--
-- PostgreSQL database dump
--



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: serien_internal; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA serien_internal;


--
-- Name: assert_ready_consist(uuid); Type: FUNCTION; Schema: serien_internal; Owner: -
--

CREATE FUNCTION serien_internal.assert_ready_consist(p_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare v_status text; v_total bigint; v_min integer; v_max integer;
begin
 select status into v_status from public.consists where id=p_id;
 if v_status is distinct from 'ready' then return;end if;
 select count(*),min(ordinal),max(ordinal) into v_total,v_min,v_max from public.consist_members where consist_id=p_id;
 if v_total=0 or v_min<>0 or v_max<>v_total-1 then raise exception 'Ready consist needs consecutive ordinal positions from zero' using errcode='23514';end if;
end;$$;


--
-- Name: check_loose_assignment(); Type: FUNCTION; Schema: serien_internal; Owner: -
--

CREATE FUNCTION serien_internal.check_loose_assignment() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
 perform 1 from public.stock_items where id=new.stock_item_id for update;
 if exists(select 1 from public.consist_members where stock_item_id=new.stock_item_id) then raise exception 'Item already in consist' using errcode='23514';end if;
 return new;
end;$$;


--
-- Name: check_member_assignment(); Type: FUNCTION; Schema: serien_internal; Owner: -
--

CREATE FUNCTION serien_internal.check_member_assignment() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare v_kind text;
begin
 perform 1 from public.stock_items where id=new.stock_item_id for update;
 if exists(select 1 from public.loose_stock_placements where stock_item_id=new.stock_item_id) then raise exception 'Item already loose on track' using errcode='23514';end if;
 select m.kind into v_kind from public.stock_items i join public.stock_models m on m.id=i.model_id where i.id=new.stock_item_id;
 if v_kind is null then raise exception 'Unknown item' using errcode='23503';end if;
 if (new.ordinal=0 and v_kind<>'locomotive') or (new.ordinal>0 and v_kind<>'wagon') then raise exception 'First member must be locomotive; others wagons' using errcode='23514';end if;
 return new;
end;$$;


--
-- Name: check_placement(); Type: FUNCTION; Schema: serien_internal; Owner: -
--

CREATE FUNCTION serien_internal.check_placement() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare v_length numeric;v_status text;
begin
 select length_mm into v_length from public.layout_segments where layout_id=new.layout_id and edge_id=new.edge_id;
 if v_length is null or new.s_mm>v_length then raise exception 'Invalid track location' using errcode='23514';end if;
 if tg_table_name='layout_placements' then
 select status into v_status from public.consists where id=new.consist_id;
 if v_status<>'ready' then raise exception 'Only ready consists may be placed' using errcode='23514';end if;
 end if;
 return new;
end;$$;


--
-- Name: check_ready_consist(); Type: FUNCTION; Schema: serien_internal; Owner: -
--

CREATE FUNCTION serien_internal.check_ready_consist() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin perform serien_internal.assert_ready_consist(new.id);return null;end;$$;


--
-- Name: check_ready_members(); Type: FUNCTION; Schema: serien_internal; Owner: -
--

CREATE FUNCTION serien_internal.check_ready_members() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin
 if tg_op='UPDATE' and new.consist_id is distinct from old.consist_id then perform serien_internal.assert_ready_consist(old.consist_id);end if;
 perform serien_internal.assert_ready_consist(case when tg_op='DELETE' then old.consist_id else new.consist_id end);
 return null;
end;$$;


--
-- Name: check_snapshot(); Type: FUNCTION; Schema: serien_internal; Owner: -
--

CREATE FUNCTION serien_internal.check_snapshot() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
declare v_hash text;v_switches jsonb;v_name text;v_count int;
begin
 select topology_hash into v_hash from public.layouts where id=new.layout_id;
 if new.payload->>'topologyHash' is distinct from v_hash then raise exception 'Layout hash mismatch' using errcode='23514';end if;
 if new.payload->>'resumePolicy' is distinct from 'STOPPED' then raise exception 'Resume policy must be STOPPED' using errcode='23514';end if;
 v_switches=new.payload#>'{layout,switches}';
 if jsonb_typeof(v_switches)='object' then select count(*) into v_count from jsonb_object_keys(v_switches);else v_count=0;end if;
 if v_count<>8 then raise exception 'Eight switches required' using errcode='23514';end if;
 foreach v_name in array array['WX-A','WX-B','Y-IN','Y-2','Y-3','Y-R1','Y-R2','Y-4'] loop
 if jsonb_typeof(v_switches->v_name) is distinct from 'boolean' then raise exception 'Invalid switch: %',v_name using errcode='23514';end if;
 end loop;
 return new;
end;$$;


--
-- Name: lock_model_identity(); Type: FUNCTION; Schema: serien_internal; Owner: -
--

CREATE FUNCTION serien_internal.lock_model_identity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin if old.kind is distinct from new.kind and exists(select 1 from public.stock_items where model_id=old.id) then raise exception 'Cannot change model kind when in inventory' using errcode='23514';end if;return new;end;$$;


--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: serien_internal; Owner: -
--

CREATE FUNCTION serien_internal.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
begin new.updated_at=now();return new;end; $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: consist_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consist_members (
    consist_id uuid NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    stock_item_id uuid NOT NULL,
    ordinal integer NOT NULL,
    orientation smallint DEFAULT 1 NOT NULL,
    CONSTRAINT consist_members_ordinal_check CHECK ((ordinal >= 0)),
    CONSTRAINT consist_members_orientation_check CHECK ((orientation = ANY (ARRAY['-1'::integer, 1])))
);


--
-- Name: consists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    revision bigint DEFAULT 0 NOT NULL,
    orientation smallint DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT consists_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 160))),
    CONSTRAINT consists_orientation_check CHECK ((orientation = ANY (ARRAY['-1'::integer, 1]))),
    CONSTRAINT consists_revision_check CHECK ((revision >= 0)),
    CONSTRAINT consists_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'ready'::text])))
);


