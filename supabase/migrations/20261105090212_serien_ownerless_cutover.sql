-- 6A.10 isolated proposal only. No production/staging application authorized.
-- D10: preserve every historical row and both generated ownership domains.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
-- CUTOVER STEP 01: freeze and fail-closed inventory assertions.
LOCK TABLE public.stock_items,public.consists,public.consist_members,public.layouts,
 public.layout_placements,public.loose_stock_placements,public.layout_snapshots,
 public.operation_receipts IN ACCESS EXCLUSIVE MODE;
DO $$
DECLARE t text; rel oid; n integer;
BEGIN
 SELECT count(*) INTO n FROM pg_constraint WHERE contype='f' AND confrelid='auth.users'::regclass;
 IF n<>8 THEN RAISE EXCEPTION 'OWNERLESS_AUTH_DEPENDENCY_DRIFT'; END IF;
 FOREACH t IN ARRAY ARRAY['stock_items','consists','consist_members','layouts','layout_placements','loose_stock_placements','layout_snapshots','operation_receipts'] LOOP
  rel:=to_regclass('public.'||t);
  IF (SELECT count(*) FROM pg_constraint WHERE conrelid=rel AND contype='f' AND confrelid='auth.users'::regclass AND confdeltype='c' AND convalidated AND conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid=rel AND attname='owner_id')])<>1 THEN RAISE EXCEPTION 'OWNERLESS_AUTH_DEPENDENCY_DRIFT: %',t; END IF;
  IF NOT EXISTS(SELECT FROM pg_attribute WHERE attrelid=rel AND attname='ownership_key' AND attgenerated='s') THEN RAISE EXCEPTION 'OWNERLESS_DOMAIN_DRIFT: %',t; END IF;
 END LOOP;
 IF (SELECT count(*) FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace AND pg_get_constraintdef(oid) LIKE '%ownership_key)%' AND convalidated)<>7 THEN RAISE EXCEPTION 'OWNERLESS_DOMAIN_FK_DRIFT'; END IF;
 IF EXISTS(SELECT FROM public.stock_items WHERE inventory_code IS NOT NULL GROUP BY ownership_key,inventory_code HAVING count(*)>1) THEN RAISE EXCEPTION 'OWNERLESS_DUPLICATE_INVENTORY'; END IF;
END $$;
-- CUTOVER STEP 02: minimal provenance ledger, never an account or authorization table.
CREATE TABLE serien_capability.legacy_owners (
 id uuid PRIMARY KEY,
 recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
 manifest_version text NOT NULL DEFAULT '6A10' CHECK(manifest_version='6A10')
);
ALTER TABLE serien_capability.legacy_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE serien_capability.legacy_owners FORCE ROW LEVEL SECURITY;
REVOKE ALL ON serien_capability.legacy_owners FROM PUBLIC,anon,authenticated,serien_tm_worker,serien_tm_executor,serien_tm_control,serien_tm_redeemer,serien_tm_provisioner;
-- CUTOVER STEP 03: verify every copied identifier against existing Auth before detach.
DO $$DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['stock_items','consists','consist_members','layouts','layout_placements','loose_stock_placements','layout_snapshots','operation_receipts'] LOOP
  EXECUTE format('INSERT INTO serien_capability.legacy_owners(id) SELECT DISTINCT owner_id FROM public.%I WHERE owner_id IS NOT NULL ON CONFLICT DO NOTHING',t);
 END LOOP;
 IF EXISTS(SELECT FROM serien_capability.legacy_owners o LEFT JOIN auth.users a ON a.id=o.id WHERE a.id IS NULL) THEN RAISE EXCEPTION 'OWNERLESS_UNVERIFIED_PROVENANCE'; END IF;
END $$;
-- CUTOVER STEP 04: validate replacement references BEFORE removing Auth references.
DO $$DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['stock_items','consists','consist_members','layouts','layout_placements','loose_stock_placements','layout_snapshots','operation_receipts'] LOOP
  EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY(owner_id) REFERENCES serien_capability.legacy_owners(id) ON DELETE RESTRICT NOT VALID',t,t||'_legacy_owner_fkey');
  EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I',t,t||'_legacy_owner_fkey');
 END LOOP;
