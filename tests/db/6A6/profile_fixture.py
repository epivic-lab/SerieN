"""Approved 6A.5 synthetic graph, copied without extending its state domain."""
import copy,json

def install(sql,uid,state,validator,A,B,L,LB,quote):
  for w,l,offset in [(A,L,100),(B,LB,200)]:
   s=state(w,l)
   # Remap model/item/consist identifiers to independent fixture graph; train identity stays DTO-only.
   mapping={s['models'][0]['id']:uid(offset),s['items'][0]['id']:uid(offset+1),s['consists'][0]['id']:uid(offset+2)}
   text=json.dumps(s)
   for old,new in mapping.items():text=text.replace(old,new)
   s=json.loads(text)
   s['models']=s['models'][:1];s['items']=s['items'][:1];s['looseStock']=[]
   wagon=copy.deepcopy(s['models'][0]);wagon.update(id=uid(offset+3),runtimeKey='closed',kind='wagon')
   wagon['couplers']['front']['x']=10;wagon['couplers']['back']['x']=-10
   wi=copy.deepcopy(s['items'][0]);wi.update(id=uid(offset+4),modelId=wagon['id'],nativeModelId=wagon['id'],nativeKind='closed')
   s['models'].append(wagon);s['items'].append(wi)
   loose=dict(itemId=wi['id'],journey=dict(segments=copy.deepcopy(s['trains'][0]['journey']['segments']),position=220,travel=0,lastBlock=None),location=dict(edge='T47',s=220,heading=1),animationDistanceMm=0)
   s['looseStock'].append(loose);validator.validate(s)
   sql(f"insert into public.stock_models(id,kind,name,metadata) values('{uid(offset)}','locomotive','synthetic profile',{quote(json.dumps(s['models'][0]))}); insert into public.stock_items(id,owner_id,workspace_id,model_id,display_name) values('{uid(offset+1)}','{uid(0)}','{w}','{uid(offset)}','fixture');".replace(uid(0),'00000000-0000-4000-8000-000000000001'))
   owner='00000000-0000-4000-8000-000000000001'
   sql(f"insert into public.layouts(id,owner_id,workspace_id,name,topology_hash) values('{l}','{owner}','{w}','fixture','{s['topologyHash']}'); insert into public.layout_segments values('{l}','T47',248,'{{}}'); insert into public.consists(id,owner_id,workspace_id,name) values('{uid(offset+2)}','{owner}','{w}','fixture'); insert into public.consist_members(consist_id,stock_item_id,owner_id,workspace_id,ordinal) values('{uid(offset+2)}','{uid(offset+1)}','{owner}','{w}',0); update public.consists set status='ready' where id='{uid(offset+2)}'; insert into public.layout_placements(consist_id,owner_id,workspace_id,layout_id,edge_id,s_mm,heading,journey_state) values('{uid(offset+2)}','{owner}','{w}','{l}','T47',120,1,{quote(json.dumps(s['trains'][0]['journey']))}); insert into serien_capability.session_heads(workspace_id,layout_id) values('{w}','{l}'); insert into serien_capability.candidate_profiles values('{w}','{l}',{quote(json.dumps(s))});")
   sql(f"insert into public.stock_models(id,kind,name,metadata) values('{wagon['id']}','wagon','synthetic loose',{quote(json.dumps(wagon))}); insert into public.stock_items(id,owner_id,workspace_id,model_id,display_name) values('{wi['id']}','{owner}','{w}','{wagon['id']}','fixture'); insert into public.loose_stock_placements(stock_item_id,owner_id,workspace_id,layout_id,edge_id,s_mm,heading,journey_state,state_version) values('{wi['id']}','{owner}','{w}','{l}','T47',220,1,{quote(json.dumps(loose['journey']))},0);")
   if w==A:BASE=s
