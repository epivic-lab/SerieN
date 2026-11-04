-- 6A.3 proposal. Apply only to an explicitly authorized isolated PostgreSQL 17 database.
-- Expand only: legacy owner_id remains mandatory; no production cutover or SaveCheckpoint RPC.
BEGIN;
CREATE ROLE serien_tm_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
CREATE ROLE serien_tm_authorizer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
CREATE SCHEMA serien_capability;
REVOKE ALL ON SCHEMA serien_capability FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA serien_capability REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE serien_capability.workspaces (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
 auth_epoch bigint NOT NULL DEFAULT 1 CHECK(auth_epoch>0)
);
CREATE TABLE serien_capability.devices (
 id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES serien_capability.workspaces(id) ON DELETE RESTRICT,
 public_key jsonb NOT NULL CHECK(jsonb_typeof(public_key)='object' AND coalesce(public_key->>'kty','')='EC' AND coalesce(public_key->>'crv','')='P-256'
   AND coalesce(public_key->>'x','') ~ '^[A-Za-z0-9_-]{43}$' AND coalesce(public_key->>'y','') ~ '^[A-Za-z0-9_-]{43}$' AND NOT public_key ? 'd'),
 key_version integer NOT NULL DEFAULT 1 CHECK(key_version>0),
 scope text NOT NULL CHECK(scope IN ('reader','editor','owner')),
 epoch bigint NOT NULL DEFAULT 1 CHECK(epoch>0),
 revoked_at timestamptz,
 expires_at timestamptz,
 UNIQUE(workspace_id,id)
);
CREATE TABLE serien_capability.invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES serien_capability.workspaces(id),
 candidate_device_id uuid NOT NULL, public_key jsonb NOT NULL CHECK(jsonb_typeof(public_key)='object' AND coalesce(public_key->>'kty','')='EC' AND coalesce(public_key->>'crv','')='P-256' AND coalesce(public_key->>'x','') ~ '^[A-Za-z0-9_-]{43}$' AND coalesce(public_key->>'y','') ~ '^[A-Za-z0-9_-]{43}$' AND NOT public_key ? 'd'),
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 verifier text NOT NULL UNIQUE CHECK(verifier ~ '^[0-9a-f]{64}$'),
 scope text NOT NULL CHECK(scope IN ('reader','editor','owner')),
 approved_by uuid, approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, consumed_at timestamptz, revoked_at timestamptz,
 CHECK(expires_at>created_at), CHECK((approved_by IS NULL)=(approved_at IS NULL)),
 CHECK(consumed_at IS NULL OR (approved_at IS NOT NULL AND consumed_at>=approved_at AND consumed_at<=expires_at)),
 FOREIGN KEY(workspace_id,approved_by) REFERENCES serien_capability.devices(workspace_id,id)
);
-- Pending invitation is also a candidate-bound challenge; no parallel unbound token table.
CREATE TABLE serien_capability.recovery_verifiers (
 workspace_id uuid NOT NULL REFERENCES serien_capability.workspaces(id), version bigint NOT NULL CHECK(version>0),
 verifier text NOT NULL UNIQUE CHECK(verifier ~ '^[0-9a-f]{64}$'), pepper_version integer NOT NULL CHECK(pepper_version>0),
 consumed_at timestamptz, revoked_at timestamptz,
 PRIMARY KEY(workspace_id,version)
);
CREATE UNIQUE INDEX recovery_one_active ON serien_capability.recovery_verifiers(workspace_id) WHERE consumed_at IS NULL AND revoked_at IS NULL;
CREATE TABLE serien_capability.replay_nonces (
 workspace_id uuid NOT NULL, device_id uuid NOT NULL, key_version integer NOT NULL CHECK(key_version>0), epoch bigint NOT NULL CHECK(epoch>0),
 nonce text NOT NULL CHECK(nonce ~ '^[0-9a-f]{32}$'), expires_at timestamptz NOT NULL,
 PRIMARY KEY(device_id,nonce), FOREIGN KEY(workspace_id,device_id) REFERENCES serien_capability.devices(workspace_id,id)
);
CREATE INDEX replay_expiry ON serien_capability.replay_nonces(expires_at);
CREATE INDEX devices_workspace ON serien_capability.devices(workspace_id);
CREATE INDEX invitations_workspace_expiry ON serien_capability.invitations(workspace_id,expires_at);
-- Coordination row is separate from device authority; worker may only update the marker.
CREATE TABLE serien_capability.device_locks (
 workspace_id uuid NOT NULL, device_id uuid NOT NULL, marker bigint NOT NULL DEFAULT 0 CHECK(marker>=0),
 PRIMARY KEY(workspace_id,device_id), FOREIGN KEY(workspace_id,device_id) REFERENCES serien_capability.devices(workspace_id,id)
);
-- SQL identity binding for isolated privilege tests; NOT a client-supplied GUC.
CREATE TABLE serien_capability.worker_bindings (
 role_name name PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES serien_capability.workspaces(id)
);
CREATE INDEX worker_bindings_workspace ON serien_capability.worker_bindings(workspace_id);
DO $$DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['workspaces','devices','invitations','recovery_verifiers','replay_nonces','worker_bindings','device_locks'] LOOP
  EXECUTE format('ALTER TABLE serien_capability.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE serien_capability.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON serien_capability.%I FROM PUBLIC,anon,authenticated,serien_tm_worker',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON serien_capability.%I TO serien_tm_authorizer',t);
  EXECUTE format('CREATE POLICY registry_operator ON serien_capability.%I TO serien_tm_authorizer USING(true) WITH CHECK(true)',t);
 END LOOP;
END $$;
GRANT USAGE ON SCHEMA serien_capability TO serien_tm_worker,serien_tm_authorizer;
GRANT SELECT ON serien_capability.worker_bindings TO serien_tm_worker;
GRANT SELECT,UPDATE(marker) ON serien_capability.device_locks TO serien_tm_worker;
CREATE POLICY lock_read ON serien_capability.device_locks FOR SELECT TO serien_tm_worker USING(workspace_id IN(SELECT workspace_id FROM serien_capability.worker_bindings WHERE role_name=current_user));
CREATE POLICY lock_marker ON serien_capability.device_locks FOR UPDATE TO serien_tm_worker USING(workspace_id IN(SELECT workspace_id FROM serien_capability.worker_bindings WHERE role_name=current_user)) WITH CHECK(workspace_id IN(SELECT workspace_id FROM serien_capability.worker_bindings WHERE role_name=current_user));
CREATE POLICY binding_self ON serien_capability.worker_bindings FOR SELECT TO serien_tm_worker USING(role_name=current_user);

-- A non-null ownership_key makes NULL workspace an explicit LEGACY domain.
-- Composite FKs therefore cannot be skipped by sending workspace_id=NULL.
DO $$DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['stock_items','consists','consist_members','layouts','layout_placements','loose_stock_placements','layout_snapshots','operation_receipts'] LOOP
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN workspace_id uuid REFERENCES serien_capability.workspaces(id) ON DELETE RESTRICT',t);
  EXECUTE format($q$ALTER TABLE public.%I ADD COLUMN ownership_key text GENERATED ALWAYS AS
   (CASE WHEN workspace_id IS NULL THEN 'legacy:'||owner_id::text ELSE 'workspace:'||workspace_id::text END) STORED$q$,t);
  EXECUTE format('CREATE INDEX %I ON public.%I(workspace_id)',t||'_workspace_idx',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,serien_tm_authorizer',t);
  EXECUTE format('GRANT SELECT ON public.%I TO serien_tm_worker',t);
  EXECUTE format('CREATE POLICY worker_read ON public.%I FOR SELECT TO serien_tm_worker USING(workspace_id IN (SELECT workspace_id FROM serien_capability.worker_bindings WHERE role_name=current_user))',t);
 END LOOP;
END $$;
ALTER TABLE public.stock_items ADD UNIQUE(id,ownership_key);
ALTER TABLE public.consists ADD UNIQUE(id,ownership_key);
ALTER TABLE public.layouts ADD UNIQUE(id,ownership_key), ADD UNIQUE(workspace_id,id);
ALTER TABLE public.consist_members ADD FOREIGN KEY(consist_id,ownership_key) REFERENCES public.consists(id,ownership_key) DEFERRABLE INITIALLY IMMEDIATE,
 ADD FOREIGN KEY(stock_item_id,ownership_key) REFERENCES public.stock_items(id,ownership_key) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE public.layout_placements ADD FOREIGN KEY(consist_id,ownership_key) REFERENCES public.consists(id,ownership_key) DEFERRABLE INITIALLY IMMEDIATE,
 ADD FOREIGN KEY(layout_id,ownership_key) REFERENCES public.layouts(id,ownership_key) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE public.loose_stock_placements ADD FOREIGN KEY(stock_item_id,ownership_key) REFERENCES public.stock_items(id,ownership_key) DEFERRABLE INITIALLY IMMEDIATE,
 ADD FOREIGN KEY(layout_id,ownership_key) REFERENCES public.layouts(id,ownership_key) DEFERRABLE INITIALLY IMMEDIATE,
 ADD COLUMN journey_state jsonb CHECK(journey_state IS NULL OR jsonb_typeof(journey_state)='object'),
 ADD COLUMN state_version bigint CHECK(state_version IS NULL OR state_version>=0);
ALTER TABLE public.layout_snapshots ADD FOREIGN KEY(layout_id,ownership_key) REFERENCES public.layouts(id,ownership_key) DEFERRABLE INITIALLY IMMEDIATE,
 ADD COLUMN payload_digest text CHECK(payload_digest IS NULL OR payload_digest ~ '^[0-9a-f]{64}$'),
 ADD UNIQUE(workspace_id,layout_id,id,revision,payload_digest);
ALTER TABLE public.operation_receipts ADD COLUMN layout_id uuid, ADD COLUMN snapshot_id uuid, ADD COLUMN revision bigint CHECK(revision IS NULL OR revision>0),
 ADD CONSTRAINT receipt_workspace_complete CHECK(workspace_id IS NULL OR (layout_id IS NOT NULL AND snapshot_id IS NOT NULL AND revision IS NOT NULL)),
 ADD FOREIGN KEY(workspace_id,layout_id,snapshot_id,revision,payload_digest) REFERENCES public.layout_snapshots(workspace_id,layout_id,id,revision,payload_digest),
 ADD UNIQUE(workspace_id,request_id), ADD UNIQUE(workspace_id,layout_id,request_id,snapshot_id,revision,payload_digest);
CREATE TABLE serien_capability.session_heads (
 workspace_id uuid NOT NULL, layout_id uuid NOT NULL, revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),
 snapshot_id uuid, receipt_request_id uuid, payload_digest text,
 PRIMARY KEY(workspace_id,layout_id),
 CHECK((revision=0 AND snapshot_id IS NULL AND receipt_request_id IS NULL AND payload_digest IS NULL) OR
       (revision>0 AND snapshot_id IS NOT NULL AND receipt_request_id IS NOT NULL AND payload_digest ~ '^[0-9a-f]{64}$' AND payload_digest IS NOT NULL)),
 FOREIGN KEY(workspace_id,layout_id) REFERENCES public.layouts(workspace_id,id),
 FOREIGN KEY(workspace_id,layout_id,snapshot_id,revision,payload_digest) REFERENCES public.layout_snapshots(workspace_id,layout_id,id,revision,payload_digest),
 FOREIGN KEY(workspace_id,layout_id,receipt_request_id,snapshot_id,revision,payload_digest) REFERENCES public.operation_receipts(workspace_id,layout_id,request_id,snapshot_id,revision,payload_digest)
);
ALTER TABLE serien_capability.session_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE serien_capability.session_heads FORCE ROW LEVEL SECURITY;
REVOKE ALL ON serien_capability.session_heads FROM PUBLIC,anon,authenticated,serien_tm_authorizer;
GRANT SELECT ON serien_capability.session_heads TO serien_tm_worker;
CREATE POLICY head_read ON serien_capability.session_heads FOR SELECT TO serien_tm_worker USING(workspace_id IN(SELECT workspace_id FROM serien_capability.worker_bindings WHERE role_name=current_user));
CREATE FUNCTION serien_capability.monotone_head() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF new.workspace_id<>old.workspace_id OR new.layout_id<>old.layout_id OR new.revision<=old.revision THEN
  RAISE EXCEPTION 'Head identity immutable and revision must increase' USING errcode='23514';
 END IF; RETURN new;
END $$;
REVOKE ALL ON FUNCTION serien_capability.monotone_head() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER monotone_head BEFORE UPDATE ON serien_capability.session_heads FOR EACH ROW EXECUTE FUNCTION serien_capability.monotone_head();
-- Segments remain canonical server projections under their existing parent layout.
REVOKE ALL ON public.layout_segments,public.stock_models FROM PUBLIC,anon,authenticated,serien_tm_authorizer;
GRANT SELECT ON public.layout_segments,public.stock_models TO serien_tm_worker;
CREATE POLICY worker_segments_read ON public.layout_segments FOR SELECT TO serien_tm_worker USING(EXISTS(SELECT 1 FROM public.layouts l WHERE l.id=layout_id));
CREATE POLICY worker_catalog_read ON public.stock_models FOR SELECT TO serien_tm_worker USING(true);
CREATE INDEX members_consist_domain_idx ON public.consist_members(consist_id,ownership_key);
CREATE INDEX members_item_domain_idx ON public.consist_members(stock_item_id,ownership_key);
CREATE INDEX placements_consist_domain_idx ON public.layout_placements(consist_id,ownership_key);
CREATE INDEX placements_layout_domain_idx ON public.layout_placements(layout_id,ownership_key);
CREATE INDEX loose_item_domain_idx ON public.loose_stock_placements(stock_item_id,ownership_key);
CREATE INDEX loose_layout_domain_idx ON public.loose_stock_placements(layout_id,ownership_key);
CREATE INDEX snapshots_layout_domain_idx ON public.layout_snapshots(layout_id,ownership_key);
CREATE INDEX receipts_snapshot_idx ON public.operation_receipts(workspace_id,layout_id,snapshot_id,revision,payload_digest);
CREATE INDEX head_snapshot_idx ON serien_capability.session_heads(workspace_id,layout_id,snapshot_id,revision,payload_digest);
CREATE INDEX head_receipt_idx ON serien_capability.session_heads(workspace_id,layout_id,receipt_request_id,snapshot_id,revision,payload_digest);
COMMIT;
