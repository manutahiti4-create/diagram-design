-- =====================================================================
-- FenuaMatch — 03 : annonces, propositions, missions
-- =====================================================================

create type public.listing_status as enum (
  'draft', 'published', 'in_discussion', 'awaiting_confirmation',
  'assigned', 'completed', 'expired', 'cancelled');
create type public.date_mode as enum ('asap', 'precise', 'flexible');
create type public.proposal_status as enum (
  'pending', 'selected', 'accepted', 'declined', 'withdrawn', 'not_selected', 'cancelled');
create type public.mission_status as enum (
  'awaiting_provider', 'confirmed', 'completed', 'declined', 'cancelled');

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 5 and 120),
  description text not null check (char_length(trim(description)) between 10 and 4000),
  commune_id smallint not null references public.communes (id),
  budget_xpf integer check (budget_xpf is null or budget_xpf between 0 and 100000000),
  date_mode public.date_mode not null default 'flexible',
  desired_date date,
  status public.listing_status not null default 'draft',
  published_at timestamptz,
  expires_at timestamptz,
  edit_count smallint not null default 0 check (edit_count between 0 and 3),
  renewal_count integer not null default 0,
  is_hidden boolean not null default false,
  hidden_reason text,
  is_demo boolean not null default false,
  search_document tsvector generated always as (
    to_tsvector('french', private.normalize_text(title) || ' ' || private.normalize_text(description))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint listings_date check (date_mode <> 'precise' or desired_date is not null)
);
create index listings_feed_idx on public.listings (status, expires_at desc) where not is_hidden;
create index listings_client_idx on public.listings (client_id, created_at desc);
create index listings_commune_idx on public.listings (commune_id);
create index listings_search_idx on public.listings using gin (search_document);
create trigger listings_updated_at before update on public.listings
  for each row execute function private.set_updated_at();

create table public.listing_categories (
  listing_id uuid not null references public.listings (id) on delete cascade,
  category_id integer not null references public.categories (id),
  primary key (listing_id, category_id)
);
create index listing_categories_category_idx on public.listing_categories (category_id);

create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index listing_photos_listing_idx on public.listing_photos (listing_id, position);

create table public.listing_revisions (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings (id) on delete cascade,
  editor_id uuid references public.profiles (id) on delete set null,
  previous jsonb not null,
  created_at timestamptz not null default now()
);
create index listing_revisions_listing_idx on public.listing_revisions (listing_id, created_at);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  provider_id uuid references public.profiles (id) on delete set null,
  message text not null check (char_length(trim(message)) between 1 and 2000),
  price_xpf integer check (price_xpf is null or price_xpf between 0 and 100000000),
  status public.proposal_status not null default 'pending',
  listing_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, provider_id)
);
create index proposals_provider_idx on public.proposals (provider_id, created_at desc);
create trigger proposals_updated_at before update on public.proposals
  for each row execute function private.set_updated_at();

