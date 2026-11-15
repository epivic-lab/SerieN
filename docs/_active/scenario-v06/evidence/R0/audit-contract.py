"""R0 read-only source audit. Outputs review evidence, never simulator data."""
from pathlib import Path
import json,csv,hashlib,math,collections,itertools,argparse
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('source_dir',type=Path);parser.add_argument('output_dir',type=Path);args=parser.parse_args()
S=args.source_dir;O=args.output_dir;O.mkdir(parents=True,exist_ok=True)
assert hashlib.sha256((S/'railway_alignment.json').read_bytes()).hexdigest()=='6a494928707609f1cf6aa9b535a510ca721b9a3458eca0910dfc250c978f46ea', 'Source differs from the R0 as-received lock'
a=json.loads((S/'railway_alignment.json').read_text());pieces={p['piece']:p for p in a['pieces']}
assert sorted(pieces)==list(range(79))
assert sum(p['vertices'] for p in pieces.values())==615
assert all(p['start_plan_mm']==p['centreline_plan_mm'][0] and p['end_plan_mm']==p['centreline_plan_mm'][-1] for p in pieces.values())
assert all(abs(sum(math.dist(x,y) for x,y in zip(p['centreline_plan_mm'],p['centreline_plan_mm'][1:]))-p['length_mm'])<=0.0005 for p in pieces.values())
assert all(abs(g[0]-xy[0]/1000)<1e-10 and abs(g[1]-0.0084)<1e-10 and abs(g[2]-xy[1]/1000)<1e-10 for p in pieces.values() for xy,g in zip(p['centreline_plan_mm'],p['centreline_gltf_m']))
# Manual V3 pages 3-16 and parts list p19. Associations are DEDUCED, not certified.
groups={
'C':[[64],[70],[71],[73],[72],[36],[34,35],[37],[26],[28],[29],[30,68],[33,69],[12,13,59,60],[78],[14],[15],[24],[25]],
'N':[[27],[48],[46],[47],[52],[50],[31,32],[53],[44],[43],[39],[40],[38],[41,42],[49],[51],[45],[21],[54],[20]],
'B':[[65],[66],[67],[1],[0],[19],[18],[16,17,61,62],[74],[77],[5],[4],[3],[2]],
'A':[[56],[63],[58],[11],[10],[23],[22],[76],[75],[57],[55],[6],[7],[8],[9]]}
types={
'C':['S248','S186','S29','S29','S29','R481-15','Y','R216-45','R216-45','R216-45','R216-45','#6 SX','#6 SX','WX310','S62','R249-45','R249-45','R216-45','R216-45'],
'N':['R216-45','S29','S29','S29','R216-45','R216-15','#6 DX','S64','S124','TAMPONE','S29','S45.5','S62','#6 DX','R249-45','S186','S248','S62F','S186','TAMPONE'],
'B':['S248','S248','S248','R282-45','R282-45','R282-45','R282-45','WX310','S62','S62F','R282-45','R282-45','R282-45','R282-45'],
'A':['S248','S248','S248','R315-45','R315-45','R315-45','R315-45','S62','S62','S248','S62F','R315-45','R315-45','R315-45','R315-45']}
codes={'S248':'20-000','S186':'20-010','S29':'20-071','S45.5':'20-070','S64':'20-030','S124':'20-020','TAMPONE':'20-046','S62':'20-040','S62F':'20-041','R481-15':'20-160','R216-45':'20-170','R216-15':'20-171','R249-45':'20-100','R282-45':'20-110','R315-45':'20-120','Y':'20-222','#6 SX':'20-202','#6 DX':'20-203','WX310':'20-210'}
mapping={};components=[]
for region,lists in groups.items():
 assert len(lists)==len(types[region])
 for n,ids in enumerate(lists,1):
  ident=f'{region}{n:02}';typ=types[region][n-1]
  components.append({'manual_component':ident,'type':typ,'kato_code':codes[typ],'geometry_pieces':ids,'mapping_status':'DEDUCED_FROM_MANUAL_ORDER_TYPE_AND_GEOMETRY_NOT_CERTIFIED'})
  for pid in ids:
   assert pid not in mapping;mapping[pid]=ident
