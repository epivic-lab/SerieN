"""S5 integrated browser checks using real controls/native stock and the existing
profiling bundle. No hooks in the production build; output outside old evidence.
"""
import os,json,math
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(os.environ.get('S5_OUTPUT','railway-s5'));out.mkdir(parents=True,exist_ok=True)
def clean(v):
 if isinstance(v,float) and not math.isfinite(v):return None
 if isinstance(v,dict):return {k:clean(x) for k,x in v.items()}
 if isinstance(v,list):return [clean(x) for x in v]
 return v
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader']);page=b.new_page(viewport={'width':960,'height':820},device_scale_factor=1);errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None);page.on('requestfailed',lambda r:failed.append(r.url))
 page.route('**/dist/game.js*',lambda r:r.fulfill(path=os.environ['S5_BUNDLE'],content_type='application/javascript'))
 page.goto(os.environ.get('SERIEN_URL','http://127.0.0.1:8003/')+'?diagnostics=1',wait_until='domcontentloaded',timeout=120000);page.wait_for_function('__serienProfile',timeout=180000)
 page.evaluate('''()=>{__serienProfile.stop();document.getElementById('pause').click();document.getElementById('quality').value='low';document.getElementById('quality').dispatchEvent(new Event('change'));window.confirm=()=>true;
 const api=__serienDiagnostics,p=__serienProfile,$=id=>document.getElementById(id),t=p.trains[2];
 window.__g={api,p,t,$};window.__g.check=(v,m)=>{if(!v)throw Error(m)};
 window.__g.speed=value=>{$('speed').value=value;$('speed').dispatchEvent(new Event('input'));};
 document.querySelector('[data-train="2"]').click();for(let i=0;i<5;i++)$('uncouple').click();
 const extent=-t.group.userData.couplers.back.x;window.__g.extent=extent;
 window.__g.place=gap=>{api.setSwitches(['Y-4']);api.placeTrain(2,'T47',extent+gap,-1);};
 }''')
 results={}
 def run(name,script):
  value=page.evaluate('()=>{const {api,p,t,$,check,speed,extent,place}=__g;'+script+'}')
  results[name]=clean(value);(out/'browser.json').write_text(json.dumps({'result':'IN_PROGRESS','cases':results},indent=2)+'\n');print(name,'PASS',flush=True)
 run('predictive-stop-and-real-panel-recovery','''
 place(80);const toggle=api.requestToggle('Y-4','panel');check(toggle.changed,'legal turnout change before arrival');speed(100);
 const samples=[];let stopped=false;
 for(let i=0;i<500;i++){const before=t.journey.position,v=t.velocity;api.step(1/60);const gap=t.journey.position-extent;check(gap>30+1e-6,'protected approach boundary crossed');
 if(i%10===0||t.speed===0)samples.push({tick:i+1,timeSeconds:(i+1)/60,before,after:t.journey.position,velocityBefore:v,velocity:t.velocity,gap,guard:t.guard});if(!t.speed){stopped=true;break;}}
 check(stopped&&t.velocity===0&&t.guard.state==='GUARDED_STOP','must brake to rest');check(Number($('speed').value)===0,'global speed control must synchronize at guarded stop');check(t.requestedSpeed===100,'retain request as observation, not restart authority');
 const index=__s4.switchSpecs.findIndex(s=>s.id==='Y-4'),button=document.querySelector('[data-switch="'+index+'"]');check(!button.disabled,'existing occupied lock must allow correction');button.click();api.step(1/60);
 check(__s4.switchSpecs[index].on&&t.guard.state==='SAFE','panel correction releases guard');check(t.speed===0&&t.velocity===0,'no automatic restart');
 const parked=t.journey.position;speed(25);api.step(.5);check(t.journey.position<parked,'explicit rearm moves');$('stop').click();api.step(.5);check(t.velocity===0&&t.speed===0&&t.requestedSpeed===0,'manual stop authority');return {samples,panelCorrection:true,explicitRearm:true,manualStop:true};
 ''')
 run('stale-history-high-speed-no-tunneling','''
 place(.01);const c=__s4.switchSpecs.find(c=>c.id==='Y-4');check(t.journey.ensure(t.journey.position-extent-20,__s4.route),'seed prior valid history');const history=JSON.stringify(t.journey.segments);c.on=false;speed(100);t.velocity=-150;
 const before=t.journey.position;api.step(1/60);check(t.journey.position===before&&t.velocity===0,'stale route must not cross');check(JSON.stringify(t.journey.segments)===history,'rejected history changed');check(t.guard.reason==='misaligned','diagnostic reason');
 const guard=t.guard;$('stopAll').click();c.on=true;api.frames([60,.2,1/20,1/120]);check(t.journey.position===before&&t.requestedSpeed===0,'STOP ALL must survive resume and release');return {before,after:t.journey.position,guard,STOP_ALL:true};
 ''')
 run('reverse-away-and-background-resume','''
 place(40);__s4.switchSpecs.find(c=>c.id==='Y-4').on=false;speed(100);t.velocity=-150;api.frames([60,.2,.05]);check(t.guard.state==='GUARDED_STOP'&&t.velocity===0,'background admission');
 const before=t.journey.position;$('reverse').click();speed(25);api.frames([60,.2,1/20]);check(t.journey.position>before&&t.guard.state==='SAFE','reverse away release');$('stop').click();return {before,after:t.journey.position,guard:t.guard,intervals:[60,.2,.05]};
 ''')
 run('unknown-raw-control-fails-closed','''
 place(40);const c=__s4.switchSpecs.find(c=>c.id==='Y-4');c.on=undefined;speed(100);t.velocity=-150;const before=t.journey.position;api.step(1/60);check(t.guard.risk==='UNKNOWN'&&t.guard.state==='GUARDED_STOP','unknown admitted');const guard=t.guard;
 c.on=true;$('stopAll').click();api.frames([60,60]);check(t.speed===0&&t.velocity===0&&t.requestedSpeed===0,'no restart');return {before,after:t.journey.position,unknown:guard};
 ''')
 # Exercise an actual Chromium lifecycle suspension, in addition to deterministic
 # 60-second elapsed inputs. The production clock resumes through its own tick.
 session=page.context.new_cdp_session(page);session.send('Page.enable')
 before=page.evaluate("()=>{const {p,t,$,place,speed}=__g;place(40);__s4.switchSpecs.find(c=>c.id==='Y-4').on=false;speed(100);t.velocity=-150;const value={coordinate:t.journey.position,time:performance.now(),frame:p.renderer.info.render.frame};$('pause').click();p.resume();return value;}")
 session.send('Page.setWebLifecycleState',{'state':'frozen'});page.wait_for_timeout(500);session.send('Page.setWebLifecycleState',{'state':'active'})
 page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(resolve))')
 page.wait_for_function("__g.t.guard?.state==='GUARDED_STOP'&&__g.t.velocity===0",timeout=60000)
 resumed=page.evaluate("()=>{const {p,t,$,extent,check}=__g;p.stop();$('pause').click();const gap=t.journey.position-extent;check(gap>30+1e-6,'lifecycle resume crossed protected limit');return {coordinate:t.journey.position,gap,time:performance.now(),frame:p.renderer.info.render.frame,guard:t.guard};}")
 assert resumed['frame']>before['frame'] and resumed['time']>before['time']+400
 results['actual-Chromium-freeze-resume']={'before':before,'after':clean(resumed),'frozenMilliseconds':500};print('actual-Chromium-freeze-resume PASS',flush=True)
 run('occupation-held-until-compatible-departure','''
 $('stopAll').click();document.querySelector('[data-train="0"]').click();for(let i=0;i<5;i++)$('uncouple').click();
 api.setSwitches([]);api.placeTrain(0,'T47',200,1);api.placeTrain(2,'T46',110,-1);
 speed(100);document.querySelector('[data-train="2"]').click();speed(100);const a=p.trains[0];
 for(let i=0;i<600&&(a.speed||t.speed);i++)api.step(1/60);
 check(a.speed===0&&t.speed===0,'both occupation participants stop');const coordinate=a.journey.position;
 for(let i=0;i<10;i++){api.step(1/60);check(a.guard.state==='GUARDED_STOP'&&t.guard.state==='GUARDED_STOP','known occupation warning cleared prematurely');}
 const guarded=[a.guard,t.guard];$('reverse').click();speed(25);
 for(let i=0;i<120;i++){api.step(1/60);check(t.speed===25,'retained hazard created phantom reservation against departing train');}
 check(a.guard.state==='SAFE'&&a.speed===0&&a.journey.position===coordinate,'release must not restart stopped train');$('stopAll').click();
 return {guarded,compatibleDeparture:true,guardAfter:a.guard,stoppedPosition:coordinate,after:a.journey.position};
 ''')
 assert not errors and not failed,(errors,failed)
 (out/'browser.json').write_text(json.dumps({'result':'PASS','cases':results,'errors':errors,'failedRequests':failed,'hardware':'Chromium/SwiftShader; physical GPU/touch NOT VERIFIED'},indent=2)+'\n');b.close()
