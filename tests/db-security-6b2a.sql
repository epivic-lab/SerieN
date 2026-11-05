-- SerieN 6B.2-A — ISOLATED PostgreSQL 17 security smoke test.
-- NOT a production migration, NOT a cloud save implementation.
-- Synthetic identities only. CI creates and discards a fresh PostgreSQL container.
-- Models actual production properties: no client table CRUD, per-owner RLS,
-- explicit RPC role, SECURITY DEFINER and verified-email gate.

CREATE ROLE anon NOLOGIN NOBYPASSRLS;
CREATE ROLE authenticated NOLOGIN NOBYPASSRLS;
CREATE ROLE serien_rpc NOLOGIN NOBYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA serien_access;
REVOKE ALL ON SCHEMA serien_access FROM PUBLIC, anon, authenticated, serien_rpc;

CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT nullif(pg_catalog.current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated, serien_rpc;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, serien_rpc;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY, email text NOT NULL, email_confirmed_at timestamptz
);
CREATE TABLE serien_access.allowed_emails (
  email text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE serien_access.allowed_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON serien_access.allowed_emails FROM PUBLIC, anon, authenticated, serien_rpc;

CREATE FUNCTION public.serien_access_allowed() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users AS u
      JOIN serien_access.allowed_emails AS a
        ON a.email = pg_catalog.lower(pg_catalog.btrim(u.email))
    WHERE u.id = (SELECT auth.uid())
      AND u.email IS NOT NULL
      AND u.email_confirmed_at IS NOT NULL
  )
$$;
REVOKE ALL ON FUNCTION public.serien_access_allowed() FROM PUBLIC, anon, authenticated, serien_rpc;
GRANT EXECUTE ON FUNCTION public.serien_access_allowed() TO authenticated, serien_rpc;

CREATE TABLE public.layouts (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  topology_hash text NOT NULL,
  UNIQUE (id, owner_id)
);
CREATE TABLE public.layout_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  layout_id uuid NOT NULL,
  revision bigint NOT NULL CHECK (revision >= 0),
  payload jsonb NOT NULL,
  UNIQUE (layout_id, revision),
  FOREIGN KEY (layout_id, owner_id) REFERENCES public.layouts(id,owner_id)
);
CREATE TABLE public.operation_receipts (
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  request_id uuid NOT NULL,
  payload_digest text NOT NULL,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY(owner_id,request_id)
);
ALTER TABLE public.layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_receipts ENABLE ROW LEVEL SECURITY;

-- Actual browser roles have NO table CRUD even though owner policies exist.
REVOKE ALL ON public.layouts, public.layout_snapshots, public.operation_receipts
  FROM PUBLIC, anon, authenticated, serien_rpc;
CREATE POLICY layouts_client_owner ON public.layouts
  FOR ALL TO authenticated USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY layouts_client_gate ON public.layouts AS RESTRICTIVE
  FOR ALL TO authenticated USING (public.serien_access_allowed())
  WITH CHECK (public.serien_access_allowed());

-- Dedicated RPC role is not a table owner, and never gets UPDATE or DELETE.
GRANT USAGE ON SCHEMA public TO serien_rpc, authenticated;
GRANT SELECT ON public.layouts TO serien_rpc;
GRANT SELECT, INSERT ON public.layout_snapshots, public.operation_receipts TO serien_rpc;
CREATE POLICY layouts_rpc_owner ON public.layouts
  FOR SELECT TO serien_rpc USING (owner_id = (SELECT auth.uid()));
CREATE POLICY layouts_rpc_gate ON public.layouts AS RESTRICTIVE
  FOR SELECT TO serien_rpc USING (public.serien_access_allowed());
CREATE POLICY snapshots_rpc_owner ON public.layout_snapshots
  FOR ALL TO serien_rpc
  USING (owner_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.layouts l
      WHERE l.id=layout_id AND l.owner_id=(SELECT auth.uid())))
  WITH CHECK (owner_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.layouts l
      WHERE l.id=layout_id AND l.owner_id=(SELECT auth.uid())));
CREATE POLICY snapshots_rpc_gate ON public.layout_snapshots AS RESTRICTIVE
  FOR ALL TO serien_rpc USING (public.serien_access_allowed())
  WITH CHECK (public.serien_access_allowed());
CREATE POLICY receipts_rpc_owner ON public.operation_receipts
  FOR ALL TO serien_rpc USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));
CREATE POLICY receipts_rpc_gate ON public.operation_receipts AS RESTRICTIVE
  FOR ALL TO serien_rpc USING (public.serien_access_allowed())
  WITH CHECK (public.serien_access_allowed());

-- Synthetic data; no real emails or user IDs are used.
INSERT INTO auth.users (id,email,email_confirmed_at) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','a@example.invalid',now()),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','b@example.invalid',now()),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','outsider@example.invalid',now());
INSERT INTO serien_access.allowed_emails(email) VALUES
 ('a@example.invalid'),('b@example.invalid');
