--
-- PostgreSQL database dump
--

\restrict NJLG3u0t8qLeTXL8Kdo3blYFOGBcdy3zu0EX23bn1tASky3aGOmJR34NSqsDNGj

-- Dumped from database version 17.11 (Debian 17.11-1.pgdg13+2)
-- Dumped by pg_dump version 17.11 (Debian 17.11-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO postgres;

--
-- Name: serien_capability; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA serien_capability;


ALTER SCHEMA serien_capability OWNER TO postgres;

--
-- Name: serien_internal; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA serien_internal;


ALTER SCHEMA serien_internal OWNER TO postgres;

--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: postgres
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;


ALTER FUNCTION auth.uid() OWNER TO postgres;

--
-- Name: approve_device_job(uuid, jsonb, text); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

CREATE FUNCTION serien_capability.approve_device_job(p_job uuid, key jsonb, approved_scope text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE j serien_capability.lifecycle_jobs%ROWTYPE;
BEGIN
 SELECT * INTO j FROM serien_capability.lifecycle_jobs WHERE id=p_job;
 IF j.id IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 PERFORM serien_capability.control_access(j.workspace_id,'approve');
 SELECT * INTO j FROM serien_capability.lifecycle_jobs WHERE id=p_job FOR UPDATE;
 PERFORM serien_capability.control_ceiling(j.workspace_id,j.scope);
 IF j.public_key IS DISTINCT FROM key OR j.scope IS DISTINCT FROM approved_scope THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF j.state IN('APPROVED','ACTIVATING','ACTIVE') THEN RETURN serien_capability.job_response(j); END IF;
 IF j.state<>'PREPARED' OR j.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
 UPDATE serien_capability.lifecycle_jobs SET state='APPROVED',approved_by=session_user WHERE id=p_job RETURNING * INTO j;
 PERFORM serien_capability.record_job(j.id);
 RETURN serien_capability.job_response(j);
END $$;


ALTER FUNCTION serien_capability.approve_device_job(p_job uuid, key jsonb, approved_scope text) OWNER TO serien_tm_lifecycle_executor;

--
-- Name: authorize(uuid, uuid, boolean); Type: FUNCTION; Schema: serien_capability; Owner: postgres
--

CREATE FUNCTION serien_capability.authorize(p_workspace uuid, p_layout uuid, p_write boolean DEFAULT false) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION serien_capability.authorize(p_workspace uuid, p_layout uuid, p_write boolean) OWNER TO postgres;

--
-- Name: bounded_response(uuid, jsonb); Type: FUNCTION; Schema: serien_capability; Owner: postgres
--

CREATE FUNCTION serien_capability.bounded_response(w uuid, value jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE cap integer; BEGIN
 SELECT max_response_bytes INTO cap FROM serien_capability.api_limits WHERE workspace_id=w;
 IF cap IS NULL OR octet_length(value::text)>cap THEN RAISE EXCEPTION 'RESPONSE_TOO_LARGE'; END IF;
 RETURN value;
END $$;


ALTER FUNCTION serien_capability.bounded_response(w uuid, value jsonb) OWNER TO postgres;

--
-- Name: claim_nonce(jsonb); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_executor
--

CREATE FUNCTION serien_capability.claim_nonce(c jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
DECLARE w uuid; l uuid; d uuid; b serien_capability.device_bindings%ROWTYPE; lim serien_capability.nonce_limits%ROWTYPE;
 now_at timestamptz:=clock_timestamp(); issue_ms numeric; current_ms numeric; sub text; cap integer; n integer; expiry timestamptz;
BEGIN
 IF c IS NULL OR jsonb_typeof(c)<>'object' OR octet_length(c::text)>4096 OR
  (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(c) k) IS DISTINCT FROM
  ARRAY['audience','bodyDigest','contextVersion','deviceId','domain','epoch','issuedAt','keyId','keyVersion','layoutId','method','nonce','operation','path','request_id','version','workspaceEpoch','workspaceId']::text[]
 THEN RAISE EXCEPTION 'INVALID_NONCE_CONTEXT'; END IF;
 IF c->>'contextVersion' IS DISTINCT FROM 'sql-claim-v1' OR c->>'domain' IS DISTINCT FROM 'SerieN-capability-v1'
  OR c->'version' IS DISTINCT FROM '1'::jsonb OR c->>'method' IS DISTINCT FROM 'POST'
  OR coalesce(c->>'operation','') NOT IN('ReadHead','ReadSnapshot','ListHistory','ReadReceipt','SaveCheckpoint','RecoverRevision')
  OR jsonb_typeof(c->'nonce') IS DISTINCT FROM 'string' OR coalesce(c->>'nonce','') !~ '^[0-9a-f]{32}$'
  OR jsonb_typeof(c->'bodyDigest') IS DISTINCT FROM 'string' OR coalesce(c->>'bodyDigest','') !~ '^[0-9a-f]{64}$'
  OR jsonb_typeof(c->'issuedAt') IS DISTINCT FROM 'number' OR coalesce(c->>'issuedAt','') !~ '^[0-9]{13}$'
  OR jsonb_typeof(c->'epoch') IS DISTINCT FROM 'number' OR coalesce(c->>'epoch','') !~ '^[1-9][0-9]*$'
  OR jsonb_typeof(c->'keyVersion') IS DISTINCT FROM 'number' OR coalesce(c->>'keyVersion','') !~ '^[1-9][0-9]*$'
  OR jsonb_typeof(c->'workspaceEpoch') IS DISTINCT FROM 'number' OR coalesce(c->>'workspaceEpoch','') !~ '^[1-9][0-9]*$'
 THEN RAISE EXCEPTION 'INVALID_NONCE_CONTEXT'; END IF;
 FOREACH sub IN ARRAY ARRAY['workspaceId','layoutId','deviceId','keyId','request_id'] LOOP
  IF jsonb_typeof(c->sub) IS DISTINCT FROM 'string' OR coalesce(c->>sub,'') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'INVALID_NONCE_CONTEXT'; END IF;
 END LOOP;
 w:=(c->>'workspaceId')::uuid; l:=(c->>'layoutId')::uuid;
 d:=serien_capability.authorize(w,l,c->>'operation' IN('SaveCheckpoint','RecoverRevision'));
 SELECT * INTO b FROM serien_capability.device_bindings WHERE role_name=session_user;
 IF c->>'deviceId' IS DISTINCT FROM d::text OR c->>'keyId' IS DISTINCT FROM d::text
  OR (c->>'epoch')::numeric IS DISTINCT FROM b.device_epoch::numeric OR (c->>'keyVersion')::numeric IS DISTINCT FROM b.key_version::numeric
  OR (c->>'workspaceEpoch')::numeric IS DISTINCT FROM b.workspace_epoch::numeric THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT * INTO lim FROM serien_capability.nonce_limits WHERE workspace_id=w;
 IF lim.workspace_id IS NULL THEN RAISE EXCEPTION 'LIMITS_NOT_PROVISIONED'; END IF;
 IF c->>'audience' IS DISTINCT FROM lim.audience OR c->>'path' IS DISTINCT FROM '/v1/workspaces/'||w::text||'/layouts/'||l::text||'/'||(c->>'operation') THEN RAISE EXCEPTION 'INVALID_NONCE_CONTEXT'; END IF;
 current_ms:=floor(extract(epoch FROM clock_timestamp())*1000); issue_ms:=(c->>'issuedAt')::numeric;
 IF abs(current_ms-issue_ms)>120000 THEN RAISE EXCEPTION 'NONCE_EXPIRED'; END IF;
 PERFORM serien_capability.safe_device_role(session_user,true);
 DELETE FROM serien_capability.replay_nonces WHERE workspace_id=w AND expires_at<clock_timestamp();
 IF EXISTS(SELECT FROM serien_capability.replay_nonces WHERE device_id=d AND nonce=c->>'nonce') THEN RAISE EXCEPTION 'REPLAY'; END IF;
 IF (SELECT count(*) FROM serien_capability.replay_nonces WHERE workspace_id=w)>=lim.workspace_live
  OR (SELECT count(*) FROM serien_capability.replay_nonces WHERE device_id=d)>=lim.device_live THEN RAISE EXCEPTION 'NONCE_QUOTA'; END IF;
 FOREACH sub IN ARRAY ARRAY['workspace',d::text] LOOP
  cap:=CASE WHEN sub='workspace' THEN lim.workspace_rate ELSE lim.device_rate END;
  INSERT INTO serien_capability.nonce_windows AS old(workspace_id,subject,started_at,claims) VALUES(w,sub,now_at,1)
  ON CONFLICT(workspace_id,subject) DO UPDATE SET claims=CASE WHEN old.started_at+interval '60 seconds'<=now_at THEN 1 ELSE old.claims+1 END,
   started_at=CASE WHEN old.started_at+interval '60 seconds'<=now_at THEN now_at ELSE old.started_at END RETURNING claims INTO n;
  IF n>cap THEN RAISE EXCEPTION 'NONCE_RATE_LIMITED'; END IF;
 END LOOP;
 expiry:=greatest(clock_timestamp()+interval '5 minutes',to_timestamp(issue_ms/1000)+interval '120 seconds');
 INSERT INTO serien_capability.replay_nonces(workspace_id,device_id,key_version,epoch,nonce,expires_at,context_digest)
 VALUES(w,d,b.key_version,b.device_epoch,c->>'nonce',expiry,encode(sha256(convert_to(c::text,'UTF8')),'hex'));
 RETURN jsonb_build_object('claimed',true,'deviceId',d,'expiresAt',expiry);
END $_$;


ALTER FUNCTION serien_capability.claim_nonce(c jsonb) OWNER TO serien_tm_executor;

--
-- Name: complete_device_job(uuid); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

CREATE FUNCTION serien_capability.complete_device_job(p_job uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE j serien_capability.lifecycle_jobs%ROWTYPE;
BEGIN
 SELECT * INTO j FROM serien_capability.lifecycle_jobs WHERE id=p_job;
 IF j.id IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 PERFORM serien_capability.control_access(j.workspace_id,'provision');
 SELECT * INTO j FROM serien_capability.lifecycle_jobs WHERE id=p_job FOR UPDATE;
 PERFORM serien_capability.control_ceiling(j.workspace_id,j.scope);
 IF j.state='ACTIVE' THEN
  IF NOT EXISTS(SELECT FROM serien_capability.devices WHERE id=j.device_id AND workspace_id=j.workspace_id AND revoked_at IS NULL AND epoch=j.target_epoch AND key_version=j.target_key_version)
   OR NOT EXISTS(SELECT FROM serien_capability.workspaces WHERE id=j.workspace_id AND auth_epoch=j.target_workspace_epoch) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN serien_capability.job_response(j);
 END IF;
 IF j.state<>'ACTIVATING' OR j.grant_expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
 PERFORM serien_capability.safe_device_role(j.role_name,true);
 IF NOT EXISTS(SELECT FROM pg_catalog.pg_roles WHERE rolname=j.role_name AND rolcanlogin) THEN RAISE EXCEPTION 'PRINCIPAL_NOT_READY'; END IF;
 IF NOT EXISTS(SELECT FROM serien_capability.workspaces WHERE id=j.workspace_id AND auth_epoch=j.original_workspace_epoch) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 PERFORM 1 FROM serien_capability.device_locks WHERE workspace_id=j.workspace_id AND device_id=j.device_id FOR UPDATE;
 IF j.kind='RECOVER' THEN
  IF NOT EXISTS(SELECT FROM serien_capability.recovery_verifiers WHERE workspace_id=j.workspace_id AND version=j.recovery_version AND reserved_job=j.id AND consumed_at IS NULL AND revoked_at IS NULL) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  UPDATE serien_capability.devices SET revoked_at=clock_timestamp(),epoch=epoch+1 WHERE workspace_id=j.workspace_id AND id<>j.device_id;
  UPDATE serien_capability.workspaces SET auth_epoch=j.target_workspace_epoch WHERE id=j.workspace_id;
  UPDATE serien_capability.invitations SET revoked_at=clock_timestamp() WHERE workspace_id=j.workspace_id AND revoked_at IS NULL;
  UPDATE serien_capability.lifecycle_jobs SET state='REVOKED',resume_state=NULL WHERE workspace_id=j.workspace_id AND id<>j.id AND state NOT IN('REVOKED','FAILED');
  UPDATE serien_capability.recovery_verifiers SET consumed_at=clock_timestamp() WHERE workspace_id=j.workspace_id AND version=j.recovery_version AND reserved_job=j.id;
 ELSIF j.kind='ROTATE' THEN
  IF NOT EXISTS(SELECT FROM serien_capability.devices WHERE id=j.device_id AND workspace_id=j.workspace_id AND epoch=j.target_epoch-1 AND key_version=j.target_key_version-1 AND revoked_at IS NULL) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  UPDATE serien_capability.lifecycle_jobs SET state='REVOKED',resume_state=NULL WHERE device_id=j.device_id AND id<>j.id AND state NOT IN('REVOKED','FAILED');
 END IF;
 UPDATE serien_capability.devices SET public_key=j.public_key,scope=j.scope,epoch=j.target_epoch,key_version=j.target_key_version,revoked_at=NULL,expires_at=j.grant_expires_at WHERE id=j.device_id AND workspace_id=j.workspace_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 UPDATE serien_capability.lifecycle_jobs SET state='ACTIVE',activated_at=clock_timestamp() WHERE id=j.id RETURNING * INTO j;
 PERFORM serien_capability.record_job(j.id);
 RETURN serien_capability.job_response(j);
END $$;


ALTER FUNCTION serien_capability.complete_device_job(p_job uuid) OWNER TO serien_tm_lifecycle_executor;

--
-- Name: consume_budget(uuid, uuid); Type: FUNCTION; Schema: serien_capability; Owner: postgres
--

CREATE FUNCTION serien_capability.consume_budget(w uuid, d uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION serien_capability.consume_budget(w uuid, d uuid) OWNER TO postgres;

--
-- Name: control_access(uuid, text); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

CREATE FUNCTION serien_capability.control_access(w uuid, operation text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE b serien_capability.control_bindings%ROWTYPE;
BEGIN
 SELECT * INTO b FROM serien_capability.control_bindings WHERE role_name=session_user AND workspace_id=w;
 IF b.role_name IS NULL OR operation NOT IN('approve','redeem','provision','read') OR operation IS NULL
  OR (operation='approve' AND NOT b.can_approve) OR (operation='redeem' AND NOT b.can_redeem)
  OR (operation='provision' AND NOT b.can_provision) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 PERFORM 1 FROM serien_capability.workspace_locks WHERE workspace_id=w FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT FROM serien_capability.workspaces WHERE id=w AND status='active') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
END $$;


ALTER FUNCTION serien_capability.control_access(w uuid, operation text) OWNER TO serien_tm_lifecycle_executor;

--
-- Name: control_ceiling(uuid, text); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

CREATE FUNCTION serien_capability.control_ceiling(w uuid, requested_scope text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE ceiling text;
BEGIN
 SELECT max_scope INTO ceiling FROM serien_capability.control_bindings WHERE role_name=session_user AND workspace_id=w;
 IF ceiling IS NULL OR requested_scope IS NULL OR requested_scope NOT IN('reader','editor','owner')
  OR array_position(ARRAY['reader','editor','owner'],requested_scope)>array_position(ARRAY['reader','editor','owner'],ceiling)
 THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
END $$;


ALTER FUNCTION serien_capability.control_ceiling(w uuid, requested_scope text) OWNER TO serien_tm_lifecycle_executor;

--
-- Name: control_scope(uuid); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

CREATE FUNCTION serien_capability.control_scope(w uuid) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
 SELECT EXISTS(SELECT FROM serien_capability.control_bindings WHERE role_name=session_user AND workspace_id=w)
$$;


ALTER FUNCTION serien_capability.control_scope(w uuid) OWNER TO serien_tm_lifecycle_executor;

--
-- Name: coordinate_authority(); Type: FUNCTION; Schema: serien_capability; Owner: postgres
--

CREATE FUNCTION serien_capability.coordinate_authority() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
 IF TG_TABLE_NAME='workspaces' THEN
 PERFORM 1 FROM serien_capability.workspace_locks WHERE workspace_id=OLD.id FOR UPDATE;
 ELSE
 PERFORM 1 FROM serien_capability.workspace_locks WHERE workspace_id=OLD.workspace_id FOR UPDATE;
 END IF;
 IF TG_TABLE_NAME='devices' THEN PERFORM 1 FROM serien_capability.device_locks WHERE workspace_id=OLD.workspace_id AND device_id=OLD.id FOR UPDATE; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;


ALTER FUNCTION serien_capability.coordinate_authority() OWNER TO postgres;

--
-- Name: immutable_checkpoint(); Type: FUNCTION; Schema: serien_capability; Owner: postgres
--

CREATE FUNCTION serien_capability.immutable_checkpoint() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$ BEGIN RAISE EXCEPTION 'IMMUTABLE_CHECKPOINT'; END $$;


ALTER FUNCTION serien_capability.immutable_checkpoint() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: lifecycle_jobs; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.lifecycle_jobs (
    id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    device_id uuid NOT NULL,
    role_name name NOT NULL,
    kind text NOT NULL,
    state text NOT NULL,
    resume_state text,
    public_key jsonb NOT NULL,
    scope text NOT NULL,
    ticket_verifier text NOT NULL,
    recovery_version bigint,
    original_workspace_epoch bigint NOT NULL,
    target_workspace_epoch bigint NOT NULL,
    target_epoch bigint NOT NULL,
    target_key_version integer NOT NULL,
    manifest jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    grant_expires_at timestamp with time zone NOT NULL,
    approved_by name,
    consumed_at timestamp with time zone,
    activated_at timestamp with time zone,
    CONSTRAINT lifecycle_jobs_check CHECK ((expires_at > created_at)),
    CONSTRAINT lifecycle_jobs_check1 CHECK ((grant_expires_at > created_at)),
    CONSTRAINT lifecycle_jobs_check2 CHECK (((state = 'RECOVERABLE'::text) = (resume_state IS NOT NULL))),
    CONSTRAINT lifecycle_jobs_check3 CHECK (((kind = 'RECOVER'::text) = (recovery_version IS NOT NULL))),
    CONSTRAINT lifecycle_jobs_check4 CHECK (((state <> ALL (ARRAY['APPROVED'::text, 'ACTIVATING'::text, 'ACTIVE'::text])) OR (approved_by IS NOT NULL))),
    CONSTRAINT lifecycle_jobs_check5 CHECK (((state <> ALL (ARRAY['ACTIVATING'::text, 'ACTIVE'::text])) OR (consumed_at IS NOT NULL))),
    CONSTRAINT lifecycle_jobs_check6 CHECK (((state <> 'ACTIVE'::text) OR (activated_at IS NOT NULL))),
    CONSTRAINT lifecycle_jobs_kind_check CHECK ((kind = ANY (ARRAY['PAIR'::text, 'ROTATE'::text, 'RECOVER'::text]))),
    CONSTRAINT lifecycle_jobs_original_workspace_epoch_check CHECK ((original_workspace_epoch > 0)),
    CONSTRAINT lifecycle_jobs_resume_state_check CHECK ((resume_state = ANY (ARRAY['PREPARED'::text, 'APPROVED'::text, 'ACTIVATING'::text]))),
    CONSTRAINT lifecycle_jobs_scope_check CHECK ((scope = ANY (ARRAY['reader'::text, 'editor'::text, 'owner'::text]))),
    CONSTRAINT lifecycle_jobs_state_check CHECK ((state = ANY (ARRAY['PREPARED'::text, 'APPROVED'::text, 'ACTIVATING'::text, 'ACTIVE'::text, 'REVOKED'::text, 'FAILED'::text, 'RECOVERABLE'::text]))),
    CONSTRAINT lifecycle_jobs_target_epoch_check CHECK ((target_epoch > 0)),
    CONSTRAINT lifecycle_jobs_target_key_version_check CHECK ((target_key_version > 0)),
    CONSTRAINT lifecycle_jobs_target_workspace_epoch_check CHECK ((target_workspace_epoch > 0)),
    CONSTRAINT lifecycle_jobs_ticket_verifier_check CHECK ((ticket_verifier ~ '^[0-9a-f]{64}$'::text))
);

ALTER TABLE ONLY serien_capability.lifecycle_jobs FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.lifecycle_jobs OWNER TO postgres;

--
-- Name: job_response(serien_capability.lifecycle_jobs); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

CREATE FUNCTION serien_capability.job_response(j serien_capability.lifecycle_jobs) RETURNS jsonb
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
 SELECT jsonb_build_object('jobId',j.id,'workspaceId',j.workspace_id,'deviceId',j.device_id,'principal',j.role_name,
 'state',j.state,'epoch',j.target_epoch,'keyVersion',j.target_key_version,'workspaceEpoch',j.target_workspace_epoch,
 'activatedAt',j.activated_at)
$$;


ALTER FUNCTION serien_capability.job_response(j serien_capability.lifecycle_jobs) OWNER TO serien_tm_lifecycle_executor;

--
-- Name: list_history(uuid, uuid, bigint, integer, bigint); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_executor
--

CREATE FUNCTION serien_capability.list_history(w uuid, l uuid, after_revision bigint DEFAULT 0, page_size integer DEFAULT 20, through_revision bigint DEFAULT NULL::bigint) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION serien_capability.list_history(w uuid, l uuid, after_revision bigint, page_size integer, through_revision bigint) OWNER TO serien_tm_executor;

--
-- Name: manifest_refs(jsonb); Type: FUNCTION; Schema: serien_capability; Owner: postgres
--

CREATE FUNCTION serien_capability.manifest_refs(v jsonb) RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('modelId',m->'id','revision',m->'revision','asset',m->'asset') ORDER BY ord),'[]'::jsonb)
 FROM jsonb_array_elements(v->'models') WITH ORDINALITY e(m,ord)
$$;


ALTER FUNCTION serien_capability.manifest_refs(v jsonb) OWNER TO postgres;

--
-- Name: monotone_head(); Type: FUNCTION; Schema: serien_capability; Owner: postgres
--

CREATE FUNCTION serien_capability.monotone_head() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
 IF NEW.workspace_id<>OLD.workspace_id OR NEW.layout_id<>OLD.layout_id OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'REVISION_NOT_CONTIGUOUS' USING errcode='23514'; END IF;
 RETURN NEW;
END $$;


ALTER FUNCTION serien_capability.monotone_head() OWNER TO postgres;

--
-- Name: prepare_device_job(uuid, uuid, uuid, name, text, jsonb, text, text, bigint); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

CREATE FUNCTION serien_capability.prepare_device_job(p_job uuid, w uuid, d uuid, principal name, kind text, key jsonb, scope text, ticket_verifier text, recovery_version bigint DEFAULT NULL::bigint) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
DECLARE j serien_capability.lifecycle_jobs%ROWTYPE; old serien_capability.devices%ROWTYPE;
 lim serien_capability.lifecycle_limits%ROWTYPE; m jsonb; we bigint; de bigint:=1; kv integer:=1;
BEGIN
 PERFORM serien_capability.control_access(w,'approve');
 IF p_job IS NULL OR d IS NULL OR principal IS NULL OR kind IS NULL OR kind NOT IN('PAIR','ROTATE','RECOVER') OR scope IS NULL OR scope NOT IN('reader','editor','owner')
  OR ticket_verifier IS NULL OR ticket_verifier !~ '^[0-9a-f]{64}$' OR key IS NULL OR jsonb_typeof(key)<>'object' OR octet_length(key::text)>2048
  OR key->>'kty' IS DISTINCT FROM 'EC' OR key->>'crv' IS DISTINCT FROM 'P-256'
  OR coalesce(key->>'x','') !~ '^[A-Za-z0-9_-]{43}$' OR coalesce(key->>'y','') !~ '^[A-Za-z0-9_-]{43}$'
  OR EXISTS(SELECT FROM jsonb_object_keys(key) k WHERE k NOT IN('kty','crv','x','y','ext','key_ops'))
  OR (key ? 'ext' AND key->'ext' IS DISTINCT FROM 'true'::jsonb)
  OR (key ? 'key_ops' AND key->'key_ops' IS DISTINCT FROM '["verify"]'::jsonb)
  OR (kind='RECOVER' AND (scope<>'owner' OR recovery_version IS NULL OR recovery_version<1))
  OR (kind<>'RECOVER' AND recovery_version IS NOT NULL) THEN RAISE EXCEPTION 'INVALID_JOB'; END IF;
 m:=jsonb_build_object('id',p_job,'workspace',w,'device',d,'principal',principal,'kind',kind,'key',key,'scope',scope,'ticket',ticket_verifier,'recoveryVersion',recovery_version);
 SELECT * INTO j FROM serien_capability.lifecycle_jobs WHERE id=p_job;
 IF FOUND THEN
  IF j.manifest IS DISTINCT FROM m THEN RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED'; END IF;
  RETURN serien_capability.job_response(j);
 END IF;
 SELECT * INTO lim FROM serien_capability.lifecycle_limits WHERE workspace_id=w;
 IF lim.workspace_id IS NULL THEN RAISE EXCEPTION 'LIMITS_NOT_PROVISIONED'; END IF;
 IF (SELECT count(*) FROM serien_capability.lifecycle_jobs WHERE workspace_id=w)>=lim.max_jobs
  OR (kind<>'ROTATE' AND (SELECT count(*) FROM serien_capability.devices WHERE workspace_id=w)>=lim.max_devices) THEN RAISE EXCEPTION 'LIFECYCLE_QUOTA'; END IF;
 PERFORM serien_capability.control_ceiling(w,scope);
 PERFORM serien_capability.safe_device_role(principal,false);
 IF EXISTS(SELECT FROM serien_capability.worker_bindings WHERE role_name=principal) THEN RAISE EXCEPTION 'UNSAFE_PRINCIPAL'; END IF;
 SELECT * INTO old FROM serien_capability.devices WHERE id=d AND workspace_id=w;
 IF kind='ROTATE' THEN
  IF old.id IS NULL OR old.revoked_at IS NOT NULL OR old.scope IS DISTINCT FROM scope OR old.public_key=key OR (old.expires_at IS NOT NULL AND old.expires_at<=clock_timestamp()) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  de:=old.epoch+1; kv:=old.key_version+1;
 ELSIF old.id IS NOT NULL OR EXISTS(SELECT FROM serien_capability.devices WHERE id=d) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT auth_epoch INTO we FROM serien_capability.workspaces WHERE id=w;
 INSERT INTO serien_capability.lifecycle_jobs(id,workspace_id,device_id,role_name,kind,state,public_key,scope,ticket_verifier,recovery_version,original_workspace_epoch,target_workspace_epoch,target_epoch,target_key_version,manifest,expires_at,grant_expires_at)
 VALUES(p_job,w,d,principal,kind,'PREPARED',key,scope,ticket_verifier,recovery_version,we,we+CASE WHEN kind='RECOVER' THEN 1 ELSE 0 END,de,kv,m,clock_timestamp()+make_interval(secs=>lim.ticket_seconds),clock_timestamp()+make_interval(secs=>lim.grant_seconds)) RETURNING * INTO j;
 PERFORM serien_capability.record_job(j.id);
 RETURN serien_capability.job_response(j);
END $_$;


ALTER FUNCTION serien_capability.prepare_device_job(p_job uuid, w uuid, d uuid, principal name, kind text, key jsonb, scope text, ticket_verifier text, recovery_version bigint) OWNER TO serien_tm_lifecycle_executor;

--
-- Name: profile_canonical_v1(jsonb); Type: FUNCTION; Schema: serien_capability; Owner: postgres
--

CREATE FUNCTION serien_capability.profile_canonical_v1(v jsonb) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO ''
    AS $_$
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
END $_$;


ALTER FUNCTION serien_capability.profile_canonical_v1(v jsonb) OWNER TO postgres;

--
-- Name: read_device_job(uuid); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

CREATE FUNCTION serien_capability.read_device_job(p_job uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE j serien_capability.lifecycle_jobs%ROWTYPE;
BEGIN
 SELECT * INTO j FROM serien_capability.lifecycle_jobs WHERE id=p_job;
 IF j.id IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 PERFORM serien_capability.control_access(j.workspace_id,'read');
 RETURN serien_capability.job_response(j);
END $$;


ALTER FUNCTION serien_capability.read_device_job(p_job uuid) OWNER TO serien_tm_lifecycle_executor;

--
-- Name: read_head(uuid, uuid); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_executor
--

CREATE FUNCTION serien_capability.read_head(w uuid, l uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION serien_capability.read_head(w uuid, l uuid) OWNER TO serien_tm_executor;

--
-- Name: read_receipt(uuid, uuid, uuid); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_executor
--

CREATE FUNCTION serien_capability.read_receipt(w uuid, l uuid, req uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE d uuid; r public.operation_receipts%ROWTYPE;
BEGIN
 d:=serien_capability.authorize(w,l); PERFORM serien_capability.consume_budget(w,d);
 SELECT * INTO r FROM public.operation_receipts WHERE workspace_id=w AND layout_id=l AND request_id=req AND result->>'actor'=d::text;
 IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
 INSERT INTO serien_capability.audit_events(workspace_id,device_id,event,request_id,revision) VALUES(w,d,'ReadReceipt',req,r.revision);
 RETURN serien_capability.bounded_response(w,serien_capability.receipt_response(r));
END $$;


ALTER FUNCTION serien_capability.read_receipt(w uuid, l uuid, req uuid) OWNER TO serien_tm_executor;

--
-- Name: read_snapshot(uuid, uuid, bigint); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_executor
--

CREATE FUNCTION serien_capability.read_snapshot(w uuid, l uuid, r bigint) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE d uuid; s public.layout_snapshots%ROWTYPE;
BEGIN
 d:=serien_capability.authorize(w,l); PERFORM serien_capability.consume_budget(w,d);
 s:=serien_capability.verify_snapshot(w,l,r);
 INSERT INTO serien_capability.audit_events(workspace_id,device_id,event,revision) VALUES(w,d,'ReadSnapshot',r);
 RETURN serien_capability.bounded_response(w,jsonb_build_object('revision',r::text,'snapshotId',s.id,'state',s.payload,'stateDigest',s.state_digest,'envelopeDigest',s.payload_digest,'canonicalVersion',s.canonical_version,'schemaVersion',s.snapshot_schema,'engineRevision',s.engine_revision,'topologyHash',s.topology_hash,'assetRefs',s.asset_refs));
END $$;


ALTER FUNCTION serien_capability.read_snapshot(w uuid, l uuid, r bigint) OWNER TO serien_tm_executor;

--
-- Name: operation_receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.operation_receipts (
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    request_id uuid NOT NULL,
    op_type text NOT NULL,
    payload_digest text NOT NULL,
    result jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid,
    ownership_key text GENERATED ALWAYS AS (
CASE
    WHEN (workspace_id IS NULL) THEN ('legacy:'::text || (owner_id)::text)
    ELSE ('workspace:'::text || (workspace_id)::text)
END) STORED,
    layout_id uuid,
    snapshot_id uuid,
    revision bigint,
    receipt_id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_context jsonb,
    receipt_version integer,
    auth_context jsonb,
    CONSTRAINT operation_receipts_op_type_check CHECK (((length(op_type) >= 1) AND (length(op_type) <= 120))),
    CONSTRAINT operation_receipts_payload_digest_check CHECK ((payload_digest ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT operation_receipts_result_check CHECK ((jsonb_typeof(result) = 'object'::text)),
    CONSTRAINT operation_receipts_revision_check CHECK (((revision IS NULL) OR (revision > 0))),
    CONSTRAINT receipt_context_complete CHECK (((workspace_id IS NULL) OR ((request_context IS NOT NULL) AND (receipt_version IS NOT NULL) AND (receipt_version = ANY (ARRAY[1, 2])) AND ((receipt_version = 1) OR (auth_context IS NOT NULL)) AND (NOT (result ? 'envelope'::text)) AND (NOT (request_context ? 'state'::text))))),
    CONSTRAINT receipt_workspace_complete CHECK (((workspace_id IS NULL) OR ((layout_id IS NOT NULL) AND (snapshot_id IS NOT NULL) AND (revision IS NOT NULL))))
);


ALTER TABLE public.operation_receipts OWNER TO postgres;

--
-- Name: receipt_response(public.operation_receipts); Type: FUNCTION; Schema: serien_capability; Owner: postgres
--

CREATE FUNCTION serien_capability.receipt_response(r public.operation_receipts) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE s public.layout_snapshots%ROWTYPE; BEGIN
 s:=serien_capability.verify_snapshot(r.workspace_id,r.layout_id,r.revision);
 IF r.receipt_version=1 THEN RETURN r.result||jsonb_build_object('envelope',r.request_context||jsonb_build_object('state',s.payload)); END IF;
 RETURN r.result;
END $$;


ALTER FUNCTION serien_capability.receipt_response(r public.operation_receipts) OWNER TO postgres;

--
-- Name: record_job(uuid); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

CREATE FUNCTION serien_capability.record_job(p_job uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE j serien_capability.lifecycle_jobs%ROWTYPE; cap integer;
BEGIN
 SELECT * INTO STRICT j FROM serien_capability.lifecycle_jobs WHERE id=p_job;
 SELECT max_events INTO cap FROM serien_capability.lifecycle_limits WHERE workspace_id=j.workspace_id;
 IF cap IS NULL OR (SELECT count(*) FROM serien_capability.lifecycle_events WHERE workspace_id=j.workspace_id)>=cap THEN RAISE EXCEPTION 'LIFECYCLE_QUOTA'; END IF;
 INSERT INTO serien_capability.lifecycle_events(workspace_id,job_id,state,actor) VALUES(j.workspace_id,j.id,j.state,session_user);
END $$;


ALTER FUNCTION serien_capability.record_job(p_job uuid) OWNER TO serien_tm_lifecycle_executor;

--
-- Name: recover_revision(uuid, uuid, bigint, bigint, uuid); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_executor
--

CREATE FUNCTION serien_capability.recover_revision(w uuid, l uuid, expected bigint, source_revision bigint, req uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION serien_capability.recover_revision(w uuid, l uuid, expected bigint, source_revision bigint, req uuid) OWNER TO serien_tm_executor;

--
-- Name: redeem_device_job(uuid, jsonb, text, text); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

CREATE FUNCTION serien_capability.redeem_device_job(p_job uuid, key jsonb, ticket text, recovery_verifier text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE j serien_capability.lifecycle_jobs%ROWTYPE; rv serien_capability.recovery_verifiers%ROWTYPE;
BEGIN
 SELECT * INTO j FROM serien_capability.lifecycle_jobs WHERE id=p_job;
 IF j.id IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 PERFORM serien_capability.control_access(j.workspace_id,'redeem');
 SELECT * INTO j FROM serien_capability.lifecycle_jobs WHERE id=p_job FOR UPDATE;
 PERFORM serien_capability.control_ceiling(j.workspace_id,j.scope);
 IF j.public_key IS DISTINCT FROM key OR j.ticket_verifier IS DISTINCT FROM ticket THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF j.kind='RECOVER' THEN
  SELECT * INTO rv FROM serien_capability.recovery_verifiers WHERE workspace_id=j.workspace_id AND version=j.recovery_version FOR UPDATE;
  IF rv.workspace_id IS NULL OR rv.verifier IS DISTINCT FROM recovery_verifier OR rv.revoked_at IS NOT NULL
   OR (rv.reserved_job IS NOT NULL AND rv.reserved_job<>j.id) OR (rv.consumed_at IS NOT NULL AND rv.reserved_job IS DISTINCT FROM j.id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 ELSIF recovery_verifier IS NOT NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 IF j.state IN('ACTIVATING','ACTIVE') THEN RETURN serien_capability.job_response(j); END IF;
 IF j.state<>'APPROVED' OR j.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
 IF NOT EXISTS(SELECT FROM serien_capability.workspaces WHERE id=j.workspace_id AND auth_epoch=j.original_workspace_epoch) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 PERFORM serien_capability.safe_device_role(j.role_name,false);
 IF j.kind='ROTATE' THEN
  PERFORM 1 FROM serien_capability.device_locks WHERE workspace_id=j.workspace_id AND device_id=j.device_id FOR UPDATE;
  IF NOT EXISTS(SELECT FROM serien_capability.devices WHERE id=j.device_id AND workspace_id=j.workspace_id AND revoked_at IS NULL AND epoch=j.target_epoch-1 AND key_version=j.target_key_version-1) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 ELSE
  IF (SELECT count(*) FROM serien_capability.devices WHERE workspace_id=j.workspace_id)>=(SELECT max_devices FROM serien_capability.lifecycle_limits WHERE workspace_id=j.workspace_id) THEN RAISE EXCEPTION 'LIFECYCLE_QUOTA'; END IF;
  INSERT INTO serien_capability.devices(id,workspace_id,public_key,scope,revoked_at,expires_at) VALUES(j.device_id,j.workspace_id,j.public_key,j.scope,clock_timestamp(),j.grant_expires_at);
  INSERT INTO serien_capability.device_locks(workspace_id,device_id) VALUES(j.workspace_id,j.device_id);
 END IF;
 INSERT INTO serien_capability.worker_bindings VALUES(j.role_name,j.workspace_id);
 INSERT INTO serien_capability.device_bindings(role_name,workspace_id,device_id,device_epoch,workspace_epoch,key_version) VALUES(j.role_name,j.workspace_id,j.device_id,j.target_epoch,j.target_workspace_epoch,j.target_key_version);
 IF j.kind='RECOVER' THEN UPDATE serien_capability.recovery_verifiers SET reserved_job=j.id WHERE workspace_id=j.workspace_id AND version=j.recovery_version; END IF;
 UPDATE serien_capability.lifecycle_jobs SET state='ACTIVATING',consumed_at=clock_timestamp() WHERE id=j.id RETURNING * INTO j;
 PERFORM serien_capability.record_job(j.id);
 RETURN serien_capability.job_response(j);
END $$;


ALTER FUNCTION serien_capability.redeem_device_job(p_job uuid, key jsonb, ticket text, recovery_verifier text) OWNER TO serien_tm_lifecycle_executor;

--
-- Name: revoke_device(uuid, uuid); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

CREATE FUNCTION serien_capability.revoke_device(w uuid, d uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE device_scope text;
BEGIN
 PERFORM serien_capability.control_access(w,'approve');
 PERFORM 1 FROM serien_capability.device_locks WHERE workspace_id=w AND device_id=d FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 SELECT scope INTO device_scope FROM serien_capability.devices WHERE id=d AND workspace_id=w;
 PERFORM serien_capability.control_ceiling(w,device_scope);
 UPDATE serien_capability.devices SET revoked_at=clock_timestamp(),epoch=epoch+1 WHERE id=d AND workspace_id=w AND revoked_at IS NULL;
 UPDATE serien_capability.lifecycle_jobs SET state='REVOKED',resume_state=NULL WHERE device_id=d AND workspace_id=w AND state NOT IN('REVOKED','FAILED');
END $$;


ALTER FUNCTION serien_capability.revoke_device(w uuid, d uuid) OWNER TO serien_tm_lifecycle_executor;

--
-- Name: safe_device_role(name, boolean); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

CREATE FUNCTION serien_capability.safe_device_role(principal name, allow_login boolean) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE r record; t record;
BEGIN
 SELECT * INTO r FROM pg_catalog.pg_roles WHERE rolname=principal;
 IF r.oid IS NULL OR r.rolsuper OR r.rolbypassrls OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication
  OR (r.rolcanlogin AND NOT allow_login)
  OR NOT EXISTS(SELECT FROM pg_catalog.pg_auth_members WHERE member=r.oid AND roleid='serien_tm_worker'::regrole AND NOT admin_option)
  OR EXISTS(SELECT FROM pg_catalog.pg_auth_members WHERE member=r.oid AND (roleid<>'serien_tm_worker'::regrole OR admin_option))
  OR EXISTS(SELECT FROM pg_catalog.pg_auth_members WHERE member='serien_tm_worker'::regrole)
  OR EXISTS(SELECT FROM pg_catalog.pg_class WHERE relowner=r.oid)
  OR EXISTS(SELECT FROM pg_catalog.pg_namespace WHERE nspowner=r.oid)
  OR EXISTS(SELECT FROM pg_catalog.pg_proc WHERE proowner=r.oid)
 THEN RAISE EXCEPTION 'UNSAFE_PRINCIPAL'; END IF;
 FOR t IN SELECT n.nspname,c.relname,c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','serien_capability') AND c.relkind IN('r','p','v','m') LOOP
  IF pg_catalog.has_table_privilege(principal,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
   OR pg_catalog.has_any_column_privilege(principal,t.oid,'SELECT,INSERT,UPDATE,REFERENCES') THEN RAISE EXCEPTION 'UNSAFE_PRINCIPAL'; END IF;
 END LOOP;
 IF pg_catalog.has_schema_privilege(principal,'serien_capability','CREATE') OR pg_catalog.has_schema_privilege(principal,'public','CREATE') THEN RAISE EXCEPTION 'UNSAFE_PRINCIPAL'; END IF;
END $$;


ALTER FUNCTION serien_capability.safe_device_role(principal name, allow_login boolean) OWNER TO serien_tm_lifecycle_executor;

--
-- Name: save_checkpoint(uuid, text, text); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_executor
--

CREATE FUNCTION serien_capability.save_checkpoint(p_request uuid, p_wire text, p_digest text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
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
END $_$;


ALTER FUNCTION serien_capability.save_checkpoint(p_request uuid, p_wire text, p_digest text) OWNER TO serien_tm_executor;

--
-- Name: set_recovery_verifier(uuid, bigint, text, integer); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

CREATE FUNCTION serien_capability.set_recovery_verifier(w uuid, v bigint, verifier text, pepper_version integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
DECLARE old serien_capability.recovery_verifiers%ROWTYPE;
BEGIN
 PERFORM serien_capability.control_access(w,'approve');
 PERFORM serien_capability.control_ceiling(w,'owner');
 IF v IS NULL OR v<1 OR verifier IS NULL OR verifier !~ '^[0-9a-f]{64}$' OR pepper_version IS NULL OR pepper_version<1 THEN RAISE EXCEPTION 'INVALID_RECOVERY'; END IF;
 SELECT * INTO old FROM serien_capability.recovery_verifiers WHERE workspace_id=w AND version=v;
 IF FOUND THEN
  IF old.verifier IS DISTINCT FROM verifier OR old.pepper_version IS DISTINCT FROM pepper_version OR old.consumed_at IS NOT NULL OR old.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED'; END IF;
  RETURN;
 END IF;
 IF v<>(SELECT coalesce(max(version),0)+1 FROM serien_capability.recovery_verifiers WHERE workspace_id=w) THEN RAISE EXCEPTION 'INVALID_RECOVERY'; END IF;
 IF EXISTS(SELECT FROM serien_capability.recovery_verifiers WHERE workspace_id=w AND reserved_job IS NOT NULL AND consumed_at IS NULL AND revoked_at IS NULL) THEN RAISE EXCEPTION 'RECOVERY_PENDING'; END IF;
 UPDATE serien_capability.recovery_verifiers SET revoked_at=clock_timestamp() WHERE workspace_id=w AND consumed_at IS NULL AND revoked_at IS NULL;
 INSERT INTO serien_capability.recovery_verifiers(workspace_id,version,verifier,pepper_version) VALUES(w,v,verifier,pepper_version);
END $_$;


ALTER FUNCTION serien_capability.set_recovery_verifier(w uuid, v bigint, verifier text, pepper_version integer) OWNER TO serien_tm_lifecycle_executor;

--
-- Name: state_hash(jsonb); Type: FUNCTION; Schema: serien_capability; Owner: postgres
--

CREATE FUNCTION serien_capability.state_hash(v jsonb) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO ''
    AS $$ SELECT encode(sha256(convert_to(serien_capability.profile_canonical_v1(v),'UTF8')),'hex') $$;


ALTER FUNCTION serien_capability.state_hash(v jsonb) OWNER TO postgres;

--
-- Name: storage_usage(uuid); Type: FUNCTION; Schema: serien_capability; Owner: postgres
--

CREATE FUNCTION serien_capability.storage_usage(w uuid) RETURNS bigint
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
 SELECT coalesce((SELECT sum(octet_length(payload::text)+octet_length(asset_refs::text)+256) FROM public.layout_snapshots WHERE workspace_id=w),0)
 +coalesce((SELECT sum(octet_length(result::text)+octet_length(request_context::text)+octet_length(coalesce(auth_context,'{}')::text)+256) FROM public.operation_receipts WHERE workspace_id=w),0)
$$;


ALTER FUNCTION serien_capability.storage_usage(w uuid) OWNER TO postgres;

--
-- Name: transition_failed_job(uuid, text); Type: FUNCTION; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

CREATE FUNCTION serien_capability.transition_failed_job(p_job uuid, action text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE j serien_capability.lifecycle_jobs%ROWTYPE;
BEGIN
 SELECT * INTO j FROM serien_capability.lifecycle_jobs WHERE id=p_job;
 IF j.id IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 PERFORM serien_capability.control_access(j.workspace_id,'provision');
 SELECT * INTO j FROM serien_capability.lifecycle_jobs WHERE id=p_job FOR UPDATE;
 PERFORM serien_capability.control_ceiling(j.workspace_id,j.scope);
 IF action='fault' AND j.state IN('PREPARED','APPROVED','ACTIVATING') THEN
  UPDATE serien_capability.lifecycle_jobs SET resume_state=state,state='RECOVERABLE' WHERE id=j.id;
 ELSIF action='resume' AND j.state='RECOVERABLE' THEN
  IF j.expires_at<=clock_timestamp() AND j.resume_state<>'ACTIVATING' THEN RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
  UPDATE serien_capability.lifecycle_jobs SET state=resume_state,resume_state=NULL WHERE id=j.id;
 ELSIF action='fail' AND j.state IN('PREPARED','APPROVED','ACTIVATING','RECOVERABLE') THEN
  UPDATE serien_capability.lifecycle_jobs SET state='FAILED',resume_state=NULL WHERE id=j.id;
  UPDATE serien_capability.recovery_verifiers SET revoked_at=clock_timestamp() WHERE reserved_job=j.id AND consumed_at IS NULL;
 ELSE RAISE EXCEPTION 'INVALID_TRANSITION'; END IF;
 SELECT * INTO j FROM serien_capability.lifecycle_jobs WHERE id=p_job;
 PERFORM serien_capability.record_job(j.id);
 RETURN serien_capability.job_response(j);
END $$;


ALTER FUNCTION serien_capability.transition_failed_job(p_job uuid, action text) OWNER TO serien_tm_lifecycle_executor;

--
-- Name: layout_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.layout_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    layout_id uuid NOT NULL,
    revision bigint NOT NULL,
    snapshot_schema integer DEFAULT 1 NOT NULL,
    payload jsonb NOT NULL,
    saved_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid,
    ownership_key text GENERATED ALWAYS AS (
CASE
    WHEN (workspace_id IS NULL) THEN ('legacy:'::text || (owner_id)::text)
    ELSE ('workspace:'::text || (workspace_id)::text)
END) STORED,
    payload_digest text,
    state_digest text,
    canonical_version text,
    engine_revision text,
    topology_hash text,
    asset_refs jsonb,
    CONSTRAINT layout_snapshots_payload_check CHECK ((jsonb_typeof(payload) = 'object'::text)),
    CONSTRAINT layout_snapshots_payload_digest_check CHECK (((payload_digest IS NULL) OR (payload_digest ~ '^[0-9a-f]{64}$'::text))),
    CONSTRAINT layout_snapshots_revision_check CHECK ((revision >= 0)),
    CONSTRAINT layout_snapshots_snapshot_schema_check CHECK ((snapshot_schema > 0)),
    CONSTRAINT layout_snapshots_state_digest_check CHECK ((state_digest ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT snapshot_integrity_metadata CHECK (((workspace_id IS NULL) OR ((state_digest IS NOT NULL) AND (canonical_version IS NOT NULL) AND (canonical_version = 'jcs-profile-v1'::text) AND (engine_revision IS NOT NULL) AND (topology_hash IS NOT NULL) AND (asset_refs IS NOT NULL))))
);


ALTER TABLE public.layout_snapshots OWNER TO postgres;

--
-- Name: verify_snapshot(uuid, uuid, bigint); Type: FUNCTION; Schema: serien_capability; Owner: postgres
--

CREATE FUNCTION serien_capability.verify_snapshot(w uuid, l uuid, r bigint) RETURNS public.layout_snapshots
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
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


ALTER FUNCTION serien_capability.verify_snapshot(w uuid, l uuid, r bigint) OWNER TO postgres;

--
-- Name: assert_ready_consist(uuid); Type: FUNCTION; Schema: serien_internal; Owner: postgres
--

CREATE FUNCTION serien_internal.assert_ready_consist(p_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare v_status text; v_total bigint; v_min integer; v_max integer;
begin
 select status into v_status from public.consists where id=p_id;
 if v_status is distinct from 'ready' then return;end if;
 select count(*),min(ordinal),max(ordinal) into v_total,v_min,v_max from public.consist_members where consist_id=p_id;
 if v_total=0 or v_min<>0 or v_max<>v_total-1 then raise exception 'Ready consist needs consecutive ordinal positions from zero' using errcode='23514';end if;
end;$$;


ALTER FUNCTION serien_internal.assert_ready_consist(p_id uuid) OWNER TO postgres;

--
-- Name: check_loose_assignment(); Type: FUNCTION; Schema: serien_internal; Owner: postgres
--

CREATE FUNCTION serien_internal.check_loose_assignment() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
 perform 1 from public.stock_items where id=new.stock_item_id for update;
 if exists(select 1 from public.consist_members where stock_item_id=new.stock_item_id) then raise exception 'Item already in consist' using errcode='23514';end if;
 return new;
end;$$;


ALTER FUNCTION serien_internal.check_loose_assignment() OWNER TO postgres;

--
-- Name: check_member_assignment(); Type: FUNCTION; Schema: serien_internal; Owner: postgres
--

CREATE FUNCTION serien_internal.check_member_assignment() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare v_kind text;
begin
 perform 1 from public.stock_items where id=new.stock_item_id for update;
 if exists(select 1 from public.loose_stock_placements where stock_item_id=new.stock_item_id) then raise exception 'Item already loose on track' using errcode='23514';end if;
 select m.kind into v_kind from public.stock_items i join public.stock_models m on m.id=i.model_id where i.id=new.stock_item_id;
 if v_kind is null then raise exception 'Unknown item' using errcode='23503';end if;
 if (new.ordinal=0 and v_kind<>'locomotive') or (new.ordinal>0 and v_kind<>'wagon') then raise exception 'First member must be locomotive; others wagons' using errcode='23514';end if;
 return new;
end;$$;


ALTER FUNCTION serien_internal.check_member_assignment() OWNER TO postgres;

--
-- Name: check_placement(); Type: FUNCTION; Schema: serien_internal; Owner: postgres
--

CREATE FUNCTION serien_internal.check_placement() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare v_length numeric;v_status text;
begin
 select length_mm into v_length from public.layout_segments where layout_id=new.layout_id and edge_id=new.edge_id;
 if v_length is null or new.s_mm>v_length then raise exception 'Invalid track location' using errcode='23514';end if;
 if tg_table_name='layout_placements' then
 select status into v_status from public.consists where id=new.consist_id;
 if v_status<>'ready' then raise exception 'Only ready consists may be placed' using errcode='23514';end if;
 end if;
 return new;
end;$$;


ALTER FUNCTION serien_internal.check_placement() OWNER TO postgres;

--
-- Name: check_ready_consist(); Type: FUNCTION; Schema: serien_internal; Owner: postgres
--

CREATE FUNCTION serien_internal.check_ready_consist() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin perform serien_internal.assert_ready_consist(new.id);return null;end;$$;


ALTER FUNCTION serien_internal.check_ready_consist() OWNER TO postgres;

--
-- Name: check_ready_members(); Type: FUNCTION; Schema: serien_internal; Owner: postgres
--

CREATE FUNCTION serien_internal.check_ready_members() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
 if tg_op='UPDATE' and new.consist_id is distinct from old.consist_id then perform serien_internal.assert_ready_consist(old.consist_id);end if;
 perform serien_internal.assert_ready_consist(case when tg_op='DELETE' then old.consist_id else new.consist_id end);
 return null;
end;$$;


ALTER FUNCTION serien_internal.check_ready_members() OWNER TO postgres;

--
-- Name: check_snapshot(); Type: FUNCTION; Schema: serien_internal; Owner: postgres
--

CREATE FUNCTION serien_internal.check_snapshot() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare v_hash text;v_switches jsonb;v_name text;v_count int;
begin
 select topology_hash into v_hash from public.layouts where id=new.layout_id;
 if new.payload->>'topologyHash' is distinct from v_hash then raise exception 'Layout hash mismatch' using errcode='23514';end if;
 if new.payload->>'resumePolicy' is distinct from 'STOPPED' then raise exception 'Resume policy must be STOPPED' using errcode='23514';end if;
 v_switches=new.payload#>'{layout,switches}';
 if jsonb_typeof(v_switches)='object' then select count(*) into v_count from jsonb_object_keys(v_switches);else v_count=0;end if;
 if v_count<>8 then raise exception 'Eight switches required' using errcode='23514';end if;
 foreach v_name in array array['WX-A','WX-B','Y-IN','Y-2','Y-3','Y-R1','Y-R2','Y-4'] loop
 if jsonb_typeof(v_switches->v_name) is distinct from 'boolean' then raise exception 'Invalid switch: %',v_name using errcode='23514';end if;
 end loop;
 return new;
end;$$;


ALTER FUNCTION serien_internal.check_snapshot() OWNER TO postgres;

--
-- Name: lock_model_identity(); Type: FUNCTION; Schema: serien_internal; Owner: postgres
--

CREATE FUNCTION serien_internal.lock_model_identity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin if old.kind is distinct from new.kind and exists(select 1 from public.stock_items where model_id=old.id) then raise exception 'Cannot change model kind when in inventory' using errcode='23514';end if;return new;end;$$;


ALTER FUNCTION serien_internal.lock_model_identity() OWNER TO postgres;

--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: serien_internal; Owner: postgres
--

CREATE FUNCTION serien_internal.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin new.updated_at=now();return new;end; $$;


ALTER FUNCTION serien_internal.touch_updated_at() OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.users (
    id uuid NOT NULL
);


ALTER TABLE auth.users OWNER TO postgres;

--
-- Name: consist_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consist_members (
    consist_id uuid NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    stock_item_id uuid NOT NULL,
    ordinal integer NOT NULL,
    orientation smallint DEFAULT 1 NOT NULL,
    workspace_id uuid,
    ownership_key text GENERATED ALWAYS AS (
CASE
    WHEN (workspace_id IS NULL) THEN ('legacy:'::text || (owner_id)::text)
    ELSE ('workspace:'::text || (workspace_id)::text)
END) STORED,
    CONSTRAINT consist_members_ordinal_check CHECK ((ordinal >= 0)),
    CONSTRAINT consist_members_orientation_check CHECK ((orientation = ANY (ARRAY['-1'::integer, 1])))
);


ALTER TABLE public.consist_members OWNER TO postgres;

--
-- Name: consists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    revision bigint DEFAULT 0 NOT NULL,
    orientation smallint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid,
    ownership_key text GENERATED ALWAYS AS (
CASE
    WHEN (workspace_id IS NULL) THEN ('legacy:'::text || (owner_id)::text)
    ELSE ('workspace:'::text || (workspace_id)::text)
END) STORED,
    CONSTRAINT consists_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 160))),
    CONSTRAINT consists_orientation_check CHECK ((orientation = ANY (ARRAY['-1'::integer, 1]))),
    CONSTRAINT consists_revision_check CHECK ((revision >= 0)),
    CONSTRAINT consists_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'ready'::text])))
);


ALTER TABLE public.consists OWNER TO postgres;

--
-- Name: layout_placements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.layout_placements (
    consist_id uuid NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    layout_id uuid NOT NULL,
    edge_id text NOT NULL,
    s_mm numeric(12,3) NOT NULL,
    heading smallint NOT NULL,
    journey_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    state_version bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid,
    ownership_key text GENERATED ALWAYS AS (
CASE
    WHEN (workspace_id IS NULL) THEN ('legacy:'::text || (owner_id)::text)
    ELSE ('workspace:'::text || (workspace_id)::text)
END) STORED,
    CONSTRAINT layout_placements_heading_check CHECK ((heading = ANY (ARRAY['-1'::integer, 1]))),
    CONSTRAINT layout_placements_journey_state_check CHECK ((jsonb_typeof(journey_state) = 'object'::text)),
    CONSTRAINT layout_placements_s_mm_check CHECK ((s_mm >= (0)::numeric)),
    CONSTRAINT layout_placements_state_version_check CHECK ((state_version >= 0))
);


ALTER TABLE public.layout_placements OWNER TO postgres;

--
-- Name: layout_segments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.layout_segments (
    layout_id uuid NOT NULL,
    edge_id text NOT NULL,
    length_mm numeric(12,3) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT layout_segments_edge_id_check CHECK (((length(edge_id) >= 1) AND (length(edge_id) <= 120))),
    CONSTRAINT layout_segments_length_mm_check CHECK ((length_mm > (0)::numeric)),
    CONSTRAINT layout_segments_metadata_check CHECK ((jsonb_typeof(metadata) = 'object'::text))
);


ALTER TABLE public.layout_segments OWNER TO postgres;

--
-- Name: layouts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.layouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    name text NOT NULL,
    topology_hash text NOT NULL,
    schema_version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid,
    ownership_key text GENERATED ALWAYS AS (
CASE
    WHEN (workspace_id IS NULL) THEN ('legacy:'::text || (owner_id)::text)
    ELSE ('workspace:'::text || (workspace_id)::text)
END) STORED,
    CONSTRAINT layouts_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 160))),
    CONSTRAINT layouts_schema_version_check CHECK ((schema_version > 0)),
    CONSTRAINT layouts_topology_hash_check CHECK (((length(topology_hash) >= 32) AND (length(topology_hash) <= 128)))
);


ALTER TABLE public.layouts OWNER TO postgres;

--
-- Name: loose_stock_placements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.loose_stock_placements (
    stock_item_id uuid NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    layout_id uuid NOT NULL,
    edge_id text NOT NULL,
    s_mm numeric(12,3) NOT NULL,
    heading smallint NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid,
    ownership_key text GENERATED ALWAYS AS (
CASE
    WHEN (workspace_id IS NULL) THEN ('legacy:'::text || (owner_id)::text)
    ELSE ('workspace:'::text || (workspace_id)::text)
END) STORED,
    journey_state jsonb,
    state_version bigint,
    CONSTRAINT loose_stock_placements_heading_check CHECK ((heading = ANY (ARRAY['-1'::integer, 1]))),
    CONSTRAINT loose_stock_placements_journey_state_check CHECK (((journey_state IS NULL) OR (jsonb_typeof(journey_state) = 'object'::text))),
    CONSTRAINT loose_stock_placements_s_mm_check CHECK ((s_mm >= (0)::numeric)),
    CONSTRAINT loose_stock_placements_state_version_check CHECK (((state_version IS NULL) OR (state_version >= 0)))
);


ALTER TABLE public.loose_stock_placements OWNER TO postgres;

--
-- Name: stock_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    model_id uuid NOT NULL,
    inventory_code text,
    display_name text,
    orientation smallint DEFAULT 1 NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    workspace_id uuid,
    ownership_key text GENERATED ALWAYS AS (
CASE
    WHEN (workspace_id IS NULL) THEN ('legacy:'::text || (owner_id)::text)
    ELSE ('workspace:'::text || (workspace_id)::text)
END) STORED,
    CONSTRAINT stock_items_orientation_check CHECK ((orientation = ANY (ARRAY['-1'::integer, 1]))),
    CONSTRAINT stock_items_settings_check CHECK ((jsonb_typeof(settings) = 'object'::text))
);


ALTER TABLE public.stock_items OWNER TO postgres;

--
-- Name: stock_models; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind text NOT NULL,
    name text NOT NULL,
    prototype text,
    target_scale integer DEFAULT 160 NOT NULL,
    length_mm numeric(12,3),
    width_mm numeric(12,3),
    height_mm numeric(12,3),
    front_coupler_mm numeric(12,3),
    rear_coupler_mm numeric(12,3),
    asset_uri text,
    thumbnail_uri text,
    source_format text,
    license_code text DEFAULT 'UNKNOWN'::text NOT NULL,
    source_url text,
    import_status text DEFAULT 'pending'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stock_models_front_coupler_mm_check CHECK ((front_coupler_mm >= (0)::numeric)),
    CONSTRAINT stock_models_height_mm_check CHECK ((height_mm > (0)::numeric)),
    CONSTRAINT stock_models_import_status_check CHECK ((import_status = ANY (ARRAY['pending'::text, 'verified'::text, 'converted'::text, 'blocked'::text, 'failed'::text]))),
    CONSTRAINT stock_models_kind_check CHECK ((kind = ANY (ARRAY['locomotive'::text, 'wagon'::text]))),
    CONSTRAINT stock_models_length_mm_check CHECK ((length_mm > (0)::numeric)),
    CONSTRAINT stock_models_metadata_check CHECK ((jsonb_typeof(metadata) = 'object'::text)),
    CONSTRAINT stock_models_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 200))),
    CONSTRAINT stock_models_rear_coupler_mm_check CHECK ((rear_coupler_mm >= (0)::numeric)),
    CONSTRAINT stock_models_source_format_check CHECK ((source_format = ANY (ARRAY['native'::text, 'glb'::text, 'gltf'::text, 'fbx'::text, 'obj'::text, 'zip'::text, 'other'::text]))),
    CONSTRAINT stock_models_target_scale_check CHECK ((target_scale > 0)),
    CONSTRAINT stock_models_width_mm_check CHECK ((width_mm > (0)::numeric))
);


ALTER TABLE public.stock_models OWNER TO postgres;

--
-- Name: api_limits; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.api_limits (
    workspace_id uuid NOT NULL,
    max_checkpoints integer DEFAULT 100 NOT NULL,
    max_storage_bytes bigint DEFAULT 16777216 NOT NULL,
    max_response_bytes integer DEFAULT 262144 NOT NULL,
    max_audit_events integer DEFAULT 5000 NOT NULL,
    max_page integer DEFAULT 20 NOT NULL,
    device_budget integer DEFAULT 60 NOT NULL,
    workspace_budget integer DEFAULT 120 NOT NULL,
    window_seconds integer DEFAULT 60 NOT NULL,
    CONSTRAINT api_limits_device_budget_check CHECK ((device_budget > 0)),
    CONSTRAINT api_limits_max_audit_events_check CHECK ((max_audit_events > 0)),
    CONSTRAINT api_limits_max_checkpoints_check CHECK ((max_checkpoints > 0)),
    CONSTRAINT api_limits_max_page_check CHECK (((max_page >= 1) AND (max_page <= 100))),
    CONSTRAINT api_limits_max_response_bytes_check CHECK ((max_response_bytes > 0)),
    CONSTRAINT api_limits_max_storage_bytes_check CHECK ((max_storage_bytes > 0)),
    CONSTRAINT api_limits_window_seconds_check CHECK ((window_seconds > 0)),
    CONSTRAINT api_limits_workspace_budget_check CHECK ((workspace_budget > 0))
);

ALTER TABLE ONLY serien_capability.api_limits FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.api_limits OWNER TO postgres;

--
-- Name: api_windows; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.api_windows (
    workspace_id uuid NOT NULL,
    subject text NOT NULL,
    started_at timestamp with time zone NOT NULL,
    requests integer NOT NULL,
    CONSTRAINT api_windows_requests_check CHECK ((requests > 0))
);

ALTER TABLE ONLY serien_capability.api_windows FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.api_windows OWNER TO postgres;

--
-- Name: audit_events; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    device_id uuid NOT NULL,
    event text NOT NULL,
    request_id uuid,
    revision bigint,
    occurred_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    CONSTRAINT audit_events_event_check CHECK ((event = ANY (ARRAY['ReadHead'::text, 'ReadSnapshot'::text, 'ListHistory'::text, 'ReadReceipt'::text, 'SaveCheckpoint'::text, 'RecoverRevision'::text])))
);

ALTER TABLE ONLY serien_capability.audit_events FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.audit_events OWNER TO postgres;

--
-- Name: candidate_profiles; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.candidate_profiles (
    workspace_id uuid NOT NULL,
    layout_id uuid NOT NULL,
    template jsonb NOT NULL
);

ALTER TABLE ONLY serien_capability.candidate_profiles FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.candidate_profiles OWNER TO postgres;

--
-- Name: control_bindings; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.control_bindings (
    role_name name NOT NULL,
    workspace_id uuid NOT NULL,
    can_approve boolean DEFAULT false NOT NULL,
    can_redeem boolean DEFAULT false NOT NULL,
    can_provision boolean DEFAULT false NOT NULL,
    max_scope text NOT NULL,
    CONSTRAINT control_bindings_max_scope_check CHECK ((max_scope = ANY (ARRAY['reader'::text, 'editor'::text, 'owner'::text])))
);

ALTER TABLE ONLY serien_capability.control_bindings FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.control_bindings OWNER TO postgres;

--
-- Name: device_bindings; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.device_bindings (
    role_name name NOT NULL,
    workspace_id uuid NOT NULL,
    device_id uuid NOT NULL,
    device_epoch bigint DEFAULT 1 NOT NULL,
    workspace_epoch bigint DEFAULT 1 NOT NULL,
    key_version integer DEFAULT 1 NOT NULL
);

ALTER TABLE ONLY serien_capability.device_bindings FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.device_bindings OWNER TO postgres;

--
-- Name: device_locks; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.device_locks (
    workspace_id uuid NOT NULL,
    device_id uuid NOT NULL,
    marker bigint DEFAULT 0 NOT NULL,
    CONSTRAINT device_locks_marker_check CHECK ((marker >= 0))
);

ALTER TABLE ONLY serien_capability.device_locks FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.device_locks OWNER TO postgres;

--
-- Name: devices; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.devices (
    id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    public_key jsonb NOT NULL,
    key_version integer DEFAULT 1 NOT NULL,
    scope text NOT NULL,
    epoch bigint DEFAULT 1 NOT NULL,
    revoked_at timestamp with time zone,
    expires_at timestamp with time zone,
    CONSTRAINT devices_epoch_check CHECK ((epoch > 0)),
    CONSTRAINT devices_key_version_check CHECK ((key_version > 0)),
    CONSTRAINT devices_public_key_check CHECK (((jsonb_typeof(public_key) = 'object'::text) AND (COALESCE((public_key ->> 'kty'::text), ''::text) = 'EC'::text) AND (COALESCE((public_key ->> 'crv'::text), ''::text) = 'P-256'::text) AND (COALESCE((public_key ->> 'x'::text), ''::text) ~ '^[A-Za-z0-9_-]{43}$'::text) AND (COALESCE((public_key ->> 'y'::text), ''::text) ~ '^[A-Za-z0-9_-]{43}$'::text) AND (NOT (public_key ? 'd'::text)))),
    CONSTRAINT devices_scope_check CHECK ((scope = ANY (ARRAY['reader'::text, 'editor'::text, 'owner'::text])))
);

ALTER TABLE ONLY serien_capability.devices FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.devices OWNER TO postgres;

--
-- Name: invitations; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    candidate_device_id uuid NOT NULL,
    public_key jsonb NOT NULL,
    fingerprint text NOT NULL,
    verifier text NOT NULL,
    scope text NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    revoked_at timestamp with time zone,
    CONSTRAINT invitations_check CHECK ((expires_at > created_at)),
    CONSTRAINT invitations_check1 CHECK (((approved_by IS NULL) = (approved_at IS NULL))),
    CONSTRAINT invitations_check2 CHECK (((consumed_at IS NULL) OR ((approved_at IS NOT NULL) AND (consumed_at >= approved_at) AND (consumed_at <= expires_at)))),
    CONSTRAINT invitations_fingerprint_check CHECK ((fingerprint ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT invitations_public_key_check CHECK (((jsonb_typeof(public_key) = 'object'::text) AND (COALESCE((public_key ->> 'kty'::text), ''::text) = 'EC'::text) AND (COALESCE((public_key ->> 'crv'::text), ''::text) = 'P-256'::text) AND (COALESCE((public_key ->> 'x'::text), ''::text) ~ '^[A-Za-z0-9_-]{43}$'::text) AND (COALESCE((public_key ->> 'y'::text), ''::text) ~ '^[A-Za-z0-9_-]{43}$'::text) AND (NOT (public_key ? 'd'::text)))),
    CONSTRAINT invitations_scope_check CHECK ((scope = ANY (ARRAY['reader'::text, 'editor'::text, 'owner'::text]))),
    CONSTRAINT invitations_verifier_check CHECK ((verifier ~ '^[0-9a-f]{64}$'::text))
);

ALTER TABLE ONLY serien_capability.invitations FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.invitations OWNER TO postgres;

--
-- Name: lifecycle_events; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.lifecycle_events (
    id bigint NOT NULL,
    workspace_id uuid NOT NULL,
    job_id uuid NOT NULL,
    state text NOT NULL,
    actor name NOT NULL,
    recorded_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL
);

ALTER TABLE ONLY serien_capability.lifecycle_events FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.lifecycle_events OWNER TO postgres;

--
-- Name: lifecycle_events_id_seq; Type: SEQUENCE; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.lifecycle_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME serien_capability.lifecycle_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lifecycle_limits; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.lifecycle_limits (
    workspace_id uuid NOT NULL,
    max_devices integer DEFAULT 64 NOT NULL,
    max_jobs integer DEFAULT 256 NOT NULL,
    max_events integer DEFAULT 4096 NOT NULL,
    ticket_seconds integer DEFAULT 600 NOT NULL,
    grant_seconds integer DEFAULT 2592000 NOT NULL,
    CONSTRAINT lifecycle_limits_grant_seconds_check CHECK (((grant_seconds >= 1) AND (grant_seconds <= 31536000))),
    CONSTRAINT lifecycle_limits_max_devices_check CHECK (((max_devices >= 1) AND (max_devices <= 1024))),
    CONSTRAINT lifecycle_limits_max_events_check CHECK (((max_events >= 1) AND (max_events <= 100000))),
    CONSTRAINT lifecycle_limits_max_jobs_check CHECK (((max_jobs >= 1) AND (max_jobs <= 10000))),
    CONSTRAINT lifecycle_limits_ticket_seconds_check CHECK (((ticket_seconds >= 1) AND (ticket_seconds <= 600)))
);

ALTER TABLE ONLY serien_capability.lifecycle_limits FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.lifecycle_limits OWNER TO postgres;

--
-- Name: nonce_limits; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.nonce_limits (
    workspace_id uuid NOT NULL,
    audience text NOT NULL,
    device_live integer DEFAULT 1000 NOT NULL,
    workspace_live integer DEFAULT 10000 NOT NULL,
    device_rate integer DEFAULT 60 NOT NULL,
    workspace_rate integer DEFAULT 120 NOT NULL,
    CONSTRAINT nonce_limits_audience_check CHECK (((audience ~ '^https?://[^ /]+$'::text) AND (length(audience) <= 256))),
    CONSTRAINT nonce_limits_device_live_check CHECK (((device_live >= 1) AND (device_live <= 10000))),
    CONSTRAINT nonce_limits_device_rate_check CHECK (((device_rate >= 1) AND (device_rate <= 10000))),
    CONSTRAINT nonce_limits_workspace_live_check CHECK (((workspace_live >= 1) AND (workspace_live <= 100000))),
    CONSTRAINT nonce_limits_workspace_rate_check CHECK (((workspace_rate >= 1) AND (workspace_rate <= 100000)))
);

ALTER TABLE ONLY serien_capability.nonce_limits FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.nonce_limits OWNER TO postgres;

--
-- Name: nonce_windows; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.nonce_windows (
    workspace_id uuid NOT NULL,
    subject text NOT NULL,
    started_at timestamp with time zone NOT NULL,
    claims integer NOT NULL,
    CONSTRAINT nonce_windows_claims_check CHECK ((claims > 0))
);

ALTER TABLE ONLY serien_capability.nonce_windows FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.nonce_windows OWNER TO postgres;

--
-- Name: recovery_verifiers; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.recovery_verifiers (
    workspace_id uuid NOT NULL,
    version bigint NOT NULL,
    verifier text NOT NULL,
    pepper_version integer NOT NULL,
    consumed_at timestamp with time zone,
    revoked_at timestamp with time zone,
    reserved_job uuid,
    CONSTRAINT recovery_verifiers_pepper_version_check CHECK ((pepper_version > 0)),
    CONSTRAINT recovery_verifiers_verifier_check CHECK ((verifier ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT recovery_verifiers_version_check CHECK ((version > 0))
);

ALTER TABLE ONLY serien_capability.recovery_verifiers FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.recovery_verifiers OWNER TO postgres;

--
-- Name: replay_nonces; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.replay_nonces (
    workspace_id uuid NOT NULL,
    device_id uuid NOT NULL,
    key_version integer NOT NULL,
    epoch bigint NOT NULL,
    nonce text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    security_domain text DEFAULT 'SerieN-capability-v1'::text NOT NULL,
    context_version text DEFAULT 'sql-claim-v1'::text NOT NULL,
    claimed_at timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    context_digest text,
    CONSTRAINT replay_nonces_context_digest_check CHECK ((context_digest ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT replay_nonces_context_version_check CHECK ((context_version = 'sql-claim-v1'::text)),
    CONSTRAINT replay_nonces_epoch_check CHECK ((epoch > 0)),
    CONSTRAINT replay_nonces_key_version_check CHECK ((key_version > 0)),
    CONSTRAINT replay_nonces_nonce_check CHECK ((nonce ~ '^[0-9a-f]{32}$'::text)),
    CONSTRAINT replay_nonces_security_domain_check CHECK ((security_domain = 'SerieN-capability-v1'::text))
);

ALTER TABLE ONLY serien_capability.replay_nonces FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.replay_nonces OWNER TO postgres;

--
-- Name: session_heads; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.session_heads (
    workspace_id uuid NOT NULL,
    layout_id uuid NOT NULL,
    revision bigint DEFAULT 0 NOT NULL,
    snapshot_id uuid,
    receipt_request_id uuid,
    payload_digest text,
    CONSTRAINT session_heads_check CHECK ((((revision = 0) AND (snapshot_id IS NULL) AND (receipt_request_id IS NULL) AND (payload_digest IS NULL)) OR ((revision > 0) AND (snapshot_id IS NOT NULL) AND (receipt_request_id IS NOT NULL) AND (payload_digest ~ '^[0-9a-f]{64}$'::text) AND (payload_digest IS NOT NULL)))),
    CONSTRAINT session_heads_revision_check CHECK ((revision >= 0))
);

ALTER TABLE ONLY serien_capability.session_heads FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.session_heads OWNER TO postgres;

--
-- Name: worker_bindings; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.worker_bindings (
    role_name name NOT NULL,
    workspace_id uuid NOT NULL
);

ALTER TABLE ONLY serien_capability.worker_bindings FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.worker_bindings OWNER TO postgres;

--
-- Name: workspace_locks; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.workspace_locks (
    workspace_id uuid NOT NULL,
    marker bigint DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY serien_capability.workspace_locks FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.workspace_locks OWNER TO postgres;

--
-- Name: workspaces; Type: TABLE; Schema: serien_capability; Owner: postgres
--

CREATE TABLE serien_capability.workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    auth_epoch bigint DEFAULT 1 NOT NULL,
    CONSTRAINT workspaces_auth_epoch_check CHECK ((auth_epoch > 0)),
    CONSTRAINT workspaces_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text])))
);

ALTER TABLE ONLY serien_capability.workspaces FORCE ROW LEVEL SECURITY;


ALTER TABLE serien_capability.workspaces OWNER TO postgres;

--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.users (id) FROM stdin;
00000000-0000-4000-8000-000000000001
20000000-0000-4000-8000-000000000001
\.


--
-- Data for Name: consist_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consist_members (consist_id, owner_id, stock_item_id, ordinal, orientation, workspace_id) FROM stdin;
00000000-0000-4000-8000-000000000030	00000000-0000-4000-8000-000000000001	00000000-0000-4000-8000-000000000020	0	1	\N
20000000-0000-4000-8000-000000000030	20000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000020	0	1	\N
10000000-0000-4000-8000-000000000066	00000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000065	0	1	10000000-0000-4000-8000-000000000001
10000000-0000-4000-8000-0000000000ca	20000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-0000000000c9	0	1	10000000-0000-4000-8000-000000000002
\.


--
-- Data for Name: consists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consists (id, owner_id, name, status, revision, orientation, created_at, updated_at, workspace_id) FROM stdin;
00000000-0000-4000-8000-000000000030	00000000-0000-4000-8000-000000000001	synthetic consist	ready	0	1	2026-11-05 09:35:52.570059+00	2026-11-05 09:35:52.638507+00	\N
20000000-0000-4000-8000-000000000030	20000000-0000-4000-8000-000000000001	synthetic consist	ready	0	1	2026-11-05 09:35:52.636847+00	2026-11-05 09:35:52.638507+00	\N
10000000-0000-4000-8000-000000000066	00000000-0000-4000-8000-000000000001	fixture	ready	0	1	2026-11-05 09:35:53.176606+00	2026-11-05 09:35:53.178998+00	10000000-0000-4000-8000-000000000001
10000000-0000-4000-8000-0000000000ca	20000000-0000-4000-8000-000000000001	fixture	ready	0	1	2026-11-05 09:35:53.371751+00	2026-11-05 09:35:53.373855+00	10000000-0000-4000-8000-000000000002
\.


--
-- Data for Name: layout_placements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.layout_placements (consist_id, owner_id, layout_id, edge_id, s_mm, heading, journey_state, state_version, updated_at, workspace_id) FROM stdin;
00000000-0000-4000-8000-000000000030	00000000-0000-4000-8000-000000000001	00000000-0000-4000-8000-000000000040	T47	120.000	1	{}	0	2026-11-05 09:35:52.57287+00	\N
20000000-0000-4000-8000-000000000030	20000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000040	T47	120.000	1	{}	0	2026-11-05 09:35:52.639359+00	\N
10000000-0000-4000-8000-000000000066	00000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000003	T47	120.000	1	{"travel": 12, "position": 120, "segments": [{"id": "T47", "end": 248, "sign": 1, "start": 0}], "lastBlock": null}	1	2026-11-05 09:35:53.652305+00	10000000-0000-4000-8000-000000000001
10000000-0000-4000-8000-0000000000ca	20000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000004	T47	120.000	1	{"travel": 12, "position": 120, "segments": [{"id": "T47", "end": 248, "sign": 1, "start": 0}], "lastBlock": null}	1	2026-11-05 09:35:53.880314+00	10000000-0000-4000-8000-000000000002
\.


--
-- Data for Name: layout_segments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.layout_segments (layout_id, edge_id, length_mm, metadata) FROM stdin;
00000000-0000-4000-8000-000000000040	T47	248.000	{}
20000000-0000-4000-8000-000000000040	T47	248.000	{}
10000000-0000-4000-8000-000000000003	T47	248.000	{}
10000000-0000-4000-8000-000000000004	T47	248.000	{}
\.


--
-- Data for Name: layout_snapshots; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.layout_snapshots (id, owner_id, layout_id, revision, snapshot_schema, payload, saved_at, workspace_id, payload_digest, state_digest, canonical_version, engine_revision, topology_hash, asset_refs) FROM stdin;
00000000-0000-4000-8000-000000000050	00000000-0000-4000-8000-000000000001	00000000-0000-4000-8000-000000000040	1	1	{"layout": {"switches": {"Y-2": false, "Y-3": false, "Y-4": false, "WX-A": false, "WX-B": false, "Y-IN": false, "Y-R1": false, "Y-R2": false}}, "resumePolicy": "STOPPED", "topologyHash": "e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc"}	2026-11-05 09:35:52.573622+00	\N	\N	\N	\N	\N	\N	\N
20000000-0000-4000-8000-000000000050	20000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000040	1	1	{"layout": {"switches": {"Y-2": false, "Y-3": false, "Y-4": false, "WX-A": false, "WX-B": false, "Y-IN": false, "Y-R1": false, "Y-R2": false}}, "resumePolicy": "STOPPED", "topologyHash": "e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc"}	2026-11-05 09:35:52.640169+00	\N	\N	\N	\N	\N	\N	\N
37bf7383-1792-4f07-802e-c64336917635	00000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000003	1	1	{"ui": {"day": 0, "camera": {"fov": 35, "zoom": 1, "preset": "overview", "target": [834, 0, 474], "position": [1664, 1150, 1694]}, "bellMuted": false, "qualityMode": "auto", "consoleSlots": ["94c863bd-5a38-530f-a4e5-a9b6d0e812f8"], "hudMinimized": false, "recentTrainIds": ["94c863bd-5a38-530f-a4e5-a9b6d0e812f8"], "selectedTrainId": "94c863bd-5a38-530f-a4e5-a9b6d0e812f8", "rollingModelMode": "native"}, "time": {"tickCount": 720, "wasPaused": false, "stepSeconds": 0.016666666666666666, "accumulatorSeconds": 0.001}, "items": [{"id": "10000000-0000-4000-8000-000000000065", "modelId": "10000000-0000-4000-8000-000000000064", "nativeKind": "steam", "displayName": "fixture", "orientation": 1, "modelRevision": "synthetic-fixture-only", "nativeModelId": "10000000-0000-4000-8000-000000000064", "nativeModelRevision": "synthetic-fixture-only"}, {"id": "10000000-0000-4000-8000-000000000068", "modelId": "10000000-0000-4000-8000-000000000067", "nativeKind": "closed", "displayName": "fixture", "orientation": 1, "modelRevision": "synthetic-fixture-only", "nativeModelId": "10000000-0000-4000-8000-000000000067", "nativeModelRevision": "synthetic-fixture-only"}], "layout": {"switches": {"Y-2": false, "Y-3": false, "Y-4": false, "WX-A": false, "WX-B": false, "Y-IN": false, "Y-R1": false, "Y-R2": false}}, "models": [{"id": "10000000-0000-4000-8000-000000000064", "kind": "locomotive", "asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "couplers": {"back": {"x": -67.9, "y": 8, "z": 0}, "front": {"x": 49.6, "y": 8, "z": 0}}, "revision": "synthetic-fixture-only", "runtimeKey": "steam", "couplingMode": "explicit", "representation": "native", "legacyRearExtentMm": 0}, {"id": "10000000-0000-4000-8000-000000000067", "kind": "wagon", "asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "couplers": {"back": {"x": -10, "y": 8, "z": 0}, "front": {"x": 10, "y": 8, "z": 0}}, "revision": "synthetic-fixture-only", "runtimeKey": "closed", "couplingMode": "explicit", "representation": "native", "legacyRearExtentMm": 0}], "trains": [{"id": "94c863bd-5a38-530f-a4e5-a9b6d0e812f8", "dir": 1, "name": "fixture", "guard": {"risk": "SAFE", "delta": 0.5, "state": "SAFE", "reason": "available", "boundary": null, "distance": null, "velocity": 30, "direction": 1, "lookahead": 5, "probeKind": null, "intervened": false, "probeDelta": null, "leadingExtent": null, "requestedDelta": 0.5, "requestedSpeed": 20, "protectionInset": null, "stoppingDistance": 4.5}, "speed": 20, "lights": false, "journey": {"travel": 12, "position": 120, "segments": [{"id": "T47", "end": 248, "sign": 1, "start": 0}], "lastBlock": null}, "location": {"s": 120, "edge": "T47", "heading": 1}, "modelKey": "steam", "odometer": 12, "velocity": 30, "consistId": "10000000-0000-4000-8000-000000000066", "resetSeed": {"s": 80, "cars": 0, "edge": "T47", "loop": 2, "fraction": null}, "nativeName": "fixture", "description": "fixture", "runtimeSlot": 0, "routeContext": {"laps": 0, "loop": 2, "mode": "yard", "section": "T47", "previousLane": 2}, "requestedSpeed": 20, "nativeDescription": "fixture"}], "stateId": "ce394ec0-fc27-56f8-9362-94fddd3430ff", "consists": [{"id": "10000000-0000-4000-8000-000000000066", "name": "fixture", "members": [{"itemId": "10000000-0000-4000-8000-000000000065", "orientation": 1}]}], "layoutId": "10000000-0000-4000-8000-000000000003", "missions": {"changes": 0, "selected": 0, "didAttach": false, "didDetach": false, "transferred": false, "visitedRunaround": false}, "looseStock": [{"itemId": "10000000-0000-4000-8000-000000000068", "journey": {"travel": 0, "position": 220, "segments": [{"id": "T47", "end": 248, "sign": 1, "start": 0}], "lastBlock": null}, "location": {"s": 220, "edge": "T47", "heading": 1}, "animationDistanceMm": 0}], "workspaceId": "10000000-0000-4000-8000-000000000001", "resumePolicy": "STOPPED", "topologyHash": "e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc", "schemaVersion": 1, "engineRevision": "R1-348bfeff12c4005657098d89ea1d3c2ccdda9910", "inventoryStorage": []}	2026-11-05 09:35:53.652305+00	10000000-0000-4000-8000-000000000001	32164f0f075ec2a746092924b1852244dd66a576ff45fc0955c5a2ea2469652f	e7bdbc2c0beb83134a110155d33ed61299e767099db1bd4e1d64cf1523220a5b	jcs-profile-v1	R1-348bfeff12c4005657098d89ea1d3c2ccdda9910	e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc	[{"asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "modelId": "10000000-0000-4000-8000-000000000064", "revision": "synthetic-fixture-only"}, {"asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "modelId": "10000000-0000-4000-8000-000000000067", "revision": "synthetic-fixture-only"}]
e9041a52-e7f6-4369-8970-4bfc31cb4230	20000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000004	1	1	{"ui": {"day": 0, "camera": {"fov": 35, "zoom": 1, "preset": "overview", "target": [834, 0, 474], "position": [1664, 1150, 1694]}, "bellMuted": false, "qualityMode": "auto", "consoleSlots": ["94c863bd-5a38-530f-a4e5-a9b6d0e812f8"], "hudMinimized": false, "recentTrainIds": ["94c863bd-5a38-530f-a4e5-a9b6d0e812f8"], "selectedTrainId": "94c863bd-5a38-530f-a4e5-a9b6d0e812f8", "rollingModelMode": "native"}, "time": {"tickCount": 720, "wasPaused": false, "stepSeconds": 0.016666666666666666, "accumulatorSeconds": 0.001}, "items": [{"id": "10000000-0000-4000-8000-0000000000c9", "modelId": "10000000-0000-4000-8000-0000000000c8", "nativeKind": "steam", "displayName": "fixture", "orientation": 1, "modelRevision": "synthetic-fixture-only", "nativeModelId": "10000000-0000-4000-8000-0000000000c8", "nativeModelRevision": "synthetic-fixture-only"}, {"id": "10000000-0000-4000-8000-0000000000cc", "modelId": "10000000-0000-4000-8000-0000000000cb", "nativeKind": "closed", "displayName": "fixture", "orientation": 1, "modelRevision": "synthetic-fixture-only", "nativeModelId": "10000000-0000-4000-8000-0000000000cb", "nativeModelRevision": "synthetic-fixture-only"}], "layout": {"switches": {"Y-2": false, "Y-3": false, "Y-4": false, "WX-A": false, "WX-B": false, "Y-IN": false, "Y-R1": false, "Y-R2": false}}, "models": [{"id": "10000000-0000-4000-8000-0000000000c8", "kind": "locomotive", "asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "couplers": {"back": {"x": -67.9, "y": 8, "z": 0}, "front": {"x": 49.6, "y": 8, "z": 0}}, "revision": "synthetic-fixture-only", "runtimeKey": "steam", "couplingMode": "explicit", "representation": "native", "legacyRearExtentMm": 0}, {"id": "10000000-0000-4000-8000-0000000000cb", "kind": "wagon", "asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "couplers": {"back": {"x": -10, "y": 8, "z": 0}, "front": {"x": 10, "y": 8, "z": 0}}, "revision": "synthetic-fixture-only", "runtimeKey": "closed", "couplingMode": "explicit", "representation": "native", "legacyRearExtentMm": 0}], "trains": [{"id": "94c863bd-5a38-530f-a4e5-a9b6d0e812f8", "dir": 1, "name": "fixture", "guard": {"risk": "SAFE", "delta": 0.5, "state": "SAFE", "reason": "available", "boundary": null, "distance": null, "velocity": 30, "direction": 1, "lookahead": 5, "probeKind": null, "intervened": false, "probeDelta": null, "leadingExtent": null, "requestedDelta": 0.5, "requestedSpeed": 20, "protectionInset": null, "stoppingDistance": 4.5}, "speed": 20, "lights": false, "journey": {"travel": 12, "position": 120, "segments": [{"id": "T47", "end": 248, "sign": 1, "start": 0}], "lastBlock": null}, "location": {"s": 120, "edge": "T47", "heading": 1}, "modelKey": "steam", "odometer": 12, "velocity": 30, "consistId": "10000000-0000-4000-8000-0000000000ca", "resetSeed": {"s": 80, "cars": 0, "edge": "T47", "loop": 2, "fraction": null}, "nativeName": "fixture", "description": "fixture", "runtimeSlot": 0, "routeContext": {"laps": 0, "loop": 2, "mode": "yard", "section": "T47", "previousLane": 2}, "requestedSpeed": 20, "nativeDescription": "fixture"}], "stateId": "ce394ec0-fc27-56f8-9362-94fddd3430ff", "consists": [{"id": "10000000-0000-4000-8000-0000000000ca", "name": "fixture", "members": [{"itemId": "10000000-0000-4000-8000-0000000000c9", "orientation": 1}]}], "layoutId": "10000000-0000-4000-8000-000000000004", "missions": {"changes": 0, "selected": 0, "didAttach": false, "didDetach": false, "transferred": false, "visitedRunaround": false}, "looseStock": [{"itemId": "10000000-0000-4000-8000-0000000000cc", "journey": {"travel": 0, "position": 220, "segments": [{"id": "T47", "end": 248, "sign": 1, "start": 0}], "lastBlock": null}, "location": {"s": 220, "edge": "T47", "heading": 1}, "animationDistanceMm": 0}], "workspaceId": "10000000-0000-4000-8000-000000000002", "resumePolicy": "STOPPED", "topologyHash": "e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc", "schemaVersion": 1, "engineRevision": "R1-348bfeff12c4005657098d89ea1d3c2ccdda9910", "inventoryStorage": []}	2026-11-05 09:35:53.880314+00	10000000-0000-4000-8000-000000000002	4234edc219464b2619ab86fb7b884e25ee9c96c51258e8b2fb58f907cdf1bf47	81bcef98911f007579e87b7e04393261a851ac97d6ef54fed85c1f28a80fda4d	jcs-profile-v1	R1-348bfeff12c4005657098d89ea1d3c2ccdda9910	e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc	[{"asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "modelId": "10000000-0000-4000-8000-0000000000c8", "revision": "synthetic-fixture-only"}, {"asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "modelId": "10000000-0000-4000-8000-0000000000cb", "revision": "synthetic-fixture-only"}]
\.


--
-- Data for Name: layouts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.layouts (id, owner_id, name, topology_hash, schema_version, created_at, updated_at, workspace_id) FROM stdin;
00000000-0000-4000-8000-000000000040	00000000-0000-4000-8000-000000000001	synthetic canonical	e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc	1	2026-11-05 09:35:52.572383+00	2026-11-05 09:35:52.572383+00	\N
20000000-0000-4000-8000-000000000040	20000000-0000-4000-8000-000000000001	synthetic canonical	e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc	1	2026-11-05 09:35:52.638945+00	2026-11-05 09:35:52.638945+00	\N
10000000-0000-4000-8000-000000000003	00000000-0000-4000-8000-000000000001	fixture	e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc	1	2026-11-05 09:35:53.174908+00	2026-11-05 09:35:53.174908+00	10000000-0000-4000-8000-000000000001
10000000-0000-4000-8000-000000000004	20000000-0000-4000-8000-000000000001	fixture	e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc	1	2026-11-05 09:35:53.370286+00	2026-11-05 09:35:53.370286+00	10000000-0000-4000-8000-000000000002
\.


--
-- Data for Name: loose_stock_placements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loose_stock_placements (stock_item_id, owner_id, layout_id, edge_id, s_mm, heading, updated_at, workspace_id, journey_state, state_version) FROM stdin;
00000000-0000-4000-8000-000000000021	00000000-0000-4000-8000-000000000001	00000000-0000-4000-8000-000000000040	T47	200.000	1	2026-11-05 09:35:52.573294+00	\N	\N	\N
20000000-0000-4000-8000-000000000021	20000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000040	T47	200.000	1	2026-11-05 09:35:52.639853+00	\N	\N	\N
10000000-0000-4000-8000-000000000068	00000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000003	T47	220.000	1	2026-11-05 09:35:53.652305+00	10000000-0000-4000-8000-000000000001	{"travel": 0, "position": 220, "segments": [{"id": "T47", "end": 248, "sign": 1, "start": 0}], "lastBlock": null}	1
10000000-0000-4000-8000-0000000000cc	20000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000004	T47	220.000	1	2026-11-05 09:35:53.880314+00	10000000-0000-4000-8000-000000000002	{"travel": 0, "position": 220, "segments": [{"id": "T47", "end": 248, "sign": 1, "start": 0}], "lastBlock": null}	1
\.


--
-- Data for Name: operation_receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.operation_receipts (owner_id, request_id, op_type, payload_digest, result, created_at, workspace_id, layout_id, snapshot_id, revision, receipt_id, request_context, receipt_version, auth_context) FROM stdin;
00000000-0000-4000-8000-000000000001	00000000-0000-4000-8000-000000000060	synthetic-save	aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa	{}	2026-11-05 09:35:52.574147+00	\N	\N	\N	\N	03d31a46-3c1e-471b-8e6a-70614e420f91	\N	\N	\N
20000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000060	synthetic-save	aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa	{}	2026-11-05 09:35:52.640613+00	\N	\N	\N	\N	1dafc678-a9ca-4b06-bbe7-ada90446f135	\N	\N	\N
00000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-00000000038e	SaveCheckpoint	32164f0f075ec2a746092924b1852244dd66a576ff45fc0955c5a2ea2469652f	{"auth": {"keyVersion": 1, "deviceEpoch": "1", "workspaceEpoch": "1"}, "actor": "10000000-0000-4000-8000-000000000384", "digest": "32164f0f075ec2a746092924b1852244dd66a576ff45fc0955c5a2ea2469652f", "layoutId": "10000000-0000-4000-8000-000000000003", "revision": "1", "operation": "SaveCheckpoint", "request_id": "10000000-0000-4000-8000-00000000038e", "snapshotId": "37bf7383-1792-4f07-802e-c64336917635", "committedAt": "2026-11-05T09:35:53.663885+00:00", "stateDigest": "e7bdbc2c0beb83134a110155d33ed61299e767099db1bd4e1d64cf1523220a5b", "workspaceId": "10000000-0000-4000-8000-000000000001", "schemaVersion": 1, "receiptVersion": 2, "canonicalVersion": "jcs-profile-v1", "expectedRevision": "0", "recoverySourceRevision": null}	2026-11-05 09:35:53.652305+00	10000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000003	37bf7383-1792-4f07-802e-c64336917635	1	8b423594-789f-4db8-b2d8-74f50961568f	{"layoutId": "10000000-0000-4000-8000-000000000003", "operation": "SaveCheckpoint", "workspaceId": "10000000-0000-4000-8000-000000000001", "expectedRevision": "0", "recoverySourceRevision": null}	2	{"keyVersion": 1, "deviceEpoch": "1", "workspaceEpoch": "1"}
20000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-00000000038f	SaveCheckpoint	4234edc219464b2619ab86fb7b884e25ee9c96c51258e8b2fb58f907cdf1bf47	{"auth": {"keyVersion": 1, "deviceEpoch": "1", "workspaceEpoch": "1"}, "actor": "10000000-0000-4000-8000-000000000385", "digest": "4234edc219464b2619ab86fb7b884e25ee9c96c51258e8b2fb58f907cdf1bf47", "layoutId": "10000000-0000-4000-8000-000000000004", "revision": "1", "operation": "SaveCheckpoint", "request_id": "10000000-0000-4000-8000-00000000038f", "snapshotId": "e9041a52-e7f6-4369-8970-4bfc31cb4230", "committedAt": "2026-11-05T09:35:53.892158+00:00", "stateDigest": "81bcef98911f007579e87b7e04393261a851ac97d6ef54fed85c1f28a80fda4d", "workspaceId": "10000000-0000-4000-8000-000000000002", "schemaVersion": 1, "receiptVersion": 2, "canonicalVersion": "jcs-profile-v1", "expectedRevision": "0", "recoverySourceRevision": null}	2026-11-05 09:35:53.880314+00	10000000-0000-4000-8000-000000000002	10000000-0000-4000-8000-000000000004	e9041a52-e7f6-4369-8970-4bfc31cb4230	1	57c55265-4b92-4f48-a0ee-088d959139a0	{"layoutId": "10000000-0000-4000-8000-000000000004", "operation": "SaveCheckpoint", "workspaceId": "10000000-0000-4000-8000-000000000002", "expectedRevision": "0", "recoverySourceRevision": null}	2	{"keyVersion": 1, "deviceEpoch": "1", "workspaceEpoch": "1"}
\.


--
-- Data for Name: stock_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_items (id, owner_id, model_id, inventory_code, display_name, orientation, settings, created_at, updated_at, workspace_id) FROM stdin;
00000000-0000-4000-8000-000000000020	00000000-0000-4000-8000-000000000001	00000000-0000-4000-8000-000000000010	\N	\N	1	{}	2026-11-05 09:35:52.569423+00	2026-11-05 09:35:52.569423+00	\N
00000000-0000-4000-8000-000000000021	00000000-0000-4000-8000-000000000001	00000000-0000-4000-8000-000000000011	\N	\N	1	{}	2026-11-05 09:35:52.569423+00	2026-11-05 09:35:52.569423+00	\N
20000000-0000-4000-8000-000000000020	20000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000010	\N	\N	1	{}	2026-11-05 09:35:52.636312+00	2026-11-05 09:35:52.636312+00	\N
20000000-0000-4000-8000-000000000021	20000000-0000-4000-8000-000000000001	20000000-0000-4000-8000-000000000011	\N	\N	1	{}	2026-11-05 09:35:52.636312+00	2026-11-05 09:35:52.636312+00	\N
10000000-0000-4000-8000-000000000065	00000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000064	\N	fixture	1	{}	2026-11-05 09:35:53.110937+00	2026-11-05 09:35:53.110937+00	10000000-0000-4000-8000-000000000001
10000000-0000-4000-8000-000000000068	00000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000067	\N	fixture	1	{}	2026-11-05 09:35:53.244676+00	2026-11-05 09:35:53.244676+00	10000000-0000-4000-8000-000000000001
10000000-0000-4000-8000-0000000000c9	20000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-0000000000c8	\N	fixture	1	{}	2026-11-05 09:35:53.307948+00	2026-11-05 09:35:53.307948+00	10000000-0000-4000-8000-000000000002
10000000-0000-4000-8000-0000000000cc	20000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-0000000000cb	\N	fixture	1	{}	2026-11-05 09:35:53.436746+00	2026-11-05 09:35:53.436746+00	10000000-0000-4000-8000-000000000002
\.


--
-- Data for Name: stock_models; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stock_models (id, kind, name, prototype, target_scale, length_mm, width_mm, height_mm, front_coupler_mm, rear_coupler_mm, asset_uri, thumbnail_uri, source_format, license_code, source_url, import_status, metadata, created_at, updated_at) FROM stdin;
00000000-0000-4000-8000-000000000010	locomotive	synthetic loco	\N	160	\N	\N	\N	\N	\N	\N	\N	\N	UNKNOWN	\N	pending	{}	2026-11-05 09:35:52.568983+00	2026-11-05 09:35:52.568983+00
00000000-0000-4000-8000-000000000011	wagon	synthetic wagon	\N	160	\N	\N	\N	\N	\N	\N	\N	\N	UNKNOWN	\N	pending	{}	2026-11-05 09:35:52.568983+00	2026-11-05 09:35:52.568983+00
20000000-0000-4000-8000-000000000010	locomotive	synthetic loco	\N	160	\N	\N	\N	\N	\N	\N	\N	\N	UNKNOWN	\N	pending	{}	2026-11-05 09:35:52.635978+00	2026-11-05 09:35:52.635978+00
20000000-0000-4000-8000-000000000011	wagon	synthetic wagon	\N	160	\N	\N	\N	\N	\N	\N	\N	\N	UNKNOWN	\N	pending	{}	2026-11-05 09:35:52.635978+00	2026-11-05 09:35:52.635978+00
10000000-0000-4000-8000-000000000064	locomotive	synthetic profile	\N	160	\N	\N	\N	\N	\N	\N	\N	\N	UNKNOWN	\N	pending	{"id": "10000000-0000-4000-8000-000000000064", "kind": "locomotive", "asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "couplers": {"back": {"x": -67.9, "y": 8, "z": 0}, "front": {"x": 49.6, "y": 8, "z": 0}}, "revision": "synthetic-fixture-only", "runtimeKey": "steam", "couplingMode": "explicit", "representation": "native", "legacyRearExtentMm": 0}	2026-11-05 09:35:53.110287+00	2026-11-05 09:35:53.110287+00
10000000-0000-4000-8000-000000000067	wagon	synthetic loose	\N	160	\N	\N	\N	\N	\N	\N	\N	\N	UNKNOWN	\N	pending	{"id": "10000000-0000-4000-8000-000000000067", "kind": "wagon", "asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "couplers": {"back": {"x": -10, "y": 8, "z": 0}, "front": {"x": 10, "y": 8, "z": 0}}, "revision": "synthetic-fixture-only", "runtimeKey": "closed", "couplingMode": "explicit", "representation": "native", "legacyRearExtentMm": 0}	2026-11-05 09:35:53.244043+00	2026-11-05 09:35:53.244043+00
10000000-0000-4000-8000-0000000000c8	locomotive	synthetic profile	\N	160	\N	\N	\N	\N	\N	\N	\N	\N	UNKNOWN	\N	pending	{"id": "10000000-0000-4000-8000-0000000000c8", "kind": "locomotive", "asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "couplers": {"back": {"x": -67.9, "y": 8, "z": 0}, "front": {"x": 49.6, "y": 8, "z": 0}}, "revision": "synthetic-fixture-only", "runtimeKey": "steam", "couplingMode": "explicit", "representation": "native", "legacyRearExtentMm": 0}	2026-11-05 09:35:53.307218+00	2026-11-05 09:35:53.307218+00
10000000-0000-4000-8000-0000000000cb	wagon	synthetic loose	\N	160	\N	\N	\N	\N	\N	\N	\N	\N	UNKNOWN	\N	pending	{"id": "10000000-0000-4000-8000-0000000000cb", "kind": "wagon", "asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "couplers": {"back": {"x": -10, "y": 8, "z": 0}, "front": {"x": 10, "y": 8, "z": 0}}, "revision": "synthetic-fixture-only", "runtimeKey": "closed", "couplingMode": "explicit", "representation": "native", "legacyRearExtentMm": 0}	2026-11-05 09:35:53.436137+00	2026-11-05 09:35:53.436137+00
\.


--
-- Data for Name: api_limits; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.api_limits (workspace_id, max_checkpoints, max_storage_bytes, max_response_bytes, max_audit_events, max_page, device_budget, workspace_budget, window_seconds) FROM stdin;
10000000-0000-4000-8000-000000000001	100	16777216	262144	5000	20	60	120	60
10000000-0000-4000-8000-000000000002	100	16777216	262144	5000	20	60	120	60
\.


--
-- Data for Name: api_windows; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.api_windows (workspace_id, subject, started_at, requests) FROM stdin;
10000000-0000-4000-8000-000000000001	workspace	2026-11-05 09:35:53.655718+00	1
10000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000384	2026-11-05 09:35:53.655718+00	1
10000000-0000-4000-8000-000000000002	workspace	2026-11-05 09:35:53.884088+00	1
10000000-0000-4000-8000-000000000002	10000000-0000-4000-8000-000000000385	2026-11-05 09:35:53.884088+00	1
\.


--
-- Data for Name: audit_events; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.audit_events (id, workspace_id, device_id, event, request_id, revision, occurred_at) FROM stdin;
49c77b3a-50e7-49f3-800d-804c62d49904	10000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000384	SaveCheckpoint	10000000-0000-4000-8000-00000000038e	1	2026-11-05 09:35:53.664859+00
c272e1fc-614e-449b-8263-03865e6d8893	10000000-0000-4000-8000-000000000002	10000000-0000-4000-8000-000000000385	SaveCheckpoint	10000000-0000-4000-8000-00000000038f	1	2026-11-05 09:35:53.89278+00
\.


--
-- Data for Name: candidate_profiles; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.candidate_profiles (workspace_id, layout_id, template) FROM stdin;
10000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000003	{"ui": {"day": 0, "camera": {"fov": 35, "zoom": 1, "preset": "overview", "target": [834, 0, 474], "position": [1664, 1150, 1694]}, "bellMuted": false, "qualityMode": "auto", "consoleSlots": ["94c863bd-5a38-530f-a4e5-a9b6d0e812f8"], "hudMinimized": false, "recentTrainIds": ["94c863bd-5a38-530f-a4e5-a9b6d0e812f8"], "selectedTrainId": "94c863bd-5a38-530f-a4e5-a9b6d0e812f8", "rollingModelMode": "native"}, "time": {"tickCount": 720, "wasPaused": false, "stepSeconds": 0.016666666666666666, "accumulatorSeconds": 0.001}, "items": [{"id": "10000000-0000-4000-8000-000000000065", "modelId": "10000000-0000-4000-8000-000000000064", "nativeKind": "steam", "displayName": "fixture", "orientation": 1, "modelRevision": "synthetic-fixture-only", "nativeModelId": "10000000-0000-4000-8000-000000000064", "nativeModelRevision": "synthetic-fixture-only"}, {"id": "10000000-0000-4000-8000-000000000068", "modelId": "10000000-0000-4000-8000-000000000067", "nativeKind": "closed", "displayName": "fixture", "orientation": 1, "modelRevision": "synthetic-fixture-only", "nativeModelId": "10000000-0000-4000-8000-000000000067", "nativeModelRevision": "synthetic-fixture-only"}], "layout": {"switches": {"Y-2": false, "Y-3": false, "Y-4": false, "WX-A": false, "WX-B": false, "Y-IN": false, "Y-R1": false, "Y-R2": false}}, "models": [{"id": "10000000-0000-4000-8000-000000000064", "kind": "locomotive", "asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "couplers": {"back": {"x": -67.9, "y": 8, "z": 0}, "front": {"x": 49.6, "y": 8, "z": 0}}, "revision": "synthetic-fixture-only", "runtimeKey": "steam", "couplingMode": "explicit", "representation": "native", "legacyRearExtentMm": 0}, {"id": "10000000-0000-4000-8000-000000000067", "kind": "wagon", "asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "couplers": {"back": {"x": -10, "y": 8, "z": 0}, "front": {"x": 10, "y": 8, "z": 0}}, "revision": "synthetic-fixture-only", "runtimeKey": "closed", "couplingMode": "explicit", "representation": "native", "legacyRearExtentMm": 0}], "trains": [{"id": "94c863bd-5a38-530f-a4e5-a9b6d0e812f8", "dir": 1, "name": "fixture", "guard": {"risk": "SAFE", "delta": 0.5, "state": "SAFE", "reason": "available", "boundary": null, "distance": null, "velocity": 30, "direction": 1, "lookahead": 5, "probeKind": null, "intervened": false, "probeDelta": null, "leadingExtent": null, "requestedDelta": 0.5, "requestedSpeed": 20, "protectionInset": null, "stoppingDistance": 4.5}, "speed": 20, "lights": false, "journey": {"travel": 12, "position": 120, "segments": [{"id": "T47", "end": 248, "sign": 1, "start": 0}], "lastBlock": null}, "location": {"s": 120, "edge": "T47", "heading": 1}, "modelKey": "steam", "odometer": 12, "velocity": 30, "consistId": "10000000-0000-4000-8000-000000000066", "resetSeed": {"s": 80, "cars": 0, "edge": "T47", "loop": 2, "fraction": null}, "nativeName": "fixture", "description": "fixture", "runtimeSlot": 0, "routeContext": {"laps": 0, "loop": 2, "mode": "yard", "section": "T47", "previousLane": 2}, "requestedSpeed": 20, "nativeDescription": "fixture"}], "stateId": "ce394ec0-fc27-56f8-9362-94fddd3430ff", "consists": [{"id": "10000000-0000-4000-8000-000000000066", "name": "fixture", "members": [{"itemId": "10000000-0000-4000-8000-000000000065", "orientation": 1}]}], "layoutId": "10000000-0000-4000-8000-000000000003", "missions": {"changes": 0, "selected": 0, "didAttach": false, "didDetach": false, "transferred": false, "visitedRunaround": false}, "looseStock": [{"itemId": "10000000-0000-4000-8000-000000000068", "journey": {"travel": 0, "position": 220, "segments": [{"id": "T47", "end": 248, "sign": 1, "start": 0}], "lastBlock": null}, "location": {"s": 220, "edge": "T47", "heading": 1}, "animationDistanceMm": 0}], "workspaceId": "10000000-0000-4000-8000-000000000001", "resumePolicy": "STOPPED", "topologyHash": "e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc", "schemaVersion": 1, "engineRevision": "R1-348bfeff12c4005657098d89ea1d3c2ccdda9910", "inventoryStorage": []}
10000000-0000-4000-8000-000000000002	10000000-0000-4000-8000-000000000004	{"ui": {"day": 0, "camera": {"fov": 35, "zoom": 1, "preset": "overview", "target": [834, 0, 474], "position": [1664, 1150, 1694]}, "bellMuted": false, "qualityMode": "auto", "consoleSlots": ["94c863bd-5a38-530f-a4e5-a9b6d0e812f8"], "hudMinimized": false, "recentTrainIds": ["94c863bd-5a38-530f-a4e5-a9b6d0e812f8"], "selectedTrainId": "94c863bd-5a38-530f-a4e5-a9b6d0e812f8", "rollingModelMode": "native"}, "time": {"tickCount": 720, "wasPaused": false, "stepSeconds": 0.016666666666666666, "accumulatorSeconds": 0.001}, "items": [{"id": "10000000-0000-4000-8000-0000000000c9", "modelId": "10000000-0000-4000-8000-0000000000c8", "nativeKind": "steam", "displayName": "fixture", "orientation": 1, "modelRevision": "synthetic-fixture-only", "nativeModelId": "10000000-0000-4000-8000-0000000000c8", "nativeModelRevision": "synthetic-fixture-only"}, {"id": "10000000-0000-4000-8000-0000000000cc", "modelId": "10000000-0000-4000-8000-0000000000cb", "nativeKind": "closed", "displayName": "fixture", "orientation": 1, "modelRevision": "synthetic-fixture-only", "nativeModelId": "10000000-0000-4000-8000-0000000000cb", "nativeModelRevision": "synthetic-fixture-only"}], "layout": {"switches": {"Y-2": false, "Y-3": false, "Y-4": false, "WX-A": false, "WX-B": false, "Y-IN": false, "Y-R1": false, "Y-R2": false}}, "models": [{"id": "10000000-0000-4000-8000-0000000000c8", "kind": "locomotive", "asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "couplers": {"back": {"x": -67.9, "y": 8, "z": 0}, "front": {"x": 49.6, "y": 8, "z": 0}}, "revision": "synthetic-fixture-only", "runtimeKey": "steam", "couplingMode": "explicit", "representation": "native", "legacyRearExtentMm": 0}, {"id": "10000000-0000-4000-8000-0000000000cb", "kind": "wagon", "asset": {"id": "9929ed64-4aae-5562-ab90-6cebf3d562dd", "digest": "0000000000000000000000000000000000000000000000000000000000000000", "revision": "fixture"}, "couplers": {"back": {"x": -10, "y": 8, "z": 0}, "front": {"x": 10, "y": 8, "z": 0}}, "revision": "synthetic-fixture-only", "runtimeKey": "closed", "couplingMode": "explicit", "representation": "native", "legacyRearExtentMm": 0}], "trains": [{"id": "94c863bd-5a38-530f-a4e5-a9b6d0e812f8", "dir": 1, "name": "fixture", "guard": {"risk": "SAFE", "delta": 0.5, "state": "SAFE", "reason": "available", "boundary": null, "distance": null, "velocity": 30, "direction": 1, "lookahead": 5, "probeKind": null, "intervened": false, "probeDelta": null, "leadingExtent": null, "requestedDelta": 0.5, "requestedSpeed": 20, "protectionInset": null, "stoppingDistance": 4.5}, "speed": 20, "lights": false, "journey": {"travel": 12, "position": 120, "segments": [{"id": "T47", "end": 248, "sign": 1, "start": 0}], "lastBlock": null}, "location": {"s": 120, "edge": "T47", "heading": 1}, "modelKey": "steam", "odometer": 12, "velocity": 30, "consistId": "10000000-0000-4000-8000-0000000000ca", "resetSeed": {"s": 80, "cars": 0, "edge": "T47", "loop": 2, "fraction": null}, "nativeName": "fixture", "description": "fixture", "runtimeSlot": 0, "routeContext": {"laps": 0, "loop": 2, "mode": "yard", "section": "T47", "previousLane": 2}, "requestedSpeed": 20, "nativeDescription": "fixture"}], "stateId": "ce394ec0-fc27-56f8-9362-94fddd3430ff", "consists": [{"id": "10000000-0000-4000-8000-0000000000ca", "name": "fixture", "members": [{"itemId": "10000000-0000-4000-8000-0000000000c9", "orientation": 1}]}], "layoutId": "10000000-0000-4000-8000-000000000004", "missions": {"changes": 0, "selected": 0, "didAttach": false, "didDetach": false, "transferred": false, "visitedRunaround": false}, "looseStock": [{"itemId": "10000000-0000-4000-8000-0000000000cc", "journey": {"travel": 0, "position": 220, "segments": [{"id": "T47", "end": 248, "sign": 1, "start": 0}], "lastBlock": null}, "location": {"s": 220, "edge": "T47", "heading": 1}, "animationDistanceMm": 0}], "workspaceId": "10000000-0000-4000-8000-000000000002", "resumePolicy": "STOPPED", "topologyHash": "e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc", "schemaVersion": 1, "engineRevision": "R1-348bfeff12c4005657098d89ea1d3c2ccdda9910", "inventoryStorage": []}
\.


--
-- Data for Name: control_bindings; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.control_bindings (role_name, workspace_id, can_approve, can_redeem, can_provision, max_scope) FROM stdin;
\.


--
-- Data for Name: device_bindings; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.device_bindings (role_name, workspace_id, device_id, device_epoch, workspace_epoch, key_version) FROM stdin;
n10_seed_0	10000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000384	1	1	1
n10_seed_1	10000000-0000-4000-8000-000000000002	10000000-0000-4000-8000-000000000385	1	1	1
\.


--
-- Data for Name: device_locks; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.device_locks (workspace_id, device_id, marker) FROM stdin;
10000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000384	0
10000000-0000-4000-8000-000000000002	10000000-0000-4000-8000-000000000385	0
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.devices (id, workspace_id, public_key, key_version, scope, epoch, revoked_at, expires_at) FROM stdin;
10000000-0000-4000-8000-000000000384	10000000-0000-4000-8000-000000000001	{"x": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "y": "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", "crv": "P-256", "kty": "EC"}	1	owner	1	\N	\N
10000000-0000-4000-8000-000000000385	10000000-0000-4000-8000-000000000002	{"x": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", "y": "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", "crv": "P-256", "kty": "EC"}	1	owner	1	\N	\N
\.


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.invitations (id, workspace_id, candidate_device_id, public_key, fingerprint, verifier, scope, approved_by, approved_at, created_at, expires_at, consumed_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: lifecycle_events; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.lifecycle_events (id, workspace_id, job_id, state, actor, recorded_at) FROM stdin;
\.


--
-- Data for Name: lifecycle_jobs; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.lifecycle_jobs (id, workspace_id, device_id, role_name, kind, state, resume_state, public_key, scope, ticket_verifier, recovery_version, original_workspace_epoch, target_workspace_epoch, target_epoch, target_key_version, manifest, created_at, expires_at, grant_expires_at, approved_by, consumed_at, activated_at) FROM stdin;
\.


--
-- Data for Name: lifecycle_limits; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.lifecycle_limits (workspace_id, max_devices, max_jobs, max_events, ticket_seconds, grant_seconds) FROM stdin;
10000000-0000-4000-8000-000000000001	64	256	4096	600	2592000
10000000-0000-4000-8000-000000000002	64	256	4096	600	2592000
\.


--
-- Data for Name: nonce_limits; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.nonce_limits (workspace_id, audience, device_live, workspace_live, device_rate, workspace_rate) FROM stdin;
\.


--
-- Data for Name: nonce_windows; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.nonce_windows (workspace_id, subject, started_at, claims) FROM stdin;
\.


--
-- Data for Name: recovery_verifiers; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.recovery_verifiers (workspace_id, version, verifier, pepper_version, consumed_at, revoked_at, reserved_job) FROM stdin;
\.


--
-- Data for Name: replay_nonces; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.replay_nonces (workspace_id, device_id, key_version, epoch, nonce, expires_at, security_domain, context_version, claimed_at, context_digest) FROM stdin;
\.


--
-- Data for Name: session_heads; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.session_heads (workspace_id, layout_id, revision, snapshot_id, receipt_request_id, payload_digest) FROM stdin;
10000000-0000-4000-8000-000000000001	10000000-0000-4000-8000-000000000003	1	37bf7383-1792-4f07-802e-c64336917635	10000000-0000-4000-8000-00000000038e	32164f0f075ec2a746092924b1852244dd66a576ff45fc0955c5a2ea2469652f
10000000-0000-4000-8000-000000000002	10000000-0000-4000-8000-000000000004	1	e9041a52-e7f6-4369-8970-4bfc31cb4230	10000000-0000-4000-8000-00000000038f	4234edc219464b2619ab86fb7b884e25ee9c96c51258e8b2fb58f907cdf1bf47
\.


--
-- Data for Name: worker_bindings; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.worker_bindings (role_name, workspace_id) FROM stdin;
n10_seed_0	10000000-0000-4000-8000-000000000001
n10_seed_1	10000000-0000-4000-8000-000000000002
\.


--
-- Data for Name: workspace_locks; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.workspace_locks (workspace_id, marker) FROM stdin;
10000000-0000-4000-8000-000000000001	0
10000000-0000-4000-8000-000000000002	0
\.


--
-- Data for Name: workspaces; Type: TABLE DATA; Schema: serien_capability; Owner: postgres
--

COPY serien_capability.workspaces (id, status, auth_epoch) FROM stdin;
10000000-0000-4000-8000-000000000001	active	1
10000000-0000-4000-8000-000000000002	active	1
\.


--
-- Name: lifecycle_events_id_seq; Type: SEQUENCE SET; Schema: serien_capability; Owner: postgres
--

SELECT pg_catalog.setval('serien_capability.lifecycle_events_id_seq', 1, false);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: consist_members consist_members_consist_id_ordinal_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consist_members
    ADD CONSTRAINT consist_members_consist_id_ordinal_key UNIQUE (consist_id, ordinal);


--
-- Name: consist_members consist_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consist_members
    ADD CONSTRAINT consist_members_pkey PRIMARY KEY (consist_id, stock_item_id);


--
-- Name: consist_members consist_members_stock_item_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consist_members
    ADD CONSTRAINT consist_members_stock_item_id_key UNIQUE (stock_item_id);


--
-- Name: consists consists_id_owner_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consists
    ADD CONSTRAINT consists_id_owner_id_key UNIQUE (id, owner_id);


--
-- Name: consists consists_id_ownership_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consists
    ADD CONSTRAINT consists_id_ownership_key_key UNIQUE (id, ownership_key);


--
-- Name: consists consists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consists
    ADD CONSTRAINT consists_pkey PRIMARY KEY (id);


--
-- Name: layout_placements layout_placements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_placements
    ADD CONSTRAINT layout_placements_pkey PRIMARY KEY (consist_id);


--
-- Name: layout_segments layout_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_segments
    ADD CONSTRAINT layout_segments_pkey PRIMARY KEY (layout_id, edge_id);


--
-- Name: layout_snapshots layout_snapshots_layout_id_revision_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_snapshots
    ADD CONSTRAINT layout_snapshots_layout_id_revision_key UNIQUE (layout_id, revision);


--
-- Name: layout_snapshots layout_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_snapshots
    ADD CONSTRAINT layout_snapshots_pkey PRIMARY KEY (id);


--
-- Name: layout_snapshots layout_snapshots_workspace_id_layout_id_id_revision_payload_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_snapshots
    ADD CONSTRAINT layout_snapshots_workspace_id_layout_id_id_revision_payload_key UNIQUE (workspace_id, layout_id, id, revision, payload_digest);


--
-- Name: layouts layouts_id_owner_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layouts
    ADD CONSTRAINT layouts_id_owner_id_key UNIQUE (id, owner_id);


--
-- Name: layouts layouts_id_ownership_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layouts
    ADD CONSTRAINT layouts_id_ownership_key_key UNIQUE (id, ownership_key);


--
-- Name: layouts layouts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layouts
    ADD CONSTRAINT layouts_pkey PRIMARY KEY (id);


--
-- Name: layouts layouts_workspace_id_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layouts
    ADD CONSTRAINT layouts_workspace_id_id_key UNIQUE (workspace_id, id);


--
-- Name: loose_stock_placements loose_stock_placements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loose_stock_placements
    ADD CONSTRAINT loose_stock_placements_pkey PRIMARY KEY (stock_item_id);


--
-- Name: operation_receipts operation_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.operation_receipts
    ADD CONSTRAINT operation_receipts_pkey PRIMARY KEY (receipt_id);


--
-- Name: operation_receipts operation_receipts_workspace_id_layout_id_request_id_snapsh_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.operation_receipts
    ADD CONSTRAINT operation_receipts_workspace_id_layout_id_request_id_snapsh_key UNIQUE (workspace_id, layout_id, request_id, snapshot_id, revision, payload_digest);


--
-- Name: operation_receipts operation_receipts_workspace_id_request_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.operation_receipts
    ADD CONSTRAINT operation_receipts_workspace_id_request_id_key UNIQUE (workspace_id, request_id);


--
-- Name: stock_items stock_items_id_owner_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_id_owner_id_key UNIQUE (id, owner_id);


--
-- Name: stock_items stock_items_id_ownership_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_id_ownership_key_key UNIQUE (id, ownership_key);


--
-- Name: stock_items stock_items_owner_id_inventory_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_owner_id_inventory_code_key UNIQUE (owner_id, inventory_code);


--
-- Name: stock_items stock_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_pkey PRIMARY KEY (id);


--
-- Name: stock_models stock_models_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_models
    ADD CONSTRAINT stock_models_pkey PRIMARY KEY (id);


--
-- Name: api_limits api_limits_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.api_limits
    ADD CONSTRAINT api_limits_pkey PRIMARY KEY (workspace_id);


--
-- Name: api_windows api_windows_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.api_windows
    ADD CONSTRAINT api_windows_pkey PRIMARY KEY (workspace_id, subject);


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);


--
-- Name: candidate_profiles candidate_profiles_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.candidate_profiles
    ADD CONSTRAINT candidate_profiles_pkey PRIMARY KEY (workspace_id, layout_id);


--
-- Name: control_bindings control_bindings_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.control_bindings
    ADD CONSTRAINT control_bindings_pkey PRIMARY KEY (role_name, workspace_id);


--
-- Name: device_bindings device_bindings_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.device_bindings
    ADD CONSTRAINT device_bindings_pkey PRIMARY KEY (role_name);


--
-- Name: device_locks device_locks_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.device_locks
    ADD CONSTRAINT device_locks_pkey PRIMARY KEY (workspace_id, device_id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: devices devices_workspace_id_id_key; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.devices
    ADD CONSTRAINT devices_workspace_id_id_key UNIQUE (workspace_id, id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_verifier_key; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.invitations
    ADD CONSTRAINT invitations_verifier_key UNIQUE (verifier);


--
-- Name: lifecycle_events lifecycle_events_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.lifecycle_events
    ADD CONSTRAINT lifecycle_events_pkey PRIMARY KEY (id);


--
-- Name: lifecycle_jobs lifecycle_jobs_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.lifecycle_jobs
    ADD CONSTRAINT lifecycle_jobs_pkey PRIMARY KEY (id);


--
-- Name: lifecycle_jobs lifecycle_jobs_role_name_key; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.lifecycle_jobs
    ADD CONSTRAINT lifecycle_jobs_role_name_key UNIQUE (role_name);


--
-- Name: lifecycle_jobs lifecycle_jobs_ticket_verifier_key; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.lifecycle_jobs
    ADD CONSTRAINT lifecycle_jobs_ticket_verifier_key UNIQUE (ticket_verifier);


--
-- Name: lifecycle_jobs lifecycle_jobs_workspace_id_id_key; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.lifecycle_jobs
    ADD CONSTRAINT lifecycle_jobs_workspace_id_id_key UNIQUE (workspace_id, id);


--
-- Name: lifecycle_limits lifecycle_limits_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.lifecycle_limits
    ADD CONSTRAINT lifecycle_limits_pkey PRIMARY KEY (workspace_id);


--
-- Name: nonce_limits nonce_limits_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.nonce_limits
    ADD CONSTRAINT nonce_limits_pkey PRIMARY KEY (workspace_id);


--
-- Name: nonce_windows nonce_windows_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.nonce_windows
    ADD CONSTRAINT nonce_windows_pkey PRIMARY KEY (workspace_id, subject);


--
-- Name: recovery_verifiers recovery_verifiers_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.recovery_verifiers
    ADD CONSTRAINT recovery_verifiers_pkey PRIMARY KEY (workspace_id, version);


--
-- Name: recovery_verifiers recovery_verifiers_verifier_key; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.recovery_verifiers
    ADD CONSTRAINT recovery_verifiers_verifier_key UNIQUE (verifier);


--
-- Name: replay_nonces replay_nonces_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.replay_nonces
    ADD CONSTRAINT replay_nonces_pkey PRIMARY KEY (device_id, nonce);


--
-- Name: session_heads session_heads_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.session_heads
    ADD CONSTRAINT session_heads_pkey PRIMARY KEY (workspace_id, layout_id);


--
-- Name: worker_bindings worker_bindings_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.worker_bindings
    ADD CONSTRAINT worker_bindings_pkey PRIMARY KEY (role_name);


--
-- Name: workspace_locks workspace_locks_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.workspace_locks
    ADD CONSTRAINT workspace_locks_pkey PRIMARY KEY (workspace_id);


--
-- Name: workspaces workspaces_pkey; Type: CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);


--
-- Name: consist_members_owner_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consist_members_owner_idx ON public.consist_members USING btree (owner_id);


--
-- Name: consist_members_stock_owner_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consist_members_stock_owner_idx ON public.consist_members USING btree (stock_item_id, owner_id);


--
-- Name: consist_members_workspace_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consist_members_workspace_idx ON public.consist_members USING btree (workspace_id);


--
-- Name: consists_owner_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consists_owner_idx ON public.consists USING btree (owner_id);


--
-- Name: consists_workspace_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX consists_workspace_idx ON public.consists USING btree (workspace_id);


--
-- Name: layout_placements_layout_owner_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX layout_placements_layout_owner_idx ON public.layout_placements USING btree (layout_id, owner_id);


--
-- Name: layout_placements_workspace_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX layout_placements_workspace_idx ON public.layout_placements USING btree (workspace_id);


--
-- Name: layout_snapshots_recent_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX layout_snapshots_recent_idx ON public.layout_snapshots USING btree (layout_id, saved_at DESC);


--
-- Name: layout_snapshots_workspace_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX layout_snapshots_workspace_idx ON public.layout_snapshots USING btree (workspace_id);


--
-- Name: layouts_owner_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX layouts_owner_idx ON public.layouts USING btree (owner_id);


--
-- Name: layouts_workspace_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX layouts_workspace_idx ON public.layouts USING btree (workspace_id);


--
-- Name: loose_item_domain_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX loose_item_domain_idx ON public.loose_stock_placements USING btree (stock_item_id, ownership_key);


--
-- Name: loose_layout_domain_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX loose_layout_domain_idx ON public.loose_stock_placements USING btree (layout_id, ownership_key);


--
-- Name: loose_stock_layout_owner_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX loose_stock_layout_owner_idx ON public.loose_stock_placements USING btree (layout_id, owner_id);


--
-- Name: loose_stock_placements_workspace_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX loose_stock_placements_workspace_idx ON public.loose_stock_placements USING btree (workspace_id);


--
-- Name: members_consist_domain_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX members_consist_domain_idx ON public.consist_members USING btree (consist_id, ownership_key);


--
-- Name: members_item_domain_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX members_item_domain_idx ON public.consist_members USING btree (stock_item_id, ownership_key);


--
-- Name: operation_receipts_recent_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX operation_receipts_recent_idx ON public.operation_receipts USING btree (owner_id, created_at DESC);


--
-- Name: operation_receipts_workspace_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX operation_receipts_workspace_idx ON public.operation_receipts USING btree (workspace_id);


--
-- Name: placements_consist_domain_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX placements_consist_domain_idx ON public.layout_placements USING btree (consist_id, ownership_key);


--
-- Name: placements_layout_domain_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX placements_layout_domain_idx ON public.layout_placements USING btree (layout_id, ownership_key);


--
-- Name: receipts_legacy_request; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX receipts_legacy_request ON public.operation_receipts USING btree (owner_id, request_id) WHERE (workspace_id IS NULL);


--
-- Name: receipts_snapshot_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX receipts_snapshot_idx ON public.operation_receipts USING btree (workspace_id, layout_id, snapshot_id, revision, payload_digest);


--
-- Name: snapshots_layout_domain_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX snapshots_layout_domain_idx ON public.layout_snapshots USING btree (layout_id, ownership_key);


--
-- Name: stock_items_model_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stock_items_model_idx ON public.stock_items USING btree (model_id);


--
-- Name: stock_items_owner_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stock_items_owner_idx ON public.stock_items USING btree (owner_id);


--
-- Name: stock_items_workspace_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX stock_items_workspace_idx ON public.stock_items USING btree (workspace_id);


--
-- Name: audit_workspace_time; Type: INDEX; Schema: serien_capability; Owner: postgres
--

CREATE INDEX audit_workspace_time ON serien_capability.audit_events USING btree (workspace_id, occurred_at);


--
-- Name: devices_workspace; Type: INDEX; Schema: serien_capability; Owner: postgres
--

CREATE INDEX devices_workspace ON serien_capability.devices USING btree (workspace_id);


--
-- Name: head_receipt_idx; Type: INDEX; Schema: serien_capability; Owner: postgres
--

CREATE INDEX head_receipt_idx ON serien_capability.session_heads USING btree (workspace_id, layout_id, receipt_request_id, snapshot_id, revision, payload_digest);


--
-- Name: head_snapshot_idx; Type: INDEX; Schema: serien_capability; Owner: postgres
--

CREATE INDEX head_snapshot_idx ON serien_capability.session_heads USING btree (workspace_id, layout_id, snapshot_id, revision, payload_digest);


--
-- Name: invitations_workspace_expiry; Type: INDEX; Schema: serien_capability; Owner: postgres
--

CREATE INDEX invitations_workspace_expiry ON serien_capability.invitations USING btree (workspace_id, expires_at);


--
-- Name: lifecycle_one_active; Type: INDEX; Schema: serien_capability; Owner: postgres
--

CREATE UNIQUE INDEX lifecycle_one_active ON serien_capability.lifecycle_jobs USING btree (device_id) WHERE (state = 'ACTIVE'::text);


--
-- Name: lifecycle_workspace_device; Type: INDEX; Schema: serien_capability; Owner: postgres
--

CREATE INDEX lifecycle_workspace_device ON serien_capability.lifecycle_jobs USING btree (workspace_id, device_id);


--
-- Name: recovery_one_active; Type: INDEX; Schema: serien_capability; Owner: postgres
--

CREATE UNIQUE INDEX recovery_one_active ON serien_capability.recovery_verifiers USING btree (workspace_id) WHERE ((consumed_at IS NULL) AND (revoked_at IS NULL));


--
-- Name: replay_expiry; Type: INDEX; Schema: serien_capability; Owner: postgres
--

CREATE INDEX replay_expiry ON serien_capability.replay_nonces USING btree (expires_at);


--
-- Name: worker_bindings_workspace; Type: INDEX; Schema: serien_capability; Owner: postgres
--

CREATE INDEX worker_bindings_workspace ON serien_capability.worker_bindings USING btree (workspace_id);


--
-- Name: layout_placements check_layout_placement; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_layout_placement BEFORE INSERT OR UPDATE ON public.layout_placements FOR EACH ROW EXECUTE FUNCTION serien_internal.check_placement();


--
-- Name: loose_stock_placements check_loose_assignment; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_loose_assignment BEFORE INSERT OR UPDATE ON public.loose_stock_placements FOR EACH ROW EXECUTE FUNCTION serien_internal.check_loose_assignment();


--
-- Name: loose_stock_placements check_loose_placement; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_loose_placement BEFORE INSERT OR UPDATE ON public.loose_stock_placements FOR EACH ROW EXECUTE FUNCTION serien_internal.check_placement();


--
-- Name: consist_members check_member_assignment; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_member_assignment BEFORE INSERT OR UPDATE ON public.consist_members FOR EACH ROW EXECUTE FUNCTION serien_internal.check_member_assignment();


--
-- Name: layout_snapshots check_snapshot; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER check_snapshot BEFORE INSERT OR UPDATE ON public.layout_snapshots FOR EACH ROW EXECUTE FUNCTION serien_internal.check_snapshot();


--
-- Name: consists consists_ready_at_commit; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE CONSTRAINT TRIGGER consists_ready_at_commit AFTER INSERT OR UPDATE OF status ON public.consists DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION serien_internal.check_ready_consist();


--
-- Name: consists consists_touch; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER consists_touch BEFORE UPDATE ON public.consists FOR EACH ROW EXECUTE FUNCTION serien_internal.touch_updated_at();


--
-- Name: operation_receipts immutable_receipt; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER immutable_receipt BEFORE DELETE OR UPDATE ON public.operation_receipts FOR EACH ROW EXECUTE FUNCTION serien_capability.immutable_checkpoint();


--
-- Name: layout_snapshots immutable_snapshot; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER immutable_snapshot BEFORE DELETE OR UPDATE ON public.layout_snapshots FOR EACH ROW EXECUTE FUNCTION serien_capability.immutable_checkpoint();


--
-- Name: layout_placements layout_placements_touch; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER layout_placements_touch BEFORE UPDATE ON public.layout_placements FOR EACH ROW EXECUTE FUNCTION serien_internal.touch_updated_at();


--
-- Name: layouts layouts_touch; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER layouts_touch BEFORE UPDATE ON public.layouts FOR EACH ROW EXECUTE FUNCTION serien_internal.touch_updated_at();


--
-- Name: stock_models lock_model_kind; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER lock_model_kind BEFORE UPDATE OF kind ON public.stock_models FOR EACH ROW EXECUTE FUNCTION serien_internal.lock_model_identity();


--
-- Name: loose_stock_placements loose_stock_touch; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER loose_stock_touch BEFORE UPDATE ON public.loose_stock_placements FOR EACH ROW EXECUTE FUNCTION serien_internal.touch_updated_at();


--
-- Name: consist_members members_ready_at_commit; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE CONSTRAINT TRIGGER members_ready_at_commit AFTER INSERT OR DELETE OR UPDATE ON public.consist_members DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION serien_internal.check_ready_members();


--
-- Name: stock_items stock_items_touch; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER stock_items_touch BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION serien_internal.touch_updated_at();


--
-- Name: stock_models stock_models_touch; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER stock_models_touch BEFORE UPDATE ON public.stock_models FOR EACH ROW EXECUTE FUNCTION serien_internal.touch_updated_at();


--
-- Name: devices coordinate_device; Type: TRIGGER; Schema: serien_capability; Owner: postgres
--

CREATE TRIGGER coordinate_device BEFORE DELETE OR UPDATE ON serien_capability.devices FOR EACH ROW EXECUTE FUNCTION serien_capability.coordinate_authority();


--
-- Name: workspaces coordinate_workspace; Type: TRIGGER; Schema: serien_capability; Owner: postgres
--

CREATE TRIGGER coordinate_workspace BEFORE DELETE OR UPDATE ON serien_capability.workspaces FOR EACH ROW EXECUTE FUNCTION serien_capability.coordinate_authority();


--
-- Name: audit_events immutable_audit; Type: TRIGGER; Schema: serien_capability; Owner: postgres
--

CREATE TRIGGER immutable_audit BEFORE DELETE OR UPDATE ON serien_capability.audit_events FOR EACH ROW EXECUTE FUNCTION serien_capability.immutable_checkpoint();


--
-- Name: lifecycle_events immutable_lifecycle_event; Type: TRIGGER; Schema: serien_capability; Owner: postgres
--

CREATE TRIGGER immutable_lifecycle_event BEFORE DELETE OR UPDATE ON serien_capability.lifecycle_events FOR EACH ROW EXECUTE FUNCTION serien_capability.immutable_checkpoint();


--
-- Name: session_heads monotone_head; Type: TRIGGER; Schema: serien_capability; Owner: postgres
--

CREATE TRIGGER monotone_head BEFORE UPDATE ON serien_capability.session_heads FOR EACH ROW EXECUTE FUNCTION serien_capability.monotone_head();


--
-- Name: consist_members consist_members_consist_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consist_members
    ADD CONSTRAINT consist_members_consist_id_owner_id_fkey FOREIGN KEY (consist_id, owner_id) REFERENCES public.consists(id, owner_id) ON DELETE CASCADE;


--
-- Name: consist_members consist_members_consist_id_ownership_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consist_members
    ADD CONSTRAINT consist_members_consist_id_ownership_key_fkey FOREIGN KEY (consist_id, ownership_key) REFERENCES public.consists(id, ownership_key) DEFERRABLE;


--
-- Name: consist_members consist_members_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consist_members
    ADD CONSTRAINT consist_members_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: consist_members consist_members_stock_item_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consist_members
    ADD CONSTRAINT consist_members_stock_item_id_owner_id_fkey FOREIGN KEY (stock_item_id, owner_id) REFERENCES public.stock_items(id, owner_id) ON DELETE RESTRICT;


--
-- Name: consist_members consist_members_stock_item_id_ownership_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consist_members
    ADD CONSTRAINT consist_members_stock_item_id_ownership_key_fkey FOREIGN KEY (stock_item_id, ownership_key) REFERENCES public.stock_items(id, ownership_key) DEFERRABLE;


--
-- Name: consist_members consist_members_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consist_members
    ADD CONSTRAINT consist_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id) ON DELETE RESTRICT;


--
-- Name: consists consists_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consists
    ADD CONSTRAINT consists_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: consists consists_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consists
    ADD CONSTRAINT consists_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id) ON DELETE RESTRICT;


--
-- Name: layout_placements layout_placements_consist_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_placements
    ADD CONSTRAINT layout_placements_consist_id_owner_id_fkey FOREIGN KEY (consist_id, owner_id) REFERENCES public.consists(id, owner_id) ON DELETE CASCADE;


--
-- Name: layout_placements layout_placements_consist_id_ownership_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_placements
    ADD CONSTRAINT layout_placements_consist_id_ownership_key_fkey FOREIGN KEY (consist_id, ownership_key) REFERENCES public.consists(id, ownership_key) DEFERRABLE;


--
-- Name: layout_placements layout_placements_layout_id_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_placements
    ADD CONSTRAINT layout_placements_layout_id_edge_id_fkey FOREIGN KEY (layout_id, edge_id) REFERENCES public.layout_segments(layout_id, edge_id) ON DELETE RESTRICT;


--
-- Name: layout_placements layout_placements_layout_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_placements
    ADD CONSTRAINT layout_placements_layout_id_owner_id_fkey FOREIGN KEY (layout_id, owner_id) REFERENCES public.layouts(id, owner_id) ON DELETE CASCADE;


--
-- Name: layout_placements layout_placements_layout_id_ownership_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_placements
    ADD CONSTRAINT layout_placements_layout_id_ownership_key_fkey FOREIGN KEY (layout_id, ownership_key) REFERENCES public.layouts(id, ownership_key) DEFERRABLE;


--
-- Name: layout_placements layout_placements_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_placements
    ADD CONSTRAINT layout_placements_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: layout_placements layout_placements_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_placements
    ADD CONSTRAINT layout_placements_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id) ON DELETE RESTRICT;


--
-- Name: layout_segments layout_segments_layout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_segments
    ADD CONSTRAINT layout_segments_layout_id_fkey FOREIGN KEY (layout_id) REFERENCES public.layouts(id) ON DELETE CASCADE;


--
-- Name: layout_snapshots layout_snapshots_layout_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_snapshots
    ADD CONSTRAINT layout_snapshots_layout_id_owner_id_fkey FOREIGN KEY (layout_id, owner_id) REFERENCES public.layouts(id, owner_id) ON DELETE CASCADE;


--
-- Name: layout_snapshots layout_snapshots_layout_id_ownership_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_snapshots
    ADD CONSTRAINT layout_snapshots_layout_id_ownership_key_fkey FOREIGN KEY (layout_id, ownership_key) REFERENCES public.layouts(id, ownership_key) DEFERRABLE;


--
-- Name: layout_snapshots layout_snapshots_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_snapshots
    ADD CONSTRAINT layout_snapshots_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: layout_snapshots layout_snapshots_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layout_snapshots
    ADD CONSTRAINT layout_snapshots_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id) ON DELETE RESTRICT;


--
-- Name: layouts layouts_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layouts
    ADD CONSTRAINT layouts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: layouts layouts_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.layouts
    ADD CONSTRAINT layouts_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id) ON DELETE RESTRICT;


--
-- Name: loose_stock_placements loose_stock_placements_layout_id_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loose_stock_placements
    ADD CONSTRAINT loose_stock_placements_layout_id_edge_id_fkey FOREIGN KEY (layout_id, edge_id) REFERENCES public.layout_segments(layout_id, edge_id) ON DELETE RESTRICT;


--
-- Name: loose_stock_placements loose_stock_placements_layout_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loose_stock_placements
    ADD CONSTRAINT loose_stock_placements_layout_id_owner_id_fkey FOREIGN KEY (layout_id, owner_id) REFERENCES public.layouts(id, owner_id) ON DELETE CASCADE;


--
-- Name: loose_stock_placements loose_stock_placements_layout_id_ownership_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loose_stock_placements
    ADD CONSTRAINT loose_stock_placements_layout_id_ownership_key_fkey FOREIGN KEY (layout_id, ownership_key) REFERENCES public.layouts(id, ownership_key) DEFERRABLE;


--
-- Name: loose_stock_placements loose_stock_placements_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loose_stock_placements
    ADD CONSTRAINT loose_stock_placements_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: loose_stock_placements loose_stock_placements_stock_item_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loose_stock_placements
    ADD CONSTRAINT loose_stock_placements_stock_item_id_owner_id_fkey FOREIGN KEY (stock_item_id, owner_id) REFERENCES public.stock_items(id, owner_id) ON DELETE CASCADE;


--
-- Name: loose_stock_placements loose_stock_placements_stock_item_id_ownership_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loose_stock_placements
    ADD CONSTRAINT loose_stock_placements_stock_item_id_ownership_key_fkey FOREIGN KEY (stock_item_id, ownership_key) REFERENCES public.stock_items(id, ownership_key) DEFERRABLE;


--
-- Name: loose_stock_placements loose_stock_placements_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loose_stock_placements
    ADD CONSTRAINT loose_stock_placements_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id) ON DELETE RESTRICT;


--
-- Name: operation_receipts operation_receipts_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.operation_receipts
    ADD CONSTRAINT operation_receipts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: operation_receipts operation_receipts_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.operation_receipts
    ADD CONSTRAINT operation_receipts_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id) ON DELETE RESTRICT;


--
-- Name: operation_receipts operation_receipts_workspace_id_layout_id_snapshot_id_revi_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.operation_receipts
    ADD CONSTRAINT operation_receipts_workspace_id_layout_id_snapshot_id_revi_fkey FOREIGN KEY (workspace_id, layout_id, snapshot_id, revision, payload_digest) REFERENCES public.layout_snapshots(workspace_id, layout_id, id, revision, payload_digest);


--
-- Name: stock_items stock_items_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.stock_models(id) ON DELETE RESTRICT;


--
-- Name: stock_items stock_items_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: stock_items stock_items_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id) ON DELETE RESTRICT;


--
-- Name: api_limits api_limits_workspace_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.api_limits
    ADD CONSTRAINT api_limits_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id);


--
-- Name: api_windows api_windows_workspace_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.api_windows
    ADD CONSTRAINT api_windows_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id);


--
-- Name: audit_events audit_events_workspace_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.audit_events
    ADD CONSTRAINT audit_events_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id);


--
-- Name: candidate_profiles candidate_profiles_workspace_id_layout_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.candidate_profiles
    ADD CONSTRAINT candidate_profiles_workspace_id_layout_id_fkey FOREIGN KEY (workspace_id, layout_id) REFERENCES public.layouts(workspace_id, id);


--
-- Name: control_bindings control_bindings_workspace_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.control_bindings
    ADD CONSTRAINT control_bindings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id);


--
-- Name: device_bindings device_bindings_role_name_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.device_bindings
    ADD CONSTRAINT device_bindings_role_name_fkey FOREIGN KEY (role_name) REFERENCES serien_capability.worker_bindings(role_name);


--
-- Name: device_bindings device_bindings_workspace_id_device_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.device_bindings
    ADD CONSTRAINT device_bindings_workspace_id_device_id_fkey FOREIGN KEY (workspace_id, device_id) REFERENCES serien_capability.devices(workspace_id, id);


--
-- Name: device_locks device_locks_workspace_id_device_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.device_locks
    ADD CONSTRAINT device_locks_workspace_id_device_id_fkey FOREIGN KEY (workspace_id, device_id) REFERENCES serien_capability.devices(workspace_id, id);


--
-- Name: devices devices_workspace_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.devices
    ADD CONSTRAINT devices_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id) ON DELETE RESTRICT;


