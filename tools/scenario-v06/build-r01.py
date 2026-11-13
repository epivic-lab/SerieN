"""R0.1 offline candidate builder. Never imported by the simulator; stdlib only."""
from pathlib import Path
import json, math, hashlib, argparse, bisect
ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / 'docs/_active/scenario-v06/evidence'
SOURCE_HASH = '6a494928707609f1cf6aa9b535a510ca721b9a3458eca0910dfc250c978f46ea'

def add(a,b): return [x+y for x,y in zip(a,b)]
def sub(a,b): return [x-y for x,y in zip(a,b)]
def mul(a,k): return [x*k for x in a]
def unit(a): return mul(a,1/math.hypot(*a))
def cumulative(ps):
    ss=[0.]
    for a,b in zip(ps,ps[1:]): ss.append(ss[-1]+math.dist(a,b))
    return ss

def at(ps,ss,s):
    i=min(len(ps)-2,max(0,bisect.bisect_right(ss,s)-1))
    return add(ps[i],mul(sub(ps[i+1],ps[i]),(s-ss[i])/(ss[i+1]-ss[i])))

def tangent(ps,end): return unit(sub(ps[1],ps[0]) if end=='S' else sub(ps[-1],ps[-2]))
def angle(a,b): return math.degrees(math.atan2(abs(a[0]*b[1]-a[1]*b[0]),sum(x*y for x,y in zip(a,b))))

def reconcile(piece,end,target,desired):
    """Compact C2 displacement on raw arclength, zero outside <=62.026mm.
    h(0)=h'(0)=h''(0)=0; h(1)=1,h'(1)=h''(1)=0.
    g(0)=g'(0)=g''(0)=0; g(1)=0,g'(1)=1,g''(1)=0.
    Source polylines retain their original interior tangent discretization.
    """
    ps=piece['points'];ss=cumulative(ps);length=ss[-1];support=min(length,62.026)
    sign=1 if end=='E' else -1
    original=ps[-1] if end=='E' else ps[0]
    delta=sub(target,original);derivative=sub(desired,tangent(ps,end))
    # t increases toward corrected endpoint, independently of original S/E orientation.
    samples=set(ss)
    n=math.ceil(support/0.25)
    for i in range(n+1):
        d=support*i/n;samples.add(length-support+d if end=='E' else support-d)
    pts=[];deviations=[]
    for s in sorted(samples):
        base=at(ps,ss,s);distance=length-s if end=='E' else s
        if distance>=support: q=base
        else:
            t=1-distance/support;h=10*t**3-15*t**4+6*t**5;g=-4*t**3+7*t**4-3*t**5
            q=add(base,add(mul(delta,h),mul(derivative,sign*support*g)))
        pts.append(q);deviations.append(math.dist(q,base))
    pts[0 if end=='S' else -1]=list(target)
    piece['points']=pts
    piece['reconciliation']={'end':end,'original_mm':original,'new_mm':target,'delta_mm':delta,
        'endpoint_displacement_mm':math.hypot(*delta),'sampled_max_displacement_mm':max(deviations),
        'support_original_arclength_mm':support,'original_tangent_SE':tangent(ps,end),
        'new_analytic_tangent_SE':desired,'displacement_derivative_SE':derivative,
        'method':'raw polyline + compact quintic Hermite displacement; C2 displacement, original interior corners retained'}

def wx_profile(start,finish):
    # Facts from XTrackCAD 20-210: 22.960 in radius, central chord (0.688,-0.157) in.
    # Keep those facts; symmetric leads and sweep are fit to V06 mouths, never old axes.
    radius=22.960*25.4;center=math.hypot(.688,.157)*25.4
    width=finish[0]-start[0];height=finish[1]-start[1];direction=1 if height>0 else -1
    lo,hi=0.,math.pi/4
    for _ in range(80):
        theta=(lo+hi)/2
        if 2*radius*(1-math.cos(theta))+center*math.sin(theta)<abs(height): lo=theta
        else: hi=theta
    theta=(lo+hi)/2;lead=(width-2*radius*math.sin(theta)-center*math.cos(theta))/2
    assert lead>0
    ps=[start[:]];primitives=[];x,y=start;heading=0.
    def line(length):
        nonlocal x,y
        a=[x,y];x+=length*math.cos(heading);y+=length*math.sin(heading)
        b=[x,y];primitives.append({'kind':'line','start':a,'end':b,'length_mm':length,'heading_rad':heading})
        n=max(1,math.ceil(length/.5))
        ps.extend([add(a,mul(sub(b,a),i/n)) for i in range(1,n+1)])
    def arc(turn):
        nonlocal x,y,heading
        a=[x,y];cx=x-turn*radius*math.sin(heading);cy=y+turn*radius*math.cos(heading)
        alpha=heading-turn*math.pi/2;n=math.ceil(radius*theta/.5)
        for i in range(1,n+1):
            t=alpha+turn*theta*i/n;ps.append([cx+radius*math.cos(t),cy+radius*math.sin(t)])
        x,y=ps[-1];primitives.append({'kind':'arc','start':a,'end':[x,y],'center':[cx,cy],
            'radius_mm':radius,'sweep_rad':turn*theta,'heading_start_rad':heading})
        heading+=turn*theta
    line(lead);arc(direction);line(center);arc(-direction);line(lead)
    assert math.dist(ps[-1],finish)<1e-9
    ps[-1]=finish[:];primitives[-1]['end']=finish[:]
    return ps,{'kind':'fitted-secondary-Kato-20-210-profile','radius_mm':radius,'center_straight_mm':center,
        'sweep_degrees':math.degrees(theta),'symmetric_lead_mm':lead,'primitives':primitives,
        'physical_profile_certified':False,'visual_blades':'OPEN: not inferred from route primitives',
        'curvature_note':'G1 at line/arc joins; finite 0↔1/R curvature steps as circular catalog profile; not C2/clothoid'}