assert len(components)==68 and len(mapping)==79

endpoint_groups=collections.defaultdict(list)
for p in pieces.values():
 endpoint_groups[tuple(p['start_plan_mm'])].append((p['piece'],'S'))
 endpoint_groups[tuple(p['end_plan_mm'])].append((p['piece'],'E'))
group_ids={xy:f'J{i+1:03}' for i,xy in enumerate(sorted(endpoint_groups))}
end_to_group={f'{pid}.{end}':group_ids[xy] for xy,ends in endpoint_groups.items() for pid,end in ends}

def pt(pid,end):return pieces[pid]['start_plan_mm' if end=='S' else 'end_plan_mm']
def dist(u,v):return math.dist(u,v)
def neighbors(pid,end):return [f'{n}.{e}' for n,e in endpoint_groups[tuple(pt(pid,end))] if (n,e)!=(pid,end)]
gaps=[{'id':'G1','a':'27.E','b':'48.S','manual_join':'N01 -> N02','status':'INTENDED_ADJACENCY_SUPPORTED_BY_MANUAL_P7_GEOMETRY_GAP_UNRESOLVED'},
      {'id':'G2','a':'38.S','b':'40.S','manual_join':'N12 -> N13','status':'INTENDED_ADJACENCY_SUPPORTED_BY_MANUAL_P8_GEOMETRY_GAP_UNRESOLVED'},
      {'id':'G3','a':'70.S','b':'71.E','manual_join':'C02 -> C03','status':'INTENDED_ADJACENCY_SUPPORTED_BY_MANUAL_P3_GEOMETRY_GAP_UNRESOLVED'}]
gap_by_end={}
for g in gaps:
 ap,ae=g['a'].split('.');bp,be=g['b'].split('.');g['point_a_mm']=pt(int(ap),ae);g['point_b_mm']=pt(int(bp),be);g['distance_mm']=dist(g['point_a_mm'],g['point_b_mm']);gap_by_end[g['a']]=g;gap_by_end[g['b']]=g

def single(cid,comp,normal,reverse,alias=None):
 data=next(t for t in a['turnouts'] if set(t['pieces'])=={normal,reverse});common=data['toe'];ports={'A':common}
 routes={}
 for port,pid,state in [('B',normal,'S0'),('C',reverse,'S1')]:
  p=pieces[pid];ports[port]=p['end_plan_mm'] if p['start_plan_mm']==common else p['start_plan_mm'];routes[state]={'path_piece':pid,'allowed_directed_pairs':[['A',port],[port,'A']]}
 return {'id':cid,'manual_component':comp,'type':next(x['type'] for x in components if x['manual_component']==comp),'kato_code':next(x['kato_code'] for x in components if x['manual_component']==comp),'reference':'toe, PLAN_MM, rail top Z=8.4','reference_point_plan_mm':common,'ports_plan_mm':ports,'states':routes,'mapping_status':'PROPOSED_NOT_CERTIFIED','masterplan_label_candidate':alias,'physical_command_polarity':'MISSING','blade_geometry_by_state':'MISSING','default_state':'S0_PROPOSED'}