--
-- Name: invitations invitations_workspace_id_approved_by_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.invitations
    ADD CONSTRAINT invitations_workspace_id_approved_by_fkey FOREIGN KEY (workspace_id, approved_by) REFERENCES serien_capability.devices(workspace_id, id);


--
-- Name: invitations invitations_workspace_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.invitations
    ADD CONSTRAINT invitations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id);


--
-- Name: lifecycle_events lifecycle_events_workspace_id_job_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.lifecycle_events
    ADD CONSTRAINT lifecycle_events_workspace_id_job_id_fkey FOREIGN KEY (workspace_id, job_id) REFERENCES serien_capability.lifecycle_jobs(workspace_id, id);


--
-- Name: lifecycle_jobs lifecycle_jobs_workspace_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.lifecycle_jobs
    ADD CONSTRAINT lifecycle_jobs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id);


--
-- Name: lifecycle_limits lifecycle_limits_workspace_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.lifecycle_limits
    ADD CONSTRAINT lifecycle_limits_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id);


--
-- Name: nonce_limits nonce_limits_workspace_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.nonce_limits
    ADD CONSTRAINT nonce_limits_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id);


--
-- Name: nonce_windows nonce_windows_workspace_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.nonce_windows
    ADD CONSTRAINT nonce_windows_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id);


