-- SerieN 6B.2-D — OFFLINE rollback rehearsal, NEVER production.
-- Deletes ONLY new SerieN 6B.2-C candidate functions, grants/policies/role.
-- Does not touch core tables, user-owned snapshots, historical migrations,
-- verified-email gate, or shared pg_jsonschema extension.
-- Production rollback needs a separate authorized maintenance decision.
BEGIN;
REVOKE EXECUTE ON FUNCTION
 public.serien_open_workspace(),
 public.serien_read_head(uuid,uuid),
 public.serien_read_snapshot(uuid,uuid,text),
 public.serien_save_checkpoint(uuid,uuid,text,uuid,text)
 FROM authenticated;
DROP FUNCTION public.serien_open_workspace();
DROP FUNCTION public.serien_read_head(uuid,uuid);
DROP FUNCTION public.serien_read_snapshot(uuid,uuid,text);
DROP FUNCTION public.serien_save_checkpoint(uuid,uuid,text,uuid,text);

DROP POLICY serien_rpc_layout_select ON public.layouts;
DROP POLICY serien_rpc_layout_insert ON public.layouts;
DROP POLICY serien_rpc_layout_gate ON public.layouts;
DROP POLICY serien_rpc_snapshot_select ON public.layout_snapshots;
DROP POLICY serien_rpc_snapshot_insert ON public.layout_snapshots;
DROP POLICY serien_rpc_snapshot_gate ON public.layout_snapshots;
DROP POLICY serien_rpc_receipt_select ON public.operation_receipts;
DROP POLICY serien_rpc_receipt_insert ON public.operation_receipts;
DROP POLICY serien_rpc_receipt_gate ON public.operation_receipts;

DROP FUNCTION serien_internal.serien_validate_references_v1(jsonb);
DROP FUNCTION serien_internal.serien_schema_v1();
DROP FUNCTION serien_internal.serien_asset_manifest_v1();
DROP FUNCTION serien_internal.serien_edge_lengths_v1();
DROP FUNCTION serien_internal.serien_within_quota_v1(bigint,bigint);
DROP FUNCTION serien_internal.serien_access_allowed_lock();

REVOKE SELECT,INSERT ON public.layouts,public.layout_snapshots,
 public.operation_receipts FROM serien_rpc;
REVOKE EXECUTE ON FUNCTION auth.uid() FROM serien_rpc;
REVOKE EXECUTE ON FUNCTION public.serien_access_allowed() FROM serien_rpc;
REVOKE USAGE ON SCHEMA auth,extensions,serien_internal,public FROM serien_rpc;
DROP ROLE serien_rpc;
COMMIT;
DO $verify$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='serien_rpc') OR
    to_regprocedure('public.serien_open_workspace()') IS NOT NULL OR
    to_regprocedure('public.serien_read_head(uuid,uuid)') IS NOT NULL OR
    to_regprocedure('public.serien_read_snapshot(uuid,uuid,text)') IS NOT NULL OR
    to_regprocedure('public.serien_save_checkpoint(uuid,uuid,text,uuid,text)') IS NOT NULL OR
    to_regprocedure('public.serien_access_allowed()') IS NULL OR
    to_regclass('public.layouts') IS NULL OR
    to_regclass('public.layout_snapshots') IS NULL OR
    to_regclass('public.operation_receipts') IS NULL OR
    (SELECT count(*) FROM pg_policies WHERE policyname LIKE 'serien_rpc_%')<>0
 THEN RAISE EXCEPTION 'Rollback failed to preserve baseline'; END IF;
END $verify$;
SELECT 'PASS: candidate rollback restores original RPC/policy/role surface without deleting history' AS result;
