-- 6A.5 isolated proposal only. Never apply to real Supabase without separate authorization.
BEGIN;
-- C1: SQL logins keep USAGE/EXECUTE only. No alternative direct application read path.
REVOKE ALL ON ALL TABLES IN SCHEMA public,serien_capability FROM serien_tm_worker;
-- Also remove explicit grants, including column grants, on already provisioned logins.
-- Reject extra inherited roles/ownership rather than claiming a grant revocation is sufficient.
DO $$DECLARE worker record; tab record; columns text; BEGIN
 FOR worker IN SELECT r.* FROM pg_roles r JOIN serien_capability.worker_bindings b ON b.role_name=r.rolname LOOP
 IF worker.rolsuper OR worker.rolbypassrls OR worker.rolcreaterole OR worker.rolcreatedb OR worker.rolreplication OR EXISTS(SELECT FROM pg_auth_members m WHERE m.member=worker.oid AND m.roleid<>'serien_tm_worker'::regrole) OR EXISTS(SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','serien_capability') AND pg_has_role(worker.oid,c.relowner,'MEMBER')) THEN RAISE EXCEPTION 'UNSAFE_WORKER_BINDING'; END IF;
 END LOOP;
 FOR worker IN SELECT role_name FROM serien_capability.worker_bindings UNION SELECT 'serien_tm_worker'::name LOOP
 FOR tab IN SELECT n.nspname,c.relname,c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','serien_capability') AND c.relkind='r' LOOP
 EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM %I',tab.nspname,tab.relname,worker.role_name);
 SELECT string_agg(quote_ident(attname),',') INTO columns FROM pg_attribute WHERE attrelid=tab.oid AND attnum>0 AND NOT attisdropped;
 EXECUTE format('REVOKE ALL (%s) ON TABLE %I.%I FROM %I',columns,tab.nspname,tab.relname,worker.role_name);
 END LOOP;
 END LOOP;
END $$;

ALTER TABLE serien_capability.device_bindings
 ADD COLUMN device_epoch bigint NOT NULL DEFAULT 1,
 ADD COLUMN workspace_epoch bigint NOT NULL DEFAULT 1,
 ADD COLUMN key_version integer NOT NULL DEFAULT 1;
UPDATE serien_capability.device_bindings b SET device_epoch=d.epoch,key_version=d.key_version,workspace_epoch=w.auth_epoch
 FROM serien_capability.devices d,serien_capability.workspaces w WHERE b.device_id=d.id AND b.workspace_id=w.id;
-- C3: retain all values and legacy uniqueness; independent workspace request domains.
ALTER TABLE public.operation_receipts ADD COLUMN receipt_id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.operation_receipts DROP CONSTRAINT operation_receipts_pkey;
ALTER TABLE public.operation_receipts ADD PRIMARY KEY(receipt_id);
CREATE UNIQUE INDEX receipts_legacy_request ON public.operation_receipts(owner_id,request_id) WHERE workspace_id IS NULL;
ALTER TABLE public.operation_receipts ADD COLUMN request_context jsonb, ADD COLUMN receipt_version integer;
ALTER TABLE public.layout_snapshots ADD COLUMN state_digest text CHECK(state_digest ~ '^[0-9a-f]{64}$'),
 ADD COLUMN canonical_version text, ADD COLUMN engine_revision text, ADD COLUMN topology_hash text,
 ADD COLUMN asset_refs jsonb;

-- Exact JCS reconstruction for the existing closed ASCII-key DTO profile, not general JSON.
-- Numbers outside the profile's ordinary decimal domain are rejected, never silently formatted.
CREATE FUNCTION serien_capability.profile_canonical_v1(v jsonb) RETURNS text
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE typ text:=jsonb_typeof(v); result text; n numeric;
BEGIN
 IF typ='object' THEN
 IF EXISTS(SELECT FROM jsonb_object_keys(v) k WHERE k !~ '^[A-Za-z][A-Za-z0-9_-]*$') THEN RAISE EXCEPTION 'CANONICAL_PROFILE_KEY'; END IF;
 SELECT '{'||coalesce(string_agg(to_jsonb(k)::text||':'||serien_capability.profile_canonical_v1(val),',' ORDER BY k COLLATE "C"),'')||'}' INTO result FROM jsonb_each(v) e(k,val); RETURN result;
 ELSIF typ='array' THEN
 SELECT '['||coalesce(string_agg(serien_capability.profile_canonical_v1(val),',' ORDER BY ord),'')||']' INTO result FROM jsonb_array_elements(v) WITH ORDINALITY e(val,ord); RETURN result;
 ELSIF typ='number' THEN
 n:=v::text::numeric;
 IF n<>0 AND (abs(n)<0.000001 OR abs(n)>=1000000000000000000000) THEN RAISE EXCEPTION 'CANONICAL_PROFILE_NUMBER'; END IF;
 result:=v::text;
 IF position('.' in result)>0 THEN result:=rtrim(rtrim(result,'0'),'.'); END IF;
 RETURN result;
 ELSIF typ IN('string','boolean','null') THEN RETURN v::text;
 ELSE RAISE EXCEPTION 'CANONICAL_PROFILE_TYPE'; END IF;
END $$;
CREATE FUNCTION serien_capability.state_hash(v jsonb) RETURNS text
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$ SELECT encode(sha256(convert_to(serien_capability.profile_canonical_v1(v),'UTF8')),'hex') $$;
CREATE FUNCTION serien_capability.manifest_refs(v jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('modelId',m->'id','revision',m->'revision','asset',m->'asset') ORDER BY ord),'[]'::jsonb)
 FROM jsonb_array_elements(v->'models') WITH ORDINALITY e(m,ord)