END $$;
-- CUTOVER STEP 05: detach only the eight inventoried Auth cascades, no CASCADE DDL.
DO $$DECLARE r record; BEGIN
 FOR r IN SELECT conrelid::regclass AS rel,conname FROM pg_constraint WHERE contype='f' AND confrelid='auth.users'::regclass LOOP
  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',r.rel,r.conname);
 END LOOP;
END $$;
-- CUTOVER STEP 06: nullable provenance, total non-null GENERATED domain.
DO $$DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['stock_items','consists','consist_members','layouts','layout_placements','loose_stock_placements','layout_snapshots','operation_receipts'] LOOP
  EXECUTE format('ALTER TABLE public.%I ALTER COLUMN owner_id DROP DEFAULT, ALTER COLUMN owner_id DROP NOT NULL, ALTER COLUMN ownership_key SET NOT NULL, ADD CONSTRAINT %I CHECK(owner_id IS NOT NULL OR workspace_id IS NOT NULL)',t,t||'_ownership_total');
 END LOOP;
END $$;
-- CUTOVER STEP 07: inventory uniqueness follows domain, including independent workspaces.
CREATE UNIQUE INDEX stock_items_domain_inventory ON public.stock_items(ownership_key,inventory_code) WHERE inventory_code IS NOT NULL;
ALTER TABLE public.stock_items DROP CONSTRAINT stock_items_owner_id_inventory_code_key;
-- CUTOVER STEP 08: retire Auth policies; keep all existing device/executor RLS and ACL.
DROP POLICY stock_models_signed_in_read ON public.stock_models;
DROP POLICY stock_items_owner_select ON public.stock_items;
DROP POLICY stock_items_owner_insert ON public.stock_items;
DROP POLICY stock_items_owner_update ON public.stock_items;
DROP POLICY stock_items_owner_delete ON public.stock_items;
DROP POLICY consists_owner_all ON public.consists;
DROP POLICY consist_members_owner_all ON public.consist_members;
DROP POLICY layouts_owner_all ON public.layouts;
DROP POLICY segments_owner_all ON public.layout_segments;
DROP POLICY placements_owner_all ON public.layout_placements;
DROP POLICY loose_owner_all ON public.loose_stock_placements;
DROP POLICY snapshots_owner_all ON public.layout_snapshots;
DROP POLICY receipts_owner_all ON public.operation_receipts;
REVOKE ALL ON public.stock_models,public.stock_items,public.consists,public.consist_members,public.layouts,public.layout_segments,public.layout_placements,public.loose_stock_placements,public.layout_snapshots,public.operation_receipts FROM PUBLIC,anon,authenticated;
-- CUTOVER STEP 09: identity/domain guard for mutable rows. Immutable archives stay untouched.
CREATE FUNCTION serien_capability.keep_ownership_identity() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE k text;
BEGIN
 IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id THEN RAISE EXCEPTION 'OWNERSHIP_IDENTITY_IMMUTABLE' USING ERRCODE='23514'; END IF;
 FOREACH k IN ARRAY TG_ARGV LOOP
  IF to_jsonb(NEW)->k IS DISTINCT FROM to_jsonb(OLD)->k THEN RAISE EXCEPTION 'OWNERSHIP_IDENTITY_IMMUTABLE' USING ERRCODE='23514'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION serien_capability.keep_ownership_identity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER keep_ownership_identity BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION serien_capability.keep_ownership_identity('id');
CREATE TRIGGER keep_ownership_identity BEFORE UPDATE ON public.consists FOR EACH ROW EXECUTE FUNCTION serien_capability.keep_ownership_identity('id');
CREATE TRIGGER keep_ownership_identity BEFORE UPDATE ON public.consist_members FOR EACH ROW EXECUTE FUNCTION serien_capability.keep_ownership_identity('consist_id','stock_item_id');
CREATE TRIGGER keep_ownership_identity BEFORE UPDATE ON public.layouts FOR EACH ROW EXECUTE FUNCTION serien_capability.keep_ownership_identity('id');
CREATE TRIGGER keep_ownership_identity BEFORE UPDATE ON public.layout_placements FOR EACH ROW EXECUTE FUNCTION serien_capability.keep_ownership_identity('consist_id');
CREATE TRIGGER keep_ownership_identity BEFORE UPDATE ON public.loose_stock_placements FOR EACH ROW EXECUTE FUNCTION serien_capability.keep_ownership_identity('stock_item_id');
CREATE FUNCTION serien_capability.require_ownerless_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NEW.workspace_id IS NOT NULL AND NEW.owner_id IS NOT NULL THEN RAISE EXCEPTION 'NEW_WORKSPACE_ROW_REQUIRES_NULL_OWNER' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION serien_capability.require_ownerless_insert() FROM PUBLIC,anon,authenticated;
DO $$DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['stock_items','consists','consist_members','layouts','layout_placements','loose_stock_placements','layout_snapshots','operation_receipts'] LOOP
  EXECUTE format('CREATE TRIGGER require_ownerless_insert BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION serien_capability.require_ownerless_insert()',t);
 END LOOP;
