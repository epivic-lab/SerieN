-- 6A.8: isolated PostgreSQL 17 proposal. No production/staging application authorized.
-- The broker remains trusted to verify P-256. SQL authenticates session_user, not browser signatures.
BEGIN;

CREATE ROLE serien_tm_control NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB;
CREATE ROLE serien_tm_redeemer NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB;
CREATE ROLE serien_tm_provisioner NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB;
CREATE ROLE serien_tm_lifecycle_executor NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB;
GRANT USAGE ON SCHEMA serien_capability TO serien_tm_control,serien_tm_redeemer,serien_tm_provisioner,serien_tm_lifecycle_executor;

CREATE TABLE serien_capability.control_bindings (
 role_name name NOT NULL, workspace_id uuid NOT NULL REFERENCES serien_capability.workspaces(id),
 can_approve boolean NOT NULL DEFAULT false, can_redeem boolean NOT NULL DEFAULT false,
 can_provision boolean NOT NULL DEFAULT false, max_scope text NOT NULL CHECK(max_scope IN('reader','editor','owner')),
 PRIMARY KEY(role_name,workspace_id)
);
CREATE TABLE serien_capability.lifecycle_limits (
 workspace_id uuid PRIMARY KEY REFERENCES serien_capability.workspaces(id),
 max_devices integer NOT NULL DEFAULT 64 CHECK(max_devices BETWEEN 1 AND 1024),
 max_jobs integer NOT NULL DEFAULT 256 CHECK(max_jobs BETWEEN 1 AND 10000),
 max_events integer NOT NULL DEFAULT 4096 CHECK(max_events BETWEEN 1 AND 100000),
 ticket_seconds integer NOT NULL DEFAULT 600 CHECK(ticket_seconds BETWEEN 1 AND 600),
 grant_seconds integer NOT NULL DEFAULT 2592000 CHECK(grant_seconds BETWEEN 1 AND 31536000)
);
CREATE TABLE serien_capability.lifecycle_jobs (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES serien_capability.workspaces(id),
 device_id uuid NOT NULL, role_name name NOT NULL UNIQUE,
 kind text NOT NULL CHECK(kind IN('PAIR','ROTATE','RECOVER')),
 state text NOT NULL CHECK(state IN('PREPARED','APPROVED','ACTIVATING','ACTIVE','REVOKED','FAILED','RECOVERABLE')),
 resume_state text CHECK(resume_state IN('PREPARED','APPROVED','ACTIVATING')),
 public_key jsonb NOT NULL, scope text NOT NULL CHECK(scope IN('reader','editor','owner')),
 ticket_verifier text NOT NULL UNIQUE CHECK(ticket_verifier ~ '^[0-9a-f]{64}$'),
 recovery_version bigint, original_workspace_epoch bigint NOT NULL CHECK(original_workspace_epoch>0),
 target_workspace_epoch bigint NOT NULL CHECK(target_workspace_epoch>0),
 target_epoch bigint NOT NULL CHECK(target_epoch>0), target_key_version integer NOT NULL CHECK(target_key_version>0),
 manifest jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL, grant_expires_at timestamptz NOT NULL,
 approved_by name, consumed_at timestamptz, activated_at timestamptz,
 CHECK(expires_at>created_at), CHECK(grant_expires_at>created_at),
 CHECK((state='RECOVERABLE')=(resume_state IS NOT NULL)),
 CHECK((kind='RECOVER')=(recovery_version IS NOT NULL)),
 CHECK(state NOT IN('APPROVED','ACTIVATING','ACTIVE') OR approved_by IS NOT NULL),
 CHECK(state NOT IN('ACTIVATING','ACTIVE') OR consumed_at IS NOT NULL),
 CHECK(state<>'ACTIVE' OR activated_at IS NOT NULL),
 UNIQUE(workspace_id,id)
);
CREATE INDEX lifecycle_workspace_device ON serien_capability.lifecycle_jobs(workspace_id,device_id);
CREATE UNIQUE INDEX lifecycle_one_active ON serien_capability.lifecycle_jobs(device_id) WHERE state='ACTIVE';
CREATE TABLE serien_capability.lifecycle_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 workspace_id uuid NOT NULL, job_id uuid NOT NULL, state text NOT NULL,
 actor name NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(workspace_id,job_id) REFERENCES serien_capability.lifecycle_jobs(workspace_id,id)
);
ALTER TABLE serien_capability.recovery_verifiers ADD COLUMN reserved_job uuid,
 ADD FOREIGN KEY(workspace_id,reserved_job) REFERENCES serien_capability.lifecycle_jobs(workspace_id,id);

