-- =====================================================================
-- FenuaMatch — 02 : notifications, journal admin, fiches prestataires, recherche
-- =====================================================================

-- ---------------------------------------------------------------------
-- Notifications intégrées
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link_path text check (link_path is null or link_path ~ '^/[A-Za-z0-9/_?=&.-]*$'),
  ref_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create or replace function private.notify(
  p_user_id uuid, p_type text, p_title text, p_body text, p_link text, p_ref uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.notifications (user_id, type, title, body, link_path, ref_id)
  values (p_user_id, p_type, p_title, left(p_body, 300), p_link, p_ref);
end;
$$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
     set read_at = now()
   where user_id = auth.uid()
     and read_at is null
     and (p_ids is null or id = any (p_ids));
$$;

-- ---------------------------------------------------------------------
-- Journal d'administration et historique des états
-- ---------------------------------------------------------------------
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  reason text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

create or replace function private.audit(
  p_action text, p_target_type text, p_target_id text, p_reason text default null, p_details jsonb default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log (admin_id, action, target_type, target_id, reason, details)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_reason, p_details);
$$;

create table public.status_history (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id uuid not null,
  from_status text,
  to_status text not null,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index status_history_entity_idx on public.status_history (entity_type, entity_id, created_at);

create or replace function private.log_status(p_type text, p_id uuid, p_from text, p_to text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.status_history (entity_type, entity_id, from_status, to_status, actor_id)
  values (p_type, p_id, p_from, p_to, auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Fiches prestataires
-- ---------------------------------------------------------------------
create type public.availability as enum ('available', 'busy', 'unavailable');

create table public.provider_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  public_name text not null check (char_length(trim(public_name)) between 2 and 60),
  description text not null check (char_length(trim(description)) between 1 and 3000),
  main_trade_id integer not null references public.trades (id),
  commune_id smallint not null references public.communes (id),
  availability public.availability not null default 'available',
  phone text check (phone is null or phone ~ '^[0-9+ .-]{6,20}$'),
  opening_hours text check (opening_hours is null or char_length(opening_hours) <= 300),
  service_area text check (service_area is null or char_length(service_area) <= 300),
  extra_info text check (extra_info is null or char_length(extra_info) <= 1000),
  is_published boolean not null default false,
  is_hidden boolean not null default false,
  hidden_reason text,
  search_document tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index provider_profiles_search_idx on public.provider_profiles using gin (search_document);
create index provider_profiles_trade_idx on public.provider_profiles (main_trade_id);
create index provider_profiles_commune_idx on public.provider_profiles (commune_id);
create index provider_profiles_name_trgm_idx on public.provider_profiles
  using gin (public_name extensions.gin_trgm_ops);

-- Métiers secondaires
create table public.provider_trades (
  provider_id uuid not null references public.provider_profiles (id) on delete cascade,
  trade_id integer not null references public.trades (id),
  created_at timestamptz not null default now(),
  primary key (provider_id, trade_id)
);
create index provider_trades_trade_idx on public.provider_trades (trade_id);

-- Galerie de réalisations
create table public.provider_photos (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles (id) on delete cascade,
  storage_path text not null,
  caption text check (caption is null or char_length(caption) <= 140),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint provider_photos_path check (storage_path like (provider_id::text || '/%'))
);
create index provider_photos_provider_idx on public.provider_photos (provider_id, position);

-- Limite de galerie : 10 en gratuit (20 prévu en Premium V2).
create or replace function private.gallery_limit(p_provider_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select 10;
$$;

create or replace function private.check_gallery_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.provider_profiles where id = new.provider_id for update;
  if (select count(*) from public.provider_photos where provider_id = new.provider_id)
     >= private.gallery_limit(new.provider_id) then
    raise exception 'Limite atteinte : % photos maximum dans la galerie.', private.gallery_limit(new.provider_id)
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger provider_photos_limit before insert on public.provider_photos
  for each row execute function private.check_gallery_limit();

create or replace function private.check_secondary_trades_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.provider_trades where provider_id = new.provider_id) >= 10 then
    raise exception 'Vous pouvez indiquer 10 métiers secondaires au maximum.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger provider_trades_limit before insert on public.provider_trades
  for each row execute function private.check_secondary_trades_limit();

-- Contrôles avant enregistrement d'une fiche : compte prestataire, majorité, conditions de publication.
create or replace function private.provider_profile_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_adult timestamptz;
begin
  select * into v_profile from public.profiles where id = new.id;
  if tg_op = 'INSERT' then
    if v_profile.account_type <> 'provider' then
      raise exception 'Seuls les comptes prestataires peuvent créer une fiche.' using errcode = '42501';
    end if;
    select adult_confirmed_at into v_adult from public.profile_private where user_id = new.id;
    if v_adult is null then
      raise exception 'Vous devez confirmer être majeur pour proposer des prestations.' using errcode = '42501';
    end if;
  end if;
  if new.is_published and v_profile.avatar_path is null then
    raise exception 'Ajoutez une photo de profil avant de publier votre fiche.' using errcode = '23514';
  end if;
  new.public_name := trim(new.public_name);
  new.description := trim(new.description);
  return new;
end;
$$;
create trigger provider_profiles_guard before insert or update on public.provider_profiles
  for each row execute function private.provider_profile_guard();
create trigger provider_profiles_updated_at before update on public.provider_profiles
  for each row execute function private.set_updated_at();

-- Document de recherche plein texte (nom, métiers, catégories, description).
create or replace function private.provider_search_document(p_id uuid, p_name text, p_description text, p_main_trade integer)
returns tsvector
language sql
stable
security definer
set search_path = ''
as $$
  with trades as (
    select t.name, t.keywords, c.name as category_name
    from public.trades t
    join public.categories c on c.id = t.category_id
    where t.id = p_main_trade
       or t.id in (select trade_id from public.provider_trades where provider_id = p_id)
  )
  select
      setweight(to_tsvector('french', private.normalize_text(p_name)), 'A')
   || setweight(to_tsvector('french', private.normalize_text(coalesce((select string_agg(name || ' ' || coalesce(keywords, ''), ' ') from trades), ''))), 'A')
   || setweight(to_tsvector('french', private.normalize_text(coalesce((select string_agg(category_name, ' ') from trades), ''))), 'B')
   || setweight(to_tsvector('french', private.normalize_text(p_description)), 'C');
$$;

create or replace function private.provider_search_refresh()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.search_document := private.provider_search_document(new.id, new.public_name, new.description, new.main_trade_id);
  return new;
end;
$$;
create trigger provider_profiles_search before insert or update of public_name, description, main_trade_id, updated_at
  on public.provider_profiles
  for each row execute function private.provider_search_refresh();

create or replace function private.provider_trades_touch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.provider_profiles set updated_at = now()
   where id = coalesce(new.provider_id, old.provider_id);
  return null;
end;
$$;
create trigger provider_trades_touch after insert or delete on public.provider_trades
  for each row execute function private.provider_trades_touch();

-- Une fiche est visible si elle est publiée, non masquée et que le compte est actif.
create or replace function private.provider_is_visible(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.provider_profiles pp
    join public.profiles p on p.id = pp.id
    where pp.id = p_id
      and pp.is_published and not pp.is_hidden
      and p.status = 'active' and not p.is_hidden and not p.hidden_for_inactivity
  );
$$;

-- ---------------------------------------------------------------------
-- Recherche des prestataires (RLS appliquée : utilisateurs connectés uniquement)
-- ---------------------------------------------------------------------
create or replace function public.search_providers(
  p_query text default null,
  p_category_id integer default null,
  p_trade_id integer default null,
  p_commune_id smallint default null,
  p_availability public.availability default null,
  p_limit integer default 20,
  p_offset integer default 0)
returns table (
  id uuid,
  public_name text,
  username text,
  avatar_path text,
  main_trade_id integer,
  main_trade_name text,
  commune_id smallint,
  commune_name text,
  availability public.availability,
  excerpt text,
  is_demo boolean,
  score real,
  total_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select
      nullif(trim(private.normalize_text(p_query)), '') as norm,
      (select to_tsquery('french', string_agg(w || ':*', ' & '))
         from regexp_split_to_table(private.normalize_text(p_query), '[^a-z0-9]+') as w
        where length(w) > 1) as tsq
  ),
  base as (
    select pp.*, p.username::text as username, p.avatar_path, p.is_demo,
      (select count(*) from public.provider_photos ph where ph.provider_id = pp.id) as photo_count
    from public.provider_profiles pp
    join public.profiles p on p.id = pp.id
    cross join params
    where pp.is_published and not pp.is_hidden
      and p.status = 'active' and not p.is_hidden and not p.hidden_for_inactivity
      and (p_commune_id is null or pp.commune_id = p_commune_id)
      and (p_availability is null or pp.availability = p_availability)
      and (p_trade_id is null or pp.main_trade_id = p_trade_id
           or exists (select 1 from public.provider_trades x where x.provider_id = pp.id and x.trade_id = p_trade_id))
      and (p_category_id is null
           or exists (select 1 from public.trades t where t.id = pp.main_trade_id and t.category_id = p_category_id)
           or exists (select 1 from public.provider_trades x join public.trades t on t.id = x.trade_id
                      where x.provider_id = pp.id and t.category_id = p_category_id))
      and (params.norm is null
           or (params.tsq is not null and pp.search_document @@ params.tsq)
           or private.normalize_text(pp.public_name) like '%' || params.norm || '%')
  ),
  scored as (
    select b.*,
      (case when params.tsq is not null then ts_rank(b.search_document, params.tsq) * 4 else 0 end
       + case when p_trade_id is not null and b.main_trade_id = p_trade_id then 1 else 0 end
       + case b.availability when 'available' then 0.6 when 'busy' then 0.2 else 0 end
       + least(b.photo_count, 5) * 0.06
       + case when char_length(b.description) >= 120 then 0.2 else 0 end
       + case when b.phone is not null or b.opening_hours is not null then 0.1 else 0 end
      )::real as score
    from base b cross join params
  )
  select s.id, s.public_name, s.username, s.avatar_path, s.main_trade_id, t.name, s.commune_id, c.name,
         s.availability, left(s.description, 160), s.is_demo, s.score, count(*) over ()
  from scored s
  join public.trades t on t.id = s.main_trade_id
  join public.communes c on c.id = s.commune_id
  order by s.score desc, s.updated_at desc, s.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