--
-- Name: layout_placements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.layout_placements (
    consist_id uuid NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    layout_id uuid NOT NULL,
    edge_id text NOT NULL,
    s_mm numeric(12,3) NOT NULL,
    heading smallint NOT NULL,
    journey_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    state_version bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT layout_placements_heading_check CHECK ((heading = ANY (ARRAY['-1'::integer, 1]))),
    CONSTRAINT layout_placements_journey_state_check CHECK ((jsonb_typeof(journey_state) = 'object'::text)),
    CONSTRAINT layout_placements_s_mm_check CHECK ((s_mm >= (0)::numeric)),
    CONSTRAINT layout_placements_state_version_check CHECK ((state_version >= 0))
);


--
-- Name: layout_segments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.layout_segments (
    layout_id uuid NOT NULL,
    edge_id text NOT NULL,
    length_mm numeric(12,3) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT layout_segments_edge_id_check CHECK (((length(edge_id) >= 1) AND (length(edge_id) <= 120))),
    CONSTRAINT layout_segments_length_mm_check CHECK ((length_mm > (0)::numeric)),
    CONSTRAINT layout_segments_metadata_check CHECK ((jsonb_typeof(metadata) = 'object'::text))
);


--
-- Name: layout_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.layout_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    layout_id uuid NOT NULL,
    revision bigint NOT NULL,
    snapshot_schema integer DEFAULT 1 NOT NULL,
    payload jsonb NOT NULL,
    saved_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT layout_snapshots_payload_check CHECK ((jsonb_typeof(payload) = 'object'::text)),
    CONSTRAINT layout_snapshots_revision_check CHECK ((revision >= 0)),
    CONSTRAINT layout_snapshots_snapshot_schema_check CHECK ((snapshot_schema > 0))
);


--
-- Name: layouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.layouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    name text NOT NULL,
    topology_hash text NOT NULL,
    schema_version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT layouts_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 160))),
    CONSTRAINT layouts_schema_version_check CHECK ((schema_version > 0)),
    CONSTRAINT layouts_topology_hash_check CHECK (((length(topology_hash) >= 32) AND (length(topology_hash) <= 128)))
);


--
-- Name: loose_stock_placements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loose_stock_placements (
    stock_item_id uuid NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    layout_id uuid NOT NULL,
    edge_id text NOT NULL,
    s_mm numeric(12,3) NOT NULL,
    heading smallint NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT loose_stock_placements_heading_check CHECK ((heading = ANY (ARRAY['-1'::integer, 1]))),
    CONSTRAINT loose_stock_placements_s_mm_check CHECK ((s_mm >= (0)::numeric))
);


