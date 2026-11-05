-- SerieN 6B.2-C: validate the real R1 captured DTO against the real
-- 49 KB JSON Schema using Supabase's PG17 pg_jsonschema extension.
-- Ephemeral CI only; NEVER apply this probe as a production migration.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_jsonschema WITH SCHEMA extensions;
CREATE TEMP TABLE serien_schema_probe(s json NOT NULL, d jsonb NOT NULL);
INSERT INTO serien_schema_probe(s,d) VALUES (:'schema'::json, :'state'::jsonb);
DO $$
DECLARE s json; d jsonb; bad jsonb; result boolean;
BEGIN
 SELECT p.s,p.d INTO STRICT s,d FROM pg_temp.serien_schema_probe p;
 IF NOT extensions.jsonschema_is_valid(s) THEN
    RAISE EXCEPTION 'STATE_SCHEMA.json not accepted by pg_jsonschema';
 END IF;
 IF NOT extensions.jsonb_matches_schema(s,d) THEN
    RAISE EXCEPTION 'Real 6B.1 Capture DTO rejected by pg_jsonschema';
 END IF;
 IF pg_catalog.octet_length(d::text)>2097152 THEN
    RAISE EXCEPTION 'Actual state oversized';
 END IF;
 bad:=d - 'trains';
 IF extensions.jsonb_matches_schema(s,bad) THEN
    RAISE EXCEPTION 'Schema failed to reject removed required root field';
 END IF;
 bad:=d || '{"unknownTopLevel":true}'::jsonb;
 IF extensions.jsonb_matches_schema(s,bad) THEN
    RAISE EXCEPTION 'Schema failed to reject unknown root field';
 END IF;
 bad:=jsonb_set(d,'{time,tickCount}','-1'::jsonb);
 IF extensions.jsonb_matches_schema(s,bad) THEN
    RAISE EXCEPTION 'Schema failed to reject invalid tick count';
 END IF;
 bad:=jsonb_set(d,'{models,0,id}','"NOT-A-UUID"'::jsonb);
 IF extensions.jsonb_matches_schema(s,bad) THEN
    RAISE EXCEPTION 'Schema failed to reject invalid model UUID';
 END IF;
 bad:=jsonb_set(d,'{trains,0,journey,segments,0,extra}','true'::jsonb);
 IF extensions.jsonb_matches_schema(s,bad) THEN
    RAISE EXCEPTION 'Schema failed to reject nested unknown property';
 END IF;
 IF '{"a":1,"a":2}' IS JSON OBJECT WITH UNIQUE KEYS OR
    '{"outer":{"x":1,"x":2}}' IS JSON OBJECT WITH UNIQUE KEYS
 THEN RAISE EXCEPTION 'Unique keys assertion bypass'; END IF;
 RAISE NOTICE 'PASS: R1 actual capture conforms to full pinned schema, 5 mutations rejected';
END $$;
SELECT 'PASS: pg_jsonschema full DTO/unknowns/UUID/limits in isolated PG17' AS result;
