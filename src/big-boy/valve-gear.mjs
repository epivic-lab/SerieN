// Nominal visual Walschaerts linkage, layout mm. Source-derived crank throw;
// remaining dimensions are explicit simulator design values, not ALCO drawings.
export const VALVE_GEAR=Object.freeze({mainRod:21.35,crossheadHeight:5.2,dropHeight:3.8,
 eccentricRadius:1,eccentricOffset:-2.235,eccentricRod:12.1,rockerS:11.8,rockerHeight:10,
 rockerRadius:2.8,dieRatio:.4,radiusRod:14.5,unionLink:4.3,combinationLever:5.45,
 valveHeight:8.8,valveFraction:.85});
const distance=(a,b)=>Math.hypot(a.s-b.s,a.h-b.h);
function circleIntersection(a,ra,b,rb){
 const dx=b.s-a.s,dy=b.h-a.h,d=Math.hypot(dx,dy);
 if(d<1e-9)throw new Error('Degenerate linkage centres');
 const along=(ra*ra-rb*rb+d*d)/(2*d),squared=ra*ra-along*along;
 if(squared<0)throw new Error('Unreachable expansion-link joint');
 const offset=Math.sqrt(squared);
 return [-1,1].map(sign=>({s:a.s+along*dx/d-sign*offset*dy/d,h:a.h+along*dy/d+sign*offset*dx/d})).sort((a,b)=>a.h-b.h)[0];
}
export function solveValveGear(theta,radius,axleHeight,p=VALVE_GEAR){
 if(![theta,radius,axleHeight,...Object.values(p)].every(Number.isFinite)||radius<=0)throw new RangeError('Invalid valve-gear input');
 const C={s:radius*Math.cos(theta),h:axleHeight+radius*Math.sin(theta)};
 const squared=p.mainRod**2-(p.crossheadHeight-C.h)**2;if(squared<=0)throw new Error('Unreachable crosshead');
 const Q={s:C.s+Math.sqrt(squared),h:p.crossheadHeight},K={s:Q.s,h:p.dropHeight};
 const E={s:p.eccentricRadius*Math.cos(theta+p.eccentricOffset),h:axleHeight+p.eccentricRadius*Math.sin(theta+p.eccentricOffset)};
 const F={s:p.rockerS,h:p.rockerHeight},P=circleIntersection(F,p.rockerRadius,E,p.eccentricRod);
 const D={s:F.s+p.dieRatio*(P.s-F.s),h:F.h+p.dieRatio*(P.h-F.h)};
 const evaluate=(x,a)=>{
  const co=Math.cos(a),si=Math.sin(a),B={s:x-p.valveFraction*p.combinationLever*co,h:p.valveHeight-p.valveFraction*p.combinationLever*si};
  const U={s:x+(1-p.valveFraction)*p.combinationLever*co,h:p.valveHeight+(1-p.valveFraction)*p.combinationLever*si};
  return {f:(B.s-K.s)**2+(B.h-K.h)**2-p.unionLink**2,g:(U.s-D.s)**2+(U.h-D.h)**2-p.radiusRod**2,B,U};
 };
 // Solve independently from a fixed branch seed: reverse/STOP cannot select a
 // different assembly mode because of prior animation history.
 let x=26.5,a=1.7,result;
 for(let i=0;i<80;i++){
  result=evaluate(x,a);const {f,g}=result;
  if(Math.max(Math.abs(f),Math.abs(g))<1e-9)break;
  const step=1e-5,rx=evaluate(x+step,a),ra=evaluate(x,a+step),aa=(rx.f-f)/step,bb=(ra.f-f)/step,cc=(rx.g-g)/step,dd=(ra.g-g)/step,det=aa*dd-bb*cc;
  if(Math.abs(det)<1e-8)throw new Error('Singular valve linkage');
  const dx=(dd*f-bb*g)/det,da=(-cc*f+aa*g)/det,scale=Math.min(1,.2/Math.max(Math.abs(dx),Math.abs(da)));
  x-=scale*dx;a-=scale*da;
 }
 result=evaluate(x,a);
 if(Math.max(Math.abs(result.f),Math.abs(result.g))>1e-8)throw new Error('Valve linkage failed to close');
 const {B,U}=result,V={s:x,h:p.valveHeight};
 const residual=Math.max(Math.abs(distance(C,Q)-p.mainRod),Math.abs(distance(E,P)-p.eccentricRod),Math.abs(distance(F,P)-p.rockerRadius),Math.abs(distance(D,U)-p.radiusRod),Math.abs(distance(K,B)-p.unionLink),Math.abs(distance(B,U)-p.combinationLever));
 return {C,Q,K,E,F,P,D,B,U,V,residual};
}
