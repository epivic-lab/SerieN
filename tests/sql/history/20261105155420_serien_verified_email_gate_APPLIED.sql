-- SerieN: allowlisted verified email access, additive and non-destructive.
CREATE SCHEMA serien_access;
REVOKE ALL ON SCHEMA serien_access FROM PUBLIC, anon, authenticated;

CREATE TABLE serien_access.allowed_emails (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT normalized_email CHECK (email = lower(btrim(email)) AND position('@' IN email) > 1)
);
ALTER TABLE serien_access.allowed_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON serien_access.allowed_emails FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.serien_access_allowed()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM auth.users AS u
      JOIN serien_access.allowed_emails AS a
      ON a.email = lower(btrim(u.email))
    WHERE u.id = (SELECT auth.uid())
      AND u.email IS NOT NULL
      AND u.email_confirmed_at IS NOT NULL
  )
$function$;
REVOKE ALL ON FUNCTION public.serien_access_allowed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.serien_access_allowed() TO authenticated;

CREATE POLICY serien_verified_email_gate ON public.consist_members
 AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.serien_access_allowed())
 WITH CHECK (public.serien_access_allowed());

CREATE POLICY serien_verified_email_gate ON public.consists
 AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.serien_access_allowed())
 WITH CHECK (public.serien_access_allowed());

CREATE POLICY serien_verified_email_gate ON public.layout_placements
 AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.serien_access_allowed())
 WITH CHECK (public.serien_access_allowed());

CREATE POLICY serien_verified_email_gate ON public.layout_segments
 AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.serien_access_allowed())
 WITH CHECK (public.serien_access_allowed());

CREATE POLICY serien_verified_email_gate ON public.layout_snapshots
 AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.serien_access_allowed())
 WITH CHECK (public.serien_access_allowed());

CREATE POLICY serien_verified_email_gate ON public.layouts
 AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.serien_access_allowed())
 WITH CHECK (public.serien_access_allowed());

CREATE POLICY serien_verified_email_gate ON public.loose_stock_placements
 AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.serien_access_allowed())
 WITH CHECK (public.serien_access_allowed());

CREATE POLICY serien_verified_email_gate ON public.operation_receipts
 AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.serien_access_allowed())
 WITH CHECK (public.serien_access_allowed());

CREATE POLICY serien_verified_email_gate ON public.stock_items
 AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.serien_access_allowed())
 WITH CHECK (public.serien_access_allowed());

CREATE POLICY serien_verified_email_gate ON public.stock_models
 AS RESTRICTIVE FOR ALL TO authenticated
 USING (public.serien_access_allowed())
 WITH CHECK (public.serien_access_allowed());
