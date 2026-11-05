-- SerieN 6B.2-C — OFFLINE CANDIDATE, NON PRODUCTION MIGRATION.
-- SOURCE: actual Supabase PG17 catalog read-only, STATE_SCHEMA.json SHA
-- b1eae00ad501a94e4117d649ce7e6e99b8579a7c; R1 edges derived from canonical-layout.json.
-- DO NOT APPLY to production: extension, migration drift, admin revocation,
-- catalog/geometry verification and full test gate remain outstanding.
-- Never expose service_role, table CRUD, or generic SQL to the browser.
-- Requires pg_jsonschema 0.3.3 enabled in extensions schema.
-- IMPORTANT: pg_jsonschema 0.3.3 ignores format:uuid, so ALL 17 UUID
-- fields in embedded schema add anchored patterns without modifying source.

DO $guard$
BEGIN
 IF to_regprocedure('extensions.jsonb_matches_schema(json,jsonb)') IS NULL
 THEN RAISE EXCEPTION 'STOP: pg_jsonschema extension unavailable'; END IF;
 IF to_regclass('public.layouts') IS NULL OR
    to_regclass('public.layout_snapshots') IS NULL OR
    to_regclass('public.operation_receipts') IS NULL OR
    to_regprocedure('public.serien_access_allowed()') IS NULL
 THEN RAISE EXCEPTION 'STOP: database does not match audited SerieN schema'; END IF;
END $guard$;
CREATE SCHEMA IF NOT EXISTS serien_internal;
DO $role$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='serien_rpc') THEN
   CREATE ROLE serien_rpc NOLOGIN NOBYPASSRLS;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='serien_rpc'
          AND (rolbypassrls OR rolcanlogin OR rolsuper OR rolcreaterole))
 THEN RAISE EXCEPTION 'STOP: unexpected serien_rpc privilege'; END IF;
END $role$;
GRANT USAGE ON SCHEMA auth, extensions, serien_internal, public TO serien_rpc;
GRANT EXECUTE ON FUNCTION auth.uid() TO serien_rpc;
GRANT EXECUTE ON FUNCTION public.serien_access_allowed() TO serien_rpc;
GRANT SELECT, INSERT ON public.layouts TO serien_rpc;
GRANT SELECT, INSERT ON public.layout_snapshots TO serien_rpc;
GRANT SELECT, INSERT ON public.operation_receipts TO serien_rpc;
-- authenticated/anon remain WITHOUT direct table CRUD.

CREATE POLICY serien_rpc_layout_select ON public.layouts FOR SELECT TO serien_rpc
 USING (owner_id=(SELECT auth.uid()));
CREATE POLICY serien_rpc_layout_insert ON public.layouts FOR INSERT TO serien_rpc
 WITH CHECK (owner_id=(SELECT auth.uid()));
CREATE POLICY serien_rpc_layout_gate ON public.layouts AS RESTRICTIVE FOR ALL TO serien_rpc
 USING (public.serien_access_allowed()) WITH CHECK (public.serien_access_allowed());
CREATE POLICY serien_rpc_snapshot_select ON public.layout_snapshots FOR SELECT TO serien_rpc
 USING (owner_id=(SELECT auth.uid()));
CREATE POLICY serien_rpc_snapshot_insert ON public.layout_snapshots FOR INSERT TO serien_rpc
 WITH CHECK (owner_id=(SELECT auth.uid()));
CREATE POLICY serien_rpc_snapshot_gate ON public.layout_snapshots AS RESTRICTIVE FOR ALL TO serien_rpc
 USING (public.serien_access_allowed()) WITH CHECK (public.serien_access_allowed());
CREATE POLICY serien_rpc_receipt_select ON public.operation_receipts FOR SELECT TO serien_rpc
 USING (owner_id=(SELECT auth.uid()));
CREATE POLICY serien_rpc_receipt_insert ON public.operation_receipts FOR INSERT TO serien_rpc
 WITH CHECK (owner_id=(SELECT auth.uid()));
CREATE POLICY serien_rpc_receipt_gate ON public.operation_receipts AS RESTRICTIVE FOR ALL TO serien_rpc
 USING (public.serien_access_allowed()) WITH CHECK (public.serien_access_allowed());

-- Frozen copies of the existing client sources; no new catalog tables.
-- Changes to these constants MUST be separately signed and versioned.
-- Prevent a time-of-check/time-of-use revocation race WITHOUT requiring a
-- special admin revoke endpoint. SELECT FOR SHARE locks BOTH auth.users and
-- the private allowlist row until the caller's transaction ends. Ordinary
-- admin UPDATE/DELETE of either row conflicts with this lock, so a committed
-- revocation precedes any subsequent successful Save/Open/Read.
-- Deliberately small SECURITY DEFINER exception in unexposed internal schema.
-- The role that owns this helper is the migration owner (postgres in prod);
-- it checks the original auth.uid(), returns ONLY a boolean, and grants
-- EXECUTE to serien_rpc, never to a direct Data API client.
CREATE FUNCTION serien_internal.serien_access_allowed_lock() RETURNS boolean
 LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=''
AS $lock$
 SELECT EXISTS(
  SELECT 1 FROM auth.users AS u
   JOIN serien_access.allowed_emails AS a
      ON a.email=pg_catalog.lower(pg_catalog.btrim(u.email))
  WHERE u.id=(SELECT auth.uid())
    AND u.email IS NOT NULL
    AND u.email_confirmed_at IS NOT NULL
  FOR SHARE OF u,a
 )
$lock$;
REVOKE ALL ON FUNCTION serien_internal.serien_access_allowed_lock()
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION serien_internal.serien_access_allowed_lock()
 TO serien_rpc;