registry=[single('V06-C07','C07',35,34,'Y-R2'),single('V06-C12','C12',68,30,'Y-IN'),single('V06-C13','C13',69,33),single('V06-N07','N07',31,32,'Y-R1'),single('V06-N14','N14',41,42)]
wx=[]
for ident,comp,hosts,diags in [('WX-A','C14',[59,60],[12,13]),('WX-B','B08',[61,62],[16,17])]:
 upper,lower=[pieces[p] for p in hosts];left=min(x[0] for x in upper['centreline_plan_mm']);right=max(x[0] for x in upper['centreline_plan_mm']);yu=upper['start_plan_mm'][1];yl=lower['start_plan_mm'][1];ports={'UL':[left,yu],'UR':[right,yu],'LL':[left,yl],'LR':[right,yl]}
 paths={'N':{'UL-UR':hosts[0],'LL-LR':hosts[1]},'X':{'UL-LR':diags[0],'LL-UR':diags[1]}}
 matrices={}
 for state,ps in paths.items():
  allowed=set()
  for pair in ps:
   x,y=pair.split('-');allowed.update([(x,y),(y,x)])
  matrices[state]=[{'entry':x,'exit':y,'allowed':(x,y) in allowed,'status':'PROPOSED_NOT_CERTIFIED'} for x in ports for y in ports]
 rec={'id':ident,'manual_component':comp,'type':'WX310','kato_code':'20-210','ports_plan_mm':ports,'reference_point_plan_mm':[(left+right)/2,(yu+yl)/2],'paths_by_state':paths,'transition_matrix':matrices,'physical_command_polarity':'MISSING','four_point_sets_by_state':{'N':{'UL':'UR','UR':'UL','LL':'LR','LR':'LL'},'X':{'UL':'LR','LR':'UL','LL':'UR','UR':'LL'}},'point_tip_positions_and_throws_mm':'MISSING','full_crossover_geometry':'MISSING_LEADS_AND_SOURCE_PRECISION','default_state':'N_PROPOSED','mapping_status':'PROPOSED_NOT_CERTIFIED'}
 assert all(sum(t['allowed'] for t in ts)==4 and len(ts)==16 for ts in matrices.values())
 registry.append(rec);wx.append(rec)

unit_by_piece={p:r['id'] for r in registry for p in next(x['geometry_pieces'] for x in components if x['manual_component']==r['manual_component'])}
role={}
for r in registry:
 if r['type']=='WX310':
  for state,paths in r['paths_by_state'].items():
   for pair,pid in paths.items():role[pid]=f'{r["id"]}:{state}:{pair}'
 else:
  for state,v in r['states'].items():role[v['path_piece']]=f'{r["id"]}:{state}'

endpoint_rows=[]
wx_ends={f'{pid}.{end}' for r in wx for pid in r['paths_by_state']['X'].values() for end in ['S','E']}
terminals={'20.S':('N20','BUFFER_IN_MANUAL_P10'),'43.S':('N10','BUFFER_IN_MANUAL_P8'),'51.S':('N16','OPEN_END_WITHOUT_BUFFER_IN_MANUAL_P9_EXPORT_BUFFER_CONFLICT')}
for xy,ends in endpoint_groups.items():
 if len(ends)!=1:continue
 pid,end=ends[0];key=f'{pid}.{end}'
 if key in wx_ends:classification='WX_CROSSOVER_ENDPOINT_NEAR_HOST_INTERIOR_NOT_A_TERMINAL';ref=unit_by_piece[pid]+' missing full lead/port route geometry'
 elif key in gap_by_end:classification='SOURCE_SUPPORTED_JOIN_INTENT_BUT_METRIC_GAP';ref=gap_by_end[key]['id']+' '+gap_by_end[key]['manual_join']
 elif key in terminals:classification='SOURCE_SUPPORTED_TERMINAL_INTENT';ref=' '.join(terminals[key])
 else:raise AssertionError(key)
 endpoint_rows.append({'endpoint':key,'manual_component_proposed':mapping[pid],'X_mm':xy[0],'Y_mm':xy[1],'classification':classification,'evidence_or_request':ref,'certified_connection':False})
assert len(endpoint_rows)==17