$$;
REVOKE ALL ON FUNCTION serien_capability.profile_canonical_v1(jsonb),serien_capability.state_hash(jsonb),serien_capability.manifest_refs(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION serien_capability.profile_canonical_v1(jsonb),serien_capability.state_hash(jsonb),serien_capability.manifest_refs(jsonb) TO serien_tm_executor;
-- Refuse ambiguous/corrupt old data rather than manufacture integrity evidence.
DO $$BEGIN
 IF EXISTS(SELECT FROM public.layout_snapshots s LEFT JOIN public.operation_receipts r ON r.workspace_id=s.workspace_id AND r.snapshot_id=s.id
 WHERE s.workspace_id IS NOT NULL AND (r.request_id IS NULL OR r.result->>'digest' IS DISTINCT FROM s.payload_digest OR r.result->>'revision' IS DISTINCT FROM s.revision::text OR r.result->>'snapshotId' IS DISTINCT FROM s.id::text OR r.result->>'request_id' IS DISTINCT FROM r.request_id::text OR r.result->>'schemaVersion' IS DISTINCT FROM s.snapshot_schema::text OR r.result->'envelope'->'state' IS DISTINCT FROM s.payload OR serien_capability.state_hash(r.result->'envelope') IS DISTINCT FROM s.payload_digest OR r.payload_digest IS DISTINCT FROM s.payload_digest)) THEN RAISE EXCEPTION 'UNVERIFIABLE_6A4_CHECKPOINT'; END IF;
END $$;
UPDATE public.layout_snapshots SET state_digest=serien_capability.state_hash(payload),canonical_version='jcs-profile-v1',engine_revision=payload->>'engineRevision',topology_hash=payload->>'topologyHash',asset_refs=serien_capability.manifest_refs(payload) WHERE workspace_id IS NOT NULL;
UPDATE public.operation_receipts SET request_context=(result->'envelope')-'state',receipt_version=1,result=result-'envelope' WHERE workspace_id IS NOT NULL;

CREATE TABLE serien_capability.api_limits (
 workspace_id uuid PRIMARY KEY REFERENCES serien_capability.workspaces(id),
 max_checkpoints integer NOT NULL DEFAULT 100 CHECK(max_checkpoints>0),
 max_storage_bytes bigint NOT NULL DEFAULT 16777216 CHECK(max_storage_bytes>0),
 max_response_bytes integer NOT NULL DEFAULT 262144 CHECK(max_response_bytes>0),
 max_audit_events integer NOT NULL DEFAULT 5000 CHECK(max_audit_events>0),
 max_page integer NOT NULL DEFAULT 20 CHECK(max_page BETWEEN 1 AND 100),
 device_budget integer NOT NULL DEFAULT 60 CHECK(device_budget>0),
 workspace_budget integer NOT NULL DEFAULT 120 CHECK(workspace_budget>0),
 window_seconds integer NOT NULL DEFAULT 60 CHECK(window_seconds>0)
);
INSERT INTO serien_capability.api_limits(workspace_id) SELECT id FROM serien_capability.workspaces;
CREATE TABLE serien_capability.api_windows (
 workspace_id uuid NOT NULL REFERENCES serien_capability.workspaces(id),
 subject text NOT NULL, started_at timestamptz NOT NULL, requests integer NOT NULL CHECK(requests>0), PRIMARY KEY(workspace_id,subject)
);
CREATE TABLE serien_capability.audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL REFERENCES serien_capability.workspaces(id),
 device_id uuid NOT NULL,event text NOT NULL CHECK(event IN('ReadHead','ReadSnapshot','ListHistory','ReadReceipt','SaveCheckpoint','RecoverRevision')),
 request_id uuid, revision bigint, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX audit_workspace_time ON serien_capability.audit_events(workspace_id,occurred_at);
DO $$DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['api_limits','api_windows','audit_events'] LOOP
 EXECUTE format('ALTER TABLE serien_capability.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE serien_capability.%I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON serien_capability.%I FROM PUBLIC,anon,authenticated,serien_tm_worker',t);
 EXECUTE format('CREATE POLICY executor_scope ON serien_capability.%I TO serien_tm_executor USING(workspace_id IN(SELECT workspace_id FROM serien_capability.worker_bindings WHERE role_name=session_user)) WITH CHECK(workspace_id IN(SELECT workspace_id FROM serien_capability.worker_bindings WHERE role_name=session_user))',t);
 END LOOP;
END $$;
GRANT SELECT ON serien_capability.api_limits,serien_capability.api_windows TO serien_tm_executor;
GRANT INSERT,UPDATE ON serien_capability.api_windows TO serien_tm_executor;
GRANT SELECT,INSERT ON serien_capability.audit_events TO serien_tm_executor;

CREATE FUNCTION serien_capability.authorize(p_workspace uuid,p_layout uuid,p_write boolean DEFAULT false) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE b serien_capability.device_bindings%ROWTYPE; d serien_capability.devices%ROWTYPE; w serien_capability.workspaces%ROWTYPE;
BEGIN
 SELECT x.* INTO b FROM serien_capability.device_bindings x JOIN serien_capability.worker_bindings y USING(role_name,workspace_id) WHERE x.role_name=session_user;
 IF b.workspace_id IS NULL OR p_workspace IS DISTINCT FROM b.workspace_id THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 PERFORM 1 FROM serien_capability.workspace_locks WHERE workspace_id=b.workspace_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 PERFORM 1 FROM serien_capability.device_locks WHERE workspace_id=b.workspace_id AND device_id=b.device_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT id,status,auth_epoch INTO w.id,w.status,w.auth_epoch FROM serien_capability.workspaces WHERE id=b.workspace_id;
 SELECT id,workspace_id,key_version,scope,epoch,revoked_at,expires_at INTO d.id,d.workspace_id,d.key_version,d.scope,d.epoch,d.revoked_at,d.expires_at FROM serien_capability.devices WHERE id=b.device_id AND workspace_id=b.workspace_id;
 IF w.status IS DISTINCT FROM 'active' OR d.id IS NULL OR d.revoked_at IS NOT NULL OR (d.expires_at IS NOT NULL AND d.expires_at<=clock_timestamp()) OR d.epoch IS DISTINCT FROM b.device_epoch OR d.key_version IS DISTINCT FROM b.key_version OR w.auth_epoch IS DISTINCT FROM b.workspace_epoch OR d.scope NOT IN('reader','editor','owner') OR (p_write AND d.scope='reader') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF NOT EXISTS(SELECT FROM public.layouts WHERE workspace_id=b.workspace_id AND id=p_layout) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 RETURN d.id;
END $$;
CREATE FUNCTION serien_capability.consume_budget(w uuid,d uuid) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE lim serien_capability.api_limits%ROWTYPE; sub text; cap integer; n integer; now_at timestamptz:=clock_timestamp();
BEGIN
 SELECT * INTO lim FROM serien_capability.api_limits WHERE workspace_id=w;
 IF NOT FOUND THEN RAISE EXCEPTION 'LIMITS_NOT_PROVISIONED'; END IF;
 IF (SELECT count(*) FROM serien_capability.audit_events WHERE workspace_id=w)>=lim.max_audit_events THEN RAISE EXCEPTION 'QUOTA_EXCEEDED'; END IF;
 FOREACH sub IN ARRAY ARRAY['workspace',d::text] LOOP
 cap:=CASE WHEN sub='workspace' THEN lim.workspace_budget ELSE lim.device_budget END;
 INSERT INTO serien_capability.api_windows AS old(workspace_id,subject,started_at,requests) VALUES(w,sub,now_at,1)
 ON CONFLICT(workspace_id,subject) DO UPDATE SET requests=CASE WHEN old.started_at+make_interval(secs=>lim.window_seconds)<=now_at THEN 1 ELSE old.requests+1 END,started_at=CASE WHEN old.started_at+make_interval(secs=>lim.window_seconds)<=now_at THEN now_at ELSE old.started_at END RETURNING requests INTO n;
 IF n>cap THEN RAISE EXCEPTION 'RATE_LIMITED'; END IF;
 END LOOP;
END $$;
CREATE FUNCTION serien_capability.bounded_response(w uuid,value jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE cap integer; BEGIN
 SELECT max_response_bytes INTO cap FROM serien_capability.api_limits WHERE workspace_id=w;
 IF cap IS NULL OR octet_length(value::text)>cap THEN RAISE EXCEPTION 'RESPONSE_TOO_LARGE'; END IF;
 RETURN value;
END $$;
CREATE FUNCTION serien_capability.verify_snapshot(w uuid,l uuid,r bigint) RETURNS public.layout_snapshots LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE s public.layout_snapshots%ROWTYPE; rec public.operation_receipts%ROWTYPE; tpl jsonb; topology text;
BEGIN
 SELECT * INTO s FROM public.layout_snapshots WHERE workspace_id=w AND layout_id=l AND revision=r;
 IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 SELECT * INTO rec FROM public.operation_receipts WHERE workspace_id=w AND layout_id=l AND snapshot_id=s.id;
 SELECT template INTO tpl FROM serien_capability.candidate_profiles WHERE workspace_id=w AND layout_id=l;
 SELECT topology_hash INTO topology FROM public.layouts WHERE workspace_id=w AND id=l;
 IF s.canonical_version IS DISTINCT FROM 'jcs-profile-v1' OR s.snapshot_schema IS DISTINCT FROM 1 OR s.payload->>'schemaVersion' IS DISTINCT FROM '1' OR s.engine_revision IS DISTINCT FROM tpl->>'engineRevision' OR s.payload->>'engineRevision' IS DISTINCT FROM s.engine_revision OR s.topology_hash IS DISTINCT FROM topology OR s.payload->>'topologyHash' IS DISTINCT FROM s.topology_hash THEN RAISE EXCEPTION 'INCOMPATIBLE_SNAPSHOT'; END IF;
 IF rec.request_id IS NULL OR rec.result->>'digest' IS DISTINCT FROM rec.payload_digest OR rec.result->>'request_id' IS DISTINCT FROM rec.request_id::text OR rec.result->>'schemaVersion' IS DISTINCT FROM s.snapshot_schema::text OR rec.op_type IS DISTINCT FROM rec.request_context->>'operation' OR rec.revision IS DISTINCT FROM r OR rec.request_context->>'workspaceId' IS DISTINCT FROM w::text OR rec.request_context->>'layoutId' IS DISTINCT FROM l::text OR rec.result->>'revision' IS DISTINCT FROM r::text OR rec.result->>'snapshotId' IS DISTINCT FROM s.id::text OR s.payload->>'workspaceId' IS DISTINCT FROM w::text OR s.payload->>'layoutId' IS DISTINCT FROM l::text OR s.state_digest IS DISTINCT FROM serien_capability.state_hash(s.payload) OR s.payload_digest IS DISTINCT FROM rec.payload_digest OR s.payload_digest IS DISTINCT FROM serien_capability.state_hash(rec.request_context||jsonb_build_object('state',s.payload)) OR s.asset_refs IS DISTINCT FROM serien_capability.manifest_refs(s.payload) THEN RAISE EXCEPTION 'INTEGRITY_ERROR'; END IF;
 IF rec.receipt_version=2 AND (rec.result->>'stateDigest' IS DISTINCT FROM s.state_digest OR rec.result->>'canonicalVersion' IS DISTINCT FROM s.canonical_version OR rec.result->'auth' IS DISTINCT FROM rec.auth_context OR rec.result->>'workspaceId' IS DISTINCT FROM w::text OR rec.result->>'layoutId' IS DISTINCT FROM l::text OR rec.result->'expectedRevision' IS DISTINCT FROM rec.request_context->'expectedRevision' OR rec.result->'recoverySourceRevision' IS DISTINCT FROM rec.request_context->'recoverySourceRevision' OR rec.result->>'operation' IS DISTINCT FROM rec.op_type) THEN RAISE EXCEPTION 'INTEGRITY_ERROR'; END IF;
 RETURN s;
END $$;
CREATE FUNCTION serien_capability.receipt_response(r public.operation_receipts) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE s public.layout_snapshots%ROWTYPE; BEGIN
 s:=serien_capability.verify_snapshot(r.workspace_id,r.layout_id,r.revision);
 IF r.receipt_version=1 THEN RETURN r.result||jsonb_build_object('envelope',r.request_context||jsonb_build_object('state',s.payload)); END IF;
 RETURN r.result;
END $$;
-- All helpers invoker-only, no client EXECUTE. They run inside the limited private API owner.
REVOKE ALL ON FUNCTION serien_capability.authorize(uuid,uuid,boolean),serien_capability.consume_budget(uuid,uuid),serien_capability.bounded_response(uuid,jsonb),serien_capability.verify_snapshot(uuid,uuid,bigint),serien_capability.receipt_response(public.operation_receipts) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION serien_capability.authorize(uuid,uuid,boolean),serien_capability.consume_budget(uuid,uuid),serien_capability.bounded_response(uuid,jsonb),serien_capability.verify_snapshot(uuid,uuid,bigint),serien_capability.receipt_response(public.operation_receipts) TO serien_tm_executor;
ALTER TABLE public.operation_receipts ADD COLUMN auth_context jsonb;
CREATE FUNCTION serien_capability.storage_usage(w uuid) RETURNS bigint LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT coalesce((SELECT sum(octet_length(payload::text)+octet_length(asset_refs::text)+256) FROM public.layout_snapshots WHERE workspace_id=w),0)
 +coalesce((SELECT sum(octet_length(result::text)+octet_length(request_context::text)+octet_length(coalesce(auth_context,'{}')::text)+256) FROM public.operation_receipts WHERE workspace_id=w),0)
$$;
REVOKE ALL ON FUNCTION serien_capability.storage_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION serien_capability.storage_usage(uuid) TO serien_tm_executor;
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
 SELECT owner_id INTO own FROM public.layouts WHERE id=l AND workspace_id=w;
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

CREATE FUNCTION serien_capability.read_head(w uuid,l uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d uuid; h serien_capability.session_heads%ROWTYPE; s public.layout_snapshots%ROWTYPE; result jsonb;
BEGIN
 d:=serien_capability.authorize(w,l); PERFORM serien_capability.consume_budget(w,d);
 SELECT * INTO h FROM serien_capability.session_heads WHERE workspace_id=w AND layout_id=l;
 IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 IF h.revision>0 THEN
 s:=serien_capability.verify_snapshot(w,l,h.revision);
 IF h.snapshot_id IS DISTINCT FROM s.id OR h.payload_digest IS DISTINCT FROM s.payload_digest THEN RAISE EXCEPTION 'INTEGRITY_ERROR'; END IF;
 END IF;
 result:=jsonb_build_object('workspaceId',w,'layoutId',l,'revision',h.revision::text,'snapshotId',h.snapshot_id,'envelopeDigest',h.payload_digest,'stateDigest',s.state_digest,'canonicalVersion',s.canonical_version);
 INSERT INTO serien_capability.audit_events(workspace_id,device_id,event,revision) VALUES(w,d,'ReadHead',h.revision);
 RETURN serien_capability.bounded_response(w,result);
END $$;
CREATE FUNCTION serien_capability.read_snapshot(w uuid,l uuid,r bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d uuid; s public.layout_snapshots%ROWTYPE;
BEGIN
 d:=serien_capability.authorize(w,l); PERFORM serien_capability.consume_budget(w,d);
 s:=serien_capability.verify_snapshot(w,l,r);
 INSERT INTO serien_capability.audit_events(workspace_id,device_id,event,revision) VALUES(w,d,'ReadSnapshot',r);
 RETURN serien_capability.bounded_response(w,jsonb_build_object('revision',r::text,'snapshotId',s.id,'state',s.payload,'stateDigest',s.state_digest,'envelopeDigest',s.payload_digest,'canonicalVersion',s.canonical_version,'schemaVersion',s.snapshot_schema,'engineRevision',s.engine_revision,'topologyHash',s.topology_hash,'assetRefs',s.asset_refs));
END $$;
CREATE FUNCTION serien_capability.list_history(w uuid,l uuid,after_revision bigint DEFAULT 0,page_size integer DEFAULT 20,through_revision bigint DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d uuid; lim serien_capability.api_limits%ROWTYPE; horizon bigint; s public.layout_snapshots%ROWTYPE; valid public.layout_snapshots%ROWTYPE; status text; items jsonb:='[]'; cursor bigint:=NULL;
BEGIN
 d:=serien_capability.authorize(w,l); PERFORM serien_capability.consume_budget(w,d);
 SELECT * INTO lim FROM serien_capability.api_limits WHERE workspace_id=w;
 IF page_size IS NULL OR page_size<1 OR page_size>lim.max_page OR after_revision IS NULL OR after_revision<0 THEN RAISE EXCEPTION 'INVALID_PAGE'; END IF;
 SELECT revision INTO horizon FROM serien_capability.session_heads WHERE workspace_id=w AND layout_id=l;
 IF through_revision IS NOT NULL THEN
 IF through_revision<0 OR through_revision>horizon THEN RAISE EXCEPTION 'INVALID_PAGE'; END IF; horizon:=through_revision;
 END IF;
 FOR s IN SELECT * FROM public.layout_snapshots WHERE workspace_id=w AND layout_id=l AND revision>after_revision AND revision<=horizon ORDER BY revision LIMIT page_size LOOP
 status:='VALID';
 BEGIN valid:=serien_capability.verify_snapshot(w,l,s.revision);
 EXCEPTION WHEN SQLSTATE 'P0001' THEN
 IF SQLERRM='INCOMPATIBLE_SNAPSHOT' THEN status:='INCOMPATIBLE';
 ELSIF SQLERRM IN('INTEGRITY_ERROR','CANONICAL_PROFILE_NUMBER','CANONICAL_PROFILE_KEY') THEN status:='CORRUPT'; ELSE RAISE; END IF;
 END;
 items:=items||jsonb_build_array(jsonb_build_object('revision',s.revision::text,'snapshotId',s.id,'stateDigest',s.state_digest,'status',status));cursor:=s.revision;
 END LOOP;
 INSERT INTO serien_capability.audit_events(workspace_id,device_id,event) VALUES(w,d,'ListHistory');
 RETURN serien_capability.bounded_response(w,jsonb_build_object('items',items,'throughRevision',horizon::text,'nextCursor',CASE WHEN cursor<horizon THEN cursor::text ELSE NULL END));
END $$;
CREATE FUNCTION serien_capability.read_receipt(w uuid,l uuid,req uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d uuid; r public.operation_receipts%ROWTYPE;
BEGIN
 d:=serien_capability.authorize(w,l); PERFORM serien_capability.consume_budget(w,d);
 SELECT * INTO r FROM public.operation_receipts WHERE workspace_id=w AND layout_id=l AND request_id=req AND result->>'actor'=d::text;
 IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 INSERT INTO serien_capability.audit_events(workspace_id,device_id,event,request_id,revision) VALUES(w,d,'ReadReceipt',req,r.revision);
 RETURN serien_capability.bounded_response(w,serien_capability.receipt_response(r));
END $$;
CREATE FUNCTION serien_capability.recover_revision(w uuid,l uuid,expected bigint,source_revision bigint,req uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d uuid; s public.layout_snapshots%ROWTYPE; r public.operation_receipts%ROWTYPE; e jsonb; ctx jsonb;
BEGIN
 d:=serien_capability.authorize(w,l,true);
 ctx:=jsonb_build_object('operation','RecoverRevision','workspaceId',w,'layoutId',l,'expectedRevision',expected::text,'recoverySourceRevision',source_revision::text);
 SELECT * INTO r FROM public.operation_receipts WHERE workspace_id=w AND request_id=req;
 IF FOUND THEN
 IF r.result->>'actor' IS DISTINCT FROM d::text OR r.request_context IS DISTINCT FROM ctx THEN RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED'; END IF;
 PERFORM serien_capability.consume_budget(w,d);
 RETURN serien_capability.bounded_response(w,serien_capability.receipt_response(r));
 END IF;
 IF expected IS NULL OR expected<0 OR source_revision IS NULL OR source_revision<1 OR req IS NULL THEN RAISE EXCEPTION 'INVALID_RECOVERY'; END IF;
 s:=serien_capability.verify_snapshot(w,l,source_revision);
 e:=ctx||jsonb_build_object('state',s.payload);
 RETURN serien_capability.save_checkpoint(req,serien_capability.profile_canonical_v1(e),serien_capability.state_hash(e));
END $$;
-- Table-owning powers are not granted. Only explicit entrypoints are callable by SQL workers.
DO $$DECLARE fn text; BEGIN
 FOREACH fn IN ARRAY ARRAY['read_head(uuid,uuid)','read_snapshot(uuid,uuid,bigint)','list_history(uuid,uuid,bigint,integer,bigint)','read_receipt(uuid,uuid,uuid)','recover_revision(uuid,uuid,bigint,bigint,uuid)'] LOOP
 EXECUTE 'ALTER FUNCTION serien_capability.'||fn||' OWNER TO serien_tm_executor';
 EXECUTE 'REVOKE ALL ON FUNCTION serien_capability.'||fn||' FROM PUBLIC,anon,authenticated,serien_tm_authorizer';
 EXECUTE 'GRANT EXECUTE ON FUNCTION serien_capability.'||fn||' TO serien_tm_worker';
 END LOOP;
END $$;
-- save_checkpoint retained its restricted ACL/owner on replacement.
ALTER TABLE public.layout_snapshots ADD CONSTRAINT snapshot_integrity_metadata CHECK(workspace_id IS NULL OR (state_digest IS NOT NULL AND canonical_version IS NOT NULL AND canonical_version='jcs-profile-v1' AND engine_revision IS NOT NULL AND topology_hash IS NOT NULL AND asset_refs IS NOT NULL));
ALTER TABLE public.operation_receipts ADD CONSTRAINT receipt_context_complete CHECK(workspace_id IS NULL OR (request_context IS NOT NULL AND receipt_version IS NOT NULL AND receipt_version IN(1,2) AND (receipt_version=1 OR auth_context IS NOT NULL) AND NOT result ? 'envelope' AND NOT request_context ? 'state'));
CREATE FUNCTION serien_capability.immutable_checkpoint() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$ BEGIN RAISE EXCEPTION 'IMMUTABLE_CHECKPOINT'; END $$;
REVOKE ALL ON FUNCTION serien_capability.immutable_checkpoint() FROM PUBLIC;
CREATE TRIGGER immutable_snapshot BEFORE UPDATE OR DELETE ON public.layout_snapshots FOR EACH ROW EXECUTE FUNCTION serien_capability.immutable_checkpoint();
CREATE TRIGGER immutable_receipt BEFORE UPDATE OR DELETE ON public.operation_receipts FOR EACH ROW EXECUTE FUNCTION serien_capability.immutable_checkpoint();
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON serien_capability.audit_events FOR EACH ROW EXECUTE FUNCTION serien_capability.immutable_checkpoint();
COMMIT;