END $$;
-- CUTOVER STEP 10: separate operator identity and limited non-owner, non-bypass executor.
CREATE ROLE serien_tm_workspace_operator NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB;
CREATE ROLE serien_tm_workspace_executor NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB;
CREATE TABLE serien_capability.workspace_creation_jobs (
 id uuid PRIMARY KEY,
 operator_role name NOT NULL,
 workspace_id uuid NOT NULL UNIQUE,
 layout_id uuid NOT NULL UNIQUE,
 source_workspace_id uuid NOT NULL,
 source_layout_id uuid NOT NULL,
 audience text NOT NULL CHECK(length(audience) BETWEEN 10 AND 256),
 approved boolean NOT NULL DEFAULT false,
 completed_at timestamptz,
 template jsonb,
 CHECK((completed_at IS NULL)=(template IS NULL)),
 FOREIGN KEY(source_workspace_id,source_layout_id) REFERENCES serien_capability.candidate_profiles(workspace_id,layout_id)
);
ALTER TABLE serien_capability.workspace_creation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE serien_capability.workspace_creation_jobs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON serien_capability.workspace_creation_jobs FROM PUBLIC,anon,authenticated,serien_tm_worker,serien_tm_control,serien_tm_redeemer,serien_tm_provisioner,serien_tm_workspace_operator;
GRANT USAGE ON SCHEMA serien_capability TO serien_tm_workspace_operator;
GRANT USAGE ON SCHEMA public,serien_internal,serien_capability TO serien_tm_workspace_executor;
GRANT SELECT ON serien_capability.workspace_creation_jobs TO serien_tm_workspace_executor;
GRANT UPDATE(completed_at,template) ON serien_capability.workspace_creation_jobs TO serien_tm_workspace_executor;
CREATE POLICY creation_job_identity ON serien_capability.workspace_creation_jobs TO serien_tm_workspace_executor
 USING(operator_role=session_user) WITH CHECK(operator_role=session_user);
-- CUTOVER STEP 11: job-bound RLS; executor has no generic workspace/catalog authority.
DO $$DECLARE t text; col text; BEGIN
 FOREACH t IN ARRAY ARRAY['workspaces','workspace_locks','api_limits','lifecycle_limits','nonce_limits','session_heads'] LOOP
  col:=CASE WHEN t='workspaces' THEN 'id' ELSE 'workspace_id' END;
  EXECUTE format('GRANT SELECT,INSERT ON serien_capability.%I TO serien_tm_workspace_executor',t);
  EXECUTE format('CREATE POLICY creation_target ON serien_capability.%I TO serien_tm_workspace_executor USING(%I IN(SELECT workspace_id FROM serien_capability.workspace_creation_jobs WHERE operator_role=session_user AND approved AND completed_at IS NULL)) WITH CHECK(%I IN(SELECT workspace_id FROM serien_capability.workspace_creation_jobs WHERE operator_role=session_user AND approved AND completed_at IS NULL))',t,col,col);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['stock_items','consists','consist_members','layouts','layout_placements','loose_stock_placements'] LOOP
  EXECUTE format('GRANT SELECT,INSERT ON public.%I TO serien_tm_workspace_executor',t);
  EXECUTE format('CREATE POLICY creation_target ON public.%I TO serien_tm_workspace_executor USING(owner_id IS NULL AND workspace_id IN(SELECT workspace_id FROM serien_capability.workspace_creation_jobs WHERE operator_role=session_user AND approved AND completed_at IS NULL)) WITH CHECK(owner_id IS NULL AND workspace_id IN(SELECT workspace_id FROM serien_capability.workspace_creation_jobs WHERE operator_role=session_user AND approved AND completed_at IS NULL))',t);
 END LOOP;