CREATE FUNCTION serien_internal.serien_schema_v1() RETURNS json
 LANGUAGE sql IMMUTABLE SET search_path=''
 AS $function$
 SELECT $schema${"type":"object","additionalProperties":false,"required":["schemaVersion","stateId","workspaceId","layoutId","topologyHash","engineRevision","resumePolicy","layout","time","models","items","consists","trains","looseStock","inventoryStorage","missions","ui"],"properties":{"schemaVersion":{"const":1,"x-source":"FUTURE serializer version","x-restore":"Reject unsupported versions; explicit migration only","x-authority":"authoritative"},"stateId":{"type":"string","format":"uuid","x-source":"FUTURE unique capture ID","x-restore":"Stable immutable capture identity","x-authority":"authoritative","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"workspaceId":{"type":"string","format":"uuid","x-source":"FUTURE authorized workspace","x-restore":"Must match verified capability binding","x-authority":"authoritative","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"layoutId":{"type":"string","format":"uuid","x-source":"FUTURE canonical layout identity","x-restore":"Must belong to workspace","x-authority":"authoritative","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"topologyHash":{"type":"string","pattern":"^[0-9a-f]{64}$","x-source":"SHA-256 raw src/canonical-layout.json bytes","x-restore":"Require exact deployed canonical bytes; never accept client topology","x-authority":"authoritative"},"engineRevision":{"const":"R1-348bfeff12c4005657098d89ea1d3c2ccdda9910","x-source":"R1 compatibility manifest","x-restore":"Fail closed on incompatible engine","x-authority":"authoritative"},"resumePolicy":{"const":"STOPPED","x-source":"D02 and existing snapshot trigger","x-restore":"Freeze before any tick; retain all kinetics","x-authority":"authoritative"},"layout":{"type":"object","additionalProperties":false,"required":["switches"],"properties":{"switches":{"type":"object","additionalProperties":false,"required":["WX-A","WX-B","Y-IN","Y-2","Y-3","Y-R1","Y-R2","Y-4"],"properties":{"WX-A":{"type":"boolean","x-source":"switchSpecs[WX-A].on","x-restore":"Restore before Journey/guard reconstruction","x-authority":"authoritative"},"WX-B":{"type":"boolean","x-source":"switchSpecs[WX-B].on","x-restore":"Restore before Journey/guard reconstruction","x-authority":"authoritative"},"Y-IN":{"type":"boolean","x-source":"switchSpecs[Y-IN].on","x-restore":"Restore before Journey/guard reconstruction","x-authority":"authoritative"},"Y-2":{"type":"boolean","x-source":"switchSpecs[Y-2].on","x-restore":"Restore before Journey/guard reconstruction","x-authority":"authoritative"},"Y-3":{"type":"boolean","x-source":"switchSpecs[Y-3].on","x-restore":"Restore before Journey/guard reconstruction","x-authority":"authoritative"},"Y-R1":{"type":"boolean","x-source":"switchSpecs[Y-R1].on","x-restore":"Restore before Journey/guard reconstruction","x-authority":"authoritative"},"Y-R2":{"type":"boolean","x-source":"switchSpecs[Y-R2].on","x-restore":"Restore before Journey/guard reconstruction","x-authority":"authoritative"},"Y-4":{"type":"boolean","x-source":"switchSpecs[Y-4].on","x-restore":"Restore before Journey/guard reconstruction","x-authority":"authoritative"}},"description":"Exactly eight canonical controller IDs.","x-source":"app.switchSpecs","x-restore":"Apply booleans; never recreate geometry","x-authority":"authoritative"}},"description":"Logical controls only.","x-source":"app.switchSpecs","x-restore":"No geometric authority","x-authority":"authoritative"},"time":{"$ref":"#/$defs/time","x-source":"FixedClock + FUTURE accepted tick count","x-restore":"Restore frozen","x-authority":"authoritative"},"models":{"type":"array","items":{"$ref":"#/$defs/model"},"minItems":1,"maxItems":128,"x-source":"STOCK/train-assets + FUTURE versioned catalog mapping","x-restore":"Only verified revisions","x-authority":"authoritative"},"items":{"type":"array","items":{"$ref":"#/$defs/item"},"minItems":1,"maxItems":512,"x-source":"Fleet concrete objects + FUTURE inventory","x-restore":"Stable IDs across sessions","x-authority":"authoritative"},"consists":{"type":"array","items":{"$ref":"#/$defs/consist"},"minItems":1,"maxItems":4,"x-source":"Fleet ordered arrays + FUTURE IDs","x-restore":"Max four active compositions","x-authority":"authoritative"},"trains":{"type":"array","items":{"$ref":"#/$defs/train"},"minItems":1,"maxItems":4,"x-source":"app.trains","x-restore":"Keep slot mapping and identities","x-authority":"authoritative"},"looseStock":{"type":"array","items":{"$ref":"#/$defs/loose"},"maxItems":512,"x-source":"app.detached","x-restore":"Restore full frozen Journey","x-authority":"authoritative"},"inventoryStorage":{"type":"array","items":{"$ref":"#/$defs/storage"},"maxItems":512,"x-source":"FUTURE 6D inventory; R1 empty","x-restore":"No track occupancy for off-scene stock","x-authority":"authoritative"},"missions":{"$ref":"#/$defs/missions","x-source":"app statuses/global progress","x-restore":"Restore without completing extra events","x-authority":"authoritative"},"ui":{"$ref":"#/$defs/ui","x-source":"UI state values listed in definitions","x-restore":"No DOM serialized","x-authority":"authoritative"}},"description":"SerieN Train Management durable state v1. Proposed 6A.1 contract; no serializer implemented. Cross-record and railway predicates in 6A1_CONTRACT.md are mandatory in addition to JSON Schema.","$schema":"https://json-schema.org/draft/2020-12/schema","$id":"urn:serien:state:1","$defs":{"vector":{"type":"array","items":{"type":"number"},"minItems":3,"maxItems":3,"description":"Plain x,y,z numeric triple in layout mm; no Three.js vector."},"coupler":{"type":"object","additionalProperties":false,"required":["x","y","z"],"properties":{"x":{"type":"number","x-source":"userData.couplers.*.x","x-restore":"Copy numeric geometry after catalog validation","x-authority":"authoritative"},"y":{"type":"number","x-source":"userData.couplers.*.y","x-restore":"Copy numeric geometry after catalog validation","x-authority":"authoritative"},"z":{"type":"number","x-source":"userData.couplers.*.z","x-restore":"Copy numeric geometry after catalog validation","x-authority":"authoritative"}},"description":"Logical point in vehicle coordinates; mm."},"assetRef":{"type":"object","additionalProperties":false,"required":["id","revision","digest"],"properties":{"id":{"type":"string","format":"uuid","x-source":"FUTURE immutable catalog identity","x-restore":"Resolve verified manifest","x-authority":"authoritative","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"revision":{"type":"string","minLength":1,"maxLength":200,"x-source":"FUTURE asset registry revision","x-restore":"Require exact revision","x-authority":"authoritative"},"digest":{"type":"string","pattern":"^[0-9a-f]{64}$","x-source":"FUTURE SHA-256 of GLB or native builder manifest","x-restore":"Check bytes before scene creation","x-authority":"authoritative"}},"description":"Reference only: no executable URL from saved state."},"model":{"type":"object","additionalProperties":false,"required":["id","revision","runtimeKey","kind","representation","asset","couplers","couplingMode","legacyRearExtentMm"],"properties":{"id":{"type":"string","format":"uuid","x-source":"FUTURE stable model identity; STOCK.id is source key only","x-restore":"Resolve catalog; never create arbitrary geometry","x-authority":"authoritative","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"revision":{"type":"string","minLength":1,"maxLength":200,"x-source":"FUTURE verified geometry/catalog revision","x-restore":"Require exact dimensions and coupling behavior","x-authority":"authoritative"},"runtimeKey":{"enum":["steam","diesel","shunter","closed","open","tank","flat","coach","lumber","box"],"x-source":"rolling-stock.STOCK / train-assets.files / app.locoModel","x-restore":"Resolve native builder or Kenney mapping","x-authority":"authoritative"},"kind":{"enum":["locomotive","wagon"],"x-source":"app.trains.group versus carObjs / STOCK","x-restore":"Validate ordinal zero locomotive","x-authority":"authoritative"},"representation":{"enum":["native","kenney"],"x-source":"rollingModelMode + per-vehicle actual assetLoaded","x-restore":"Require saved effective representation; no silent geometry fallback","x-authority":"authoritative"},"asset":{"$ref":"#/$defs/assetRef","x-source":"FUTURE verified reference to native builder or six Kenney GLBs","x-restore":"Allow only approved registry","x-authority":"authoritative"},"couplers":{"type":"object","additionalProperties":false,"required":["front","back"],"properties":{"front":{"$ref":"#/$defs/coupler","x-source":"userData.couplers.front","x-restore":"Verify catalog equality","x-authority":"authoritative"},"back":{"$ref":"#/$defs/coupler","x-source":"userData.couplers.back","x-restore":"Verify catalog equality","x-authority":"authoritative"}},"description":"Effective R1 coupling points.","x-source":"userData.couplers; native or imported effective values","x-restore":"Validate against pinned model revision; not a new geometry authority","x-authority":"authoritative"},"couplingMode":{"enum":["explicit","legacy64"],"x-source":"consist.couplingDistance stock/assetDimensions predicate","x-restore":"Preserve explicit ends or exact legacy 64mm fallback","x-authority":"authoritative"},"legacyRearExtentMm":{"type":"number","minimum":0,"x-source":"consist.consistLayout legacy 38mm fallback","x-restore":"For legacy64 require 38; explicit require 0","x-authority":"authoritative"}},"description":"Versioned effective geometry manifest. Values are assertions against server-approved catalog, not user-authorized geometry edits."},"item":{"type":"object","additionalProperties":false,"required":["id","modelId","nativeModelId","nativeModelRevision","nativeKind","modelRevision","displayName","orientation"],"properties":{"id":{"type":"string","format":"uuid","x-source":"FUTURE stable identity for group/carObjs/detached.group","x-restore":"Maintain identity through coupling and detaching; never mesh.uuid","x-authority":"authoritative","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"modelId":{"type":"string","format":"uuid","x-source":"FUTURE mapping of concrete vehicle to models.id","x-restore":"Resolve pinned model","x-authority":"authoritative","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"nativeModelId":{"type":"string","format":"uuid","x-source":"FUTURE pinned native builder identity; current hidden native children are not serializable","x-restore":"Resolve original wagon variant even when effective model is Kenney","x-authority":"authoritative","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"nativeModelRevision":{"type":"string","minLength":1,"maxLength":200,"x-source":"FUTURE native builder revision","x-restore":"Require exact native builder for later explicit model-mode change","x-authority":"authoritative"},"nativeKind":{"enum":["steam","diesel","shunter","closed","open","tank","flat","coach"],"x-source":"app.locoModel/freightWagon and userData.stock.kind when present","x-restore":"Preserve original native constructor independently from effective Kenney asset","x-authority":"authoritative"},"modelRevision":{"type":"string","minLength":1,"maxLength":200,"x-source":"FUTURE model revision","x-restore":"Must equal referenced models.revision","x-authority":"authoritative"},"displayName":{"type":"string","minLength":1,"maxLength":200,"x-source":"FUTURE inventory label; runtime stock.name if present","x-restore":"Plain text only","x-authority":"authoritative"},"orientation":{"enum":[-1,1],"x-source":"FUTURE 6D; R1 uses +1 for attached vehicles","x-restore":"Relative to Journey positive axis; reject -1 until adapter supports it","x-authority":"authoritative"}},"description":"All stock owned by workspace, including off-scene inventory."},"member":{"type":"object","additionalProperties":false,"required":["itemId","orientation"],"properties":{"itemId":{"type":"string","format":"uuid","x-source":"[train.group,...train.carObjs] identity map","x-restore":"Restore order without cloning identities","x-authority":"authoritative","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"orientation":{"enum":[-1,1],"x-source":"FUTURE member orientation; R1 +1","x-restore":"Must equal item.orientation","x-authority":"authoritative"}},"description":"Array index is ordinal; no duplicate order field."},"consist":{"type":"object","additionalProperties":false,"required":["id","name","members"],"properties":{"id":{"type":"string","format":"uuid","x-source":"FUTURE stable composition identity","x-restore":"Link train and ordered members","x-authority":"authoritative","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"name":{"type":"string","minLength":1,"maxLength":200,"x-source":"train.name / FUTURE composition label","x-restore":"Plain text","x-authority":"authoritative"},"members":{"type":"array","items":{"$ref":"#/$defs/member"},"minItems":1,"maxItems":6,"x-source":"[train.group,...train.carObjs]","x-restore":"Index 0 locomotive, <=5 wagons; unique workspace assignment","x-authority":"authoritative"}},"description":"Active composition, maximum one train per composition."},"segment":{"type":"object","additionalProperties":false,"required":["id","sign","start","end"],"properties":{"id":{"type":"string","minLength":1,"maxLength":120,"x-source":"Journey.segments[].id","x-restore":"Resolve canonical edge","x-authority":"authoritative"},"sign":{"enum":[-1,1],"x-source":"Journey.segments[].sign","x-restore":"Copy axis orientation","x-authority":"authoritative"},"start":{"type":"number","x-source":"Journey.segments[].start","x-restore":"Copy unrebased ribbon coordinate","x-authority":"authoritative"},"end":{"type":"number","x-source":"Journey.segments[].end","x-restore":"Copy; end-start must equal edge.length","x-authority":"authoritative"}},"description":"Ordered historical traversal occurrence; repeated edge IDs allowed."},"range":{"type":"object","additionalProperties":false,"required":["edge","from","to","distance"],"properties":{"edge":{"type":"string","minLength":1,"maxLength":120,"x-source":"guard.boundary.edge","x-restore":"Resolve canonical edge","x-authority":"authoritative"},"from":{"type":"number","minimum":0,"x-source":"guard.boundary.from","x-restore":"Check <= edge.length","x-authority":"authoritative"},"to":{"type":"number","minimum":0,"x-source":"guard.boundary.to","x-restore":"Check <= edge.length","x-authority":"authoritative"},"distance":{"type":"number","minimum":0,"x-source":"guard.boundary.distance","x-restore":"Preserve diagnostic range","x-authority":"authoritative"}},"description":"traceJourney range."},"boundary":{"anyOf":[{"type":"string","minLength":1,"maxLength":120},{"$ref":"#/$defs/range"},{"type":"null"}],"description":"Guard boundary can be node/edge ID, trace range, or null. Never an object reference."},"lastBlock":{"type":"object","additionalProperties":false,"required":["edge","node","reason","boundary"],"properties":{"edge":{"anyOf":[{"type":"string","minLength":1,"maxLength":120},{"type":"null"}],"x-source":"Journey.lastBlock.edge or absent","x-restore":"Absent normalized null","x-authority":"authoritative"},"node":{"anyOf":[{"type":"string","minLength":1,"maxLength":120},{"type":"null"}],"x-source":"Journey.lastBlock.node or absent","x-restore":"Absent normalized null","x-authority":"authoritative"},"reason":{"type":"string","minLength":1,"maxLength":200,"x-source":"Journey.lastBlock.reason","x-restore":"Preserve diagnostic reason; no routing permission","x-authority":"authoritative"},"boundary":{"$ref":"#/$defs/boundary","x-source":"Journey.lastBlock.boundary or absent","x-restore":"Absent normalized null","x-authority":"authoritative"}},"description":"Both shapes produced by Journey.extend and stepRailway normalized explicitly."},"journey":{"type":"object","additionalProperties":false,"required":["segments","position","travel","lastBlock"],"properties":{"segments":{"type":"array","items":{"$ref":"#/$defs/segment"},"minItems":1,"maxItems":10000,"x-source":"Journey.segments","x-restore":"Copy full retained history; do not retrace from present switches","x-authority":"authoritative"},"position":{"type":"number","x-source":"Journey.position","x-restore":"Restore exact ribbon coordinate","x-authority":"authoritative"},"travel":{"type":"number","minimum":0,"x-source":"Journey.travel","x-restore":"Absolute travelled mm, preserve","x-authority":"authoritative"},"lastBlock":{"anyOf":[{"$ref":"#/$defs/lastBlock"},{"type":"null"}],"x-source":"Journey.lastBlock or absent","x-restore":"Null means delete lastBlock","x-authority":"authoritative"}},"description":"Data only. network is obtained from locked R1 topology, not serialized."},"location":{"type":"object","additionalProperties":false,"required":["edge","s","heading"],"properties":{"edge":{"type":"string","minLength":1,"maxLength":120,"x-source":"Journey.locate().edge or detached.point.edge","x-restore":"Verify against saved Journey","x-authority":"authoritative"},"s":{"type":"number","minimum":0,"x-source":"Journey.locate().s or detached.point.s","x-restore":"Within canonical edge length","x-authority":"authoritative"},"heading":{"enum":[-1,1],"x-source":"Active Journey segment.sign","x-restore":"Tangent orientation relative to edge source order, independent of train.dir","x-authority":"authoritative"}},"description":"Canonical location assertion; derived from Journey, never x/z world coordinates."},"guard":{"type":"object","additionalProperties":false,"required":["state","risk","reason","direction","distance","boundary","lookahead","stoppingDistance","leadingExtent","protectionInset","requestedSpeed","requestedDelta","delta","velocity","intervened","probeDelta","probeKind"],"properties":{"state":{"enum":["SAFE","GUARDED_STOP"],"x-source":"train.guard.state","x-restore":"Preserve latch; reassess before movement","x-authority":"authoritative"},"risk":{"enum":["SAFE","UNSAFE","UNKNOWN"],"x-source":"train.guard.risk","x-restore":"Preserve observation; not permission","x-authority":"authoritative"},"reason":{"type":"string","minLength":1,"maxLength":200,"x-source":"train.guard.reason","x-restore":"Plain diagnostic code","x-authority":"authoritative"},"direction":{"enum":[-1,1],"x-source":"train.guard.direction","x-restore":"Preserve observed sign","x-authority":"authoritative"},"distance":{"anyOf":[{"type":"number","minimum":0},{"type":"null"}],"x-source":"train.guard.distance","x-restore":"Only +Infinity maps to null; null decodes +Infinity","x-authority":"authoritative"},"boundary":{"$ref":"#/$defs/boundary","x-source":"train.guard.boundary","x-restore":"Copy diagnostic value","x-authority":"authoritative"},"lookahead":{"type":"number","minimum":0,"x-source":"train.guard.lookahead","x-restore":"Retained horizon used by assessRailwayGuard","x-authority":"authoritative"},"stoppingDistance":{"type":"number","minimum":0,"x-source":"train.guard.stoppingDistance","x-restore":"Preserve numeric observation","x-authority":"authoritative"},"leadingExtent":{"anyOf":[{"type":"number","minimum":0},{"type":"null"}],"x-source":"train.guard.leadingExtent or absent","x-restore":"Null decodes absent","x-authority":"authoritative"},"protectionInset":{"anyOf":[{"type":"number","minimum":0},{"type":"null"}],"x-source":"train.guard.protectionInset or absent","x-restore":"Null decodes absent","x-authority":"authoritative"},"requestedSpeed":{"type":"number","minimum":0,"maximum":100,"x-source":"train.guard.requestedSpeed","x-restore":"Preserve saved observation","x-authority":"authoritative"},"requestedDelta":{"type":"number","x-source":"train.guard.requestedDelta","x-restore":"Preserve saved observation","x-authority":"authoritative"},"delta":{"type":"number","x-source":"train.guard.delta","x-restore":"Preserve saved observation","x-authority":"authoritative"},"velocity":{"type":"number","minimum":-150,"maximum":150,"x-source":"train.guard.velocity","x-restore":"Preserve saved observation","x-authority":"authoritative"},"intervened":{"type":"boolean","x-source":"train.guard.intervened","x-restore":"Preserve latch","x-authority":"authoritative"},"probeDelta":{"anyOf":[{"type":"number"},{"type":"null"}],"x-source":"train.guard.probeDelta or absent","x-restore":"Restore signed collision probe; null deletes","x-authority":"authoritative"},"probeKind":{"anyOf":[{"enum":["train","wagon"]},{"type":"null"}],"x-source":"train.guard.probeKind or absent","x-restore":"Restore retained hazard; null deletes","x-authority":"authoritative"}},"description":"Complete stepRailway guard record. Absence before first step represented by train.guard=null."},"routeContext":{"type":"object","additionalProperties":false,"required":["loop","previousLane","mode","section","laps"],"properties":{"loop":{"enum":[0,1,2],"x-source":"train.loop","x-restore":"Retain last loop even while in yard","x-authority":"authoritative"},"previousLane":{"enum":[0,1,2],"x-source":"train.previousLane","x-restore":"Retain transfer mission history","x-authority":"authoritative"},"mode":{"enum":["loop","yard"],"x-source":"train.mode","x-restore":"Retain R1 crossover semantics","x-authority":"authoritative"},"section":{"anyOf":[{"type":"string","minLength":1,"maxLength":120},{"type":"null"}],"x-source":"train.section or absent","x-restore":"Null deletes; can retain historical section while on loop","x-authority":"authoritative"},"laps":{"type":"integer","minimum":0,"maximum":9007199254740991,"x-source":"train.laps","x-restore":"Check floor(journey.travel/loops[loop].length); restore consistency","x-authority":"derived"}},"description":"R1 historical route context cannot all be recomputed from current edge."},"resetSeed":{"type":"object","additionalProperties":false,"required":["loop","cars","fraction","edge","s"],"properties":{"loop":{"enum":[0,1,2],"x-source":"train.initial.loop","x-restore":"Preserve explicit reset behavior","x-authority":"authoritative"},"cars":{"type":"integer","minimum":0,"maximum":5,"x-source":"train.initial.cars","x-restore":"Initial count, not current count","x-authority":"authoritative"},"fraction":{"anyOf":[{"type":"number","minimum":0,"maximum":1},{"type":"null"}],"x-source":"train.initial.fraction or absent","x-restore":"Exclusive with edge/s","x-authority":"authoritative"},"edge":{"anyOf":[{"type":"string","minLength":1,"maxLength":120},{"type":"null"}],"x-source":"train.initial.edge or absent","x-restore":"Exclusive with fraction","x-authority":"authoritative"},"s":{"anyOf":[{"type":"number","minimum":0},{"type":"null"}],"x-source":"train.initial.s or absent","x-restore":"Require with edge","x-authority":"authoritative"}},"description":"Reset template only; restore must never call initializeJourney/reset."},"train":{"type":"object","additionalProperties":false,"required":["id","runtimeSlot","consistId","name","description","nativeName","nativeDescription","modelKey","journey","location","speed","requestedSpeed","velocity","dir","odometer","lights","guard","routeContext","resetSeed"],"properties":{"id":{"type":"string","format":"uuid","x-source":"FUTURE stable train identity","x-restore":"Rebuild runtime slot mapping separately","x-authority":"authoritative","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"runtimeSlot":{"type":"integer","minimum":0,"maximum":3,"x-source":"train.id currently equals array index","x-restore":"Preserve R1 index-based commands; unique contiguous slots","x-authority":"authoritative"},"consistId":{"type":"string","format":"uuid","x-source":"FUTURE stable composition mapping","x-restore":"Must reference exactly one consist","x-authority":"authoritative","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"name":{"type":"string","minLength":1,"maxLength":200,"x-source":"train.name","x-restore":"Plain text","x-authority":"authoritative"},"description":{"type":"string","maxLength":500,"x-source":"train.desc","x-restore":"Plain text","x-authority":"authoritative"},"nativeName":{"type":"string","minLength":1,"maxLength":200,"x-source":"train.nativeName","x-restore":"Preserve native/model switching name","x-authority":"authoritative"},"nativeDescription":{"type":"string","maxLength":500,"x-source":"train.nativeDescription","x-restore":"Preserve native/model switching description","x-authority":"authoritative"},"modelKey":{"enum":["steam","diesel","shunter"],"x-source":"train.modelKey","x-restore":"Resolve approved locomotive builder","x-authority":"authoritative"},"journey":{"$ref":"#/$defs/journey","x-source":"train.journey","x-restore":"Rehydrate data into existing Journey implementation","x-authority":"authoritative"},"location":{"$ref":"#/$defs/location","x-source":"train.journey.locate() plus segment sign","x-restore":"Cross-check only; Journey wins after equality validation","x-authority":"derived"},"speed":{"type":"number","minimum":0,"maximum":100,"x-source":"train.speed","x-restore":"Preserve command %, including zero after protected stop","x-authority":"authoritative"},"requestedSpeed":{"type":"number","minimum":0,"maximum":100,"x-source":"train.requestedSpeed","x-restore":"Preserve intent even when speed is zero","x-authority":"authoritative"},"velocity":{"type":"number","minimum":-150,"maximum":150,"x-source":"train.velocity","x-restore":"Signed mm/s; do not clear on restore","x-authority":"authoritative"},"dir":{"enum":[-1,1],"x-source":"train.dir","x-restore":"Requested movement direction; can differ from velocity while reversing","x-authority":"authoritative"},"odometer":{"type":"number","x-source":"train.odometer","x-restore":"Signed mm for wheel phase, unlike Journey.travel","x-authority":"authoritative"},"lights":{"type":"boolean","x-source":"train.lights","x-restore":"Apply after assets ready","x-authority":"authoritative"},"guard":{"anyOf":[{"$ref":"#/$defs/guard"},{"type":"null"}],"x-source":"train.guard or absent","x-restore":"Restore retained horizon/probe before first admissible step","x-authority":"authoritative"},"routeContext":{"$ref":"#/$defs/routeContext","x-source":"app.advanceFleet train context","x-restore":"Restore mission-sensitive fields","x-authority":"authoritative"},"resetSeed":{"$ref":"#/$defs/resetSeed","x-source":"train.initial","x-restore":"For later explicit reset only","x-authority":"authoritative"}},"description":"No Three.Group, carObjs references, live functions, or DOM."},"loose":{"type":"object","additionalProperties":false,"required":["itemId","journey","location","animationDistanceMm"],"properties":{"itemId":{"type":"string","format":"uuid","x-source":"detached.group identity map","x-restore":"Resolve unique item","x-authority":"authoritative","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"journey":{"$ref":"#/$defs/journey","x-source":"detached.journey","x-restore":"Mandatory full frozen history, including joints","x-authority":"authoritative"},"location":{"$ref":"#/$defs/location","x-source":"detached.point and Journey","x-restore":"Check equality; derive x,z,angle via network","x-authority":"authoritative"},"animationDistanceMm":{"type":"number","x-source":"FUTURE retained odometer at uncouple; R1 only retains live mesh wheel phase","x-restore":"Recreate detached wheel/rod phase without serializing mesh rotations","x-authority":"presentation"}},"description":"Detached vehicle on track; legacy fixtures without Journey are not durable v1 states."},"storage":{"type":"object","additionalProperties":false,"required":["itemId","bayId"],"properties":{"itemId":{"type":"string","format":"uuid","x-source":"FUTURE off-scene inventory / 6D","x-restore":"Must not occupy consist or loose placement","x-authority":"authoritative","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"bayId":{"anyOf":[{"type":"string","minLength":1,"maxLength":200},{"type":"null"}],"x-source":"FUTURE inventory shelf identity","x-restore":"Null = available inventory, no physical rail position","x-authority":"authoritative"}},"description":"Inventory storage outside scene, not railway shed placement."},"missions":{"type":"object","additionalProperties":false,"required":["selected","changes","transferred","visitedRunaround","didDetach","didAttach"],"properties":{"selected":{"enum":[0,1,2,3],"x-source":"app.mission","x-restore":"Select status without invoking commands","x-authority":"authoritative"},"changes":{"type":"integer","minimum":0,"maximum":9007199254740991,"x-source":"app.changes","x-restore":"Preserve counter even though reset currently leaves it unchanged","x-authority":"authoritative"},"transferred":{"type":"boolean","x-source":"app.transferred","x-restore":"Preserve completion","x-authority":"authoritative"},"visitedRunaround":{"type":"boolean","x-source":"app.visitedRunaround","x-restore":"Preserve completion","x-authority":"authoritative"},"didDetach":{"type":"boolean","x-source":"app.didDetach","x-restore":"Preserve completion","x-authority":"authoritative"},"didAttach":{"type":"boolean","x-source":"app.didAttach","x-restore":"Preserve completion","x-authority":"authoritative"}},"description":"Mission 0 progress derives from first train laps. No serialized done() functions."},"ui":{"type":"object","additionalProperties":false,"required":["selectedTrainId","consoleSlots","recentTrainIds","day","rollingModelMode","qualityMode","camera","hudMinimized","bellMuted"],"properties":{"selectedTrainId":{"type":"string","format":"uuid","x-source":"app.selected -> train.id mapping","x-restore":"Resolve runtime slot","x-authority":"authoritative","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"consoleSlots":{"type":"array","items":{"type":"string","format":"uuid","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"minItems":1,"maxItems":3,"uniqueItems":true,"x-source":"trainDeck.visibleIds / RecentConsoles.slots","x-restore":"Restore exact order; max 3","x-authority":"authoritative"},"recentTrainIds":{"type":"array","items":{"type":"string","format":"uuid","pattern":"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"},"minItems":1,"maxItems":4,"uniqueItems":true,"x-source":"trainDeck.recentIds / RecentConsoles.recent","x-restore":"Restore full LRU order, not only visible slots","x-authority":"authoritative"},"day":{"type":"number","minimum":0,"maximum":100,"x-source":"app.day","x-restore":"Apply light slider","x-authority":"authoritative"},"rollingModelMode":{"enum":["native","kenney"],"x-source":"app.rollingModelMode / rollingModels select","x-restore":"Preserve preference separately from effective model per item","x-authority":"authoritative"},"qualityMode":{"enum":["auto","low","high","cinema"],"x-source":"quality.mode","x-restore":"Recompute auto profile per device","x-authority":"presentation"},"camera":{"type":"object","additionalProperties":false,"required":["preset","position","target","zoom","fov"],"properties":{"preset":{"enum":["overview","station","yard","follow","manual"],"x-source":"nav.preset","x-restore":"Restore mode without pending interpolation","x-authority":"authoritative"},"position":{"$ref":"#/$defs/vector","x-source":"camera.position.toArray()","x-restore":"Copy finite coordinates; validate safeView","x-authority":"authoritative"},"target":{"$ref":"#/$defs/vector","x-source":"controls.target.toArray()","x-restore":"Copy finite coordinates; validate safeView","x-authority":"authoritative"},"zoom":{"type":"number","minimum":0.65,"maximum":3.4,"x-source":"camera.zoom","x-restore":"Restore projection","x-authority":"authoritative"},"fov":{"type":"number","exclusiveMinimum":0,"exclusiveMaximum":180,"x-source":"camera.fov","x-restore":"Restore projection","x-authority":"authoritative"}},"description":"Current view; transient goal/damping are not durable.","x-source":"navigation/camera/controls","x-restore":"Restore view, recalculate aspect from viewport","x-authority":"presentation"},"hudMinimized":{"type":"boolean","x-source":"nextSwitchHUD.panel.classList is-minimized","x-restore":"Apply preference","x-authority":"presentation"},"bellMuted":{"type":"boolean","x-source":"guardedStops.bell.snapshot.muted","x-restore":"Apply mute; audio unlock still requires gesture","x-authority":"presentation"}},"description":"Significant UI only. Route preview timer, hover, modals, GPU state and announcements excluded."},"time":{"type":"object","additionalProperties":false,"required":["tickCount","stepSeconds","accumulatorSeconds","wasPaused"],"properties":{"tickCount":{"type":"integer","minimum":0,"maximum":9007199254740991,"x-source":"FUTURE accepted logical tick counter; R1 has no total counter","x-restore":"Never derive from browser wall time","x-authority":"authoritative"},"stepSeconds":{"const":0.016666666666666666,"x-source":"FixedClock.step","x-restore":"Fixed R1 1/60 sec","x-authority":"authoritative"},"accumulatorSeconds":{"type":"number","minimum":0,"exclusiveMaximum":0.016666666666666666,"x-source":"FixedClock.accumulator at stable RAF boundary","x-restore":"Preserve substep remainder; freeze until resume","x-authority":"authoritative"},"wasPaused":{"type":"boolean","x-source":"app.paused before capture","x-restore":"Preserve pre-save pause preference; restore gate always stopped","x-authority":"authoritative"}},"description":"elapsed simulated seconds is derived tickCount * stepSeconds; no wall-clock catch-up."}},"title":"SerieN persistent state v1"}$schema$::json
 $function$;
CREATE FUNCTION serien_internal.serien_asset_manifest_v1() RETURNS jsonb
 LANGUAGE sql IMMUTABLE SET search_path=''
 AS $function$
 SELECT $catalog${"revision":"2f2596076ab8687bdb68cb8c6a6bcad27ed19301111d3f87fe6deae721f1c36e","assets":{"steam":"8dfe9d20667c1534652286149fb0e1639ff48975a4187d3ad2fd956add0bba2a","diesel":"20c6c7c23c005e8cda1c1e922473c0fc9c93fc7c1d1bc5a637d640424f811cc3","shunter":"396a7d723d748efb249f16083e9ec5bf9a017a4eab3ed16a30facd3faea8d4b1","lumber":"c205eff406b60d1c3df668c688ec5841a476568aaccc970a195287aa863b9bf6","tank":"0de1d92587c0b4d79e6dd1dad7d4d2e8ef849330af07e2f1701b98b9e0cf4e6a","box":"6b594f3f7ef779879043219e2ee79eb37523427e2100855296a0c9662b36689c"},"topologyHash":"e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc"}$catalog$::jsonb
 $function$;
CREATE FUNCTION serien_internal.serien_edge_lengths_v1() RETURNS jsonb
 LANGUAGE sql IMMUTABLE SET search_path=''
 AS $function$
 SELECT $edges${"T0":221.4818200575426,"T1":221.4818200575426,"T2":221.4818200575425,"T3":221.48182005754254,"T4":221.4818200575426,"T5":221.4818200575425,"T6":62,"T7":248.0000000000001,"T8":247.40000792272636,"T9":247.40000792272647,"T10":247.40000792272627,"T11":247.40000792272633,"T12":247.40000792272645,"T13":247.4000079227265,"T14":248.0000000000001,"T15":248,"T16":195.56361932027335,"T17":195.56361932027332,"T18":195.56361932027338,"T19":195.56361932027346,"T20":195.56361932027332,"T21":195.56361932027343,"T22":123.99999999999989,"T23":247.40000792272653,"T24":247.40000792272647,"T25":221.48182005754265,"T26":221.4818200575425,"T27":195.5636193202733,"T28":195.56361932027343,"T29":247.42069436488117,"T30":62.096698785040154,"T31":62,"T32":62,"T33":62,"T34":124,"T35":124,"T36":247.9999999999999,"T37":62.0966987850401,"T38":62.09669878504004,"T39":62,"T40":248.64633518312712,"T41":60,"T42":186.29009635512028,"T43":126.3829883756171,"T44":127.76434728764636,"T45":62.09669878504012,"T46":248,"T47":248,"T48":124.19339757008031,"T49":125.51562216079824,"T50":248.38679514016044,"TO0:AB":186.0000000000001,"TO0:AC":188.21092341063326,"TO1:AB":125.15989773086284,"TO1:AC":125.38259206732346,"TO2:AB":125.15989773086255,"TO2:AC":125.89782065910131,"TO3:AB":125.99999999999989,"TO3:AC":126.51499061160226,"TO4:AB":185.5855597830823,"TO4:AC":188.21092341063314,"TO5:AB":186.29009635512028,"TO5:AC":188.07920263173213,"WX-A:upper":310,"WX-A:lower":310,"WX-A:down":312.6125862897636,"WX-A:up":312.6125862897636,"WX-B:upper":310,"WX-B:lower":310,"WX-B:down":312.6125862897636,"WX-B:up":312.6125862897636,"WIDEN-L:offset":312.8960104221398,"WIDEN-L:straight":310,"WIDEN-R:offset":312.8960104221398,"WIDEN-R:straight":310}$edges$::jsonb
 $function$;
REVOKE ALL ON FUNCTION serien_internal.serien_schema_v1(),
 serien_internal.serien_asset_manifest_v1(),
 serien_internal.serien_edge_lengths_v1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION serien_internal.serien_schema_v1(),
 serien_internal.serien_asset_manifest_v1(),
 serien_internal.serien_edge_lengths_v1() TO serien_rpc;

-- Explicit fixed owner quota protects Supabase Free (500 MB per project).
-- No auto-prune, no mutation of past snapshots. Hard cap: 64 MiB of
-- normalized serialized payloads per owner (conservative approximation
-- ignoring receipt/index/WAL overhead). Increase only via reviewed migration.
CREATE FUNCTION serien_internal.serien_within_quota_v1(
 used_bytes bigint, next_bytes bigint
) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=''
AS $quota$ SELECT used_bytes>=0 AND next_bytes>=0
     AND used_bytes <= 67108864 - next_bytes $quota$;
REVOKE ALL ON FUNCTION serien_internal.serien_within_quota_v1(bigint,bigint)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION serien_internal.serien_within_quota_v1(bigint,bigint)
 TO serien_rpc;

CREATE FUNCTION serien_internal.serien_validate_references_v1(d jsonb) RETURNS void
 LANGUAGE plpgsql SET search_path='' AS $function$
DECLARE
  cat jsonb := serien_internal.serien_asset_manifest_v1();
  edges jsonb := serien_internal.serien_edge_lengths_v1();
  m jsonb; i jsonb; c jsonb; mem jsonb; tr jsonb; j jsonb; seg jsonb;
  n integer; base_n integer; v_count integer; v_distinct integer;
  base_kind text; expected_key text; expected_kind text;
  expected_digest text; prefix constant text:='00000000-0000-4000-8000-';
  seen_models text[]:='{}'; seen_items text[]:='{}';
  seen_consists text[]:='{}'; seen_trains text[]:='{}';
  train_consists text[]:='{}'; assigned text[]:='{}';
  model jsonb; item jsonb;
BEGIN
  IF d->>'topologyHash' IS DISTINCT FROM cat->>'topologyHash'
  THEN RAISE EXCEPTION 'INCOMPATIBLE_TOPOLOGY' USING ERRCODE='P0001'; END IF;
  -- 6B.1 R1 explicitly forbids storage until 6D; closed schema alone
  -- would admit this FUTURE field and create an unrestorable snapshot.
  IF pg_catalog.jsonb_array_length(d->'inventoryStorage')<>0 THEN
   RAISE EXCEPTION 'UNSUPPORTED_INVENTORY_STORAGE' USING ERRCODE='P0001';
  END IF;
  FOR m IN SELECT value FROM pg_catalog.jsonb_array_elements(d->'models') LOOP
    IF (m->>'id')=ANY(seen_models) THEN
       RAISE EXCEPTION 'DUPLICATE_MODEL' USING ERRCODE='P0001'; END IF;
    seen_models:=pg_catalog.array_append(seen_models,m->>'id');
    IF left(m->>'id',24)<>prefix THEN
       RAISE EXCEPTION 'UNTRUSTED_MODEL_ID' USING ERRCODE='P0001'; END IF;
    n:=right(m->>'id',12)::integer;
    base_n:=CASE WHEN n BETWEEN 101 AND 108 THEN n-100 ELSE n END;
    IF base_n NOT BETWEEN 1 AND 8 OR
      (m->>'representation'='native' AND n<>base_n) OR
      (m->>'representation'='kenney' AND n<>base_n+100)
    THEN RAISE EXCEPTION 'UNTRUSTED_MODEL_ID' USING ERRCODE='P0001'; END IF;
    base_kind:=(ARRAY['steam','diesel','shunter','closed','open','tank','flat','coach'])[base_n];
    expected_key:=CASE WHEN m->>'representation'='native' THEN base_kind
      ELSE (ARRAY['steam','diesel','shunter','box','lumber','tank','lumber','box'])[base_n] END;
    expected_kind:=CASE WHEN base_n<=3 THEN 'locomotive' ELSE 'wagon' END;
    expected_digest:=CASE WHEN m->>'representation'='native' THEN cat->>'revision'
      ELSE cat->'assets'->>expected_key END;
    IF m->>'kind' IS DISTINCT FROM expected_kind OR
       m->>'runtimeKey' IS DISTINCT FROM expected_key OR
       m->>'revision' IS DISTINCT FROM cat->>'revision' OR
       m#>>'{asset,id}' IS DISTINCT FROM m->>'id' OR
       m#>>'{asset,revision}' IS DISTINCT FROM cat->>'revision' OR
       m#>>'{asset,digest}' IS DISTINCT FROM expected_digest
    THEN RAISE EXCEPTION 'UNTRUSTED_ASSET_MANIFEST' USING ERRCODE='P0001'; END IF;
  END LOOP;

  FOR i IN SELECT value FROM pg_catalog.jsonb_array_elements(d->'items') LOOP
    IF (i->>'id')=ANY(seen_items) THEN
       RAISE EXCEPTION 'DUPLICATE_ITEM' USING ERRCODE='P0001'; END IF;
    seen_items:=pg_catalog.array_append(seen_items,i->>'id');
    SELECT value INTO model FROM pg_catalog.jsonb_array_elements(d->'models')
      WHERE value->>'id'=i->>'modelId';
    IF model IS NULL OR i->>'modelRevision' IS DISTINCT FROM model->>'revision' THEN
       RAISE EXCEPTION 'ITEM_MODEL_MISSING' USING ERRCODE='P0001'; END IF;
    -- A Kenney effective model MUST also have its original native
    -- fallback manifest present, exactly as validateDocument requires.
    IF NOT EXISTS(
      SELECT 1 FROM pg_catalog.jsonb_array_elements(d->'models') AS nm
      WHERE nm.value->>'id'=i->>'nativeModelId'
        AND nm.value->>'revision'=i->>'nativeModelRevision'
        AND nm.value->>'representation'='native'
        AND nm.value->>'runtimeKey'=i->>'nativeKind'
    ) THEN RAISE EXCEPTION 'NATIVE_MODEL_MISSING' USING ERRCODE='P0001'; END IF;
    base_n:=pg_catalog.array_position(
      ARRAY['steam','diesel','shunter','closed','open','tank','flat','coach'],
      i->>'nativeKind');
    IF base_n IS NULL OR i->>'nativeModelId' IS DISTINCT FROM
       prefix||pg_catalog.lpad(base_n::text,12,'0') OR
       i->>'nativeModelRevision' IS DISTINCT FROM cat->>'revision' OR
       right(i->>'modelId',12)::integer NOT IN (base_n,base_n+100) OR
       i->'orientation' <> '1'::jsonb
    THEN RAISE EXCEPTION 'ITEM_NATIVE_IDENTITY_INVALID' USING ERRCODE='P0001'; END IF;
  END LOOP;

  FOR c IN SELECT value FROM pg_catalog.jsonb_array_elements(d->'consists') LOOP
    IF (c->>'id')=ANY(seen_consists) THEN
       RAISE EXCEPTION 'DUPLICATE_CONSIST' USING ERRCODE='P0001'; END IF;
    seen_consists:=pg_catalog.array_append(seen_consists,c->>'id');
    n:=0;
    FOR mem IN SELECT value FROM pg_catalog.jsonb_array_elements(c->'members') LOOP
      SELECT value INTO item FROM pg_catalog.jsonb_array_elements(d->'items')
        WHERE value->>'id'=mem->>'itemId';
      IF item IS NULL OR mem->'orientation' IS DISTINCT FROM item->'orientation' THEN
         RAISE EXCEPTION 'UNRESOLVED_MEMBER' USING ERRCODE='P0001'; END IF;
      SELECT value INTO model FROM pg_catalog.jsonb_array_elements(d->'models')
        WHERE value->>'id'=item->>'modelId';
      expected_kind:=CASE WHEN n=0 THEN 'locomotive' ELSE 'wagon' END;
      IF model->>'kind' IS DISTINCT FROM expected_kind THEN
       RAISE EXCEPTION 'INVALID_CONSIST_ORDER' USING ERRCODE='P0001'; END IF;
      assigned:=pg_catalog.array_append(assigned,mem->>'itemId');n:=n+1;
    END LOOP;
  END LOOP;
  FOR i IN SELECT value FROM pg_catalog.jsonb_array_elements(d->'looseStock') LOOP
    assigned:=pg_catalog.array_append(assigned,i->>'itemId');
    SELECT value INTO item FROM pg_catalog.jsonb_array_elements(d->'items')
     WHERE value->>'id'=i->>'itemId';
    IF item IS NULL THEN RAISE EXCEPTION 'UNRESOLVED_LOOSE_ITEM' USING ERRCODE='P0001'; END IF;
  END LOOP;
  FOR i IN SELECT value FROM pg_catalog.jsonb_array_elements(d->'inventoryStorage') LOOP
    assigned:=pg_catalog.array_append(assigned,i->>'itemId');
    SELECT value INTO item FROM pg_catalog.jsonb_array_elements(d->'items')
     WHERE value->>'id'=i->>'itemId';
    IF item IS NULL THEN RAISE EXCEPTION 'UNRESOLVED_STORED_ITEM' USING ERRCODE='P0001'; END IF;
  END LOOP;
  SELECT count(*),count(DISTINCT id) INTO v_count,v_distinct
    FROM pg_catalog.unnest(assigned) AS x(id);
  IF v_count<>pg_catalog.jsonb_array_length(d->'items') OR
     v_distinct<>v_count
  THEN RAISE EXCEPTION 'ITEM_ASSIGNMENT_INVALID' USING ERRCODE='P0001'; END IF;

  IF pg_catalog.jsonb_array_length(d->'trains') <>
     pg_catalog.jsonb_array_length(d->'consists')
  THEN RAISE EXCEPTION 'CONSIST_TRAIN_COUNT_MISMATCH' USING ERRCODE='P0001'; END IF;
  FOR tr IN SELECT value FROM pg_catalog.jsonb_array_elements(d->'trains') LOOP
    IF tr->>'id'=ANY(seen_trains) OR tr->>'consistId'=ANY(train_consists) OR
       NOT tr->>'consistId'=ANY(seen_consists)
    THEN RAISE EXCEPTION 'TRAIN_CONSIST_INVALID' USING ERRCODE='P0001'; END IF;
    -- Train ID is locomotive item identity, not an independent UUID.
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.jsonb_array_elements(d->'consists') cc
       JOIN LATERAL pg_catalog.jsonb_array_elements(d->'items') ii ON
         ii.value->>'id'=cc.value#>>'{members,0,itemId}'
      WHERE cc.value->>'id'=tr->>'consistId'
        AND ii.value->>'id'=tr->>'id'
        AND ii.value->>'nativeKind'=tr->>'modelKey'
    ) THEN RAISE EXCEPTION 'TRAIN_LOCO_IDENTITY_INVALID' USING ERRCODE='P0001'; END IF;
    seen_trains:=pg_catalog.array_append(seen_trains,tr->>'id');
    train_consists:=pg_catalog.array_append(train_consists,tr->>'consistId');
  END LOOP;
  FOR n IN 0..pg_catalog.jsonb_array_length(d->'trains')-1 LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.jsonb_array_elements(d->'trains')
        WHERE value->>'runtimeSlot'=n::text
    ) THEN RAISE EXCEPTION 'INVALID_RUNTIME_SLOTS' USING ERRCODE='P0001'; END IF;
  END LOOP;
  IF NOT (d#>>'{ui,selectedTrainId}')=ANY(seen_trains) THEN
    RAISE EXCEPTION 'INVALID_SELECTED_TRAIN' USING ERRCODE='P0001'; END IF;
  -- LRU must be a permutation with the selected train first; deck
  -- slots are a unique min(3,N) subset that contains the selected ID.
  IF pg_catalog.jsonb_array_length(d#>'{ui,recentTrainIds}')<>pg_catalog.array_length(seen_trains,1)
     OR pg_catalog.jsonb_array_length(d#>'{ui,consoleSlots}') <>
        least(3,pg_catalog.array_length(seen_trains,1))
     OR d#>>'{ui,recentTrainIds,0}' IS DISTINCT FROM d#>>'{ui,selectedTrainId}'
     OR NOT (d#>>'{ui,selectedTrainId}') IN
       (SELECT value FROM pg_catalog.jsonb_array_elements_text(d#>'{ui,consoleSlots}'))
     OR (SELECT count(DISTINCT value) FROM pg_catalog.jsonb_array_elements_text(d#>'{ui,recentTrainIds}'))
        <>pg_catalog.jsonb_array_length(d#>'{ui,recentTrainIds}')
     OR (SELECT count(DISTINCT value) FROM pg_catalog.jsonb_array_elements_text(d#>'{ui,consoleSlots}'))
        <>pg_catalog.jsonb_array_length(d#>'{ui,consoleSlots}')
  THEN RAISE EXCEPTION 'INVALID_UI_LRU' USING ERRCODE='P0001'; END IF;
  FOR i IN SELECT value FROM pg_catalog.jsonb_array_elements(d#>'{ui,recentTrainIds}') LOOP
    IF NOT trim(both '"' FROM i::text)=ANY(seen_trains) THEN
      RAISE EXCEPTION 'INVALID_RECENT_TRAIN' USING ERRCODE='P0001'; END IF;
  END LOOP;
  FOR i IN SELECT value FROM pg_catalog.jsonb_array_elements(d#>'{ui,consoleSlots}') LOOP
    IF NOT trim(both '"' FROM i::text)=ANY(seen_trains) THEN
      RAISE EXCEPTION 'INVALID_CONSOLE_TRAIN' USING ERRCODE='P0001'; END IF;
  END LOOP;

  -- Semantic topology check is limited to edge IDs and segment lengths.
  -- Full R1 journey/occupancy reconciliation still occurs on browser staging.
  FOR j IN
    SELECT value->'journey' FROM pg_catalog.jsonb_array_elements(d->'trains')
    UNION ALL
    SELECT value->'journey' FROM pg_catalog.jsonb_array_elements(d->'looseStock')
  LOOP
    FOR seg IN SELECT value FROM pg_catalog.jsonb_array_elements(j->'segments') LOOP
      IF edges->(seg->>'id') IS NULL OR
         pg_catalog.abs(((seg->>'end')::numeric-(seg->>'start')::numeric)
                    -(edges->>(seg->>'id'))::numeric)>0.000001
      THEN RAISE EXCEPTION 'INVALID_JOURNEY_SEGMENT' USING ERRCODE='P0001'; END IF;
    END LOOP;
  END LOOP;
END $function$;
REVOKE ALL ON FUNCTION serien_internal.serien_validate_references_v1(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION serien_internal.serien_validate_references_v1(jsonb) TO serien_rpc;

CREATE FUNCTION public.serien_open_workspace()
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $function$
DECLARE u uuid:=auth.uid(); v_hash text:='e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc'; l public.layouts%ROWTYPE;
BEGIN
 IF u IS NULL THEN
  RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,0));
 IF NOT serien_internal.serien_access_allowed_lock() THEN
  RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001'; END IF;
 INSERT INTO public.layouts(id,owner_id,name,topology_hash,schema_version)
 VALUES(u,u,'SerieN',v_hash,1) ON CONFLICT(id) DO NOTHING;
 SELECT * INTO l FROM public.layouts WHERE id=u AND owner_id=u;
 IF NOT FOUND OR l.topology_hash IS DISTINCT FROM v_hash OR l.schema_version<>1 THEN
  RAISE EXCEPTION 'INCOMPATIBLE_LAYOUT' USING ERRCODE='P0001'; END IF;
 RETURN pg_catalog.jsonb_build_object(
   'workspaceId',u,'layoutId',l.id,'topologyHash',l.topology_hash,'schemaVersion',1);
END $function$;

CREATE FUNCTION public.serien_read_head(p_workspace uuid,p_layout uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $function$
DECLARE u uuid:=auth.uid(); s public.layout_snapshots%ROWTYPE; r public.operation_receipts%ROWTYPE;
BEGIN
 IF u IS NULL OR p_workspace IS DISTINCT FROM u OR NOT serien_internal.serien_access_allowed_lock() OR
   NOT EXISTS(SELECT 1 FROM public.layouts WHERE id=p_layout AND owner_id=u)
 THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001'; END IF;
 SELECT * INTO s FROM public.layout_snapshots
  WHERE layout_id=p_layout AND owner_id=u ORDER BY revision DESC LIMIT 1;
 IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object(
   'revision','0','snapshotId',NULL,'digest',NULL,'schemaVersion',1); END IF;
 SELECT * INTO r FROM public.operation_receipts
  WHERE owner_id=u AND result->>'snapshotId'=s.id::text LIMIT 1;
 RETURN pg_catalog.jsonb_build_object(
  'revision',s.revision::text,'snapshotId',s.id,
  'digest',r.payload_digest,'schemaVersion',s.snapshot_schema);
END $function$;

CREATE FUNCTION public.serien_read_snapshot(p_workspace uuid,p_layout uuid,p_revision text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $function$
DECLARE u uuid:=auth.uid(); revision_i bigint; s public.layout_snapshots%ROWTYPE;
 r public.operation_receipts%ROWTYPE;
BEGIN
 IF u IS NULL OR p_workspace IS DISTINCT FROM u OR NOT serien_internal.serien_access_allowed_lock() OR
   NOT EXISTS(SELECT 1 FROM public.layouts WHERE id=p_layout AND owner_id=u)
 THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001'; END IF;
 IF p_revision IS NULL OR length(p_revision)>19 OR
    p_revision !~ '^[1-9][0-9]*$' OR
    (length(p_revision)=19 AND p_revision>'9223372036854775807')
 THEN RAISE EXCEPTION 'INVALID_REVISION' USING ERRCODE='P0001'; END IF;
 revision_i:=p_revision::bigint;
 SELECT * INTO s FROM public.layout_snapshots
  WHERE owner_id=u AND layout_id=p_layout AND revision=revision_i;
 IF NOT FOUND THEN RAISE EXCEPTION 'SNAPSHOT_NOT_FOUND' USING ERRCODE='P0001'; END IF;
 SELECT * INTO r FROM public.operation_receipts
  WHERE owner_id=u AND result->>'snapshotId'=s.id::text LIMIT 1;
 RETURN pg_catalog.jsonb_build_object(
   'revision',s.revision::text,'snapshotId',s.id,
   'digest',r.payload_digest,'state',s.payload,'savedAt',s.saved_at);
END $function$;

CREATE FUNCTION public.serien_save_checkpoint(
 p_workspace uuid,p_layout uuid,p_expected_revision text,p_request_id uuid,p_state_text text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $function$
DECLARE u uuid:=auth.uid(); l public.layouts%ROWTYPE; d jsonb;
 old public.operation_receipts%ROWTYPE; head_revision bigint; expected bigint;
 digest text; snapshot_id uuid; committed_at timestamptz; receipt jsonb;
 current_bytes bigint;
BEGIN
 IF u IS NULL OR p_workspace IS DISTINCT FROM u OR p_layout IS NULL OR
    p_request_id IS NULL THEN
  RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text,0));
 IF NOT serien_internal.serien_access_allowed_lock() THEN
  RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='P0001'; END IF;
 SELECT * INTO l FROM public.layouts WHERE id=p_layout AND owner_id=u;
 IF NOT FOUND OR l.topology_hash<>'e233b168afdb05482ed448a09133ff8f085c3039d5225b52286898e73aaad0cc' OR l.schema_version<>1 THEN
  RAISE EXCEPTION 'INCOMPATIBLE_LAYOUT' USING ERRCODE='P0001'; END IF;
 IF p_expected_revision IS NULL OR length(p_expected_revision)>19 OR
    p_expected_revision !~ '^(0|[1-9][0-9]*)$' OR
    (length(p_expected_revision)=19 AND p_expected_revision>'9223372036854775807')
 THEN RAISE EXCEPTION 'INVALID_REVISION' USING ERRCODE='P0001'; END IF;
 expected:=p_expected_revision::bigint;
 IF p_state_text IS NULL OR pg_catalog.octet_length(p_state_text)>2097152 THEN
  RAISE EXCEPTION 'PAYLOAD_TOO_LARGE' USING ERRCODE='P0001'; END IF;
 IF NOT (p_state_text IS JSON OBJECT WITH UNIQUE KEYS) THEN
  RAISE EXCEPTION 'INVALID_JSON' USING ERRCODE='P0001'; END IF;
 d:=p_state_text::jsonb;
 IF NOT extensions.jsonb_matches_schema(serien_internal.serien_schema_v1(),d) THEN
  RAISE EXCEPTION 'INVALID_STATE_SCHEMA' USING ERRCODE='P0001'; END IF;
 IF d->>'workspaceId' IS DISTINCT FROM u::text OR
    d->>'layoutId' IS DISTINCT FROM p_layout::text OR
    d->>'topologyHash' IS DISTINCT FROM l.topology_hash
 THEN RAISE EXCEPTION 'INVALID_STATE_CONTEXT' USING ERRCODE='P0001'; END IF;
 PERFORM serien_internal.serien_validate_references_v1(d);
 digest:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_array('serien-save-v1',u::text,p_workspace::text,
       p_layout::text,p_expected_revision,p_state_text)::text,'UTF8')),'hex');
 SELECT * INTO old FROM public.operation_receipts
 WHERE owner_id=u AND request_id=p_request_id;
 IF FOUND THEN
  IF old.op_type<>'serien-save-v1' OR old.payload_digest<>digest THEN
   RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE='P0001'; END IF;
  RETURN old.result;
 END IF;
 SELECT coalesce(max(revision),0) INTO head_revision FROM public.layout_snapshots
  WHERE owner_id=u AND layout_id=p_layout;
 IF head_revision<>expected THEN
  RAISE EXCEPTION 'REVISION_CONFLICT' USING ERRCODE='P0001'; END IF;
 IF head_revision=9223372036854775807 THEN
  RAISE EXCEPTION 'REVISION_OVERFLOW' USING ERRCODE='P0001'; END IF;
 -- One-user advisory lock serializes all authorized writers.
 SELECT coalesce(sum(pg_catalog.octet_length(payload::text)),0)
 INTO current_bytes FROM public.layout_snapshots WHERE owner_id=u;
 IF NOT serien_internal.serien_within_quota_v1(
      current_bytes,pg_catalog.octet_length(d::text)) THEN
  RAISE EXCEPTION 'OWNER_QUOTA_EXCEEDED' USING ERRCODE='P0001'; END IF;
 INSERT INTO public.layout_snapshots(owner_id,layout_id,revision,snapshot_schema,payload)
 VALUES(u,p_layout,head_revision+1,1,d)
 RETURNING id,saved_at INTO snapshot_id,committed_at;
 receipt:=pg_catalog.jsonb_build_object(
   'revision',(head_revision+1)::text,'snapshotId',snapshot_id,
   'requestId',p_request_id,'digest',digest,'committedAt',committed_at);
 INSERT INTO public.operation_receipts(owner_id,request_id,op_type,payload_digest,result)
 VALUES(u,p_request_id,'serien-save-v1',digest,receipt);
 RETURN receipt;
END $function$;

-- Functions deliberately owned by a limited role that is NOT table owner.
ALTER FUNCTION public.serien_open_workspace() OWNER TO serien_rpc;
ALTER FUNCTION public.serien_read_head(uuid,uuid) OWNER TO serien_rpc;
ALTER FUNCTION public.serien_read_snapshot(uuid,uuid,text) OWNER TO serien_rpc;
ALTER FUNCTION public.serien_save_checkpoint(uuid,uuid,text,uuid,text) OWNER TO serien_rpc;
REVOKE ALL ON FUNCTION public.serien_open_workspace(),
 public.serien_read_head(uuid,uuid),public.serien_read_snapshot(uuid,uuid,text),
 public.serien_save_checkpoint(uuid,uuid,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.serien_open_workspace(),
 public.serien_read_head(uuid,uuid),public.serien_read_snapshot(uuid,uuid,text),
 public.serien_save_checkpoint(uuid,uuid,text,uuid,text) TO authenticated;

-- POSTCONDITIONS to verify in offline database, not evidence of all semantics.
DO $check$
BEGIN
 IF has_table_privilege('authenticated','public.layout_snapshots','INSERT') OR
    has_table_privilege('authenticated','public.layouts','SELECT') OR
    has_table_privilege('authenticated','public.operation_receipts','SELECT') OR
    has_table_privilege('serien_rpc','public.layout_snapshots','UPDATE') OR
    has_table_privilege('serien_rpc','public.layout_snapshots','DELETE') OR
    (SELECT rolbypassrls FROM pg_roles WHERE rolname='serien_rpc')
 THEN RAISE EXCEPTION 'STOP: privilege invariant violated'; END IF;
END $check$;