--
-- Name: operation_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operation_receipts (
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    request_id uuid NOT NULL,
    op_type text NOT NULL,
    payload_digest text NOT NULL,
    result jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT operation_receipts_op_type_check CHECK (((length(op_type) >= 1) AND (length(op_type) <= 120))),
    CONSTRAINT operation_receipts_payload_digest_check CHECK ((payload_digest ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT operation_receipts_result_check CHECK ((jsonb_typeof(result) = 'object'::text))
);


--
-- Name: stock_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid DEFAULT auth.uid() NOT NULL,
    model_id uuid NOT NULL,
    inventory_code text,
    display_name text,
    orientation smallint DEFAULT 1 NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stock_items_orientation_check CHECK ((orientation = ANY (ARRAY['-1'::integer, 1]))),
    CONSTRAINT stock_items_settings_check CHECK ((jsonb_typeof(settings) = 'object'::text))
);


--
-- Name: stock_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind text NOT NULL,
    name text NOT NULL,
    prototype text,
    target_scale integer DEFAULT 160 NOT NULL,
    length_mm numeric(12,3),
    width_mm numeric(12,3),
    height_mm numeric(12,3),
    front_coupler_mm numeric(12,3),
    rear_coupler_mm numeric(12,3),
    asset_uri text,
    thumbnail_uri text,
    source_format text,
    license_code text DEFAULT 'UNKNOWN'::text NOT NULL,
    source_url text,
    import_status text DEFAULT 'pending'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stock_models_front_coupler_mm_check CHECK ((front_coupler_mm >= (0)::numeric)),
    CONSTRAINT stock_models_height_mm_check CHECK ((height_mm > (0)::numeric)),
    CONSTRAINT stock_models_import_status_check CHECK ((import_status = ANY (ARRAY['pending'::text, 'verified'::text, 'converted'::text, 'blocked'::text, 'failed'::text]))),
    CONSTRAINT stock_models_kind_check CHECK ((kind = ANY (ARRAY['locomotive'::text, 'wagon'::text]))),
    CONSTRAINT stock_models_length_mm_check CHECK ((length_mm > (0)::numeric)),
    CONSTRAINT stock_models_metadata_check CHECK ((jsonb_typeof(metadata) = 'object'::text)),
    CONSTRAINT stock_models_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 200))),
    CONSTRAINT stock_models_rear_coupler_mm_check CHECK ((rear_coupler_mm >= (0)::numeric)),
    CONSTRAINT stock_models_source_format_check CHECK ((source_format = ANY (ARRAY['native'::text, 'glb'::text, 'gltf'::text, 'fbx'::text, 'obj'::text, 'zip'::text, 'other'::text]))),
    CONSTRAINT stock_models_target_scale_check CHECK ((target_scale > 0)),
    CONSTRAINT stock_models_width_mm_check CHECK ((width_mm > (0)::numeric))
);


--
-- Name: consist_members consist_members_consist_id_ordinal_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consist_members
    ADD CONSTRAINT consist_members_consist_id_ordinal_key UNIQUE (consist_id, ordinal);


--
-- Name: consist_members consist_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consist_members
    ADD CONSTRAINT consist_members_pkey PRIMARY KEY (consist_id, stock_item_id);


--
-- Name: consist_members consist_members_stock_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consist_members
    ADD CONSTRAINT consist_members_stock_item_id_key UNIQUE (stock_item_id);


--
-- Name: consists consists_id_owner_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consists
    ADD CONSTRAINT consists_id_owner_id_key UNIQUE (id, owner_id);


--
-- Name: consists consists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consists
    ADD CONSTRAINT consists_pkey PRIMARY KEY (id);


--
-- Name: layout_placements layout_placements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_placements
    ADD CONSTRAINT layout_placements_pkey PRIMARY KEY (consist_id);


--
-- Name: layout_segments layout_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_segments
    ADD CONSTRAINT layout_segments_pkey PRIMARY KEY (layout_id, edge_id);


--
-- Name: layout_snapshots layout_snapshots_layout_id_revision_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_snapshots
    ADD CONSTRAINT layout_snapshots_layout_id_revision_key UNIQUE (layout_id, revision);


--
-- Name: layout_snapshots layout_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_snapshots
    ADD CONSTRAINT layout_snapshots_pkey PRIMARY KEY (id);


