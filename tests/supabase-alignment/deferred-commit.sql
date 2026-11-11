-- The final COMMIT MUST fail with 23514. The runner checks the failure and
-- verifies that PostgreSQL rolled back all synthetic rows.
BEGIN;
INSERT INTO auth.users VALUES('00000000-0000-4000-8000-000000000005','deferred@example.invalid',now());
INSERT INTO public.consists(id,owner_id,name,status) VALUES
 ('00000000-0000-4000-8000-000000000305','00000000-0000-4000-8000-000000000005','Invalid empty ready','ready');
SELECT 'REACHED_COMMIT';
COMMIT;
