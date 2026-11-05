-- 6B.2-C isolated fixture: core table definitions transcribed from READ-ONLY
-- production catalog queries, with synthetic Google identities.
-- NEVER apply this fixture outside a disposable PostgreSQL CI database.
DO $fixture$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
  CREATE ROLE anon NOLOGIN NOBYPASSRLS; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  CREATE ROLE authenticated NOLOGIN NOBYPASSRLS; END IF;
END $fixture$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS serien_access;
CREATE SCHEMA IF NOT EXISTS serien_internal;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path=''
AS $f$ SELECT nullif(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid $f$;

CREATE TABLE IF NOT EXISTS auth.users(
 id uuid PRIMARY KEY, email text NOT NULL, email_confirmed_at timestamptz);
CREATE TABLE serien_access.allowed_emails(
 email text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE serien_access.allowed_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA serien_access FROM PUBLIC,anon,authenticated;
REVOKE ALL ON serien_access.allowed_emails FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.serien_access_allowed()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $f$
 SELECT EXISTS(SELECT 1 FROM auth.users AS u
 JOIN serien_access.allowed_emails AS a ON a.email=pg_catalog.lower(pg_catalog.btrim(u.email))
 WHERE u.id=(SELECT auth.uid()) AND u.email IS NOT NULL
   AND u.email_confirmed_at IS NOT NULL)
$f$;
REVOKE ALL ON FUNCTION public.serien_access_allowed() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.serien_access_allowed() TO authenticated;

CREATE TABLE public.layouts(
 id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(btrim(name)) BETWEEN 1 AND 160),
 topology_hash text NOT NULL CHECK(length(topology_hash) BETWEEN 32 AND 128),
 schema_version int NOT NULL DEFAULT 1 CHECK(schema_version>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,owner_id));
CREATE TABLE public.layout_snapshots(
 id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
 owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 layout_id uuid NOT NULL,
 revision bigint NOT NULL CHECK(revision>=0),
 snapshot_schema integer NOT NULL DEFAULT 1 CHECK(snapshot_schema>0),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 saved_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(layout_id,revision),
 FOREIGN KEY(layout_id,owner_id) REFERENCES public.layouts(id,owner_id) ON DELETE CASCADE);
CREATE TABLE public.operation_receipts(
 owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id uuid NOT NULL,
 op_type text NOT NULL CHECK(length(op_type) BETWEEN 1 AND 120),
 payload_digest text NOT NULL CHECK(payload_digest ~ '^[0-9a-f]{64}$'),
 result jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(result)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,request_id));

ALTER TABLE public.layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.layouts,public.layout_snapshots,public.operation_receipts
 FROM PUBLIC,anon,authenticated;
CREATE POLICY layouts_owner_all ON public.layouts FOR ALL TO authenticated
 USING(owner_id=(SELECT auth.uid())) WITH CHECK(owner_id=(SELECT auth.uid()));
CREATE POLICY snapshots_owner_all ON public.layout_snapshots FOR ALL TO authenticated
 USING(owner_id=(SELECT auth.uid())) WITH CHECK(owner_id=(SELECT auth.uid()));
CREATE POLICY receipts_owner_all ON public.operation_receipts FOR ALL TO authenticated
 USING(owner_id=(SELECT auth.uid())) WITH CHECK(owner_id=(SELECT auth.uid()));
CREATE POLICY serien_verified_email_gate ON public.layouts AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.serien_access_allowed()) WITH CHECK(public.serien_access_allowed());
CREATE POLICY serien_verified_email_gate ON public.layout_snapshots AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.serien_access_allowed()) WITH CHECK(public.serien_access_allowed());
CREATE POLICY serien_verified_email_gate ON public.operation_receipts AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.serien_access_allowed()) WITH CHECK(public.serien_access_allowed());

CREATE FUNCTION serien_internal.check_snapshot() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $f$
DECLARE v_hash text; v_switches jsonb; v_name text; v_count integer;
BEGIN
 SELECT topology_hash INTO v_hash FROM public.layouts WHERE id=NEW.layout_id;
 IF NEW.payload->>'topologyHash' IS DISTINCT FROM v_hash THEN
   RAISE EXCEPTION 'Layout hash mismatch' USING ERRCODE='23514'; END IF;
 IF NEW.payload->>'resumePolicy' IS DISTINCT FROM 'STOPPED' THEN
   RAISE EXCEPTION 'Resume policy must be STOPPED' USING ERRCODE='23514'; END IF;
 v_switches:=NEW.payload#>'{layout,switches}';
 IF jsonb_typeof(v_switches)='object' THEN
  SELECT count(*) INTO v_count FROM jsonb_object_keys(v_switches);
 ELSE v_count:=0; END IF;
 IF v_count<>8 THEN RAISE EXCEPTION 'Eight switches required' USING ERRCODE='23514'; END IF;
 FOREACH v_name IN ARRAY ARRAY['WX-A','WX-B','Y-IN','Y-2','Y-3','Y-R1','Y-R2','Y-4'] LOOP
   IF jsonb_typeof(v_switches->v_name) IS DISTINCT FROM 'boolean'
   THEN RAISE EXCEPTION 'Invalid switch: %',v_name USING ERRCODE='23514'; END IF;
 END LOOP;
 RETURN NEW;
END $f$;
CREATE TRIGGER check_snapshot BEFORE INSERT OR UPDATE ON public.layout_snapshots
 FOR EACH ROW EXECUTE FUNCTION serien_internal.check_snapshot();

INSERT INTO auth.users (id,email,email_confirmed_at) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','a@example.invalid',now()),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','b@example.invalid',now()),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','outsider@example.invalid',now());
INSERT INTO serien_access.allowed_emails(email) VALUES
 ('a@example.invalid'),('b@example.invalid');
SELECT 'PASS: synthetic replica of 3 audited tables + triggers + RLS' AS result;
