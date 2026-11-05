-- TEST-ONLY adapter for the standalone Supabase Postgres Docker image.
-- Applied before replaying production's ACTUAL three migration statements.
-- The Docker image lacks the hosted project's auth.users.email_confirmed_at
-- column. This is not a SerieN production migration.
DO $f$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
  CREATE ROLE anon NOLOGIN NOBYPASSRLS; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  CREATE ROLE authenticated NOLOGIN NOBYPASSRLS; END IF;
END $f$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users(id uuid PRIMARY KEY,email text NOT NULL);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
 LANGUAGE sql STABLE SET search_path=''
 AS $f$ SELECT nullif(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid $f$;
