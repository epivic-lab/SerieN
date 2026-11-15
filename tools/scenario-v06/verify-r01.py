"""Independent offline R0.1 checker: consumes geometry, never imports its builder.
Oracles: frozen R0 route lists/matrices + explicit manual topology. No runtime certification.
"""
from pathlib import Path
import argparse, json, math, itertools, collections, csv, hashlib, copy
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'docs/_active/scenario-v06'

def angle(a,b):return math.degrees(math.atan2(abs(a[0]*b[1]-a[1]*b[0]),sum(x*y for x,y in zip(a,b))))
def vector(a,b):return [b[0]-a[0],b[1]-a[1]]
def norm(v):return math.hypot(*v)
def minus(v):return [-x for x in v]
def length(ps):return sum(math.dist(a,b) for a,b in zip(ps,ps[1:]))
def outward(p,e):
    ps=p['points'];return vector(ps[0],ps[1]) if e=='S' else vector(ps[-1],ps[-2])
def node_for(p,end):return tuple(p['points'][0 if end=='S' else -1])
def signed_points(p,s):return p['points'] if s==1 else p['points'][::-1]

def inspect(c,source):
    p={x['piece']:x for x in c['pieces']};raw={x['piece']:x for x in source['pieces']}
    assert len(c['pieces'])==79 and set(p)==set(range(79)), 'coverage'
    assert c['source_axes_sha256']==hashlib.sha256((BASE/'evidence/R01/source-axes.json').read_bytes()).hexdigest()=='b140214d52977ea62be422882bbcf2b2e3fcf16fee6d1d0f429f03e2d4304cab', 'frozen source axes lock'
    modified={12,13,16,17,27,38,40,48,70,71}
    for i in p:
        ps=p[i]['points'];assert all(len(x)==2 and all(math.isfinite(v) for v in x) for x in ps)
        assert all(math.dist(a,b)>1e-10 for a,b in zip(ps,ps[1:])), ('degenerate',i)
        assert abs(length(ps)-p[i]['length_mm'])<1e-8, ('length',i)
        assert p[i]['hidden_intervals_mm']==raw[i]['hidden_intervals_mm'], 'hidden metadata'
        if i not in modified:assert ps==raw[i]['points'], ('unexpected movement',i)
    groups=collections.defaultdict(list)
    for i,q in p.items():
        for e in ['S','E']:groups[node_for(q,e)].append((i,e))
    singles={f'{i}.{e}' for members in groups.values() if len(members)==1 for i,e in members}
    assert singles=={'20.S','43.S','51.S'}, ('unmatched',singles)
    assert len(c['junctions'])==len(groups)==74
    declared={tuple(j['point_mm']):set(j['endpoints']) for j in c['junctions']}
    assert declared=={xy:{f'{i}.{e}' for i,e in members} for xy,members in groups.items()}, 'fake/missing nodes'
    declared_ids={j['id']:tuple(j['point_mm']) for j in c['junctions']}
    for q in p.values():assert declared_ids[q['from_node']]==node_for(q,'S') and declared_ids[q['to_node']]==node_for(q,'E')
    neighbors=collections.defaultdict(set)
    for q in p.values():
        a,b=node_for(q,'S'),node_for(q,'E');neighbors[a].add(b);neighbors[b].add(a)
    seen=set();todo=[next(iter(neighbors))]
    while todo:
        xy=todo.pop()
        if xy in seen:continue
        seen.add(xy);todo.extend(neighbors[xy]-seen)
    assert len(seen)==74, 'disconnected component'
    # Joint matrix from actual geometry and independent no-same-device transit rule.
    joins=[]
    for xy,members in groups.items():
        for (i,e),(j,f) in itertools.combinations(members,2):
            same=p[i]['unit'] is not None and p[i]['unit']==p[j]['unit']
            joins.append({'a':f'{i}.{e}','b':f'{j}.{f}','x_mm':xy[0],'y_mm':xy[1],
                'direct_transit':not same,'reason':'same device: reverse/throw required or alternate route' if same else 'external joint',
                'sampled_tangent_mismatch_deg':angle(minus(outward(p[i],e)),outward(p[j],f)) if not same else None})
    gap_metrics=[]
    for name,i,e,j,f,expected in [('G1',27,'E',48,'S',.7491548571557061),('G2',38,'S',40,'S',.8552502557731805),('G3',70,'S',71,'E',2.1419920634772986)]:
        a=raw[i]['points'][0 if e=='S' else -1];b=raw[j]['points'][0 if f=='S' else -1]
        assert abs(math.dist(a,b)-expected)<1e-10
        assert node_for(p[i],e)==node_for(p[j],f),name
        assert node_for(p[i],'E' if e=='S' else 'S')==node_for(raw[i],'E' if e=='S' else 'S')
        assert node_for(p[j],'E' if f=='S' else 'S')==node_for(raw[j],'E' if f=='S' else 'S')
        mismatch=angle(minus(outward(p[i],e)),outward(p[j],f));assert mismatch<.01, (name,mismatch)
        gap_metrics.append({'id':name,'residual_mm':0,'sampled_tangent_mismatch_deg':mismatch,
            'endpoint_displacements_mm':[math.dist(a,node_for(p[i],e)),math.dist(b,node_for(p[j],f))]})
    # Literal independent state/device oracle. Registry path labels are NOT the oracle.
    expected_units={35:('V06-C07','S0'),34:('V06-C07','S1'),68:('V06-C12','S0'),30:('V06-C12','S1'),69:('V06-C13','S0'),33:('V06-C13','S1'),31:('V06-N07','S0'),32:('V06-N07','S1'),41:('V06-N14','S0'),42:('V06-N14','S1'),59:('WX-A','N'),60:('WX-A','N'),12:('WX-A','X'),13:('WX-A','X'),61:('WX-B','N'),62:('WX-B','N'),16:('WX-B','X'),17:('WX-B','X')}
    assert {i:(q['unit'],q['required_state']) for i,q in p.items() if q['unit']}==expected_units
    wx_cases=[];wx_metrics=[]
    frozen=json.loads((BASE/'evidence/R0/proposed-port-registry.json').read_text())['controllers']
    assert len(c['controllers'])==7 and {r['id'] for r in c['controllers']}=={r['id'] for r in frozen}, 'controller inventory'
    assert c['terminals']==[{'endpoint':e,'type':t} for e,t in [('20.S','buffer-N20'),('43.S','buffer-N10'),('51.S','open-N16')]], 'terminal registry'
    for r in frozen:
        candidate_registry=next(z for z in c['controllers'] if z['id']==r['id'])
        assert candidate_registry['ports_plan_mm']==r['ports_plan_mm']
        if r['type']=='WX310': assert candidate_registry['transition_matrix']==r['transition_matrix']
        uid=r['id'];ports={k:tuple(v) for k,v in r['ports_plan_mm'].items()}
        if r['type']=='WX310':
            ids=[i for i,q in p.items() if q['unit']==uid];assert len(ids)==4
            endpoints={node_for(p[i],e) for i in ids for e in ['S','E']};assert endpoints==set(ports.values())
            for state in ['N','X']:
                actual={}
                for a,b in itertools.product(ports,repeat=2):
                    matches=[i for i in ids if p[i]['required_state']==state and a!=b and {node_for(p[i],'S'),node_for(p[i],'E')}=={ports[a],ports[b]}]
                    expected=(a,b) in ({('UL','UR'),('UR','UL'),('LL','LR'),('LR','LL')} if state=='N' else {('UL','LR'),('LR','UL'),('LL','UR'),('UR','LL')})
                    assert len(matches)==int(expected),(uid,state,a,b,matches)
                    fixture=next(x for x in r['transition_matrix'][state] if x['entry']==a and x['exit']==b)
                    assert fixture['allowed']==expected
                    wx_cases.append({'unit':uid,'state':state,'entry':a,'exit':b,'allowed':expected,'piece':matches[0] if matches else None})
            for i in ids:
                ps=p[i]['points']; assert all(b[0]<a[0] for a,b in zip(ps,ps[1:])), 'WX folded path'
                if p[i]['required_state']=='X': assert max(math.dist(a,b) for a,b in zip(ps,ps[1:]))<.501, 'WX interior jump'
                for a,b,d in zip(ps,ps[1:],ps[2:]):
                    u,v=vector(a,b),vector(b,d);area2=abs(u[0]*v[1]-u[1]*v[0])
                    if area2>1e-10:
                        radius=norm(u)*norm(v)*math.dist(a,d)/(2*area2)
                        assert radius>583.17, ('WX excessive curvature',i,radius)
            cross=[p[i]['points'] for i in ids if p[i]['required_state']=='X']
            # Segment intersection inside the two crossing routes; no endpoint node there.
            crossings=[]
            for a,b in zip(cross[0],cross[0][1:]):
                u=vector(a,b)
                for d,e in zip(cross[1],cross[1][1:]):
                    v=vector(d,e);den=u[0]*v[1]-u[1]*v[0]
                    if abs(den)<1e-12:continue
                    w=vector(a,d);t=(w[0]*v[1]-w[1]*v[0])/den;s=(w[0]*u[1]-w[1]*u[0])/den
                    if -1e-9<=t<=1+1e-9 and -1e-9<=s<=1+1e-9:
                        xy=(a[0]+t*u[0],a[1]+t*u[1]);assert xy not in groups,'diamond node';crossings.append(xy)
            assert crossings
            # Port secants horizontal; positive length and correct orientation both ways.
            for i in ids:
                for e in ['S','E']:assert angle(outward(p[i],e),[1,0])<.001 or angle(outward(p[i],e),[-1,0])<.001
            wx_metrics.append({'unit':uid,'crossing_mm':list(crossings[0]),'central_nodes':0,'ports':4,'ordered_cases':32,'physical_fidelity':'OPEN'})
    assert len(wx_cases)==64
    # Five 3-port truth tables, every ordered case including forbidden branch->branch.
    simple_cases=[]
    for r in frozen:
        if r['type']=='WX310':continue
        ports={k:tuple(v) for k,v in r['ports_plan_mm'].items()};ids=[i for i,q in p.items() if q['unit']==r['id']]
        for state in ['S0','S1']:
            for a,b in itertools.product(ports,repeat=2):
                found=[i for i in ids if p[i]['required_state']==state and a!=b and {node_for(p[i],'S'),node_for(p[i],'E')}=={ports[a],ports[b]}]
                branch='B' if state=='S0' else 'C';want=(a,b) in [('A',branch),(branch,'A')]
                assert len(found)==int(want)
                simple_cases.append({'unit':r['id'],'state':state,'entry':a,'exit':b,'allowed':want})
    def check_walk(walk,closed=False,allow_reversal=False):
        points=[signed_points(p[i],s) for i,s in walk]
        transitions=list(zip(range(len(walk)-1),range(1,len(walk))))
        if closed:transitions.append((len(walk)-1,0))
        for a,b in transitions:
            i,j=walk[a][0],walk[b][0];assert points[a][-1]==points[b][0],('walk gap',i,j)
            assert not (p[i]['unit'] and p[i]['unit']==p[j]['unit']),('forbidden unit transition',i,j)
        states={}
        for i,_ in walk:
            if p[i]['unit']:
                u=p[i]['unit'];state=p[i]['required_state'];assert u not in states or states[u]==state;states[u]=state
        return {'length_mm':sum(p[i]['length_mm'] for i,_ in walk),'states':states,'joins_exact':True}
    routes=json.loads((BASE/'evidence/R0/route-checks.json').read_text());walks={}
    for name in ['A','B','C','S1_FROM_N07_COMMON','S2_FROM_C13_COMMON','TSEG_FROM_N14_COMMON']:
        walk=routes[name]['piece_walk'];walks[name]=check_walk(walk,name in ['A','B','C'])
        check_walk([(i,-s) for i,s in walk[::-1]],name in ['A','B','C'])
    triangle=routes['TRIANGLE_GEOMETRIC_CYCLE']['piece_walk']
    # Geometric cycle closes; direct C->B route MUST be rejected.
    for (i,s),(j,t) in zip(triangle,triangle[1:]+triangle[:1]):assert signed_points(p[i],s)[-1]==signed_points(p[j],t)[0]
    try:check_walk(triangle,True)
    except AssertionError as exc:assert 'forbidden unit transition' in str(exc)
    else:raise AssertionError('N07 branch-to-branch admitted')
    # Replace that direct transit with common lead and explicit stop/throw/reversal.
    approach=[[34,1],[27,1],[48,1],[46,1],[47,1],[52,-1],[50,-1],[32,-1],[53,-1],[44,1],[43,-1]]
    departure=[[43,1],[44,-1],[53,1],[31,-1],[39,-1],[40,-1],[38,1],[41,-1],[30,1],[29,1],[28,1],[26,1],[37,1]]
    check_walk(approach);check_walk(departure)
    assert signed_points(p[43],-1)[-1]==signed_points(p[43],1)[0]
    # Reversal anywhere on common siding; endpoint above is a topological witness ONLY, not a safe stop anchor.
    walks['TRIANGLE_MANOEUVRE']={'approach':approach,'departure':departure,'required_event':'stop before terminal with whole consist clear of N07; S1→S0; reverse',
        'capacity_upper_bound_mm':walks['S1_FROM_N07_COMMON']['length_mm'],'safe_stopping_point':'OPEN; terminal witness is NOT a stopping instruction'}
    # All 2^7 state configurations: at most one permitted continuation per arrival.
    units=sorted({q['unit'] for q in p.values() if q['unit']}); checked=0
    for bits in itertools.product([0,1],repeat=7):
        states={u:('X' if bit else 'N') if u.startswith('WX') else ('S1' if bit else 'S0') for u,bit in zip(units,bits)}
        for i,q in p.items():
            if q['unit'] and q['required_state']!=states[q['unit']]:continue
            for end in ['S','E']:
                exits=[]
                for j,e in groups[node_for(q,end)]:
                    if i==j or q['unit'] is not None and q['unit']==p[j]['unit']:continue
                    other=p[j]
                    if other['unit'] and other['required_state']!=states[other['unit']]:continue
                    exits.append(j)
                assert len(exits)<=1, ('ambiguous route',states,i,end,exits)
                checked+=1
    # State-aware directed BFS; choose a consistent static state assignment along each witness.
    start=node_for(p[64],'S');witnesses={}
    for target in ['20.S','43.S']:
        ti,te=target.split('.');goal=node_for(p[int(ti)],te);queue=collections.deque([(start,None,(),())]);visited=set();found=None
        while queue:
            xy,lastunit,assignment,walk=queue.popleft();key=(xy,lastunit,assignment)
            if key in visited:continue
            visited.add(key)
            if xy==goal:found=walk;break
            states=dict(assignment)
            for i,e in groups[xy]:
                q=p[i];u=q['unit'];st=q['required_state']
                if u and (u==lastunit or u in states and states[u]!=st):continue
                nxt=dict(states)
                if u:nxt[u]=st
                sign=1 if e=='S' else -1;dest=node_for(q,'E' if e=='S' else 'S')
                queue.append((dest,u,tuple(sorted(nxt.items())),walk+((i,sign),)))
        assert found,('unreachable terminal',target)
        check_walk(found);witnesses[target]=found
    n16_departure=[[43,1],[44,-1],[53,1],[31,-1],[39,-1],[40,-1],[38,1],[42,1],[49,1],[51,-1]]
    check_walk(n16_departure)
    for leg in [approach,departure,n16_departure]:check_walk([(i,-sign) for i,sign in reversed(leg)])
    witnesses['51.S']={'approach_via_N07_C':approach,'stop_throw_reverse':True,'departure_via_N07_B_N14_C':n16_departure,'safe_capacity_and_stop':'OPEN'}
    # Baseline endpoint secants vs candidate: all legal joins measured, not asserted smooth by labels.
    legal=[j for j in joins if j['direct_transit']]
    return {'status':'PASS_GEOMETRIC_AND_OFFLINE_TOPOLOGICAL_CHECKS; PHYSICAL_WX_FIDELITY_OPEN',
        'pieces':79,'unchanged_pieces':69,'nodes':74,'connected_components_union':1,'cycle_rank_union':6,
        'intentional_terminals':sorted(singles),'gaps':gap_metrics,'wx':wx_metrics,'wx_matrix':wx_cases,
        'simple_matrix':simple_cases,'walks':walks,'terminal_reachability_witnesses':witnesses,
        'junction_matrix':joins,'max_legal_join_secant_mismatch_deg':max(j['sampled_tangent_mismatch_deg'] for j in legal),
        'state_configurations_checked':128,'oriented_arrivals_checked':checked,
        'global_smoothness':'NOT CERTIFIED: original polygonal corners retained; see measured join matrix',
        'runtime_compatibility':'NOT VERIFIED; standalone checker has no safety/core authority'}

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--candidate',type=Path,default=BASE/'candidate/R01/track.json');ap.add_argument('--output',type=Path,default=BASE/'evidence/R01');ap.add_argument('--mutation-tests',action='store_true');args=ap.parse_args()
    c=json.loads(args.candidate.read_text());src=json.loads((BASE/'evidence/R01/source-axes.json').read_text());result=inspect(c,src)
    if args.mutation_tests:
        rejected=[]
        for label,mutator in [
            ('reopen-G2',lambda x:x['pieces'][38]['points'][0].__setitem__(0,x['pieces'][38]['points'][0][0]+.01)),
            ('fake-diamond-node',lambda x:x['junctions'].append({'id':'fake','point_mm':[564.722,84.525],'endpoints':[]})),
            ('wrong-WX-state',lambda x:x['pieces'][12].__setitem__('required_state','N')),
            ('drop-hidden-piece',lambda x:x['pieces'].pop(28)),
            ('move-legacy-source-piece',lambda x:x['pieces'][55]['points'][0].__setitem__(0,410)),
            ('wrong-node-reference',lambda x:x['pieces'][12].__setitem__('from_node',x['pieces'][59]['from_node']))]:
            bad=copy.deepcopy(c);mutator(bad)
            try:inspect(bad,src)
            except (AssertionError,KeyError):rejected.append(label)
            else:raise AssertionError(('mutation survived',label))
        result['negative_mutations_rejected']=rejected
    args.output.mkdir(parents=True,exist_ok=True)
    (args.output/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
    for name,key in [('junction-matrix.csv','junction_matrix'),('wx-64-cases.csv','wx_matrix'),('simple-90-cases.csv','simple_matrix')]:
        rows=result[key]
        with (args.output/name).open('w',newline='') as f:
            w=csv.DictWriter(f,fieldnames=rows[0],lineterminator="\n");w.writeheader();w.writerows(rows)
    print(json.dumps({k:v for k,v in result.items() if k not in ['junction_matrix','wx_matrix','simple_matrix']},indent=2))
if __name__=='__main__':main()
