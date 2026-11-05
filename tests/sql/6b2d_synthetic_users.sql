-- TEST-ONLY IDs and fake .invalid email addresses; no real identities.
-- Requires the three ACTUAL applied migration definitions to be replayed.
INSERT INTO auth.users (id,email,email_confirmed_at) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','a@example.invalid',now()),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','b@example.invalid',now()),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','outsider@example.invalid',now());
INSERT INTO serien_access.allowed_emails(email) VALUES
 ('a@example.invalid'),('b@example.invalid');
SELECT 'PASS: actual historical migrations replayed with synthetic Auth' AS result;