--
-- Name: recovery_verifiers recovery_verifiers_workspace_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.recovery_verifiers
    ADD CONSTRAINT recovery_verifiers_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id);


--
-- Name: recovery_verifiers recovery_verifiers_workspace_id_reserved_job_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.recovery_verifiers
    ADD CONSTRAINT recovery_verifiers_workspace_id_reserved_job_fkey FOREIGN KEY (workspace_id, reserved_job) REFERENCES serien_capability.lifecycle_jobs(workspace_id, id);


--
-- Name: replay_nonces replay_nonces_workspace_id_device_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.replay_nonces
    ADD CONSTRAINT replay_nonces_workspace_id_device_id_fkey FOREIGN KEY (workspace_id, device_id) REFERENCES serien_capability.devices(workspace_id, id);


--
-- Name: session_heads session_heads_workspace_id_layout_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.session_heads
    ADD CONSTRAINT session_heads_workspace_id_layout_id_fkey FOREIGN KEY (workspace_id, layout_id) REFERENCES public.layouts(workspace_id, id);


--
-- Name: session_heads session_heads_workspace_id_layout_id_receipt_request_id_sn_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.session_heads
    ADD CONSTRAINT session_heads_workspace_id_layout_id_receipt_request_id_sn_fkey FOREIGN KEY (workspace_id, layout_id, receipt_request_id, snapshot_id, revision, payload_digest) REFERENCES public.operation_receipts(workspace_id, layout_id, request_id, snapshot_id, revision, payload_digest) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: session_heads session_heads_workspace_id_layout_id_snapshot_id_revision__fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.session_heads
    ADD CONSTRAINT session_heads_workspace_id_layout_id_snapshot_id_revision__fkey FOREIGN KEY (workspace_id, layout_id, snapshot_id, revision, payload_digest) REFERENCES public.layout_snapshots(workspace_id, layout_id, id, revision, payload_digest);