INSERT INTO public.layouts(id,owner_id,topology_hash) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', repeat('a',64)),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', repeat('a',64));

-- Only test RPCs; they do NOT represent the future production API.
CREATE FUNCTION public.serien_smoke_can_read(p_layout uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS(SELECT 1 FROM public.layouts WHERE id = p_layout) $$;
ALTER FUNCTION public.serien_smoke_can_read(uuid) OWNER TO serien_rpc;
REVOKE ALL ON FUNCTION public.serien_smoke_can_read(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.serien_smoke_can_read(uuid) TO authenticated;

CREATE FUNCTION public.serien_smoke_insert_snapshot(p_layout uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.layout_snapshots(owner_id,layout_id,revision,payload)
  VALUES (auth.uid(),p_layout,1,'{}'::jsonb);
  RETURN true;
EXCEPTION WHEN insufficient_privilege OR foreign_key_violation OR check_violation THEN
  RETURN false;
END;
$$;
ALTER FUNCTION public.serien_smoke_insert_snapshot(uuid) OWNER TO serien_rpc;
REVOKE ALL ON FUNCTION public.serien_smoke_insert_snapshot(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.serien_smoke_insert_snapshot(uuid) TO authenticated;

DO $$
BEGIN
  IF (SELECT rolbypassrls OR rolcanlogin FROM pg_roles WHERE rolname='serien_rpc') THEN
    RAISE EXCEPTION 'RPC role unexpectedly privileged';
  END IF;
  IF has_table_privilege('authenticated','public.layouts','SELECT')
    OR has_table_privilege('authenticated','public.layout_snapshots','INSERT')
    OR has_table_privilege('authenticated','public.operation_receipts','SELECT')
    OR has_table_privilege('serien_rpc','public.layout_snapshots','UPDATE')
    OR has_table_privilege('serien_rpc','public.layout_snapshots','DELETE')
    OR has_table_privilege('serien_rpc','public.operation_receipts','UPDATE')
    OR has_schema_privilege('serien_rpc','serien_access','USAGE')
    OR has_function_privilege('anon','public.serien_smoke_can_read(uuid)','EXECUTE')
  THEN RAISE EXCEPTION 'Privilege surface widened'; END IF;
  IF '{"a":1,"a":2}' IS JSON OBJECT WITH UNIQUE KEYS
    OR '{"a":{"x":1,"x":2}}' IS JSON OBJECT WITH UNIQUE KEYS
    OR NOT ('{"a":{"x":1}}' IS JSON OBJECT WITH UNIQUE KEYS)
  THEN RAISE EXCEPTION 'JSON duplicate-key rejection unavailable'; END IF;
  IF length(encode(pg_catalog.sha256(pg_catalog.convert_to('SerieN','UTF8')),'hex')) <> 64
  THEN RAISE EXCEPTION 'SHA256 unavailable'; END IF;
END $$;

-- The authenticating principal is 'authenticated'; the RPC executes as serien_rpc.
SET ROLE authenticated;
SET "request.jwt.claim.sub" = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DO $$
BEGIN
  IF NOT public.serien_access_allowed()
    OR NOT public.serien_smoke_can_read('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    OR public.serien_smoke_can_read('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    OR NOT public.serien_smoke_insert_snapshot('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    OR public.serien_smoke_insert_snapshot('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
  THEN RAISE EXCEPTION 'Owner A isolation failed'; END IF;
END $$;

SET "request.jwt.claim.sub" = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
DO $$
BEGIN
  IF NOT public.serien_access_allowed()
    OR NOT public.serien_smoke_can_read('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    OR public.serien_smoke_can_read('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    OR NOT public.serien_smoke_insert_snapshot('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    OR public.serien_smoke_insert_snapshot('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  THEN RAISE EXCEPTION 'Owner B isolation failed'; END IF;
END $$;

SET "request.jwt.claim.sub" = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
DO $$
BEGIN
  IF public.serien_access_allowed()
    OR public.serien_smoke_can_read('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    OR public.serien_smoke_can_read('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    OR public.serien_smoke_insert_snapshot('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  THEN RAISE EXCEPTION 'Excluded user was admitted'; END IF;
END $$;
SET "request.jwt.claim.sub" = '';
DO $$
BEGIN
  IF public.serien_access_allowed()
    OR public.serien_smoke_can_read('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  THEN RAISE EXCEPTION 'Missing JWT was admitted'; END IF;
END $$;
RESET ROLE;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.layout_snapshots) <> 2 THEN
    RAISE EXCEPTION 'Wrong snapshot count: test did not isolate inserts';
  END IF;
  IF (SELECT count(DISTINCT owner_id) FROM public.layout_snapshots) <> 2 THEN
    RAISE EXCEPTION 'Cross-owner snapshot corruption';
  END IF;
END $$;
SELECT 'PASS: isolated role/RLS/allowlist/JSON/SHA smoke; NOT a cloud CAS gate' AS result;