--
-- Name: layouts layouts_id_owner_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layouts
    ADD CONSTRAINT layouts_id_owner_id_key UNIQUE (id, owner_id);


--
-- Name: layouts layouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layouts
    ADD CONSTRAINT layouts_pkey PRIMARY KEY (id);


--
-- Name: loose_stock_placements loose_stock_placements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loose_stock_placements
    ADD CONSTRAINT loose_stock_placements_pkey PRIMARY KEY (stock_item_id);


--
-- Name: operation_receipts operation_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_receipts
    ADD CONSTRAINT operation_receipts_pkey PRIMARY KEY (owner_id, request_id);


--
-- Name: stock_items stock_items_id_owner_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_id_owner_id_key UNIQUE (id, owner_id);


--
-- Name: stock_items stock_items_owner_id_inventory_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_owner_id_inventory_code_key UNIQUE (owner_id, inventory_code);


--
-- Name: stock_items stock_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_pkey PRIMARY KEY (id);


--
-- Name: stock_models stock_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_models
    ADD CONSTRAINT stock_models_pkey PRIMARY KEY (id);


--
-- Name: consist_members_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX consist_members_owner_idx ON public.consist_members USING btree (owner_id);


--
-- Name: consist_members_stock_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX consist_members_stock_owner_idx ON public.consist_members USING btree (stock_item_id, owner_id);


--
-- Name: consists_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX consists_owner_idx ON public.consists USING btree (owner_id);


--
-- Name: layout_placements_layout_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX layout_placements_layout_owner_idx ON public.layout_placements USING btree (layout_id, owner_id);


--
-- Name: layout_snapshots_recent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX layout_snapshots_recent_idx ON public.layout_snapshots USING btree (layout_id, saved_at DESC);


--
-- Name: layouts_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX layouts_owner_idx ON public.layouts USING btree (owner_id);


--
-- Name: loose_stock_layout_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX loose_stock_layout_owner_idx ON public.loose_stock_placements USING btree (layout_id, owner_id);


--
-- Name: operation_receipts_recent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operation_receipts_recent_idx ON public.operation_receipts USING btree (owner_id, created_at DESC);


--
-- Name: stock_items_model_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_items_model_idx ON public.stock_items USING btree (model_id);


--
-- Name: stock_items_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_items_owner_idx ON public.stock_items USING btree (owner_id);


--
-- Name: layout_placements check_layout_placement; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_layout_placement BEFORE INSERT OR UPDATE ON public.layout_placements FOR EACH ROW EXECUTE FUNCTION serien_internal.check_placement();


--
-- Name: loose_stock_placements check_loose_assignment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_loose_assignment BEFORE INSERT OR UPDATE ON public.loose_stock_placements FOR EACH ROW EXECUTE FUNCTION serien_internal.check_loose_assignment();


--
-- Name: loose_stock_placements check_loose_placement; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_loose_placement BEFORE INSERT OR UPDATE ON public.loose_stock_placements FOR EACH ROW EXECUTE FUNCTION serien_internal.check_placement();


--
-- Name: consist_members check_member_assignment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_member_assignment BEFORE INSERT OR UPDATE ON public.consist_members FOR EACH ROW EXECUTE FUNCTION serien_internal.check_member_assignment();


--
-- Name: layout_snapshots check_snapshot; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_snapshot BEFORE INSERT OR UPDATE ON public.layout_snapshots FOR EACH ROW EXECUTE FUNCTION serien_internal.check_snapshot();


--
-- Name: consists consists_ready_at_commit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER consists_ready_at_commit AFTER INSERT OR UPDATE OF status ON public.consists DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION serien_internal.check_ready_consist();


--
-- Name: consists consists_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER consists_touch BEFORE UPDATE ON public.consists FOR EACH ROW EXECUTE FUNCTION serien_internal.touch_updated_at();


--
-- Name: layout_placements layout_placements_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER layout_placements_touch BEFORE UPDATE ON public.layout_placements FOR EACH ROW EXECUTE FUNCTION serien_internal.touch_updated_at();


--
-- Name: layouts layouts_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER layouts_touch BEFORE UPDATE ON public.layouts FOR EACH ROW EXECUTE FUNCTION serien_internal.touch_updated_at();


--
-- Name: stock_models lock_model_kind; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lock_model_kind BEFORE UPDATE OF kind ON public.stock_models FOR EACH ROW EXECUTE FUNCTION serien_internal.lock_model_identity();