END $$;
GRANT UPDATE(status) ON public.consists TO serien_tm_workspace_executor;
GRANT UPDATE(id) ON public.stock_items TO serien_tm_workspace_executor;
GRANT SELECT,INSERT ON public.layout_segments,serien_capability.candidate_profiles TO serien_tm_workspace_executor;
CREATE POLICY creation_segments_read ON public.layout_segments FOR SELECT TO serien_tm_workspace_executor
 USING(layout_id IN(SELECT source_layout_id FROM serien_capability.workspace_creation_jobs WHERE operator_role=session_user AND approved UNION SELECT layout_id FROM serien_capability.workspace_creation_jobs WHERE operator_role=session_user AND approved AND completed_at IS NULL));
CREATE POLICY creation_segments_insert ON public.layout_segments FOR INSERT TO serien_tm_workspace_executor
 WITH CHECK(layout_id IN(SELECT layout_id FROM serien_capability.workspace_creation_jobs WHERE operator_role=session_user AND approved AND completed_at IS NULL));
CREATE POLICY creation_profile_read ON serien_capability.candidate_profiles FOR SELECT TO serien_tm_workspace_executor
 USING((workspace_id,layout_id) IN(SELECT source_workspace_id,source_layout_id FROM serien_capability.workspace_creation_jobs WHERE operator_role=session_user AND approved UNION SELECT workspace_id,layout_id FROM serien_capability.workspace_creation_jobs WHERE operator_role=session_user AND approved AND completed_at IS NULL));
CREATE POLICY creation_profile_insert ON serien_capability.candidate_profiles FOR INSERT TO serien_tm_workspace_executor
 WITH CHECK((workspace_id,layout_id) IN(SELECT workspace_id,layout_id FROM serien_capability.workspace_creation_jobs WHERE operator_role=session_user AND approved AND completed_at IS NULL));
GRANT SELECT ON public.stock_models TO serien_tm_workspace_executor;
CREATE POLICY creation_catalog_read ON public.stock_models FOR SELECT TO serien_tm_workspace_executor
 USING(EXISTS(SELECT FROM serien_capability.workspace_creation_jobs WHERE operator_role=session_user AND approved));
