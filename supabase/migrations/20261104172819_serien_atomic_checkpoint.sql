-- 6A.4 PROPOSAL: isolated PostgreSQL only. No production application authorized.
BEGIN;
CREATE ROLE serien_tm_executor NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB;
CREATE TABLE serien_capability.device_bindings (
 role_name name PRIMARY KEY REFERENCES serien_capability.worker_bindings(role_name),
 workspace_id uuid NOT NULL, device_id uuid NOT NULL,
 FOREIGN KEY(workspace_id,device_id) REFERENCES serien_capability.devices(workspace_id,id)
);
CREATE TABLE serien_capability.workspace_locks (
 workspace_id uuid PRIMARY KEY REFERENCES serien_capability.workspaces(id), marker bigint NOT NULL DEFAULT 0
);
CREATE TABLE serien_capability.candidate_profiles (
 workspace_id uuid NOT NULL, layout_id uuid NOT NULL, template jsonb NOT NULL,
 PRIMARY KEY(workspace_id,layout_id), FOREIGN KEY(workspace_id,layout_id) REFERENCES public.layouts(workspace_id,id)
);
DO $$DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['device_bindings','workspace_locks','candidate_profiles'] LOOP
 EXECUTE format('ALTER TABLE serien_capability.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE serien_capability.%I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON serien_capability.%I FROM PUBLIC,anon,authenticated,serien_tm_worker',t);
 END LOOP;
END $$;
GRANT USAGE ON SCHEMA serien_capability,serien_internal,public TO serien_tm_executor;
GRANT SELECT ON serien_capability.worker_bindings,serien_capability.device_bindings,serien_capability.workspace_locks,serien_capability.device_locks,serien_capability.candidate_profiles TO serien_tm_executor;
CREATE POLICY executor_binding ON serien_capability.worker_bindings FOR SELECT TO serien_tm_executor USING(role_name=session_user);
CREATE POLICY executor_device_binding ON serien_capability.device_bindings FOR SELECT TO serien_tm_executor USING(role_name=session_user);
GRANT SELECT(id,status,auth_epoch) ON serien_capability.workspaces TO serien_tm_executor;
GRANT SELECT(id,workspace_id,key_version,scope,epoch,revoked_at,expires_at) ON serien_capability.devices TO serien_tm_executor;
GRANT SELECT ON public.layouts,public.consists,public.consist_members,public.stock_items,public.layout_segments,public.layout_placements,public.loose_stock_placements,public.layout_snapshots,public.operation_receipts,serien_capability.session_heads TO serien_tm_executor;
GRANT UPDATE(marker) ON serien_capability.workspace_locks,serien_capability.device_locks TO serien_tm_executor;
GRANT INSERT ON public.layout_snapshots,public.operation_receipts TO serien_tm_executor;
GRANT UPDATE(revision,snapshot_id,receipt_request_id,payload_digest) ON serien_capability.session_heads TO serien_tm_executor;
-- Existing loose-assignment trigger requires SELECT FOR UPDATE on the item.
-- PostgreSQL requires an UPDATE privilege on one column even for row locking only.
GRANT UPDATE(id) ON public.stock_items TO serien_tm_executor;
GRANT UPDATE(state_version) ON public.layout_placements,public.loose_stock_placements TO serien_tm_executor;
GRANT EXECUTE ON FUNCTION serien_internal.check_placement(),serien_internal.touch_updated_at(),serien_internal.check_snapshot(),serien_internal.assert_ready_consist(uuid) TO serien_tm_executor;
DO $$DECLARE t text; s text; BEGIN
 FOREACH t IN ARRAY ARRAY['workspaces','devices','workspace_locks','device_locks','candidate_profiles','session_heads'] LOOP
 s=CASE WHEN t='workspaces' THEN 'id' ELSE 'workspace_id' END;
 EXECUTE format('CREATE POLICY executor_scope ON serien_capability.%I TO serien_tm_executor USING(%I IN(SELECT workspace_id FROM serien_capability.worker_bindings WHERE role_name=session_user)) WITH CHECK(%I IN(SELECT workspace_id FROM serien_capability.worker_bindings WHERE role_name=session_user))',t,s,s);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['layouts','consists','consist_members','stock_items','layout_snapshots','operation_receipts','layout_placements','loose_stock_placements'] LOOP
 EXECUTE format('CREATE POLICY executor_scope ON public.%I TO serien_tm_executor USING(workspace_id IN(SELECT workspace_id FROM serien_capability.worker_bindings WHERE role_name=session_user)) WITH CHECK(workspace_id IN(SELECT workspace_id FROM serien_capability.worker_bindings WHERE role_name=session_user))',t);
 END LOOP;
