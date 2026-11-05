// One fixed principal/version per connection. No SET ROLE and no pg.Pool behind this cap.
import pg from 'pg';
export class FixedPool {
  constructor(options, emit=()=>{}) {
    this.options={cap:16,queue:64,waitMs:2000,idleMs:30000,...options};
    this.emit=emit;this.entries=new Map();this.queue=[];this.closed=false;this.pumping=false;
    this.lastWorkspace=null;this.stats={opened:0,maxOpen:0,maxQueue:0,evictions:0,timeouts:0,rejected:0};
    this.timer=setInterval(()=>this.expire(),100).unref();
  }
  key(b){return b.principal+'@'+b.version;}
  metric(event,extra={}){this.emit({event,open:this.entries.size,queued:this.queue.length,...this.stats,...extra});}
  acquire(b,w) {
    if(this.closed)return Promise.reject(Error('RETRYABLE_UNAVAILABLE'));
    if(this.queue.length>=this.options.queue){this.stats.rejected++;this.metric('queueFull');return Promise.reject(Error('POOL_QUEUE_FULL'));}
    return new Promise((resolve,reject)=>{
      const r={b,w,resolve,reject,started:performance.now(),cancelled:false};
      r.timer=setTimeout(()=>{r.cancelled=true;this.queue=this.queue.filter(q=>q!==r);this.stats.timeouts++;reject(Error('POOL_TIMEOUT'));this.metric('queueTimeout');this.pump();},this.options.waitMs);
      this.queue.push(r);this.stats.maxQueue=Math.max(this.stats.maxQueue,this.queue.length);this.pump();
    });
  }
  async remove(e,reason) {
    if(e.closing)return e.closing;
    e.closing=(async()=>{await e.client.end().catch(()=>{});if(this.entries.get(e.key)===e)this.entries.delete(e.key);this.metric(reason);})();
    return e.closing;
  }
  async expire(){for(const e of this.entries.values())if(!e.busy&&!e.closing&&Date.now()-e.last>=this.options.idleMs){this.stats.evictions++;await this.remove(e,'idleEviction');}this.pump();}
  async retire(valid){for(const e of this.entries.values())if(!valid.has(e.key)){e.retired=true;if(!e.busy)await this.remove(e,'credentialRetired');}}
  async pump() {
    if(this.pumping||this.closed)return;this.pumping=true;
    try {
      while(this.queue.length&&!this.closed) {
        const eligible=this.queue.filter(r=>!r.cancelled&&(!this.entries.has(this.key(r.b))||!this.entries.get(this.key(r.b)).busy&&!this.entries.get(this.key(r.b)).closing));
        if(!eligible.length)break;
        const r=eligible.find(r=>r.w!==this.lastWorkspace)??eligible[0];
        let e=this.entries.get(this.key(r.b));
        if(!e&&this.entries.size>=this.options.cap) {
          const idle=[...this.entries.values()].filter(x=>!x.busy&&!x.closing).sort((a,b)=>a.last-b.last)[0];
          if(!idle)break;
          this.stats.evictions++;await this.remove(idle,'lruEviction');continue;
        }
        this.queue=this.queue.filter(q=>q!==r);this.lastWorkspace=r.w;
        if(!e) {
          const client=new pg.Client({...r.b.connection,user:r.b.principal,password:r.b.password,application_name:this.options.applicationName,connectionTimeoutMillis:1500});
          e={key:this.key(r.b),client,busy:true,last:Date.now(),bad:false};this.entries.set(e.key,e);
          client.on('error',()=>{e.bad=true;if(!e.busy)this.remove(e,'connectionError').then(()=>this.pump());});
          this.stats.maxOpen=Math.max(this.stats.maxOpen,this.entries.size);
          try {
            await client.connect();
            const identity=await client.query('SELECT session_user AS actor,pg_backend_pid() AS pid');
            if(identity.rows[0].actor!==r.b.principal)throw Error('FORBIDDEN');
            this.stats.opened++;this.metric('connected',{principal:r.b.principal,pid:identity.rows[0].pid});
          } catch(error){await this.remove(e,'connectFailed');clearTimeout(r.timer);r.reject(error);continue;}
        } else e.busy=true;
        if(r.cancelled){await this.remove(e,'cancelledOpening');continue;}
        clearTimeout(r.timer);this.metric('leased',{workspace:r.w,waitMs:performance.now()-r.started});
        r.resolve({client:e.client,release:async(drop=false)=>{if(drop||e.bad||e.retired||this.closed)await this.remove(e,'discard');else{e.busy=false;e.last=Date.now();this.metric('released');}this.pump();}});
      }
    } finally{this.pumping=false;}
  }
  async close(){this.closed=true;clearInterval(this.timer);for(const r of this.queue){clearTimeout(r.timer);r.reject(Error('RETRYABLE_UNAVAILABLE'));}this.queue=[];await Promise.all([...this.entries.values()].map(e=>this.remove(e,'shutdown')));this.metric('closed');}
}