CREATE TABLE serien_capability.nonce_limits (
 workspace_id uuid PRIMARY KEY REFERENCES serien_capability.workspaces(id),
 audience text NOT NULL CHECK(audience ~ '^https?://[^ /]+$' AND length(audience)<=256),
 device_live integer NOT NULL DEFAULT 1000 CHECK(device_live BETWEEN 1 AND 10000),
 workspace_live integer NOT NULL DEFAULT 10000 CHECK(workspace_live BETWEEN 1 AND 100000),
 device_rate integer NOT NULL DEFAULT 60 CHECK(device_rate BETWEEN 1 AND 10000),
 workspace_rate integer NOT NULL DEFAULT 120 CHECK(workspace_rate BETWEEN 1 AND 100000)
);
CREATE TABLE serien_capability.nonce_windows (
 workspace_id uuid NOT NULL REFERENCES serien_capability.workspaces(id), subject text NOT NULL,
 started_at timestamptz NOT NULL, claims integer NOT NULL CHECK(claims>0),
 PRIMARY KEY(workspace_id,subject)
);
ALTER TABLE serien_capability.replay_nonces
 ADD COLUMN security_domain text NOT NULL DEFAULT 'SerieN-capability-v1' CHECK(security_domain='SerieN-capability-v1'),
 ADD COLUMN context_version text NOT NULL DEFAULT 'sql-claim-v1' CHECK(context_version='sql-claim-v1'),
 ADD COLUMN claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 ADD COLUMN context_digest text CHECK(context_digest ~ '^[0-9a-f]{64}$');
-- Existing PK(device_id,nonce) intentionally rejects reuse even across key versions.

DO $$DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['control_bindings','lifecycle_limits','lifecycle_jobs','lifecycle_events','nonce_limits','nonce_windows'] LOOP
  EXECUTE format('ALTER TABLE serien_capability.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE serien_capability.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON serien_capability.%I FROM PUBLIC,anon,authenticated,serien_tm_worker,serien_tm_control,serien_tm_redeemer,serien_tm_provisioner,serien_tm_authorizer',t);
 END LOOP;
END $$;
REVOKE ALL ON SEQUENCE serien_capability.lifecycle_events_id_seq FROM PUBLIC,anon,authenticated,serien_tm_worker,serien_tm_control,serien_tm_redeemer,serien_tm_provisioner,serien_tm_authorizer;
GRANT SELECT ON serien_capability.control_bindings,serien_capability.lifecycle_limits TO serien_tm_lifecycle_executor;
CREATE POLICY lifecycle_binding_self ON serien_capability.control_bindings TO serien_tm_lifecycle_executor USING(role_name=session_user);