--
-- Name: worker_bindings worker_bindings_workspace_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.worker_bindings
    ADD CONSTRAINT worker_bindings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id);


--
-- Name: workspace_locks workspace_locks_workspace_id_fkey; Type: FK CONSTRAINT; Schema: serien_capability; Owner: postgres
--

ALTER TABLE ONLY serien_capability.workspace_locks
    ADD CONSTRAINT workspace_locks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES serien_capability.workspaces(id);


--
-- Name: consist_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.consist_members ENABLE ROW LEVEL SECURITY;

--
-- Name: consist_members consist_members_owner_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consist_members_owner_all ON public.consist_members TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: consists; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.consists ENABLE ROW LEVEL SECURITY;

--
-- Name: consists consists_owner_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY consists_owner_all ON public.consists TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: consist_members executor_scope; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY executor_scope ON public.consist_members TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: consists executor_scope; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY executor_scope ON public.consists TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: layout_placements executor_scope; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY executor_scope ON public.layout_placements TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: layout_snapshots executor_scope; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY executor_scope ON public.layout_snapshots TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: layouts executor_scope; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY executor_scope ON public.layouts TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: loose_stock_placements executor_scope; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY executor_scope ON public.loose_stock_placements TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: operation_receipts executor_scope; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY executor_scope ON public.operation_receipts TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: stock_items executor_scope; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY executor_scope ON public.stock_items TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: layout_segments executor_segments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY executor_segments ON public.layout_segments FOR SELECT TO serien_tm_executor USING ((EXISTS ( SELECT
   FROM public.layouts l
  WHERE (l.id = layout_segments.layout_id))));