END $$;
CREATE POLICY executor_segments ON public.layout_segments FOR SELECT TO serien_tm_executor USING(EXISTS(SELECT FROM public.layouts l WHERE l.id=layout_id));
-- Revocation coordination uses the same workspace -> device -> head order as saves.
GRANT SELECT,UPDATE ON serien_capability.workspace_locks TO serien_tm_authorizer;
CREATE POLICY authorizer_lock ON serien_capability.workspace_locks TO serien_tm_authorizer USING(true) WITH CHECK(true);
CREATE OR REPLACE FUNCTION serien_capability.coordinate_authority() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF TG_TABLE_NAME='workspaces' THEN
 PERFORM 1 FROM serien_capability.workspace_locks WHERE workspace_id=OLD.id FOR UPDATE;
 ELSE
 PERFORM 1 FROM serien_capability.workspace_locks WHERE workspace_id=OLD.workspace_id FOR UPDATE;
 END IF;
 IF TG_TABLE_NAME='devices' THEN PERFORM 1 FROM serien_capability.device_locks WHERE workspace_id=OLD.workspace_id AND device_id=OLD.id FOR UPDATE; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION serien_capability.coordinate_authority() FROM PUBLIC;
CREATE TRIGGER coordinate_device BEFORE UPDATE OR DELETE ON serien_capability.devices FOR EACH ROW EXECUTE FUNCTION serien_capability.coordinate_authority();
CREATE TRIGGER coordinate_workspace BEFORE UPDATE OR DELETE ON serien_capability.workspaces FOR EACH ROW EXECUTE FUNCTION serien_capability.coordinate_authority();
-- Head must reference receipt inserted later in the same transaction.
DO $$DECLARE n text; BEGIN
 FOR n IN SELECT conname FROM pg_constraint WHERE conrelid='serien_capability.session_heads'::regclass AND confrelid='public.operation_receipts'::regclass LOOP
 EXECUTE format('ALTER TABLE serien_capability.session_heads ALTER CONSTRAINT %I DEFERRABLE INITIALLY DEFERRED',n);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION serien_capability.monotone_head() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NEW.workspace_id<>OLD.workspace_id OR NEW.layout_id<>OLD.layout_id OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'REVISION_NOT_CONTIGUOUS' USING errcode='23514'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION serien_capability.save_checkpoint(p_request uuid,p_wire text,p_digest text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e jsonb; w uuid; l uuid; d uuid; own uuid; h serien_capability.session_heads%ROWTYPE;
 r public.operation_receipts%ROWTYPE; tpl jsonb; candidate jsonb; normalized jsonb;
 sid uuid:=gen_random_uuid(); rev bigint; result jsonb; act text; device_epoch bigint; workspace_epoch bigint;
BEGIN
 IF octet_length(p_wire)>2097152 THEN RAISE EXCEPTION 'PAYLOAD_TOO_LARGE'; END IF;
 IF p_request IS NULL OR p_digest IS NULL OR p_digest<>encode(sha256(convert_to(p_wire,'UTF8')),'hex') THEN RAISE EXCEPTION 'DIGEST_MISMATCH'; END IF;
 e:=p_wire::jsonb;
 IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(e) k) IS DISTINCT FROM ARRAY['expectedRevision','layoutId','operation','recoverySourceRevision','state','workspaceId']::text[] THEN RAISE EXCEPTION 'INVALID_ENVELOPE'; END IF;
 IF e->>'expectedRevision' IS NULL OR jsonb_typeof(e->'expectedRevision')<>'string' THEN RAISE EXCEPTION 'INVALID_ENVELOPE'; END IF;
 SELECT b.workspace_id,b.device_id INTO w,d FROM serien_capability.device_bindings b JOIN serien_capability.worker_bindings x USING(role_name,workspace_id) WHERE b.role_name=session_user;
 IF w IS NULL OR e->>'workspaceId' IS DISTINCT FROM w::text THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 l:=(e->>'layoutId')::uuid;
 PERFORM 1 FROM serien_capability.workspace_locks WHERE workspace_id=w FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 PERFORM 1 FROM serien_capability.device_locks WHERE workspace_id=w AND device_id=d FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT auth_epoch INTO workspace_epoch FROM serien_capability.workspaces WHERE id=w AND status='active';
 SELECT epoch INTO device_epoch FROM serien_capability.devices WHERE id=d AND workspace_id=w AND scope IN('editor','owner') AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>clock_timestamp());
 IF workspace_epoch IS NULL OR device_epoch IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT * INTO h FROM serien_capability.session_heads WHERE workspace_id=w AND layout_id=l FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT * INTO r FROM public.operation_receipts WHERE workspace_id=w AND request_id=p_request;
 IF FOUND THEN
 IF r.payload_digest<>p_digest OR r.result->>'actor'<>d::text OR r.result->'envelope'<>e THEN RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED'; END IF;
 RETURN r.result;
 END IF;
 IF coalesce(e->>'expectedRevision','') !~ '^(0|[1-9][0-9]*)$' OR (e->>'expectedRevision')::bigint<>h.revision THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
 act:=e->>'operation';
 IF act NOT IN('SaveCheckpoint','RecoverRevision') OR act IS NULL THEN RAISE EXCEPTION 'INVALID_OPERATION'; END IF;
 IF act='SaveCheckpoint' AND e->'recoverySourceRevision' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'INVALID_RECOVERY'; END IF;
 IF act='RecoverRevision' AND NOT EXISTS(SELECT FROM public.layout_snapshots WHERE workspace_id=w AND layout_id=l AND revision=(e->>'recoverySourceRevision')::bigint AND payload=e->'state') THEN RAISE EXCEPTION 'INVALID_RECOVERY'; END IF;
 SELECT template INTO tpl FROM serien_capability.candidate_profiles WHERE workspace_id=w AND layout_id=l;
 candidate:=e->'state';
 IF candidate->>'workspaceId' IS DISTINCT FROM w::text OR candidate->>'layoutId' IS DISTINCT FROM l::text THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 -- Fail-closed bounded validator: full operator-certified DTO, only safe display/switch/capture edits.
 normalized:=jsonb_set(jsonb_set(jsonb_set(candidate,'{stateId}',tpl->'stateId'),'{ui,day}',tpl#>'{ui,day}'),'{layout,switches}',tpl#>'{layout,switches}');
 IF tpl IS NULL OR normalized IS DISTINCT FROM tpl OR coalesce(candidate->>'stateId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR NOT coalesce(candidate#>'{ui,day}' IN ('0'::jsonb,'1'::jsonb),false) THEN RAISE EXCEPTION 'INVALID_STATE_PROFILE'; END IF;
 SELECT owner_id INTO own FROM public.layouts WHERE id=l AND workspace_id=w;
 rev:=h.revision+1;
 INSERT INTO public.layout_snapshots(id,owner_id,workspace_id,layout_id,revision,payload,payload_digest) VALUES(sid,own,w,l,rev,candidate,p_digest);
 UPDATE public.layout_placements SET state_version=rev WHERE workspace_id=w AND layout_id=l;
 UPDATE public.loose_stock_placements SET state_version=rev WHERE workspace_id=w AND layout_id=l;
 UPDATE serien_capability.session_heads SET revision=rev,snapshot_id=sid,receipt_request_id=p_request,payload_digest=p_digest WHERE workspace_id=w AND layout_id=l AND revision=h.revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
 result:=jsonb_build_object('request_id',p_request,'revision',rev::text,'snapshotId',sid,'digest',p_digest,'committedAt',clock_timestamp(),'actor',d,'envelope',e,'schemaVersion',1);
 INSERT INTO public.operation_receipts(owner_id,workspace_id,request_id,op_type,payload_digest,result,layout_id,snapshot_id,revision) VALUES(own,w,p_request,act,p_digest,result,l,sid,rev);
 SET CONSTRAINTS ALL IMMEDIATE;
 RETURN result;
END $$;
ALTER FUNCTION serien_capability.save_checkpoint(uuid,text,text) OWNER TO serien_tm_executor;
REVOKE ALL ON FUNCTION serien_capability.save_checkpoint(uuid,text,text) FROM PUBLIC,anon,authenticated,serien_tm_authorizer;
GRANT EXECUTE ON FUNCTION serien_capability.save_checkpoint(uuid,text,text) TO serien_tm_worker;
COMMIT;
