// Presentation only: never change switch positions or railway safety state.
function createSwitchFeedback(switches, materials, now=()=>performance.now()) {
  let active=null, started=0;
  function update(time=now()) {
    const bright=active!==null && (time-started)%700<350;
    for(const sw of switches)sw.bulb.material=bright&&sw.id===active?materials.highlight:sw.on?materials.diverging:materials.normal;
    return {id:active,bright};
  }
  return {
    hover(id) {
      if(id!==null&&!switches.some(s=>s.id===id))throw new RangeError("Unknown switch indicator");
      if(id!==active){active=id;started=now();}
      return update();
    },
    update,
    get active(){return active;},
    dispose(){active=null;update();}
  };
}
export {createSwitchFeedback};