-- Missions : une ligne par attribution (le modèle permet plusieurs prestataires en V2).
create table public.missions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  client_id uuid references public.profiles (id) on delete set null,
  provider_id uuid references public.profiles (id) on delete set null,
  status public.mission_status not null default 'awaiting_provider',
  selected_at timestamptz not null default now(),
  confirmed_at timestamptz,
  completed_at timestamptz,
  closed_at timestamptz,
  closed_by uuid references public.profiles (id) on delete set null,
  close_reason text check (close_reason is null or char_length(close_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Règle V1 : une seule attribution active par annonce (protège contre les doubles clics simultanés).
create unique index missions_one_active_per_listing on public.missions (listing_id)
  where status in ('awaiting_provider', 'confirmed');
create index missions_client_idx on public.missions (client_id, created_at desc);
create index missions_provider_idx on public.missions (provider_id, created_at desc);
create trigger missions_updated_at before update on public.missions
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function private.listing_is_open(p_listing public.listings)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_listing.status in ('published', 'in_discussion')
     and p_listing.expires_at > now()
     and not p_listing.is_hidden;
$$;

-- État "ouvert" à rétablir après un refus ou une annulation.
create or replace function private.reopen_status(p_listing_id uuid)
returns public.listing_status
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when l.expires_at <= now() then 'expired'::public.listing_status
    when exists (select 1 from public.proposals p where p.listing_id = l.id and p.status = 'pending')
      then 'in_discussion'::public.listing_status
    else 'published'::public.listing_status
  end
  from public.listings l where l.id = p_listing_id;
$$;

create or replace function private.set_listing_status(p_listing_id uuid, p_status public.listing_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old public.listing_status;
begin
  select status into v_old from public.listings where id = p_listing_id;
  if v_old is distinct from p_status then
    update public.listings set status = p_status where id = p_listing_id;
    perform private.log_status('listing', p_listing_id, v_old::text, p_status::text);
  end if;
end;
$$;

create or replace function private.validate_categories(p_category_ids integer[])
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_category_ids is null or cardinality(p_category_ids) = 0 then
    raise exception 'Choisissez au moins une catégorie.' using errcode = '23514';
  end if;
  if exists (
    select 1 from unnest(p_category_ids) as x(id)
    where not exists (select 1 from public.categories c where c.id = x.id and c.is_active)) then
    raise exception 'Catégorie invalide.' using errcode = '23514';
  end if;
end;
$$;

create or replace function private.validate_listing_fields(
  p_title text, p_description text, p_commune_id smallint, p_budget integer,
  p_date_mode public.date_mode, p_desired_date date)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if char_length(trim(coalesce(p_title, ''))) < 5 then
    raise exception 'Le titre doit contenir au moins 5 caractères.' using errcode = '23514';
  end if;
  if char_length(trim(coalesce(p_description, ''))) < 10 then
    raise exception 'La description doit contenir au moins 10 caractères.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.communes c where c.id = p_commune_id and c.is_active) then
    raise exception 'Commune invalide.' using errcode = '23514';
  end if;
  if p_budget is not null and p_budget < 0 then
    raise exception 'Budget invalide.' using errcode = '23514';
  end if;
  if p_date_mode = 'precise' and (p_desired_date is null or p_desired_date < (now() at time zone 'Pacific/Tahiti')::date) then
    raise exception 'Choisissez une date à venir.' using errcode = '23514';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Annonces : création, publication, modification, renouvellement, annulation
-- ---------------------------------------------------------------------
create or replace function public.create_listing(
  p_title text,
  p_description text,
  p_commune_id smallint,
  p_category_ids integer[],
  p_budget_xpf integer default null,
  p_date_mode public.date_mode default 'flexible',
  p_desired_date date default null,
  p_publish boolean default true)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_active_user();
  v_id uuid;
begin
  if v_profile.account_type <> 'client' then
    raise exception 'Seuls les comptes clients peuvent publier une annonce.' using errcode = '42501';
  end if;
  if (select adult_confirmed_at from public.profile_private where user_id = v_profile.id) is null then
    raise exception 'Vous devez confirmer être majeur pour publier une annonce.' using errcode = '42501';
  end if;
  perform private.enforce_rate_limit('listing_create', 10, interval '1 day');
  perform private.validate_listing_fields(p_title, p_description, p_commune_id, p_budget_xpf, p_date_mode, p_desired_date);
  perform private.validate_categories(p_category_ids);

  insert into public.listings (client_id, title, description, commune_id, budget_xpf, date_mode, desired_date,
                               status, published_at, expires_at)
  values (v_profile.id, trim(p_title), trim(p_description), p_commune_id, p_budget_xpf, p_date_mode,
          case when p_date_mode = 'precise' then p_desired_date end,
          case when p_publish then 'published'::public.listing_status else 'draft'::public.listing_status end,
          case when p_publish then now() end,
          case when p_publish then now() + interval '30 days' end)
  returning id into v_id;

  insert into public.listing_categories (listing_id, category_id)
  select v_id, x from (select distinct unnest(p_category_ids) as x) s;

  perform private.log_status('listing', v_id, null, case when p_publish then 'published' else 'draft' end);
  return v_id;
end;
$$;

create or replace function public.publish_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_active_user();
  v_listing public.listings;
begin
  select * into v_listing from public.listings where id = p_listing_id and client_id = v_profile.id for update;
  if not found then
    raise exception 'Annonce introuvable.' using errcode = 'P0002';
  end if;
  if v_listing.status <> 'draft' then
    raise exception 'Cette annonce est déjà publiée.' using errcode = '22023';
  end if;
  update public.listings
     set status = 'published', published_at = now(), expires_at = now() + interval '30 days'
   where id = p_listing_id;
  perform private.log_status('listing', p_listing_id, 'draft', 'published');
end;
$$;

create or replace function public.update_listing(
  p_listing_id uuid,
  p_title text,
  p_description text,
  p_commune_id smallint,
  p_category_ids integer[],
  p_budget_xpf integer default null,
  p_date_mode public.date_mode default 'flexible',
  p_desired_date date default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_active_user();
  v_listing public.listings;
  v_prev_categories integer[];
  v_changed boolean;
  v_proposal record;
begin
  select * into v_listing from public.listings where id = p_listing_id and client_id = v_profile.id for update;
  if not found then
    raise exception 'Annonce introuvable.' using errcode = 'P0002';
  end if;
  if v_listing.status not in ('draft', 'published', 'in_discussion', 'expired') then
    raise exception 'Cette annonce ne peut plus être modifiée (mission engagée ou annonce clôturée).' using errcode = '42501';
  end if;
  if v_listing.status <> 'draft' and v_listing.edit_count >= 3 then
    raise exception 'Vous avez atteint la limite de 3 modifications pour cette annonce.' using errcode = '42501';
  end if;
  perform private.validate_listing_fields(p_title, p_description, p_commune_id, p_budget_xpf, p_date_mode, p_desired_date);
  perform private.validate_categories(p_category_ids);

  select coalesce(array_agg(category_id order by category_id), '{}') into v_prev_categories
  from public.listing_categories where listing_id = p_listing_id;

  v_changed := trim(p_title) is distinct from v_listing.title
    or trim(p_description) is distinct from v_listing.description
    or p_commune_id is distinct from v_listing.commune_id
    or p_budget_xpf is distinct from v_listing.budget_xpf
    or p_date_mode is distinct from v_listing.date_mode
    or (case when p_date_mode = 'precise' then p_desired_date end) is distinct from v_listing.desired_date
    or (select array_agg(distinct x order by x) from unnest(p_category_ids) x) is distinct from v_prev_categories;

  if not v_changed then
    return;
  end if;

  insert into public.listing_revisions (listing_id, editor_id, previous)
  values (p_listing_id, v_profile.id, jsonb_build_object(
    'title', v_listing.title, 'description', v_listing.description, 'commune_id', v_listing.commune_id,
    'budget_xpf', v_listing.budget_xpf, 'date_mode', v_listing.date_mode,
    'desired_date', v_listing.desired_date, 'category_ids', to_jsonb(v_prev_categories)));

  update public.listings
     set title = trim(p_title),
         description = trim(p_description),
         commune_id = p_commune_id,
         budget_xpf = p_budget_xpf,
         date_mode = p_date_mode,
         desired_date = case when p_date_mode = 'precise' then p_desired_date end,
         edit_count = case when status = 'draft' then edit_count else edit_count + 1 end
   where id = p_listing_id;

  delete from public.listing_categories where listing_id = p_listing_id;
  insert into public.listing_categories (listing_id, category_id)
  select p_listing_id, x from (select distinct unnest(p_category_ids) as x) s;

  -- Prévenir les prestataires ayant déjà répondu.
  for v_proposal in
    select id, provider_id from public.proposals where listing_id = p_listing_id and status = 'pending'
  loop
    update public.proposals set listing_changed_at = now() where id = v_proposal.id;
    perform private.notify(v_proposal.provider_id, 'listing_updated', 'Annonce modifiée',
      'Le client a modifié l''annonce « ' || trim(p_title) || ' ». Vous pouvez maintenir ou retirer votre proposition.',
      '/annonces/' || p_listing_id, p_listing_id);
  end loop;
end;
$$;

create or replace function public.renew_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_active_user();
  v_listing public.listings;
  v_new public.listing_status;
begin
  select * into v_listing from public.listings where id = p_listing_id and client_id = v_profile.id for update;
  if not found then
    raise exception 'Annonce introuvable.' using errcode = 'P0002';
  end if;
  if not (v_listing.status = 'expired'
          or (v_listing.status in ('published', 'in_discussion') and v_listing.expires_at < now() + interval '3 days')) then
    raise exception 'Cette annonce ne peut pas être renouvelée pour le moment.' using errcode = '22023';
  end if;
  update public.listings
     set expires_at = now() + interval '30 days', renewal_count = renewal_count + 1
   where id = p_listing_id;
  v_new := private.reopen_status(p_listing_id);
  perform private.set_listing_status(p_listing_id, v_new);
end;
$$;

create or replace function public.cancel_listing(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_active_user();
  v_listing public.listings;
  v_p record;
begin
  select * into v_listing from public.listings where id = p_listing_id and client_id = v_profile.id for update;
  if not found then
    raise exception 'Annonce introuvable.' using errcode = 'P0002';
  end if;
  if v_listing.status in ('completed', 'cancelled') then
    raise exception 'Cette annonce est déjà clôturée.' using errcode = '22023';
  end if;
  if exists (select 1 from public.missions where listing_id = p_listing_id and status in ('awaiting_provider', 'confirmed')) then
    raise exception 'Annulez d''abord la mission en cours depuis la page de l''annonce.' using errcode = '42501';
  end if;
  for v_p in select id, provider_id from public.proposals where listing_id = p_listing_id and status = 'pending' loop
    update public.proposals set status = 'cancelled' where id = v_p.id;
    perform private.notify(v_p.provider_id, 'listing_cancelled', 'Annonce annulée',
      'Le client a annulé l''annonce « ' || v_listing.title || ' ».', '/annonces/' || p_listing_id, p_listing_id);
  end loop;
  perform private.set_listing_status(p_listing_id, 'cancelled');
end;
$$;

-- ---------------------------------------------------------------------
-- Propositions des prestataires
-- ---------------------------------------------------------------------
create or replace function public.submit_proposal(p_listing_id uuid, p_message text, p_price_xpf integer default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_active_user();
  v_listing public.listings;
  v_id uuid;
  v_existing public.proposals;
  v_conversation uuid;
  v_name text;
begin
  if v_profile.account_type <> 'provider' then
    raise exception 'Seuls les prestataires peuvent répondre aux annonces.' using errcode = '42501';
  end if;
  if not private.provider_is_visible(v_profile.id) then
    raise exception 'Publiez d''abord votre fiche prestataire pour pouvoir répondre.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_message, ''))) = 0 then
    raise exception 'Écrivez un message pour accompagner votre proposition.' using errcode = '23514';
  end if;
  if p_price_xpf is not null and p_price_xpf < 0 then
    raise exception 'Prix invalide.' using errcode = '23514';
  end if;

  select * into v_listing from public.listings where id = p_listing_id for update;
  if not found or v_listing.is_hidden then
    raise exception 'Annonce introuvable.' using errcode = 'P0002';
  end if;
  if v_listing.client_id = v_profile.id then
    raise exception 'Vous ne pouvez pas répondre à votre propre annonce.' using errcode = '42501';
  end if;
  if not private.listing_is_open(v_listing) then
    raise exception 'Cette annonce n''accepte plus de nouvelles propositions.' using errcode = '42501';
  end if;
  perform private.enforce_rate_limit('proposal', 30, interval '1 day');

  select * into v_existing from public.proposals where listing_id = p_listing_id and provider_id = v_profile.id;
  if found then
    if v_existing.status not in ('withdrawn') then
      raise exception 'Vous avez déjà répondu à cette annonce.' using errcode = '23505';
    end if;
    update public.proposals
       set message = trim(p_message), price_xpf = p_price_xpf, status = 'pending', listing_changed_at = null
     where id = v_existing.id
     returning id into v_id;
  else
    insert into public.proposals (listing_id, provider_id, message, price_xpf)
    values (p_listing_id, v_profile.id, trim(p_message), p_price_xpf)
    returning id into v_id;
  end if;
  perform private.log_status('proposal', v_id, null, 'pending');

  if v_listing.status = 'published' then
    perform private.set_listing_status(p_listing_id, 'in_discussion');
  end if;

  -- Une conversation est ouverte entre le client et le prestataire.
  v_conversation := private.ensure_conversation(v_listing.client_id, v_profile.id, p_listing_id);
  select public_name into v_name from public.provider_profiles where id = v_profile.id;
  insert into public.messages (conversation_id, sender_id, kind, body)
  values (v_conversation, v_profile.id, 'system',
          'Proposition envoyée pour « ' || v_listing.title || ' »'
          || case when p_price_xpf is not null then ' — prix indicatif : ' || to_char(p_price_xpf, 'FM999G999G999') || ' F CFP' else '' end
          || E'\n\n' || trim(p_message));

  perform private.notify(v_listing.client_id, 'proposal_received', 'Nouvelle proposition',
    coalesce(v_name, v_profile.username::text) || ' a répondu à votre annonce « ' || v_listing.title || ' ».',
    '/annonces/' || p_listing_id, v_id);
  return v_id;
end;
$$;

create or replace function public.withdraw_proposal(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_active_user();
  v_p public.proposals;
  v_listing public.listings;
begin
  select * into v_p from public.proposals where id = p_proposal_id and provider_id = v_profile.id;
  if not found then
    raise exception 'Proposition introuvable.' using errcode = 'P0002';
  end if;
  select * into v_listing from public.listings where id = v_p.listing_id for update;
  select * into v_p from public.proposals where id = p_proposal_id for update;
  if v_p.status <> 'pending' then
    raise exception 'Cette proposition ne peut plus être retirée ici. Si le client vous a choisi, refusez ou annulez la mission.' using errcode = '22023';
  end if;
  update public.proposals set status = 'withdrawn' where id = p_proposal_id;
  perform private.log_status('proposal', p_proposal_id, 'pending', 'withdrawn');
  if v_listing.status = 'in_discussion' then
    perform private.set_listing_status(v_listing.id, private.reopen_status(v_listing.id));
  end if;
  perform private.notify(v_listing.client_id, 'proposal_withdrawn', 'Proposition retirée',
    'Un prestataire a retiré sa proposition pour « ' || v_listing.title || ' ».', '/annonces/' || v_listing.id, p_proposal_id);
end;
$$;

create or replace function public.decline_proposal(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_active_user();
  v_p public.proposals;
  v_listing public.listings;
begin
  select * into v_p from public.proposals where id = p_proposal_id;
  if not found then
    raise exception 'Proposition introuvable.' using errcode = 'P0002';
  end if;
  select * into v_listing from public.listings where id = v_p.listing_id and client_id = v_profile.id for update;
  if not found then
    raise exception 'Proposition introuvable.' using errcode = 'P0002';
  end if;
  select * into v_p from public.proposals where id = p_proposal_id for update;
  if v_p.status <> 'pending' then
    raise exception 'Cette proposition a déjà été traitée.' using errcode = '22023';
  end if;
  update public.proposals set status = 'declined' where id = p_proposal_id;
  perform private.log_status('proposal', p_proposal_id, 'pending', 'declined');
  if v_listing.status = 'in_discussion' then
    perform private.set_listing_status(v_listing.id, private.reopen_status(v_listing.id));
  end if;
  perform private.notify(v_p.provider_id, 'proposal_declined', 'Proposition non retenue',
    'Le client n''a pas retenu votre proposition pour « ' || v_listing.title || ' ».', '/annonces/' || v_listing.id, p_proposal_id);
end;
$$;

-- Étape 1 : le client choisit une proposition (mission en attente de confirmation du prestataire).
create or replace function public.select_proposal(p_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_active_user();
  v_p public.proposals;
  v_listing public.listings;
  v_mission uuid;
begin
  select * into v_p from public.proposals where id = p_proposal_id;
  if not found then
    raise exception 'Proposition introuvable.' using errcode = 'P0002';
  end if;
  -- Verrou sur l'annonce : sérialise les clics simultanés.
  select * into v_listing from public.listings where id = v_p.listing_id and client_id = v_profile.id for update;
  if not found then
    raise exception 'Proposition introuvable.' using errcode = 'P0002';
  end if;
  select * into v_p from public.proposals where id = p_proposal_id for update;
  if not private.listing_is_open(v_listing) then
    raise exception 'Cette annonce n''est plus ouverte (expirée, attribuée ou clôturée).' using errcode = '42501';
  end if;
  if v_p.status <> 'pending' then
    raise exception 'Cette proposition n''est plus disponible.' using errcode = '22023';
  end if;
  if v_p.provider_id is null or not private.provider_is_visible(v_p.provider_id) then
    raise exception 'Ce prestataire n''est plus disponible sur FenuaMatch.' using errcode = '42501';
  end if;

  insert into public.missions (listing_id, proposal_id, client_id, provider_id)
  values (v_listing.id, v_p.id, v_listing.client_id, v_p.provider_id)
  returning id into v_mission;

  update public.proposals set status = 'selected' where id = v_p.id;
  perform private.log_status('proposal', v_p.id, 'pending', 'selected');
  perform private.log_status('mission', v_mission, null, 'awaiting_provider');
  perform private.set_listing_status(v_listing.id, 'awaiting_confirmation');

  perform private.notify(v_p.provider_id, 'proposal_selected', 'Votre proposition a été choisie',
    'Le client vous a choisi pour « ' || v_listing.title || ' ». Confirmez la mission pour la valider.',
    '/annonces/' || v_listing.id, v_mission);
  return v_mission;
end;
$$;

-- Étape 2 : le prestataire confirme → mission attribuée.
create or replace function public.confirm_mission(p_mission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_active_user();
  v_m public.missions;
  v_listing public.listings;
  v_other record;
begin
  select * into v_m from public.missions where id = p_mission_id and provider_id = v_profile.id;
  if not found then
    raise exception 'Mission introuvable.' using errcode = 'P0002';
  end if;
  select * into v_listing from public.listings where id = v_m.listing_id for update;
  select * into v_m from public.missions where id = p_mission_id for update;
  if v_m.status <> 'awaiting_provider' then
    raise exception 'Cette mission n''est plus en attente de confirmation.' using errcode = '22023';
  end if;

  update public.missions set status = 'confirmed', confirmed_at = now() where id = p_mission_id;
  update public.proposals set status = 'accepted' where id = v_m.proposal_id;
  perform private.log_status('mission', p_mission_id, 'awaiting_provider', 'confirmed');
  perform private.log_status('proposal', v_m.proposal_id, 'selected', 'accepted');
  perform private.set_listing_status(v_listing.id, 'assigned');

  -- Les autres propositions sont conservées mais marquées « non retenues ».
  for v_other in
    select id, provider_id from public.proposals
    where listing_id = v_listing.id and status = 'pending'
  loop
    update public.proposals set status = 'not_selected' where id = v_other.id;
    perform private.notify(v_other.provider_id, 'proposal_not_selected', 'Annonce attribuée',
      'Le client a choisi un autre prestataire pour « ' || v_listing.title || ' ».', '/annonces/' || v_listing.id, v_other.id);
  end loop;

  perform private.notify(v_listing.client_id, 'mission_confirmed', 'Mission confirmée',
    'Le prestataire a confirmé la mission « ' || v_listing.title || ' ».', '/annonces/' || v_listing.id, p_mission_id);
end;
$$;

-- Le prestataire refuse la mission proposée.
create or replace function public.decline_mission(p_mission_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_active_user();
  v_m public.missions;
  v_listing public.listings;
begin
  select * into v_m from public.missions where id = p_mission_id and provider_id = v_profile.id;
  if not found then
    raise exception 'Mission introuvable.' using errcode = 'P0002';
  end if;
  select * into v_listing from public.listings where id = v_m.listing_id for update;
  select * into v_m from public.missions where id = p_mission_id for update;
  if v_m.status <> 'awaiting_provider' then
    raise exception 'Cette mission n''est plus en attente de confirmation.' using errcode = '22023';
  end if;
  update public.missions
     set status = 'declined', closed_at = now(), closed_by = v_profile.id, close_reason = left(p_reason, 500)
   where id = p_mission_id;
  update public.proposals set status = 'declined' where id = v_m.proposal_id;
  perform private.log_status('mission', p_mission_id, 'awaiting_provider', 'declined');
  perform private.set_listing_status(v_listing.id, private.reopen_status(v_listing.id));
  perform private.notify(v_listing.client_id, 'mission_declined', 'Mission refusée',
    'Le prestataire ne peut pas réaliser « ' || v_listing.title || ' ». Votre annonce est de nouveau ouverte.',
    '/annonces/' || v_listing.id, p_mission_id);
end;
$$;

-- Annulation par l'une des deux parties (avant ou après confirmation).
create or replace function public.cancel_mission(p_mission_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_active_user();
  v_m public.missions;
  v_listing public.listings;
  v_other uuid;
begin
  select * into v_m from public.missions
   where id = p_mission_id and (client_id = v_profile.id or provider_id = v_profile.id);
  if not found then
    raise exception 'Mission introuvable.' using errcode = 'P0002';
  end if;
  select * into v_listing from public.listings where id = v_m.listing_id for update;
  select * into v_m from public.missions where id = p_mission_id for update;
  if v_m.status not in ('awaiting_provider', 'confirmed') then
    raise exception 'Cette mission ne peut plus être annulée.' using errcode = '22023';
  end if;
  update public.missions
     set status = 'cancelled', closed_at = now(), closed_by = v_profile.id, close_reason = left(p_reason, 500)
   where id = p_mission_id;
  update public.proposals set status = 'cancelled' where id = v_m.proposal_id;
  -- Les propositions non retenues redeviennent disponibles.
  update public.proposals set status = 'pending' where listing_id = v_listing.id and status = 'not_selected';
  perform private.log_status('mission', p_mission_id, v_m.status::text, 'cancelled');
  perform private.set_listing_status(v_listing.id, private.reopen_status(v_listing.id));

  v_other := case when v_profile.id = v_m.client_id then v_m.provider_id else v_m.client_id end;
  perform private.notify(v_other, 'mission_cancelled', 'Mission annulée',
    'La mission « ' || v_listing.title || ' » a été annulée.'
      || case when coalesce(trim(p_reason), '') <> '' then ' Motif : ' || left(trim(p_reason), 200) else '' end,
    '/annonces/' || v_listing.id, p_mission_id);
end;
$$;

-- Le client indique que la prestation est terminée.
create or replace function public.complete_mission(p_mission_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_active_user();
  v_m public.missions;
  v_listing public.listings;
begin
  select * into v_m from public.missions where id = p_mission_id and client_id = v_profile.id;
  if not found then
    raise exception 'Mission introuvable.' using errcode = 'P0002';
  end if;
  select * into v_listing from public.listings where id = v_m.listing_id for update;
  select * into v_m from public.missions where id = p_mission_id for update;
  if v_m.status <> 'confirmed' then
    raise exception 'Seule une mission confirmée peut être marquée comme terminée.' using errcode = '22023';
  end if;
  update public.missions set status = 'completed', completed_at = now(), closed_at = now(), closed_by = v_profile.id
   where id = p_mission_id;
  perform private.log_status('mission', p_mission_id, 'confirmed', 'completed');
  perform private.set_listing_status(v_listing.id, 'completed');
  perform private.notify(v_m.provider_id, 'mission_completed', 'Mission terminée',
    'Le client a indiqué que la mission « ' || v_listing.title || ' » est terminée.', '/annonces/' || v_listing.id, p_mission_id);
end;
$$;

-- Limite de 3 photos par annonce + contrôle du chemin de stockage.
create or replace function private.listing_photo_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing public.listings;
begin
  select * into v_listing from public.listings where id = new.listing_id for update;
  if new.storage_path not like (v_listing.client_id::text || '/' || v_listing.id::text || '/%') then
    raise exception 'Chemin de fichier invalide.' using errcode = '42501';
  end if;
  if v_listing.status not in ('draft', 'published', 'in_discussion', 'expired') then
    raise exception 'Les photos de cette annonce ne peuvent plus être modifiées.' using errcode = '42501';
  end if;
  if (select count(*) from public.listing_photos where listing_id = new.listing_id) >= 3 then
    raise exception 'Maximum 3 photos par annonce.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger listing_photos_guard before insert on public.listing_photos
  for each row execute function private.listing_photo_guard();

-- Expiration automatique (tâche planifiée).
create or replace function private.expire_listings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    select id, client_id, title, status from public.listings
    where status in ('published', 'in_discussion') and expires_at <= now()
    for update skip locked
  loop
    update public.listings set status = 'expired' where id = v_row.id;
    insert into public.status_history (entity_type, entity_id, from_status, to_status)
    values ('listing', v_row.id, v_row.status::text, 'expired');
    perform private.notify(v_row.client_id, 'listing_expired', 'Annonce expirée',
      'Votre annonce « ' || v_row.title || ' » est arrivée à expiration. Vous pouvez la renouveler gratuitement.',
      '/annonces/' || v_row.id, v_row.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