CREATE FUNCTION serien_capability.control_scope(w uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT EXISTS(SELECT FROM serien_capability.control_bindings WHERE role_name=session_user AND workspace_id=w)
$$;
CREATE FUNCTION serien_capability.control_access(w uuid,operation text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE b serien_capability.control_bindings%ROWTYPE;
BEGIN
 SELECT * INTO b FROM serien_capability.control_bindings WHERE role_name=session_user AND workspace_id=w;
 IF b.role_name IS NULL OR operation NOT IN('approve','redeem','provision','read') OR operation IS NULL
  OR (operation='approve' AND NOT b.can_approve) OR (operation='redeem' AND NOT b.can_redeem)
  OR (operation='provision' AND NOT b.can_provision) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 PERFORM 1 FROM serien_capability.workspace_locks WHERE workspace_id=w FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT FROM serien_capability.workspaces WHERE id=w AND status='active') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
END $$;

GRANT SELECT,INSERT ON serien_capability.lifecycle_jobs TO serien_tm_lifecycle_executor;
GRANT UPDATE(state,resume_state,approved_by,consumed_at,activated_at) ON serien_capability.lifecycle_jobs TO serien_tm_lifecycle_executor;
GRANT SELECT,INSERT ON serien_capability.lifecycle_events TO serien_tm_lifecycle_executor;
GRANT USAGE ON SEQUENCE serien_capability.lifecycle_events_id_seq TO serien_tm_lifecycle_executor;
GRANT SELECT,INSERT ON serien_capability.worker_bindings,serien_capability.device_bindings TO serien_tm_lifecycle_executor;
GRANT SELECT,INSERT ON serien_capability.devices TO serien_tm_lifecycle_executor;
GRANT UPDATE(public_key,scope,epoch,key_version,revoked_at,expires_at) ON serien_capability.devices TO serien_tm_lifecycle_executor;
GRANT SELECT,INSERT,UPDATE(marker) ON serien_capability.device_locks TO serien_tm_lifecycle_executor;
GRANT SELECT,UPDATE(marker) ON serien_capability.workspace_locks TO serien_tm_lifecycle_executor;
GRANT SELECT(id,status,auth_epoch),UPDATE(auth_epoch) ON serien_capability.workspaces TO serien_tm_lifecycle_executor;
GRANT SELECT,INSERT ON serien_capability.recovery_verifiers TO serien_tm_lifecycle_executor;
GRANT UPDATE(consumed_at,revoked_at,reserved_job) ON serien_capability.recovery_verifiers TO serien_tm_lifecycle_executor;
GRANT SELECT(workspace_id,revoked_at),UPDATE(revoked_at) ON serien_capability.invitations TO serien_tm_lifecycle_executor;
DO $$DECLARE t text; col text; BEGIN
 FOREACH t IN ARRAY ARRAY['lifecycle_limits','lifecycle_jobs','lifecycle_events','worker_bindings','device_bindings','devices','device_locks','workspace_locks','recovery_verifiers','invitations','workspaces'] LOOP
  col:=CASE WHEN t='workspaces' THEN 'id' ELSE 'workspace_id' END;
  EXECUTE format('CREATE POLICY lifecycle_scope ON serien_capability.%I TO serien_tm_lifecycle_executor USING(serien_capability.control_scope(%I)) WITH CHECK(serien_capability.control_scope(%I))',t,col,col);
 END LOOP;
END $$;

CREATE FUNCTION serien_capability.control_ceiling(w uuid,requested_scope text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE ceiling text;
BEGIN
 SELECT max_scope INTO ceiling FROM serien_capability.control_bindings WHERE role_name=session_user AND workspace_id=w;
 IF ceiling IS NULL OR requested_scope IS NULL OR requested_scope NOT IN('reader','editor','owner')
  OR array_position(ARRAY['reader','editor','owner'],requested_scope)>array_position(ARRAY['reader','editor','owner'],ceiling)
 THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
END $$;

CREATE FUNCTION serien_capability.safe_device_role(principal name,allow_login boolean) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
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

CREATE FUNCTION serien_capability.job_response(j serien_capability.lifecycle_jobs) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT jsonb_build_object('jobId',j.id,'workspaceId',j.workspace_id,'deviceId',j.device_id,'principal',j.role_name,
 'state',j.state,'epoch',j.target_epoch,'keyVersion',j.target_key_version,'workspaceEpoch',j.target_workspace_epoch,
 'activatedAt',j.activated_at)
$$;
CREATE FUNCTION serien_capability.record_job(p_job uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE j serien_capability.lifecycle_jobs%ROWTYPE; cap integer;
BEGIN
 SELECT * INTO STRICT j FROM serien_capability.lifecycle_jobs WHERE id=p_job;
 SELECT max_events INTO cap FROM serien_capability.lifecycle_limits WHERE workspace_id=j.workspace_id;
 IF cap IS NULL OR (SELECT count(*) FROM serien_capability.lifecycle_events WHERE workspace_id=j.workspace_id)>=cap THEN RAISE EXCEPTION 'LIFECYCLE_QUOTA'; END IF;
 INSERT INTO serien_capability.lifecycle_events(workspace_id,job_id,state,actor) VALUES(j.workspace_id,j.id,j.state,session_user);
END $$;

CREATE FUNCTION serien_capability.prepare_device_job(p_job uuid,w uuid,d uuid,principal name,kind text,key jsonb,scope text,ticket_verifier text,recovery_version bigint DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
END $$;

CREATE FUNCTION serien_capability.approve_device_job(p_job uuid,key jsonb,approved_scope text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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

CREATE FUNCTION serien_capability.redeem_device_job(p_job uuid,key jsonb,ticket text,recovery_verifier text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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

CREATE FUNCTION serien_capability.complete_device_job(p_job uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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

CREATE FUNCTION serien_capability.revoke_device(w uuid,d uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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

CREATE FUNCTION serien_capability.set_recovery_verifier(w uuid,v bigint,verifier text,pepper_version integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
END $$;

CREATE FUNCTION serien_capability.transition_failed_job(p_job uuid,action text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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

CREATE FUNCTION serien_capability.read_device_job(p_job uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j serien_capability.lifecycle_jobs%ROWTYPE;
BEGIN
 SELECT * INTO j FROM serien_capability.lifecycle_jobs WHERE id=p_job;
 IF j.id IS NULL THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 PERFORM serien_capability.control_access(j.workspace_id,'read');
 RETURN serien_capability.job_response(j);
END $$;

-- Nonce entrypoint: caller MUST commit this call on its own before invoking a data API.
-- A PostgreSQL function cannot create an autonomous transaction. Trusted broker contract, not hidden COMMIT.
GRANT SELECT,INSERT,DELETE ON serien_capability.replay_nonces TO serien_tm_executor;
GRANT SELECT ON serien_capability.nonce_limits TO serien_tm_executor;
GRANT SELECT,INSERT,UPDATE ON serien_capability.nonce_windows TO serien_tm_executor;
CREATE POLICY nonce_scope ON serien_capability.replay_nonces TO serien_tm_executor
 USING(workspace_id IN(SELECT workspace_id FROM serien_capability.worker_bindings WHERE role_name=session_user))
 WITH CHECK(workspace_id IN(SELECT workspace_id FROM serien_capability.worker_bindings WHERE role_name=session_user));
DO $$DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['nonce_limits','nonce_windows'] LOOP
  EXECUTE format('CREATE POLICY nonce_scope ON serien_capability.%I TO serien_tm_executor USING(workspace_id IN(SELECT workspace_id FROM serien_capability.worker_bindings WHERE role_name=session_user)) WITH CHECK(workspace_id IN(SELECT workspace_id FROM serien_capability.worker_bindings WHERE role_name=session_user))',t);
 END LOOP;
END $$;
CREATE FUNCTION serien_capability.claim_nonce(c jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
END $$;

CREATE TRIGGER immutable_lifecycle_event BEFORE UPDATE OR DELETE ON serien_capability.lifecycle_events FOR EACH ROW EXECUTE FUNCTION serien_capability.immutable_checkpoint();
-- Every function is private, explicitly owned/ACL'd in this same transaction.
DO $$DECLARE f record; owner_name name; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature,p.proname FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='serien_capability' AND p.proname IN('control_scope','control_access','control_ceiling','safe_device_role','job_response','record_job','prepare_device_job','approve_device_job','redeem_device_job','complete_device_job','revoke_device','set_recovery_verifier','transition_failed_job','read_device_job','claim_nonce') LOOP
  owner_name:=CASE WHEN f.proname='claim_nonce' THEN 'serien_tm_executor' ELSE 'serien_tm_lifecycle_executor' END;
  EXECUTE format('ALTER FUNCTION %s OWNER TO %I',f.signature,owner_name);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,serien_tm_worker,serien_tm_control,serien_tm_redeemer,serien_tm_provisioner,serien_tm_authorizer',f.signature);
 END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION serien_capability.safe_device_role(name,boolean) TO serien_tm_executor;
GRANT EXECUTE ON FUNCTION serien_capability.claim_nonce(jsonb) TO serien_tm_worker;
GRANT EXECUTE ON FUNCTION serien_capability.prepare_device_job(uuid,uuid,uuid,name,text,jsonb,text,text,bigint),serien_capability.approve_device_job(uuid,jsonb,text),serien_capability.revoke_device(uuid,uuid),serien_capability.set_recovery_verifier(uuid,bigint,text,integer) TO serien_tm_control;
GRANT EXECUTE ON FUNCTION serien_capability.redeem_device_job(uuid,jsonb,text,text) TO serien_tm_redeemer;
GRANT EXECUTE ON FUNCTION serien_capability.complete_device_job(uuid),serien_capability.transition_failed_job(uuid,text) TO serien_tm_provisioner;
GRANT EXECUTE ON FUNCTION serien_capability.read_device_job(uuid) TO serien_tm_control,serien_tm_redeemer,serien_tm_provisioner;
COMMIT;
