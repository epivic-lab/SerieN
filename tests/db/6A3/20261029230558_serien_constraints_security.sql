create function serien_internal.check_member_assignment() returns trigger language plpgsql set search_path='' as $$
declare v_kind text;
begin
 perform 1 from public.stock_items where id=new.stock_item_id for update;
 if exists(select 1 from public.loose_stock_placements where stock_item_id=new.stock_item_id) then raise exception 'Item already loose on track' using errcode='23514';end if;
 select m.kind into v_kind from public.stock_items i join public.stock_models m on m.id=i.model_id where i.id=new.stock_item_id;
 if v_kind is null then raise exception 'Unknown item' using errcode='23503';end if;
 if (new.ordinal=0 and v_kind<>'locomotive') or (new.ordinal>0 and v_kind<>'wagon') then raise exception 'First member must be locomotive; others wagons' using errcode='23514';end if;
 return new;
end;$$;
create trigger check_member_assignment before insert or update on public.consist_members for each row execute function serien_internal.check_member_assignment();
create function serien_internal.check_loose_assignment() returns trigger language plpgsql set search_path='' as $$
begin
 perform 1 from public.stock_items where id=new.stock_item_id for update;
 if exists(select 1 from public.consist_members where stock_item_id=new.stock_item_id) then raise exception 'Item already in consist' using errcode='23514';end if;
 return new;
end;$$;
create trigger check_loose_assignment before insert or update on public.loose_stock_placements for each row execute function serien_internal.check_loose_assignment();
create function serien_internal.assert_ready_consist(p_id uuid) returns void language plpgsql set search_path='' as $$
declare v_status text; v_total bigint; v_min integer; v_max integer;
begin
 select status into v_status from public.consists where id=p_id;
 if v_status is distinct from 'ready' then return;end if;
 select count(*),min(ordinal),max(ordinal) into v_total,v_min,v_max from public.consist_members where consist_id=p_id;
 if v_total=0 or v_min<>0 or v_max<>v_total-1 then raise exception 'Ready consist needs consecutive ordinal positions from zero' using errcode='23514';end if;
end;$$;
create function serien_internal.check_ready_members() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and new.consist_id is distinct from old.consist_id then perform serien_internal.assert_ready_consist(old.consist_id);end if;
 perform serien_internal.assert_ready_consist(case when tg_op='DELETE' then old.consist_id else new.consist_id end);
 return null;
end;$$;
create constraint trigger members_ready_at_commit after insert or update or delete on public.consist_members deferrable initially deferred for each row execute function serien_internal.check_ready_members();
create function serien_internal.check_ready_consist() returns trigger language plpgsql set search_path='' as $$
begin perform serien_internal.assert_ready_consist(new.id);return null;end;$$;
create constraint trigger consists_ready_at_commit after insert or update of status on public.consists deferrable initially deferred for each row execute function serien_internal.check_ready_consist();
create function serien_internal.check_placement() returns trigger language plpgsql set search_path='' as $$
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
create trigger check_layout_placement before insert or update on public.layout_placements for each row execute function serien_internal.check_placement();
create trigger check_loose_placement before insert or update on public.loose_stock_placements for each row execute function serien_internal.check_placement();
create function serien_internal.check_snapshot() returns trigger language plpgsql set search_path='' as $$
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
create trigger check_snapshot before insert or update on public.layout_snapshots for each row execute function serien_internal.check_snapshot();
create function serien_internal.lock_model_identity() returns trigger language plpgsql set search_path='' as $$
begin if old.kind is distinct from new.kind and exists(select 1 from public.stock_items where model_id=old.id) then raise exception 'Cannot change model kind when in inventory' using errcode='23514';end if;return new;end;$$;
create trigger lock_model_kind before update of kind on public.stock_models for each row execute function serien_internal.lock_model_identity();
alter table public.stock_models enable row level security;
alter table public.stock_items enable row level security;
alter table public.consists enable row level security;
alter table public.consist_members enable row level security;
alter table public.layouts enable row level security;
alter table public.layout_segments enable row level security;
alter table public.layout_placements enable row level security;
alter table public.loose_stock_placements enable row level security;
alter table public.layout_snapshots enable row level security;
alter table public.operation_receipts enable row level security;
revoke all on public.stock_models,public.stock_items,public.consists,public.consist_members,public.layouts,public.layout_segments,public.layout_placements,public.loose_stock_placements,public.layout_snapshots,public.operation_receipts from anon,authenticated;
create policy stock_models_signed_in_read on public.stock_models for select to authenticated using(true);
create policy stock_items_owner_select on public.stock_items for select to authenticated using((select auth.uid())=owner_id);
create policy stock_items_owner_insert on public.stock_items for insert to authenticated with check((select auth.uid())=owner_id);
create policy stock_items_owner_update on public.stock_items for update to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy stock_items_owner_delete on public.stock_items for delete to authenticated using((select auth.uid())=owner_id);
create policy consists_owner_all on public.consists for all to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy consist_members_owner_all on public.consist_members for all to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy layouts_owner_all on public.layouts for all to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy segments_owner_all on public.layout_segments for all to authenticated using(exists(select 1 from public.layouts l where l.id=layout_id and l.owner_id=(select auth.uid()))) with check(exists(select 1 from public.layouts l where l.id=layout_id and l.owner_id=(select auth.uid())));
create policy placements_owner_all on public.layout_placements for all to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy loose_owner_all on public.loose_stock_placements for all to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy snapshots_owner_all on public.layout_snapshots for all to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
create policy receipts_owner_all on public.operation_receipts for all to authenticated using((select auth.uid())=owner_id) with check((select auth.uid())=owner_id);
revoke all on all functions in schema serien_internal from public,anon,authenticated;
revoke all on schema serien_internal from public,anon,authenticated;
