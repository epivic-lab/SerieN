create table public.stock_models (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('locomotive','wagon')),
 name text not null check(length(trim(name)) between 1 and 200),
 prototype text,
 target_scale integer not null default 160 check(target_scale>0),
 length_mm numeric(12,3) check(length_mm>0),
 width_mm numeric(12,3) check(width_mm>0),
 height_mm numeric(12,3) check(height_mm>0),
 front_coupler_mm numeric(12,3) check(front_coupler_mm>=0),
 rear_coupler_mm numeric(12,3) check(rear_coupler_mm>=0),
 asset_uri text, thumbnail_uri text,
 source_format text check(source_format in ('native','glb','gltf','fbx','obj','zip','other')),
 license_code text not null default 'UNKNOWN',
 source_url text,
 import_status text not null default 'pending' check(import_status in ('pending','verified','converted','blocked','failed')),
 metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.stock_items (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 model_id uuid not null references public.stock_models(id) on delete restrict,
 inventory_code text,
 display_name text,
 orientation smallint not null default 1 check(orientation in (-1,1)),
 settings jsonb not null default '{}'::jsonb check(jsonb_typeof(settings)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,owner_id), unique(owner_id,inventory_code)
);
create table public.consists (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 160),
 status text not null default 'draft' check(status in ('draft','ready')),
 revision bigint not null default 0 check(revision>=0),
 orientation smallint not null default 1 check(orientation in (-1,1)),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,owner_id)
);
create table public.consist_members (
 consist_id uuid not null,
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 stock_item_id uuid not null,
 ordinal integer not null check(ordinal>=0),
 orientation smallint not null default 1 check(orientation in (-1,1)),
 primary key(consist_id,stock_item_id),
 unique(consist_id,ordinal),unique(stock_item_id),
 foreign key(consist_id,owner_id) references public.consists(id,owner_id) on delete cascade,
 foreign key(stock_item_id,owner_id) references public.stock_items(id,owner_id) on delete restrict
);
create table public.layouts (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 160),
 topology_hash text not null check(length(topology_hash) between 32 and 128),
 schema_version integer not null default 1 check(schema_version>0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(id,owner_id)
);
create table public.layout_segments (
 layout_id uuid not null references public.layouts(id) on delete cascade,
 edge_id text not null check(length(edge_id) between 1 and 120),
 length_mm numeric(12,3) not null check(length_mm>0),
 metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
 primary key(layout_id,edge_id)
);
create table public.layout_placements (
 consist_id uuid primary key,
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 layout_id uuid not null, edge_id text not null,
 s_mm numeric(12,3) not null check(s_mm>=0),
 heading smallint not null check(heading in (-1,1)),
 journey_state jsonb not null default '{}'::jsonb check(jsonb_typeof(journey_state)='object'),
 state_version bigint not null default 0 check(state_version>=0),
 updated_at timestamptz not null default now(),
 foreign key(consist_id,owner_id) references public.consists(id,owner_id) on delete cascade,
 foreign key(layout_id,owner_id) references public.layouts(id,owner_id) on delete cascade,
 foreign key(layout_id,edge_id) references public.layout_segments(layout_id,edge_id) on delete restrict
);
create table public.loose_stock_placements (
 stock_item_id uuid primary key,
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 layout_id uuid not null,edge_id text not null,
 s_mm numeric(12,3) not null check(s_mm>=0),
 heading smallint not null check(heading in (-1,1)),
 updated_at timestamptz not null default now(),
 foreign key(stock_item_id,owner_id) references public.stock_items(id,owner_id) on delete cascade,
 foreign key(layout_id,owner_id) references public.layouts(id,owner_id) on delete cascade,
 foreign key(layout_id,edge_id) references public.layout_segments(layout_id,edge_id) on delete restrict
);
create table public.layout_snapshots (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 layout_id uuid not null,
 revision bigint not null check(revision>=0),
 snapshot_schema integer not null default 1 check(snapshot_schema>0),
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 saved_at timestamptz not null default now(),
 unique(layout_id,revision),
 foreign key(layout_id,owner_id) references public.layouts(id,owner_id) on delete cascade
);
create table public.operation_receipts (
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 request_id uuid not null,
 op_type text not null check(length(op_type) between 1 and 120),
 payload_digest text not null check(payload_digest ~ '^[0-9a-f]{64}$'),
 result jsonb not null default '{}'::jsonb check(jsonb_typeof(result)='object'),
 created_at timestamptz not null default now(),
 primary key(owner_id,request_id)
);
create index stock_items_owner_idx on public.stock_items(owner_id);
create index stock_items_model_idx on public.stock_items(model_id);
create index consists_owner_idx on public.consists(owner_id);
create index consist_members_owner_idx on public.consist_members(owner_id);
create index consist_members_stock_owner_idx on public.consist_members(stock_item_id,owner_id);
create index layouts_owner_idx on public.layouts(owner_id);
create index layout_placements_layout_owner_idx on public.layout_placements(layout_id,owner_id);
create index loose_stock_layout_owner_idx on public.loose_stock_placements(layout_id,owner_id);
create index layout_snapshots_recent_idx on public.layout_snapshots(layout_id,saved_at desc);
create index operation_receipts_recent_idx on public.operation_receipts(owner_id,created_at desc);
create schema if not exists serien_internal;
revoke all on schema serien_internal from public,anon,authenticated;
create function serien_internal.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now();return new;end; $$;
create trigger stock_models_touch before update on public.stock_models for each row execute function serien_internal.touch_updated_at();
create trigger stock_items_touch before update on public.stock_items for each row execute function serien_internal.touch_updated_at();
create trigger consists_touch before update on public.consists for each row execute function serien_internal.touch_updated_at();
create trigger layouts_touch before update on public.layouts for each row execute function serien_internal.touch_updated_at();
create trigger layout_placements_touch before update on public.layout_placements for each row execute function serien_internal.touch_updated_at();
create trigger loose_stock_touch before update on public.loose_stock_placements for each row execute function serien_internal.touch_updated_at();
