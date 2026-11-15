// Layout millimetres. Keep the original BR 01 body origins used by its axle
// rig. The contact-free ribbon pitch and the physical shelter of the drawgear
// are distinct dimensions. Only an engine directly followed by its own type
// of tender uses this pitch.
import * as T from 'three';

const scale=149.625/39.801374;
const oldRear=(20.066135+5.55)*scale/2;
const oldFront=(19.735239-5.55)*scale/2;
export const BR01_GEAR=Object.freeze({
  extra:2.2, pitch:149.625/2+2.2,
  enginePin:-oldRear+2.0, tenderPin:oldFront-1.15, height:4.35,
  eyeRadius:.49, pinRadius:.20, sleeve:4.79, tongue:4.79,
  minOverlap:.35, maxOverlap:4.79-.50
});
const steel=new T.MeshStandardMaterial({color:0x555c60,metalness:.65,roughness:.48});
const pinSteel=new T.MeshStandardMaterial({color:0xbab1a0,metalness:.6,roughness:.42});
const box=new T.BoxGeometry(1,1,1);
const pin=new T.CylinderGeometry(.20,.20,1.20,16);
const profile=new T.Shape();
profile.absarc(0,0,.49,0,Math.PI*2,false);
const bore=new T.Path();bore.absarc(0,0,.27,0,Math.PI*2,true);profile.holes.push(bore);
const eye=new T.ExtrudeGeometry(profile,{depth:.34,bevelEnabled:false,curveSegments:12})
  .rotateX(-Math.PI/2).translate(0,-.17,0);
function part(parent,geometry,material,name,x,y,z){
 const m=new T.Mesh(geometry,material);m.name=name;m.userData.drawgear=true;m.position.set(x,y,z);parent.add(m);return m;
}
function block(parent,name,x,y,z,l,h,w){
 const m=part(parent,box,steel,name,x,y,z);m.scale.set(l,h,w);return m;
}
export function buildDrawgear(root,tender){
 const {enginePin,tenderPin,height,sleeve,tongue}=BR01_GEAR;
 const carrier=new T.Group();
 carrier.position.set(tender?tenderPin:enginePin,height,0);root.add(carrier);
 part(carrier,pin,pinSteel,'drawgear pivot',0,0,0);
 // The eye is retained below the original coupling beam by a vertical
 // shoulder pin. The narrow hanger leaves the pony truck free to swing.
 block(carrier,'drawgear beam hanger',0,2.06,0,.48,3.48,.48);
 block(carrier,'drawgear retaining head',0,-.46,0,.55,.12,.55);
 const member=new T.Group();carrier.add(member);
 part(member,eye,steel,'drawgear eye',0,0,0);
 if(tender){
   block(member,'drawgear tongue',(.35+tongue)/2,0,0,tongue-.35,.20,.38);
   block(member,'drawgear captive shoe',tongue-.12,0,0,.24,.24,.50);
 }else{
   for(const z of [-.25,.25])block(member,'drawgear mouth keeper',sleeve-.055,0,z,.11,.29,.056);
   block(member,'drawgear rear stop',.45,0,0,.10,.29,.55);
   const start=.40,len=sleeve-start,mid=(start+sleeve)/2;
   for(const y of [-.20,.20])block(member,'drawgear sleeve face',mid,y,0,len,.10,.78);
   for(const z of [-.335,.335])block(member,'drawgear sleeve side',mid,0,z,len,.30,.11);
 }
 member.rotation.y=tender?0:Math.PI;
 root.br01Gear={carrier,member,tender};
}
const a=new T.Vector3(),b=new T.Vector3();
// Each solid member rotates on its own fixed vertical pin. The smaller
// tongue slides in the open sleeve; no node changes scale or axial length.
export function poseDrawbar(engine,tender){
 const first=engine.br01Gear,second=tender?.br01Gear;
 if(!first||first.tender)return;
 if(!second?.tender){first.member.rotation.y=Math.PI;return;}
 first.carrier.getWorldPosition(a);second.carrier.getWorldPosition(b);
 first.carrier.worldToLocal(b);second.carrier.worldToLocal(a);
 first.member.rotation.y=-Math.atan2(b.z,b.x);
 second.member.rotation.y=-Math.atan2(a.z,a.x);
}