--
-- Name: loose_stock_placements loose_stock_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER loose_stock_touch BEFORE UPDATE ON public.loose_stock_placements FOR EACH ROW EXECUTE FUNCTION serien_internal.touch_updated_at();


--
-- Name: consist_members members_ready_at_commit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER members_ready_at_commit AFTER INSERT OR DELETE OR UPDATE ON public.consist_members DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION serien_internal.check_ready_members();


--
-- Name: stock_items stock_items_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER stock_items_touch BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION serien_internal.touch_updated_at();


--
-- Name: stock_models stock_models_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER stock_models_touch BEFORE UPDATE ON public.stock_models FOR EACH ROW EXECUTE FUNCTION serien_internal.touch_updated_at();


--
-- Name: consist_members consist_members_consist_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consist_members
    ADD CONSTRAINT consist_members_consist_id_owner_id_fkey FOREIGN KEY (consist_id, owner_id) REFERENCES public.consists(id, owner_id) ON DELETE CASCADE;


--
-- Name: consist_members consist_members_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consist_members
    ADD CONSTRAINT consist_members_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: consist_members consist_members_stock_item_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consist_members
    ADD CONSTRAINT consist_members_stock_item_id_owner_id_fkey FOREIGN KEY (stock_item_id, owner_id) REFERENCES public.stock_items(id, owner_id) ON DELETE RESTRICT;


--
-- Name: consists consists_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consists
    ADD CONSTRAINT consists_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: layout_placements layout_placements_consist_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_placements
    ADD CONSTRAINT layout_placements_consist_id_owner_id_fkey FOREIGN KEY (consist_id, owner_id) REFERENCES public.consists(id, owner_id) ON DELETE CASCADE;


--
-- Name: layout_placements layout_placements_layout_id_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_placements
    ADD CONSTRAINT layout_placements_layout_id_edge_id_fkey FOREIGN KEY (layout_id, edge_id) REFERENCES public.layout_segments(layout_id, edge_id) ON DELETE RESTRICT;


--
-- Name: layout_placements layout_placements_layout_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_placements
    ADD CONSTRAINT layout_placements_layout_id_owner_id_fkey FOREIGN KEY (layout_id, owner_id) REFERENCES public.layouts(id, owner_id) ON DELETE CASCADE;


--
-- Name: layout_placements layout_placements_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_placements
    ADD CONSTRAINT layout_placements_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: layout_segments layout_segments_layout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_segments
    ADD CONSTRAINT layout_segments_layout_id_fkey FOREIGN KEY (layout_id) REFERENCES public.layouts(id) ON DELETE CASCADE;


--
-- Name: layout_snapshots layout_snapshots_layout_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_snapshots
    ADD CONSTRAINT layout_snapshots_layout_id_owner_id_fkey FOREIGN KEY (layout_id, owner_id) REFERENCES public.layouts(id, owner_id) ON DELETE CASCADE;


--
-- Name: layout_snapshots layout_snapshots_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_snapshots
    ADD CONSTRAINT layout_snapshots_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: layouts layouts_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layouts
    ADD CONSTRAINT layouts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: loose_stock_placements loose_stock_placements_layout_id_edge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loose_stock_placements
    ADD CONSTRAINT loose_stock_placements_layout_id_edge_id_fkey FOREIGN KEY (layout_id, edge_id) REFERENCES public.layout_segments(layout_id, edge_id) ON DELETE RESTRICT;


--
-- Name: loose_stock_placements loose_stock_placements_layout_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loose_stock_placements
    ADD CONSTRAINT loose_stock_placements_layout_id_owner_id_fkey FOREIGN KEY (layout_id, owner_id) REFERENCES public.layouts(id, owner_id) ON DELETE CASCADE;


--
-- Name: loose_stock_placements loose_stock_placements_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loose_stock_placements
    ADD CONSTRAINT loose_stock_placements_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: loose_stock_placements loose_stock_placements_stock_item_id_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loose_stock_placements
    ADD CONSTRAINT loose_stock_placements_stock_item_id_owner_id_fkey FOREIGN KEY (stock_item_id, owner_id) REFERENCES public.stock_items(id, owner_id) ON DELETE CASCADE;


