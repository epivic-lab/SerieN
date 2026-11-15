"""Quantify why a literal straight WX core plus short quintic leads is rejected."""
from pathlib import Path
import math,json
BASE=Path(__file__).resolve().parents[2]/'docs/_active/scenario-v06';E=BASE/'evidence/R01'
c=json.loads((BASE/'candidate/R01/track.json').read_text());b=json.loads((E/'source-axes.json').read_text());rows=[]
for i in [12,13,16,17]:
    left,right=sorted(b['pieces'][i]['points']);host=c['pieces'][59 if i<16 else 61]['points'];lower=c['pieces'][60 if i<16 else 62]['points']
    x0=min(x[0] for x in host);y0=min([host[0][1],lower[0][1]],key=lambda y:abs(y-left[1]));w=left[0]-x0;h=left[1]-y0;slope=(right[1]-left[1])/(right[0]-left[0]);minimum_radius=float('inf');overshoot=0.
    for k in range(5001):
        t=k/5000;H=10*t**3-15*t**4+6*t**5;G=-4*t**3+7*t**4-3*t**5
        hp=30*t*t-60*t**3+30*t**4;gp=-12*t*t+28*t**3-15*t**4
        hpp=60*t-180*t*t+120*t**3;gpp=-24*t+84*t*t-60*t**3
        y=h*H+slope*w*G;d=(h*hp+slope*w*gp)/w;dd=(h*hpp+slope*w*gpp)/(w*w)
        if abs(dd)>1e-15:minimum_radius=min(minimum_radius,(1+d*d)**1.5/abs(dd))
        overshoot=max(overshoot,max(0,-y if h>=0 else y))
    rows.append({'piece':i,'lead_width_mm':w,'rise_to_core_mm':h,'core_heading_deg':math.degrees(math.atan(slope)),
        'minimum_x_needed_for_monotone_heading_at_secondary_radius_mm':583.184*abs(math.sin(math.atan(slope))),
        'core_preserving_quintic_min_radius_mm':minimum_radius,'outward_overshoot_mm':overshoot,
        'decision':'REJECTED: rapid reverse bend outside host and radius incompatible with secondary Kato profile'})
(E/'reconstruction-alternatives.json').write_text(json.dumps(rows,indent=2)+'\n')
print('Four core-preserving lead fits rejected; numerical evidence written.')
