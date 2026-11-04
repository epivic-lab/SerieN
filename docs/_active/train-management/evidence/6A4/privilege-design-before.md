6A.4 local privilege design before implementation:
Existing worker: own-workspace SELECT + lock marker UPDATE; authorizer: registry DML.
After: worker retains previous rights plus EXECUTE one private function; no direct save DML.
New NOLOGIN/NOSUPERUSER/NOBYPASSRLS/NOCREATEROLE executor owns only private function,
not tables; explicit RLS uses immutable session_user binding. Minimal grants:
SELECT auth status/scope/epochs only (no keys/verifiers); UPDATE(marker) coordination;
SELECT/INSERT snapshots and receipts; SELECT/UPDATE(revision/snapshot refs) heads;
SELECT/UPDATE placement projection columns only. Cannot change capability or catalog.
Authorizer revocations coordinate through mandatory BEFORE trigger on device/workspace.
No browser access, no public definer; fixed empty search_path; EXECUTE only worker.
Bounded candidate validator accepts one operator-provisioned synthetic full DTO profile,
with stateId/day/eight-switch changes only; arbitrary train/catalog/geometry edits rejected.
This proves transaction machinery, not full future SaveCheckpoint candidate admission.