--
-- Name: layout_placements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.layout_placements ENABLE ROW LEVEL SECURITY;

--
-- Name: layout_segments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.layout_segments ENABLE ROW LEVEL SECURITY;

--
-- Name: layout_snapshots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.layout_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: layouts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.layouts ENABLE ROW LEVEL SECURITY;

--
-- Name: layouts layouts_owner_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY layouts_owner_all ON public.layouts TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: loose_stock_placements loose_owner_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY loose_owner_all ON public.loose_stock_placements TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: loose_stock_placements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.loose_stock_placements ENABLE ROW LEVEL SECURITY;

--
-- Name: operation_receipts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.operation_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: layout_placements placements_owner_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY placements_owner_all ON public.layout_placements TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: operation_receipts receipts_owner_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY receipts_owner_all ON public.operation_receipts TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: layout_segments segments_owner_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY segments_owner_all ON public.layout_segments TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.layouts l
  WHERE ((l.id = layout_segments.layout_id) AND (l.owner_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.layouts l
  WHERE ((l.id = layout_segments.layout_id) AND (l.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: layout_snapshots snapshots_owner_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY snapshots_owner_all ON public.layout_snapshots TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: stock_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_items stock_items_owner_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_items_owner_delete ON public.stock_items FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: stock_items stock_items_owner_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_items_owner_insert ON public.stock_items FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: stock_items stock_items_owner_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_items_owner_select ON public.stock_items FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: stock_items stock_items_owner_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_items_owner_update ON public.stock_items FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: stock_models; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.stock_models ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_models stock_models_signed_in_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY stock_models_signed_in_read ON public.stock_models FOR SELECT TO authenticated USING (true);


--
-- Name: stock_models worker_catalog_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY worker_catalog_read ON public.stock_models FOR SELECT TO serien_tm_worker USING (true);


--
-- Name: consist_members worker_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY worker_read ON public.consist_members FOR SELECT TO serien_tm_worker USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = CURRENT_USER))));