--
-- Name: operation_receipts operation_receipts_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_receipts
    ADD CONSTRAINT operation_receipts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: stock_items stock_items_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.stock_models(id) ON DELETE RESTRICT;


--
-- Name: stock_items stock_items_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_items
    ADD CONSTRAINT stock_items_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: consist_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consist_members ENABLE ROW LEVEL SECURITY;

--
-- Name: consist_members consist_members_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY consist_members_owner_all ON public.consist_members TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: consists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consists ENABLE ROW LEVEL SECURITY;

--
-- Name: consists consists_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY consists_owner_all ON public.consists TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: layout_placements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.layout_placements ENABLE ROW LEVEL SECURITY;

--
-- Name: layout_segments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.layout_segments ENABLE ROW LEVEL SECURITY;

--
-- Name: layout_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.layout_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: layouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.layouts ENABLE ROW LEVEL SECURITY;

--
-- Name: layouts layouts_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY layouts_owner_all ON public.layouts TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: loose_stock_placements loose_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loose_owner_all ON public.loose_stock_placements TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: loose_stock_placements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loose_stock_placements ENABLE ROW LEVEL SECURITY;

--
-- Name: operation_receipts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.operation_receipts ENABLE ROW LEVEL SECURITY;

--
-- Name: layout_placements placements_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY placements_owner_all ON public.layout_placements TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: operation_receipts receipts_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY receipts_owner_all ON public.operation_receipts TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: layout_segments segments_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY segments_owner_all ON public.layout_segments TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.layouts l
  WHERE ((l.id = layout_segments.layout_id) AND (l.owner_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.layouts l
  WHERE ((l.id = layout_segments.layout_id) AND (l.owner_id = ( SELECT auth.uid() AS uid))))));


--
-- Name: layout_snapshots snapshots_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY snapshots_owner_all ON public.layout_snapshots TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: stock_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_items stock_items_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_items_owner_delete ON public.stock_items FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: stock_items stock_items_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_items_owner_insert ON public.stock_items FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: stock_items stock_items_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_items_owner_select ON public.stock_items FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: stock_items stock_items_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_items_owner_update ON public.stock_items FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));


--
-- Name: stock_models; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_models ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_models stock_models_signed_in_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_models_signed_in_read ON public.stock_models FOR SELECT TO authenticated USING (true);


--
-- Name: FUNCTION assert_ready_consist(p_id uuid); Type: ACL; Schema: serien_internal; Owner: -
--

REVOKE ALL ON FUNCTION serien_internal.assert_ready_consist(p_id uuid) FROM PUBLIC;


--
-- Name: FUNCTION check_loose_assignment(); Type: ACL; Schema: serien_internal; Owner: -
--

REVOKE ALL ON FUNCTION serien_internal.check_loose_assignment() FROM PUBLIC;


--
-- Name: FUNCTION check_member_assignment(); Type: ACL; Schema: serien_internal; Owner: -
--

REVOKE ALL ON FUNCTION serien_internal.check_member_assignment() FROM PUBLIC;


--
-- Name: FUNCTION check_placement(); Type: ACL; Schema: serien_internal; Owner: -
--

REVOKE ALL ON FUNCTION serien_internal.check_placement() FROM PUBLIC;


--
-- Name: FUNCTION check_ready_consist(); Type: ACL; Schema: serien_internal; Owner: -
--

REVOKE ALL ON FUNCTION serien_internal.check_ready_consist() FROM PUBLIC;


--
-- Name: FUNCTION check_ready_members(); Type: ACL; Schema: serien_internal; Owner: -
--

REVOKE ALL ON FUNCTION serien_internal.check_ready_members() FROM PUBLIC;


--
-- Name: FUNCTION check_snapshot(); Type: ACL; Schema: serien_internal; Owner: -
--

REVOKE ALL ON FUNCTION serien_internal.check_snapshot() FROM PUBLIC;


--
-- Name: FUNCTION lock_model_identity(); Type: ACL; Schema: serien_internal; Owner: -
--

REVOKE ALL ON FUNCTION serien_internal.lock_model_identity() FROM PUBLIC;


--
-- Name: FUNCTION touch_updated_at(); Type: ACL; Schema: serien_internal; Owner: -
--

REVOKE ALL ON FUNCTION serien_internal.touch_updated_at() FROM PUBLIC;


--
-- PostgreSQL database dump complete
--