rows=[]
for pid,p in pieces.items():
 row={'piece':pid,'component_proposed':mapping[pid],'type_from_manual':next(x['type'] for x in components if x['manual_component']==mapping[pid]),'kato_code_proposed':next(x['kato_code'] for x in components if x['manual_component']==mapping[pid]),'geometry_kind_verified':p['kind'],'length_mm_verified':p['length_mm'],'X_start_mm':p['start_plan_mm'][0],'Y_start_mm':p['start_plan_mm'][1],'X_end_mm':p['end_plan_mm'][0],'Y_end_mm':p['end_plan_mm'][1],'start_coordinate_group':end_to_group[f'{pid}.S'],'end_coordinate_group':end_to_group[f'{pid}.E'],'coincident_neighbors_start':' '.join(neighbors(pid,'S')) or 'NONE','coincident_neighbors_end':' '.join(neighbors(pid,'E')) or 'NONE','unit_proposed':unit_by_piece.get(pid,''),'route_or_role_proposed':role.get(pid,'ordinary track, see manual component'),'hidden_intervals_mm_verified':json.dumps(p['hidden_intervals_mm']),'end_S_note':next((e['evidence_or_request'] for e in endpoint_rows if e['endpoint']==f'{pid}.S'),''),'end_E_note':next((e['evidence_or_request'] for e in endpoint_rows if e['endpoint']==f'{pid}.E'),''),'certification':'GEOMETRY_VERIFIED; MAPPING_AND_CONNECTIONS_PROPOSED_NOT_CERTIFIED'}
 rows.append(row)
def writecsv(name,data):
 with (O/name).open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(data[0]),lineterminator='\n');w.writeheader();w.writerows(data)
writecsv('piece-matrix.csv',rows);writecsv('endpoint-classification.csv',endpoint_rows)

circuits={'A':[(56,1),(63,1),(58,1),(11,-1),(10,-1),(23,-1),(22,-1),(61,1),(76,1),(75,1),(57,1),(55,1),(6,-1),(7,-1),(8,-1),(9,-1)],
'B':[(65,1),(66,-1),(67,-1),(1,-1),(0,-1),(19,-1),(18,-1),(62,1),(74,1),(59,1),(77,1),(5,-1),(4,-1),(3,-1),(2,-1)],
'C':[(64,1),(70,-1),(71,-1),(73,-1),(72,-1),(36,-1),(35,1),(37,-1),(26,-1),(28,-1),(29,-1),(68,1),(69,1),(60,1),(78,1),(14,-1),(15,-1),(24,-1),(25,-1)]}
walks={**circuits,'S1_FROM_N07_COMMON':[(53,-1),(44,1),(43,-1)],'S2_FROM_C13_COMMON':[(33,-1),(45,-1),(21,1),(54,1),(20,-1)],'TSEG_FROM_N14_COMMON':[(42,1),(49,1),(51,-1)],'TRIANGLE_GEOMETRIC_CYCLE':[(34,1),(27,1),(48,1),(46,1),(47,1),(52,-1),(50,-1),(32,-1),(31,-1),(39,-1),(40,-1),(38,1),(41,-1),(30,1),(29,1),(28,1),(26,1),(37,1)]}
def ends(part):
 pid,sign=part;return (pt(pid,'S'),pt(pid,'E')) if sign==1 else (pt(pid,'E'),pt(pid,'S'))
checks={}
for name,walk in walks.items():
 closed=name in circuits or name=='TRIANGLE_GEOMETRIC_CYCLE';pairs=list(zip(walk,walk[1:]+walk[:1])) if closed else list(zip(walk,walk[1:]));g=[]
 for x,y in pairs:
  d=dist(ends(x)[1],ends(y)[0])
  if d>1e-10:g.append({'a_piece':x[0],'a_end':'E' if x[1]==1 else 'S','b_piece':y[0],'b_end':'S' if y[1]==1 else 'E','gap_mm':d})
 checks[name]={'piece_walk':walk,'sum_of_exported_lengths_mm':sum(pieces[x]['length_mm'] for x,_ in walk),'closed_walk_required':closed,'noncoincident_joins':g,'metric_continuity_of_published_vertices':not g,'status':'ANALYTICAL_PROPOSAL_NOT_OPERATIONAL_CERTIFICATION'}
 if name=='TRIANGLE_GEOMETRIC_CYCLE':checks[name]['routing_obstacle']='32 -> 31 is C-to-B inside V06-N07; forbidden as a direct transit. Requires clearance in common lead S1, stop, throw and reversal.'
assert not checks['A']['noncoincident_joins'];assert not checks['B']['noncoincident_joins'];assert len(checks['C']['noncoincident_joins'])==1