GRANT EXECUTE ON FUNCTION serien_internal.assert_ready_consist(uuid) TO serien_tm_workspace_executor;
-- CUTOVER STEP 12: private closed-profile creator, accepts only a preapproved job ID.
CREATE FUNCTION serien_capability.create_ownerless_workspace(job uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j serien_capability.workspace_creation_jobs%ROWTYPE; p jsonb; i0 uuid:=gen_random_uuid(); i1 uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); result jsonb;
BEGIN
 IF NOT pg_has_role(session_user,'serien_tm_workspace_operator','MEMBER') OR EXISTS(SELECT FROM pg_roles WHERE rolname=session_user AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb)) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT * INTO j FROM serien_capability.workspace_creation_jobs WHERE id=job AND operator_role=session_user FOR UPDATE;
 IF j.id IS NULL OR NOT j.approved THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF j.completed_at IS NOT NULL THEN RETURN jsonb_build_object('workspaceId',j.workspace_id,'layoutId',j.layout_id,'revision','0','profile',j.template); END IF;
 SELECT template INTO p FROM serien_capability.candidate_profiles WHERE workspace_id=j.source_workspace_id AND layout_id=j.source_layout_id;
 IF p IS NULL OR p->>'topologyHash' IS DISTINCT FROM 'e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc' OR p->>'resumePolicy' IS DISTINCT FROM 'STOPPED'
  OR jsonb_array_length(p->'models')<>2 OR jsonb_array_length(p->'items')<>2 OR jsonb_array_length(p->'consists')<>1 OR jsonb_array_length(p->'trains')<>1 OR jsonb_array_length(p->'looseStock')<>1
  OR p#>>'{models,0,kind}' IS DISTINCT FROM 'locomotive' OR p#>>'{models,1,kind}' IS DISTINCT FROM 'wagon'
  OR p#>>'{trains,0,location,edge}' IS DISTINCT FROM 'T47' OR p#>>'{looseStock,0,location,edge}' IS DISTINCT FROM 'T47'
  OR NOT EXISTS(SELECT FROM public.layout_segments WHERE layout_id=j.source_layout_id AND edge_id='T47' AND length_mm=248) THEN RAISE EXCEPTION 'INVALID_STATE_PROFILE'; END IF;
 -- UUID remapping only inside an already operator-certified closed profile; no general serializer.
 p:=replace(replace(replace(p::text,to_jsonb(p#>>'{items,0,id}')::text,to_jsonb(i0::text)::text),to_jsonb(p#>>'{items,1,id}')::text,to_jsonb(i1::text)::text),to_jsonb(p#>>'{consists,0,id}')::text,to_jsonb(c::text)::text)::jsonb;
 p:=jsonb_set(jsonb_set(jsonb_set(p,'{workspaceId}',to_jsonb(j.workspace_id::text)),'{layoutId}',to_jsonb(j.layout_id::text)),'{stateId}',to_jsonb(gen_random_uuid()::text));
 INSERT INTO serien_capability.workspaces(id) VALUES(j.workspace_id);
 INSERT INTO serien_capability.workspace_locks(workspace_id) VALUES(j.workspace_id);
 INSERT INTO serien_capability.api_limits(workspace_id) VALUES(j.workspace_id);
 INSERT INTO serien_capability.lifecycle_limits(workspace_id) VALUES(j.workspace_id);
 INSERT INTO serien_capability.nonce_limits(workspace_id,audience) VALUES(j.workspace_id,j.audience);
 INSERT INTO public.layouts(id,workspace_id,owner_id,name,topology_hash) VALUES(j.layout_id,j.workspace_id,NULL,'closed ownerless fixture',p->>'topologyHash');
 INSERT INTO public.layout_segments(layout_id,edge_id,length_mm) VALUES(j.layout_id,'T47',248);
 INSERT INTO public.stock_items(id,workspace_id,owner_id,model_id,display_name) VALUES(i0,j.workspace_id,NULL,(p#>>'{items,0,modelId}')::uuid,'fixture'),(i1,j.workspace_id,NULL,(p#>>'{items,1,modelId}')::uuid,'fixture');
 INSERT INTO public.consists(id,workspace_id,owner_id,name) VALUES(c,j.workspace_id,NULL,'fixture');
 INSERT INTO public.consist_members(consist_id,stock_item_id,workspace_id,owner_id,ordinal) VALUES(c,i0,j.workspace_id,NULL,0);
 UPDATE public.consists SET status='ready' WHERE id=c AND workspace_id=j.workspace_id;
 INSERT INTO public.layout_placements(consist_id,workspace_id,owner_id,layout_id,edge_id,s_mm,heading,journey_state) VALUES(c,j.workspace_id,NULL,j.layout_id,'T47',(p#>>'{trains,0,location,s}')::numeric,(p#>>'{trains,0,location,heading}')::smallint,p#>'{trains,0,journey}');
 INSERT INTO public.loose_stock_placements(stock_item_id,workspace_id,owner_id,layout_id,edge_id,s_mm,heading,journey_state,state_version) VALUES(i1,j.workspace_id,NULL,j.layout_id,'T47',(p#>>'{looseStock,0,location,s}')::numeric,(p#>>'{looseStock,0,location,heading}')::smallint,p#>'{looseStock,0,journey}',0);
 INSERT INTO serien_capability.session_heads(workspace_id,layout_id) VALUES(j.workspace_id,j.layout_id);
 INSERT INTO serien_capability.candidate_profiles(workspace_id,layout_id,template) VALUES(j.workspace_id,j.layout_id,p);
 SET CONSTRAINTS ALL IMMEDIATE;
 UPDATE serien_capability.workspace_creation_jobs SET completed_at=clock_timestamp(),template=p WHERE id=job;
 RETURN jsonb_build_object('workspaceId',j.workspace_id,'layoutId',j.layout_id,'revision','0','profile',p);
END $$;
REVOKE ALL ON FUNCTION serien_capability.create_ownerless_workspace(uuid) FROM PUBLIC,anon,authenticated,serien_tm_worker,serien_tm_control,serien_tm_redeemer,serien_tm_provisioner;
ALTER FUNCTION serien_capability.create_ownerless_workspace(uuid) OWNER TO serien_tm_workspace_executor;
GRANT EXECUTE ON FUNCTION serien_capability.create_ownerless_workspace(uuid) TO serien_tm_workspace_operator;
-- Same restricted 6A.5 API/validator/CAS/receipt code, only new-row provenance changes.
-- CREATE OR REPLACE retains its limited owner and existing ACL.
CREATE OR REPLACE FUNCTION serien_capability.save_checkpoint(p_request uuid,p_wire text,p_digest text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e jsonb; w uuid; l uuid; d uuid; own uuid; h serien_capability.session_heads%ROWTYPE;
 r public.operation_receipts%ROWTYPE; tpl jsonb; candidate jsonb; normalized jsonb; source public.layout_snapshots%ROWTYPE;
 sid uuid:=gen_random_uuid(); rev bigint; result jsonb; act text; auth jsonb; lim serien_capability.api_limits%ROWTYPE;
BEGIN
 IF p_wire IS NULL OR octet_length(p_wire)>2097152 THEN RAISE EXCEPTION 'PAYLOAD_TOO_LARGE'; END IF;
 e:=p_wire::jsonb;
 IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(e) k) IS DISTINCT FROM ARRAY['expectedRevision','layoutId','operation','recoverySourceRevision','state','workspaceId']::text[] THEN RAISE EXCEPTION 'INVALID_ENVELOPE'; END IF;
 w:=(e->>'workspaceId')::uuid; l:=(e->>'layoutId')::uuid;
 d:=serien_capability.authorize(w,l,true);
 PERFORM serien_capability.consume_budget(w,d);
 IF p_request IS NULL OR p_digest IS NULL OR p_digest IS DISTINCT FROM serien_capability.state_hash(e) OR p_wire IS DISTINCT FROM serien_capability.profile_canonical_v1(e) THEN RAISE EXCEPTION 'DIGEST_OR_CANONICAL_MISMATCH'; END IF;
 SELECT * INTO h FROM serien_capability.session_heads WHERE workspace_id=w AND layout_id=l FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT * INTO r FROM public.operation_receipts WHERE workspace_id=w AND request_id=p_request;
 IF FOUND THEN
 IF r.payload_digest<>p_digest OR r.result->>'actor' IS DISTINCT FROM d::text OR r.request_context IS DISTINCT FROM e-'state' THEN RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED'; END IF;
 RETURN serien_capability.bounded_response(w,serien_capability.receipt_response(r));
 END IF;
 IF jsonb_typeof(e->'expectedRevision') IS DISTINCT FROM 'string' OR coalesce(e->>'expectedRevision','') !~ '^(0|[1-9][0-9]*)$' THEN RAISE EXCEPTION 'INVALID_ENVELOPE'; END IF;
 IF (e->>'expectedRevision')::bigint<>h.revision THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
 act:=e->>'operation';
 IF act NOT IN('SaveCheckpoint','RecoverRevision') OR act IS NULL THEN RAISE EXCEPTION 'INVALID_OPERATION'; END IF;
 IF act='SaveCheckpoint' AND e->'recoverySourceRevision' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'INVALID_RECOVERY'; END IF;
 IF act='RecoverRevision' THEN
 IF jsonb_typeof(e->'recoverySourceRevision') IS DISTINCT FROM 'string' OR coalesce(e->>'recoverySourceRevision','') !~ '^[1-9][0-9]*$' THEN RAISE EXCEPTION 'INVALID_RECOVERY'; END IF;
 source:=serien_capability.verify_snapshot(w,l,(e->>'recoverySourceRevision')::bigint);
 IF source.payload IS DISTINCT FROM e->'state' THEN RAISE EXCEPTION 'INVALID_RECOVERY'; END IF;
 END IF;
 SELECT template INTO tpl FROM serien_capability.candidate_profiles WHERE workspace_id=w AND layout_id=l;
 candidate:=e->'state';
 IF candidate->>'workspaceId' IS DISTINCT FROM w::text OR candidate->>'layoutId' IS DISTINCT FROM l::text THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 normalized:=jsonb_set(jsonb_set(jsonb_set(candidate,'{stateId}',tpl->'stateId'),'{ui,day}',tpl#>'{ui,day}'),'{layout,switches}',tpl#>'{layout,switches}');
 IF tpl IS NULL OR normalized IS DISTINCT FROM tpl OR coalesce(candidate->>'stateId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR NOT coalesce(candidate#>'{ui,day}' IN ('0'::jsonb,'1'::jsonb),false) THEN RAISE EXCEPTION 'INVALID_STATE_PROFILE'; END IF;
 SELECT * INTO lim FROM serien_capability.api_limits WHERE workspace_id=w;
 IF (SELECT count(*) FROM public.layout_snapshots WHERE workspace_id=w)>=lim.max_checkpoints THEN RAISE EXCEPTION 'QUOTA_EXCEEDED'; END IF;
 own:=NULL; -- 6A.10: provenance is historical; every new workspace checkpoint is ownerless.
 SELECT jsonb_build_object('deviceEpoch',device_epoch::text,'workspaceEpoch',workspace_epoch::text,'keyVersion',key_version) INTO auth FROM serien_capability.device_bindings WHERE role_name=session_user;
 rev:=h.revision+1;
 INSERT INTO public.layout_snapshots(id,owner_id,workspace_id,layout_id,revision,payload,payload_digest,state_digest,canonical_version,engine_revision,topology_hash,asset_refs) VALUES(sid,own,w,l,rev,candidate,p_digest,serien_capability.state_hash(candidate),'jcs-profile-v1',candidate->>'engineRevision',candidate->>'topologyHash',serien_capability.manifest_refs(candidate));
 UPDATE public.layout_placements SET state_version=rev WHERE workspace_id=w AND layout_id=l;
 UPDATE public.loose_stock_placements SET state_version=rev WHERE workspace_id=w AND layout_id=l;
 UPDATE serien_capability.session_heads SET revision=rev,snapshot_id=sid,receipt_request_id=p_request,payload_digest=p_digest WHERE workspace_id=w AND layout_id=l AND revision=h.revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
 result:=jsonb_build_object('receiptVersion',2,'request_id',p_request,'revision',rev::text,'snapshotId',sid,'digest',p_digest,'stateDigest',serien_capability.state_hash(candidate),'canonicalVersion','jcs-profile-v1','committedAt',clock_timestamp(),'actor',d,'workspaceId',w,'layoutId',l,'expectedRevision',e->'expectedRevision','operation',act,'recoverySourceRevision',e->'recoverySourceRevision','schemaVersion',1,'auth',auth);
 INSERT INTO public.operation_receipts(owner_id,workspace_id,request_id,op_type,payload_digest,result,layout_id,snapshot_id,revision,request_context,receipt_version,auth_context) VALUES(own,w,p_request,act,p_digest,result,l,sid,rev,e-'state',2,auth);
 IF serien_capability.storage_usage(w)>lim.max_storage_bytes THEN RAISE EXCEPTION 'QUOTA_EXCEEDED'; END IF;
 INSERT INTO serien_capability.audit_events(workspace_id,device_id,event,request_id,revision) VALUES(w,d,act,p_request,rev);
 SET CONSTRAINTS ALL IMMEDIATE;
 RETURN serien_capability.bounded_response(w,result);
END $$;
-- CUTOVER STEP 13: no residual Auth FK/default/policy or NULL domain may survive.
DO $$DECLARE t text; BEGIN
 IF EXISTS(SELECT FROM pg_constraint WHERE contype='f' AND confrelid='auth.users'::regclass AND connamespace IN('public'::regnamespace,'serien_capability'::regnamespace)) THEN RAISE EXCEPTION 'OWNERLESS_AUTH_EDGE_REMAINS'; END IF;
 IF EXISTS(SELECT FROM pg_policies WHERE schemaname='public' AND (roles && ARRAY['anon','authenticated']::name[] OR coalesce(qual,'') LIKE '%auth.uid%' OR coalesce(with_check,'') LIKE '%auth.uid%')) THEN RAISE EXCEPTION 'OWNERLESS_AUTH_POLICY_REMAINS'; END IF;
 FOREACH t IN ARRAY ARRAY['stock_items','consists','consist_members','layouts','layout_placements','loose_stock_placements','layout_snapshots','operation_receipts'] LOOP
  IF EXISTS(SELECT FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=to_regclass('public.'||t) AND a.attname='owner_id' AND (a.attnotnull OR d.oid IS NOT NULL)) THEN RAISE EXCEPTION 'OWNERLESS_OWNER_STILL_REQUIRED: %',t; END IF;
 END LOOP;
END $$;
-- CUTOVER STEP 14: all DDL/data validation completed; historical rows never mutated.
COMMIT;