--
-- Name: consists worker_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY worker_read ON public.consists FOR SELECT TO serien_tm_worker USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = CURRENT_USER))));


--
-- Name: layout_placements worker_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY worker_read ON public.layout_placements FOR SELECT TO serien_tm_worker USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = CURRENT_USER))));


--
-- Name: layout_snapshots worker_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY worker_read ON public.layout_snapshots FOR SELECT TO serien_tm_worker USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = CURRENT_USER))));


--
-- Name: layouts worker_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY worker_read ON public.layouts FOR SELECT TO serien_tm_worker USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = CURRENT_USER))));


--
-- Name: loose_stock_placements worker_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY worker_read ON public.loose_stock_placements FOR SELECT TO serien_tm_worker USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = CURRENT_USER))));


--
-- Name: operation_receipts worker_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY worker_read ON public.operation_receipts FOR SELECT TO serien_tm_worker USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = CURRENT_USER))));


--
-- Name: stock_items worker_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY worker_read ON public.stock_items FOR SELECT TO serien_tm_worker USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = CURRENT_USER))));


--
-- Name: layout_segments worker_segments_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY worker_segments_read ON public.layout_segments FOR SELECT TO serien_tm_worker USING ((EXISTS ( SELECT 1
   FROM public.layouts l
  WHERE (l.id = layout_segments.layout_id))));