# Conditional connectivity skeleton: explicit reviewed proposals only, NO distance auto-welding.
parent={g:g for g in group_ids.values()}
def find(x):
 while parent[x]!=x:x=parent[x]
 return x
def join(x,y):parent[find(x)]=find(y)
for g in gaps:join(end_to_group[g['a']],end_to_group[g['b']])
external_pairs={12:('60.S','59.E'),13:('59.S','60.E'),16:('62.S','61.E'),17:('61.S','62.E')}
adj=collections.defaultdict(set);edges=[]
for pid in pieces:
 u,v=external_pairs.get(pid,(f'{pid}.S',f'{pid}.E'));u=find(end_to_group[u]);v=find(end_to_group[v]);adj[u].add(v);adj[v].add(u);edges.append([pid,u,v])
remaining=set(adj);comps=[]
while remaining:
 todo=[next(iter(remaining))];seen=set()
 while todo:
  n=todo.pop()
  if n in seen:continue
  seen.add(n);todo.extend(adj[n]-seen)
 remaining-=seen;comps.append(len(seen))
skeleton={'status':'CONDITIONAL_ABSTRACT_CONNECTIVITY_ONLY_NOT_RUNTIME_GRAPH','assumptions':['G1,G2,G3 intentionally linked for analysis only, raw coordinates unchanged','four WX cross routes semantically reach external ports; full lead geometry remains missing','physical/controller mapping deduced from manual, not producer-certified'],'nodes_under_assumptions':len(adj),'edges_under_assumptions':len(edges),'components_under_assumptions':comps,'cycle_rank_of_union_of_all_states':len(edges)-len(adj)+len(comps),'warning':'Union of switch states is not a simultaneous operational route; no direct branch-to-branch reversal at N07.'}
assert len(comps)==1

for name,data in [('component-mapping.json',components),('proposed-port-registry.json',{'status':'PROPOSED_NOT_CERTIFIED_NOT_RUNTIME_DATA','controllers':registry}),('route-checks.json',checks),('conditional-connectivity.json',skeleton),('gap-classification.json',gaps)]:
 (O/name).write_text(json.dumps(data,indent=2)+'\n')

with (O/'piece-matrix.md').open('w') as f:
 f.write('| Pezzo | Componente proposto / tipo | L mm | S (X,Y) → E (X,Y) verificati | Estremità coincidenti S / E | Ruolo proposto o eccezione |\n| ---: | --- | ---: | --- | --- | --- |\n')
 for row in rows:
  pid=row['piece'];p=pieces[pid];coord=lambda xy:', '.join(f'{v:.3f}' for v in xy)
  note=row['route_or_role_proposed'] if row['unit_proposed'] else ''
  notes=[x for x in [note,row['end_S_note'],row['end_E_note']] if x]
  f.write(f'| {pid} | {mapping[pid]} · {row["type_from_manual"]} | {p["length_mm"]:.3f} | ({coord(p["start_plan_mm"])}) → ({coord(p["end_plan_mm"])}) | {row["coincident_neighbors_start"]} / {row["coincident_neighbors_end"]} | {"; ".join(notes) or "tratto ordinario"} |\n')

summary={'piece_count':len(rows),'physical_component_mapping_count':len(components),'simple_controller_count_proposed':5,'wx_count':2,'exact_coordinate_group_count':len(endpoint_groups),'endpoint_multiplicities':dict(collections.Counter(len(v) for v in endpoint_groups.values())),'unmatched_endpoint_count':len(endpoint_rows),'unmatched_classification_count':dict(collections.Counter(x['classification'] for x in endpoint_rows)),'all_geometry_pieces_covered_once':True,'all_17_endpoints_classified':True,'geometry_raw_source_sha256':hashlib.sha256((S/'railway_alignment.json').read_bytes()).hexdigest(),'source_not_modified':True,'none_of_these_connections_is_certified':True,'conditional_skeleton':skeleton}
(O/'validation-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2));print('ROUTES',json.dumps({k:{'length':v['sum_of_exported_lengths_mm'],'gaps':v['noncoincident_joins']} for k,v in checks.items()},indent=2))
