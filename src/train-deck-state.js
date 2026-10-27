// UI identity only. No speed, Journey or railway state is owned by this class.
class RecentConsoles {
  constructor(capacity=3) {
    if(!Number.isInteger(capacity)||capacity<1)throw new RangeError("Invalid console capacity");
    this.capacity=capacity;this.recent=[];this.slots=[];
  }
  sync(ids,active=ids[0]) {
    const available=new Set(ids);
    this.recent=this.recent.filter((id)=>available.has(id));
    this.slots=this.slots.filter((id)=>available.has(id));
    if(available.has(active))this.select(active,ids);
    for(const id of ids)if(this.slots.length<this.capacity&&!this.slots.includes(id)){
      this.slots.push(id);if(!this.recent.includes(id))this.recent.push(id);
    }
    return [...this.slots];
  }
  select(id,ids) {
    if(!ids.includes(id))return [...this.slots];
    this.recent=[id,...this.recent.filter((v)=>v!==id&&ids.includes(v))];
    this.slots=this.slots.filter((v)=>ids.includes(v));
    if(!this.slots.includes(id)){
      if(this.slots.length<this.capacity)this.slots.push(id);
      else {
        const victim=[...this.recent].reverse().find((v)=>this.slots.includes(v));
        this.slots[this.slots.indexOf(victim)]=id;
      }
    }
    return [...this.slots];
  }
}
const MAP_VIEWBOX="0 0 1500 700";
function railwayMapPath(network) {
  return Object.values(network.edges).map((e)=>e.points.map((p,i)=>`${i?"L":"M"}${p.x},${p.z}`).join(" ")).join(" ");
}
function locomotivePoint(train) {
  const p=train.journey?.locate();
  if(!p||!Number.isFinite(p.x+p.z))return null;
  return {x:p.x,z:p.z,edge:p.edge,s:p.s};
}
function operatingState(train,paused=false) {
  if(paused)return "In pausa";
  if(Math.abs(train.velocity??0)>.1)return train.dir<0?"In marcia · retromarcia":"In marcia";
  return train.speed>0?"In avvio":"Fermo";
}
export { RecentConsoles, MAP_VIEWBOX, railwayMapPath, locomotivePoint, operatingState };