--
-- Name: api_limits; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.api_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: api_windows; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.api_windows ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_events; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.audit_events ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_locks authorizer_lock; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY authorizer_lock ON serien_capability.workspace_locks TO serien_tm_authorizer USING (true) WITH CHECK (true);


--
-- Name: worker_bindings binding_self; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY binding_self ON serien_capability.worker_bindings FOR SELECT TO serien_tm_worker USING ((role_name = CURRENT_USER));


--
-- Name: candidate_profiles; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.candidate_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: control_bindings; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.control_bindings ENABLE ROW LEVEL SECURITY;

--
-- Name: device_bindings; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.device_bindings ENABLE ROW LEVEL SECURITY;

--
-- Name: device_locks; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.device_locks ENABLE ROW LEVEL SECURITY;

--
-- Name: devices; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.devices ENABLE ROW LEVEL SECURITY;

--
-- Name: worker_bindings executor_binding; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY executor_binding ON serien_capability.worker_bindings FOR SELECT TO serien_tm_executor USING ((role_name = SESSION_USER));


--
-- Name: device_bindings executor_device_binding; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY executor_device_binding ON serien_capability.device_bindings FOR SELECT TO serien_tm_executor USING ((role_name = SESSION_USER));


--
-- Name: api_limits executor_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY executor_scope ON serien_capability.api_limits TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: api_windows executor_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY executor_scope ON serien_capability.api_windows TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: audit_events executor_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY executor_scope ON serien_capability.audit_events TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: candidate_profiles executor_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY executor_scope ON serien_capability.candidate_profiles TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: device_locks executor_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY executor_scope ON serien_capability.device_locks TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: devices executor_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY executor_scope ON serien_capability.devices TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: session_heads executor_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY executor_scope ON serien_capability.session_heads TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: workspace_locks executor_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY executor_scope ON serien_capability.workspace_locks TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: workspaces executor_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY executor_scope ON serien_capability.workspaces TO serien_tm_executor USING ((id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: session_heads head_read; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY head_read ON serien_capability.session_heads FOR SELECT TO serien_tm_worker USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = CURRENT_USER))));


--
-- Name: invitations; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: control_bindings lifecycle_binding_self; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY lifecycle_binding_self ON serien_capability.control_bindings TO serien_tm_lifecycle_executor USING ((role_name = SESSION_USER));


--
-- Name: lifecycle_events; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.lifecycle_events ENABLE ROW LEVEL SECURITY;

--
-- Name: lifecycle_jobs; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.lifecycle_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: lifecycle_limits; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.lifecycle_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: device_bindings lifecycle_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY lifecycle_scope ON serien_capability.device_bindings TO serien_tm_lifecycle_executor USING (serien_capability.control_scope(workspace_id)) WITH CHECK (serien_capability.control_scope(workspace_id));


--
-- Name: device_locks lifecycle_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY lifecycle_scope ON serien_capability.device_locks TO serien_tm_lifecycle_executor USING (serien_capability.control_scope(workspace_id)) WITH CHECK (serien_capability.control_scope(workspace_id));


--
-- Name: devices lifecycle_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY lifecycle_scope ON serien_capability.devices TO serien_tm_lifecycle_executor USING (serien_capability.control_scope(workspace_id)) WITH CHECK (serien_capability.control_scope(workspace_id));


--
-- Name: invitations lifecycle_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY lifecycle_scope ON serien_capability.invitations TO serien_tm_lifecycle_executor USING (serien_capability.control_scope(workspace_id)) WITH CHECK (serien_capability.control_scope(workspace_id));


--
-- Name: lifecycle_events lifecycle_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY lifecycle_scope ON serien_capability.lifecycle_events TO serien_tm_lifecycle_executor USING (serien_capability.control_scope(workspace_id)) WITH CHECK (serien_capability.control_scope(workspace_id));


--
-- Name: lifecycle_jobs lifecycle_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY lifecycle_scope ON serien_capability.lifecycle_jobs TO serien_tm_lifecycle_executor USING (serien_capability.control_scope(workspace_id)) WITH CHECK (serien_capability.control_scope(workspace_id));


--
-- Name: lifecycle_limits lifecycle_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY lifecycle_scope ON serien_capability.lifecycle_limits TO serien_tm_lifecycle_executor USING (serien_capability.control_scope(workspace_id)) WITH CHECK (serien_capability.control_scope(workspace_id));


--
-- Name: recovery_verifiers lifecycle_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY lifecycle_scope ON serien_capability.recovery_verifiers TO serien_tm_lifecycle_executor USING (serien_capability.control_scope(workspace_id)) WITH CHECK (serien_capability.control_scope(workspace_id));


--
-- Name: worker_bindings lifecycle_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY lifecycle_scope ON serien_capability.worker_bindings TO serien_tm_lifecycle_executor USING (serien_capability.control_scope(workspace_id)) WITH CHECK (serien_capability.control_scope(workspace_id));


--
-- Name: workspace_locks lifecycle_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY lifecycle_scope ON serien_capability.workspace_locks TO serien_tm_lifecycle_executor USING (serien_capability.control_scope(workspace_id)) WITH CHECK (serien_capability.control_scope(workspace_id));


--
-- Name: workspaces lifecycle_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY lifecycle_scope ON serien_capability.workspaces TO serien_tm_lifecycle_executor USING (serien_capability.control_scope(id)) WITH CHECK (serien_capability.control_scope(id));


--
-- Name: device_locks lock_marker; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY lock_marker ON serien_capability.device_locks FOR UPDATE TO serien_tm_worker USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = CURRENT_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = CURRENT_USER))));


--
-- Name: device_locks lock_read; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY lock_read ON serien_capability.device_locks FOR SELECT TO serien_tm_worker USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = CURRENT_USER))));


--
-- Name: nonce_limits; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.nonce_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: nonce_limits nonce_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY nonce_scope ON serien_capability.nonce_limits TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: nonce_windows nonce_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY nonce_scope ON serien_capability.nonce_windows TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: replay_nonces nonce_scope; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY nonce_scope ON serien_capability.replay_nonces TO serien_tm_executor USING ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER)))) WITH CHECK ((workspace_id IN ( SELECT worker_bindings.workspace_id
   FROM serien_capability.worker_bindings
  WHERE (worker_bindings.role_name = SESSION_USER))));


--
-- Name: nonce_windows; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.nonce_windows ENABLE ROW LEVEL SECURITY;

--
-- Name: recovery_verifiers; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.recovery_verifiers ENABLE ROW LEVEL SECURITY;