def build(source_path,output):
    source=json.loads(source_path.read_text());assert source['source_sha256']==SOURCE_HASH
    pieces=json.loads(json.dumps(source['pieces']));p={q['piece']:q for q in pieces}
    assert sorted(p)==list(range(79))
    gaps=[]
    for name,pid,pe,qid,qe in [('G1',27,'E',48,'S'),('G2',38,'S',40,'S'),('G3',70,'S',71,'E')]:
        a=p[pid]['points'][0 if pe=='S' else -1];b=p[qid]['points'][0 if qe=='S' else -1]
        target=mul(add(a,b),.5)
        # Travel toward joint on first piece, away from joint on second piece.
        da=mul(tangent(p[pid]['points'],pe),1 if pe=='E' else -1)
        db=mul(tangent(p[qid]['points'],qe),1 if qe=='S' else -1)
        common=unit(add(da,db))
        reconcile(p[pid],pe,target,mul(common,1 if pe=='E' else -1))
        reconcile(p[qid],qe,target,mul(common,1 if qe=='S' else -1))
        gaps.append({'id':name,'endpoints':[f'{pid}.{pe}',f'{qid}.{qe}'],'original_gap_mm':math.dist(a,b),
            'joint_mm':target,'before_secant_tangent_mismatch_deg':angle(da,db),'analytic_after_mismatch_deg':0.,
            'optimality':'midpoint minimizes max endpoint displacement = gap/2 with other piece ends fixed; not a global elastic-energy optimum'})
    registry=json.loads((EVIDENCE/'R0/proposed-port-registry.json').read_text())['controllers']
    for r in registry:
        if r['type']!='WX310':continue
        for pair,pid in r['paths_by_state']['X'].items():
            # Preserve original S→E orientation (right to left) while replacing incomplete core.
            left,right=pair.split('-');pts,profile=wx_profile(r['ports_plan_mm'][left],r['ports_plan_mm'][right])
            p[pid]['points']=list(reversed(pts));p[pid]['profile']=profile
            p[pid]['lineage']='full replacement of incomplete diagonal core; original retained in source-axes.json'
        r['full_crossover_geometry']='CONTINUOUS_CANDIDATE_SECONDARY_PROFILE_NOT_PHYSICAL_CERTIFICATION'
    # Exactly equal coordinates only. NO distance threshold, clustering, snapping or diamond node.
    groups={}
    for q in pieces:
        for end,xy in [('S',q['points'][0]),('E',q['points'][-1])]:
            groups.setdefault(tuple(xy),[]).append(f"{q['piece']}.{end}")
    junctions=[{'id':f'R01J{i:03}','point_mm':list(xy),'endpoints':ends} for i,(xy,ends) in enumerate(sorted(groups.items()),1)]
    endpoint_node={ep:j['id'] for j in junctions for ep in j['endpoints']}
    units={}
    for r in registry:
        if r['type']=='WX310':
            for state,paths in r['paths_by_state'].items():
                for pair,pid in paths.items():units[pid]=(r['id'],state)
        else:
            for state,d in r['states'].items():units[d['path_piece']]=(r['id'],state)
    for q in pieces:
        pid=q['piece'];q.update(from_node=endpoint_node[f'{pid}.S'],to_node=endpoint_node[f'{pid}.E'],
            length_mm=cumulative(q['points'])[-1],unit=units.get(pid,[None,None])[0],required_state=units.get(pid,[None,None])[1])
    candidate={'schema':'serien-v06-r01-candidate-1','status':'OFFLINE_CANDIDATE_NOT_ACTIVE_NOT_PHYSICALLY_CERTIFIED',
        'source_sha256':SOURCE_HASH,'source_axes_sha256':hashlib.sha256(source_path.read_bytes()).hexdigest(),
        'base_commit':'c527134ebcd51c18b5714177946535d325499dc2','coordinates':'PLAN_MM; rail top 8.4 mm; scale N already applied',
        'gaps':gaps,'pieces':pieces,'junctions':junctions,'controllers':registry,
        'terminals':[{'endpoint':e,'type':t} for e,t in [('20.S','buffer-N20'),('43.S','buffer-N10'),('51.S','open-N16')]],
        'safety':'No runtime stop, occupancy, blade actuation or collision compatibility claimed; all require later authorized phases.'}
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(candidate,indent=2)+'\n')
    print(json.dumps({'pieces':len(pieces),'nodes':len(junctions),'gaps':gaps},indent=2))

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--source',type=Path,default=EVIDENCE/'R01/source-axes.json');ap.add_argument('--output',type=Path,default=ROOT/'docs/_active/scenario-v06/candidate/R01/track.json');ap.add_argument('--raw-alignment',type=Path,help='Optionally verify every extracted point against the hash-locked raw export');args=ap.parse_args()
    if args.raw_alignment:
        data=args.raw_alignment.read_bytes();assert hashlib.sha256(data).hexdigest()==SOURCE_HASH, 'raw export differs'
        raw=json.loads(data);expected=[{'piece':p['piece'],'points':p['centreline_plan_mm'],'hidden_intervals_mm':p['hidden_intervals_mm']} for p in raw['pieces']]
        assert json.loads(args.source.read_text())['pieces']==expected, 'source extraction differs'
    build(args.source,args.output)