--
-- Name: device_locks registry_operator; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY registry_operator ON serien_capability.device_locks TO serien_tm_authorizer USING (true) WITH CHECK (true);


--
-- Name: devices registry_operator; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY registry_operator ON serien_capability.devices TO serien_tm_authorizer USING (true) WITH CHECK (true);


--
-- Name: invitations registry_operator; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY registry_operator ON serien_capability.invitations TO serien_tm_authorizer USING (true) WITH CHECK (true);


--
-- Name: recovery_verifiers registry_operator; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY registry_operator ON serien_capability.recovery_verifiers TO serien_tm_authorizer USING (true) WITH CHECK (true);


--
-- Name: replay_nonces registry_operator; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY registry_operator ON serien_capability.replay_nonces TO serien_tm_authorizer USING (true) WITH CHECK (true);


--
-- Name: worker_bindings registry_operator; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY registry_operator ON serien_capability.worker_bindings TO serien_tm_authorizer USING (true) WITH CHECK (true);


--
-- Name: workspaces registry_operator; Type: POLICY; Schema: serien_capability; Owner: postgres
--

CREATE POLICY registry_operator ON serien_capability.workspaces TO serien_tm_authorizer USING (true) WITH CHECK (true);


--
-- Name: replay_nonces; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.replay_nonces ENABLE ROW LEVEL SECURITY;

--
-- Name: session_heads; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.session_heads ENABLE ROW LEVEL SECURITY;

--
-- Name: worker_bindings; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.worker_bindings ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_locks; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.workspace_locks ENABLE ROW LEVEL SECURITY;

--
-- Name: workspaces; Type: ROW SECURITY; Schema: serien_capability; Owner: postgres
--

ALTER TABLE serien_capability.workspaces ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO serien_tm_executor;


--
-- Name: SCHEMA serien_capability; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA serien_capability TO serien_tm_worker;
GRANT USAGE ON SCHEMA serien_capability TO serien_tm_authorizer;
GRANT USAGE ON SCHEMA serien_capability TO serien_tm_executor;
GRANT USAGE ON SCHEMA serien_capability TO serien_tm_control;
GRANT USAGE ON SCHEMA serien_capability TO serien_tm_redeemer;
GRANT USAGE ON SCHEMA serien_capability TO serien_tm_provisioner;
GRANT USAGE ON SCHEMA serien_capability TO serien_tm_lifecycle_executor;


--
-- Name: SCHEMA serien_internal; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA serien_internal TO serien_tm_executor;


--
-- Name: FUNCTION approve_device_job(p_job uuid, key jsonb, approved_scope text); Type: ACL; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

REVOKE ALL ON FUNCTION serien_capability.approve_device_job(p_job uuid, key jsonb, approved_scope text) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.approve_device_job(p_job uuid, key jsonb, approved_scope text) TO serien_tm_control;


--
-- Name: FUNCTION authorize(p_workspace uuid, p_layout uuid, p_write boolean); Type: ACL; Schema: serien_capability; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_capability.authorize(p_workspace uuid, p_layout uuid, p_write boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.authorize(p_workspace uuid, p_layout uuid, p_write boolean) TO serien_tm_executor;


--
-- Name: FUNCTION bounded_response(w uuid, value jsonb); Type: ACL; Schema: serien_capability; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_capability.bounded_response(w uuid, value jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.bounded_response(w uuid, value jsonb) TO serien_tm_executor;


--
-- Name: FUNCTION claim_nonce(c jsonb); Type: ACL; Schema: serien_capability; Owner: serien_tm_executor
--

REVOKE ALL ON FUNCTION serien_capability.claim_nonce(c jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.claim_nonce(c jsonb) TO serien_tm_worker;


--
-- Name: FUNCTION complete_device_job(p_job uuid); Type: ACL; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

REVOKE ALL ON FUNCTION serien_capability.complete_device_job(p_job uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.complete_device_job(p_job uuid) TO serien_tm_provisioner;


--
-- Name: FUNCTION consume_budget(w uuid, d uuid); Type: ACL; Schema: serien_capability; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_capability.consume_budget(w uuid, d uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.consume_budget(w uuid, d uuid) TO serien_tm_executor;


--
-- Name: FUNCTION control_access(w uuid, operation text); Type: ACL; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

REVOKE ALL ON FUNCTION serien_capability.control_access(w uuid, operation text) FROM PUBLIC;


--
-- Name: FUNCTION control_ceiling(w uuid, requested_scope text); Type: ACL; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

REVOKE ALL ON FUNCTION serien_capability.control_ceiling(w uuid, requested_scope text) FROM PUBLIC;


--
-- Name: FUNCTION control_scope(w uuid); Type: ACL; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

REVOKE ALL ON FUNCTION serien_capability.control_scope(w uuid) FROM PUBLIC;


--
-- Name: FUNCTION coordinate_authority(); Type: ACL; Schema: serien_capability; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_capability.coordinate_authority() FROM PUBLIC;


--
-- Name: FUNCTION immutable_checkpoint(); Type: ACL; Schema: serien_capability; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_capability.immutable_checkpoint() FROM PUBLIC;


--
-- Name: TABLE lifecycle_jobs; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT,INSERT ON TABLE serien_capability.lifecycle_jobs TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN lifecycle_jobs.state; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT UPDATE(state) ON TABLE serien_capability.lifecycle_jobs TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN lifecycle_jobs.resume_state; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT UPDATE(resume_state) ON TABLE serien_capability.lifecycle_jobs TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN lifecycle_jobs.approved_by; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT UPDATE(approved_by) ON TABLE serien_capability.lifecycle_jobs TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN lifecycle_jobs.consumed_at; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT UPDATE(consumed_at) ON TABLE serien_capability.lifecycle_jobs TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN lifecycle_jobs.activated_at; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT UPDATE(activated_at) ON TABLE serien_capability.lifecycle_jobs TO serien_tm_lifecycle_executor;


--
-- Name: FUNCTION job_response(j serien_capability.lifecycle_jobs); Type: ACL; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

REVOKE ALL ON FUNCTION serien_capability.job_response(j serien_capability.lifecycle_jobs) FROM PUBLIC;


--
-- Name: FUNCTION list_history(w uuid, l uuid, after_revision bigint, page_size integer, through_revision bigint); Type: ACL; Schema: serien_capability; Owner: serien_tm_executor
--

REVOKE ALL ON FUNCTION serien_capability.list_history(w uuid, l uuid, after_revision bigint, page_size integer, through_revision bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.list_history(w uuid, l uuid, after_revision bigint, page_size integer, through_revision bigint) TO serien_tm_worker;


--
-- Name: FUNCTION manifest_refs(v jsonb); Type: ACL; Schema: serien_capability; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_capability.manifest_refs(v jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.manifest_refs(v jsonb) TO serien_tm_executor;


--
-- Name: FUNCTION monotone_head(); Type: ACL; Schema: serien_capability; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_capability.monotone_head() FROM PUBLIC;


--
-- Name: FUNCTION prepare_device_job(p_job uuid, w uuid, d uuid, principal name, kind text, key jsonb, scope text, ticket_verifier text, recovery_version bigint); Type: ACL; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

REVOKE ALL ON FUNCTION serien_capability.prepare_device_job(p_job uuid, w uuid, d uuid, principal name, kind text, key jsonb, scope text, ticket_verifier text, recovery_version bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.prepare_device_job(p_job uuid, w uuid, d uuid, principal name, kind text, key jsonb, scope text, ticket_verifier text, recovery_version bigint) TO serien_tm_control;


--
-- Name: FUNCTION profile_canonical_v1(v jsonb); Type: ACL; Schema: serien_capability; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_capability.profile_canonical_v1(v jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.profile_canonical_v1(v jsonb) TO serien_tm_executor;


--
-- Name: FUNCTION read_device_job(p_job uuid); Type: ACL; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

REVOKE ALL ON FUNCTION serien_capability.read_device_job(p_job uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.read_device_job(p_job uuid) TO serien_tm_control;
GRANT ALL ON FUNCTION serien_capability.read_device_job(p_job uuid) TO serien_tm_redeemer;
GRANT ALL ON FUNCTION serien_capability.read_device_job(p_job uuid) TO serien_tm_provisioner;


--
-- Name: FUNCTION read_head(w uuid, l uuid); Type: ACL; Schema: serien_capability; Owner: serien_tm_executor
--

REVOKE ALL ON FUNCTION serien_capability.read_head(w uuid, l uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.read_head(w uuid, l uuid) TO serien_tm_worker;


--
-- Name: FUNCTION read_receipt(w uuid, l uuid, req uuid); Type: ACL; Schema: serien_capability; Owner: serien_tm_executor
--

REVOKE ALL ON FUNCTION serien_capability.read_receipt(w uuid, l uuid, req uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.read_receipt(w uuid, l uuid, req uuid) TO serien_tm_worker;


--
-- Name: FUNCTION read_snapshot(w uuid, l uuid, r bigint); Type: ACL; Schema: serien_capability; Owner: serien_tm_executor
--

REVOKE ALL ON FUNCTION serien_capability.read_snapshot(w uuid, l uuid, r bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.read_snapshot(w uuid, l uuid, r bigint) TO serien_tm_worker;


--
-- Name: TABLE operation_receipts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT ON TABLE public.operation_receipts TO serien_tm_executor;


--
-- Name: FUNCTION receipt_response(r public.operation_receipts); Type: ACL; Schema: serien_capability; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_capability.receipt_response(r public.operation_receipts) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.receipt_response(r public.operation_receipts) TO serien_tm_executor;


--
-- Name: FUNCTION record_job(p_job uuid); Type: ACL; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

REVOKE ALL ON FUNCTION serien_capability.record_job(p_job uuid) FROM PUBLIC;


--
-- Name: FUNCTION recover_revision(w uuid, l uuid, expected bigint, source_revision bigint, req uuid); Type: ACL; Schema: serien_capability; Owner: serien_tm_executor
--

REVOKE ALL ON FUNCTION serien_capability.recover_revision(w uuid, l uuid, expected bigint, source_revision bigint, req uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.recover_revision(w uuid, l uuid, expected bigint, source_revision bigint, req uuid) TO serien_tm_worker;


--
-- Name: FUNCTION redeem_device_job(p_job uuid, key jsonb, ticket text, recovery_verifier text); Type: ACL; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

REVOKE ALL ON FUNCTION serien_capability.redeem_device_job(p_job uuid, key jsonb, ticket text, recovery_verifier text) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.redeem_device_job(p_job uuid, key jsonb, ticket text, recovery_verifier text) TO serien_tm_redeemer;


--
-- Name: FUNCTION revoke_device(w uuid, d uuid); Type: ACL; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

REVOKE ALL ON FUNCTION serien_capability.revoke_device(w uuid, d uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.revoke_device(w uuid, d uuid) TO serien_tm_control;


--
-- Name: FUNCTION safe_device_role(principal name, allow_login boolean); Type: ACL; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

REVOKE ALL ON FUNCTION serien_capability.safe_device_role(principal name, allow_login boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.safe_device_role(principal name, allow_login boolean) TO serien_tm_executor;


--
-- Name: FUNCTION save_checkpoint(p_request uuid, p_wire text, p_digest text); Type: ACL; Schema: serien_capability; Owner: serien_tm_executor
--

REVOKE ALL ON FUNCTION serien_capability.save_checkpoint(p_request uuid, p_wire text, p_digest text) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.save_checkpoint(p_request uuid, p_wire text, p_digest text) TO serien_tm_worker;


--
-- Name: FUNCTION set_recovery_verifier(w uuid, v bigint, verifier text, pepper_version integer); Type: ACL; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

REVOKE ALL ON FUNCTION serien_capability.set_recovery_verifier(w uuid, v bigint, verifier text, pepper_version integer) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.set_recovery_verifier(w uuid, v bigint, verifier text, pepper_version integer) TO serien_tm_control;


--
-- Name: FUNCTION state_hash(v jsonb); Type: ACL; Schema: serien_capability; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_capability.state_hash(v jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.state_hash(v jsonb) TO serien_tm_executor;


--
-- Name: FUNCTION storage_usage(w uuid); Type: ACL; Schema: serien_capability; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_capability.storage_usage(w uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.storage_usage(w uuid) TO serien_tm_executor;


--
-- Name: FUNCTION transition_failed_job(p_job uuid, action text); Type: ACL; Schema: serien_capability; Owner: serien_tm_lifecycle_executor
--

REVOKE ALL ON FUNCTION serien_capability.transition_failed_job(p_job uuid, action text) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.transition_failed_job(p_job uuid, action text) TO serien_tm_provisioner;


--
-- Name: TABLE layout_snapshots; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT ON TABLE public.layout_snapshots TO serien_tm_executor;


--
-- Name: FUNCTION verify_snapshot(w uuid, l uuid, r bigint); Type: ACL; Schema: serien_capability; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_capability.verify_snapshot(w uuid, l uuid, r bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_capability.verify_snapshot(w uuid, l uuid, r bigint) TO serien_tm_executor;


--
-- Name: FUNCTION assert_ready_consist(p_id uuid); Type: ACL; Schema: serien_internal; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_internal.assert_ready_consist(p_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION serien_internal.assert_ready_consist(p_id uuid) TO serien_tm_executor;


--
-- Name: FUNCTION check_loose_assignment(); Type: ACL; Schema: serien_internal; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_internal.check_loose_assignment() FROM PUBLIC;


--
-- Name: FUNCTION check_member_assignment(); Type: ACL; Schema: serien_internal; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_internal.check_member_assignment() FROM PUBLIC;


--
-- Name: FUNCTION check_placement(); Type: ACL; Schema: serien_internal; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_internal.check_placement() FROM PUBLIC;
GRANT ALL ON FUNCTION serien_internal.check_placement() TO serien_tm_executor;


--
-- Name: FUNCTION check_ready_consist(); Type: ACL; Schema: serien_internal; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_internal.check_ready_consist() FROM PUBLIC;


--
-- Name: FUNCTION check_ready_members(); Type: ACL; Schema: serien_internal; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_internal.check_ready_members() FROM PUBLIC;


--
-- Name: FUNCTION check_snapshot(); Type: ACL; Schema: serien_internal; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_internal.check_snapshot() FROM PUBLIC;
GRANT ALL ON FUNCTION serien_internal.check_snapshot() TO serien_tm_executor;


--
-- Name: FUNCTION lock_model_identity(); Type: ACL; Schema: serien_internal; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_internal.lock_model_identity() FROM PUBLIC;


--
-- Name: FUNCTION touch_updated_at(); Type: ACL; Schema: serien_internal; Owner: postgres
--

REVOKE ALL ON FUNCTION serien_internal.touch_updated_at() FROM PUBLIC;
GRANT ALL ON FUNCTION serien_internal.touch_updated_at() TO serien_tm_executor;


--
-- Name: TABLE consist_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.consist_members TO serien_tm_executor;


--
-- Name: TABLE consists; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.consists TO serien_tm_executor;


--
-- Name: TABLE layout_placements; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.layout_placements TO serien_tm_executor;


--
-- Name: COLUMN layout_placements.state_version; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(state_version) ON TABLE public.layout_placements TO serien_tm_executor;


--
-- Name: TABLE layout_segments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.layout_segments TO serien_tm_executor;


--
-- Name: TABLE layouts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.layouts TO serien_tm_executor;


--
-- Name: TABLE loose_stock_placements; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.loose_stock_placements TO serien_tm_executor;


--
-- Name: COLUMN loose_stock_placements.state_version; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(state_version) ON TABLE public.loose_stock_placements TO serien_tm_executor;


--
-- Name: TABLE stock_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.stock_items TO serien_tm_executor;


--
-- Name: COLUMN stock_items.id; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(id) ON TABLE public.stock_items TO serien_tm_executor;


--
-- Name: TABLE api_limits; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT ON TABLE serien_capability.api_limits TO serien_tm_executor;


--
-- Name: TABLE api_windows; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE serien_capability.api_windows TO serien_tm_executor;


--
-- Name: TABLE audit_events; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT,INSERT ON TABLE serien_capability.audit_events TO serien_tm_executor;


--
-- Name: TABLE candidate_profiles; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT ON TABLE serien_capability.candidate_profiles TO serien_tm_executor;


--
-- Name: TABLE control_bindings; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT ON TABLE serien_capability.control_bindings TO serien_tm_lifecycle_executor;


--
-- Name: TABLE device_bindings; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT ON TABLE serien_capability.device_bindings TO serien_tm_executor;
GRANT SELECT,INSERT ON TABLE serien_capability.device_bindings TO serien_tm_lifecycle_executor;


--
-- Name: TABLE device_locks; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE serien_capability.device_locks TO serien_tm_authorizer;
GRANT SELECT ON TABLE serien_capability.device_locks TO serien_tm_executor;
GRANT SELECT,INSERT ON TABLE serien_capability.device_locks TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN device_locks.marker; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT UPDATE(marker) ON TABLE serien_capability.device_locks TO serien_tm_executor;
GRANT UPDATE(marker) ON TABLE serien_capability.device_locks TO serien_tm_lifecycle_executor;


--
-- Name: TABLE devices; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE serien_capability.devices TO serien_tm_authorizer;
GRANT SELECT,INSERT ON TABLE serien_capability.devices TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN devices.id; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT(id) ON TABLE serien_capability.devices TO serien_tm_executor;


--
-- Name: COLUMN devices.workspace_id; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT(workspace_id) ON TABLE serien_capability.devices TO serien_tm_executor;


--
-- Name: COLUMN devices.public_key; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT UPDATE(public_key) ON TABLE serien_capability.devices TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN devices.key_version; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT(key_version) ON TABLE serien_capability.devices TO serien_tm_executor;
GRANT UPDATE(key_version) ON TABLE serien_capability.devices TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN devices.scope; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT(scope) ON TABLE serien_capability.devices TO serien_tm_executor;
GRANT UPDATE(scope) ON TABLE serien_capability.devices TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN devices.epoch; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT(epoch) ON TABLE serien_capability.devices TO serien_tm_executor;
GRANT UPDATE(epoch) ON TABLE serien_capability.devices TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN devices.revoked_at; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT(revoked_at) ON TABLE serien_capability.devices TO serien_tm_executor;
GRANT UPDATE(revoked_at) ON TABLE serien_capability.devices TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN devices.expires_at; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT(expires_at) ON TABLE serien_capability.devices TO serien_tm_executor;
GRANT UPDATE(expires_at) ON TABLE serien_capability.devices TO serien_tm_lifecycle_executor;


--
-- Name: TABLE invitations; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE serien_capability.invitations TO serien_tm_authorizer;


--
-- Name: COLUMN invitations.workspace_id; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT(workspace_id) ON TABLE serien_capability.invitations TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN invitations.revoked_at; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT(revoked_at),UPDATE(revoked_at) ON TABLE serien_capability.invitations TO serien_tm_lifecycle_executor;


--
-- Name: TABLE lifecycle_events; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT,INSERT ON TABLE serien_capability.lifecycle_events TO serien_tm_lifecycle_executor;


--
-- Name: SEQUENCE lifecycle_events_id_seq; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT USAGE ON SEQUENCE serien_capability.lifecycle_events_id_seq TO serien_tm_lifecycle_executor;


--
-- Name: TABLE lifecycle_limits; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT ON TABLE serien_capability.lifecycle_limits TO serien_tm_lifecycle_executor;


--
-- Name: TABLE nonce_limits; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT ON TABLE serien_capability.nonce_limits TO serien_tm_executor;


--
-- Name: TABLE nonce_windows; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE serien_capability.nonce_windows TO serien_tm_executor;


--
-- Name: TABLE recovery_verifiers; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE serien_capability.recovery_verifiers TO serien_tm_authorizer;
GRANT SELECT,INSERT ON TABLE serien_capability.recovery_verifiers TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN recovery_verifiers.consumed_at; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT UPDATE(consumed_at) ON TABLE serien_capability.recovery_verifiers TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN recovery_verifiers.revoked_at; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT UPDATE(revoked_at) ON TABLE serien_capability.recovery_verifiers TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN recovery_verifiers.reserved_job; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT UPDATE(reserved_job) ON TABLE serien_capability.recovery_verifiers TO serien_tm_lifecycle_executor;


--
-- Name: TABLE replay_nonces; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE serien_capability.replay_nonces TO serien_tm_authorizer;
GRANT SELECT,INSERT,DELETE ON TABLE serien_capability.replay_nonces TO serien_tm_executor;


--
-- Name: TABLE session_heads; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT ON TABLE serien_capability.session_heads TO serien_tm_executor;


--
-- Name: COLUMN session_heads.revision; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT UPDATE(revision) ON TABLE serien_capability.session_heads TO serien_tm_executor;


--
-- Name: COLUMN session_heads.snapshot_id; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT UPDATE(snapshot_id) ON TABLE serien_capability.session_heads TO serien_tm_executor;


--
-- Name: COLUMN session_heads.receipt_request_id; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT UPDATE(receipt_request_id) ON TABLE serien_capability.session_heads TO serien_tm_executor;


--
-- Name: COLUMN session_heads.payload_digest; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT UPDATE(payload_digest) ON TABLE serien_capability.session_heads TO serien_tm_executor;


--
-- Name: TABLE worker_bindings; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE serien_capability.worker_bindings TO serien_tm_authorizer;
GRANT SELECT ON TABLE serien_capability.worker_bindings TO serien_tm_executor;
GRANT SELECT,INSERT ON TABLE serien_capability.worker_bindings TO serien_tm_lifecycle_executor;


--
-- Name: TABLE workspace_locks; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT ON TABLE serien_capability.workspace_locks TO serien_tm_executor;
GRANT SELECT,UPDATE ON TABLE serien_capability.workspace_locks TO serien_tm_authorizer;
GRANT SELECT ON TABLE serien_capability.workspace_locks TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN workspace_locks.marker; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT UPDATE(marker) ON TABLE serien_capability.workspace_locks TO serien_tm_executor;
GRANT UPDATE(marker) ON TABLE serien_capability.workspace_locks TO serien_tm_lifecycle_executor;


--
-- Name: TABLE workspaces; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE serien_capability.workspaces TO serien_tm_authorizer;


--
-- Name: COLUMN workspaces.id; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT(id) ON TABLE serien_capability.workspaces TO serien_tm_executor;
GRANT SELECT(id) ON TABLE serien_capability.workspaces TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN workspaces.status; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT(status) ON TABLE serien_capability.workspaces TO serien_tm_executor;
GRANT SELECT(status) ON TABLE serien_capability.workspaces TO serien_tm_lifecycle_executor;


--
-- Name: COLUMN workspaces.auth_epoch; Type: ACL; Schema: serien_capability; Owner: postgres
--

GRANT SELECT(auth_epoch) ON TABLE serien_capability.workspaces TO serien_tm_executor;
GRANT SELECT(auth_epoch),UPDATE(auth_epoch) ON TABLE serien_capability.workspaces TO serien_tm_lifecycle_executor;


--
-- PostgreSQL database dump complete
--

\unrestrict NJLG3u0t8qLeTXL8Kdo3blYFOGBcdy3zu0EX23bn1tASky3aGOmJR34NSqsDNGj
