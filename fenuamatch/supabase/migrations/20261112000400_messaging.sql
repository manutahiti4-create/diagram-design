-- =====================================================================
-- FenuaMatch — 04 : messagerie privée
-- =====================================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles (id) on delete set null,
  provider_id uuid references public.profiles (id) on delete set null,
  listing_id uuid references public.listings (id) on delete set null,
  last_message_at timestamptz,
  last_message_preview text,
  last_sender_id uuid,
  created_at timestamptz not null default now(),
  unique (client_id, provider_id)
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default '-infinity',
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null default auth.uid(),
  kind text not null default 'text' check (kind in ('text', 'system')),
  body text not null check (char_length(body) between 1 and 4000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

create or replace function private.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and user_id = auth.uid());
$$;

-- Crée (ou retrouve) la conversation client ↔ prestataire. Usage interne uniquement.
create or replace function private.ensure_conversation(p_client uuid, p_provider uuid, p_listing uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.conversations where client_id = p_client and provider_id = p_provider;
  if v_id is null then
    insert into public.conversations (client_id, provider_id, listing_id)
    values (p_client, p_provider, p_listing)
    on conflict (client_id, provider_id) do nothing
    returning id into v_id;
    if v_id is null then
      select id into v_id from public.conversations where client_id = p_client and provider_id = p_provider;
    end if;
  elsif p_listing is not null then
    update public.conversations set listing_id = p_listing where id = v_id;
  end if;
  insert into public.conversation_members (conversation_id, user_id)
  values (v_id, p_client), (v_id, p_provider)
  on conflict do nothing;
  return v_id;
end;
$$;

-- Un client contacte directement un prestataire.
-- Un prestataire ne peut PAS ouvrir une conversation de lui-même : il passe par une
-- proposition sur une annonce, ou répond dans une conversation ouverte par le client.
create or replace function public.start_conversation(p_provider_id uuid)
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
    raise exception 'Seuls les clients peuvent contacter directement un prestataire.' using errcode = '42501';
  end if;
  if p_provider_id = v_profile.id then
    raise exception 'Action impossible.' using errcode = '42501';
  end if;
  if not private.provider_is_visible(p_provider_id) then
    raise exception 'Ce prestataire n''est pas disponible.' using errcode = 'P0002';
  end if;
  select id into v_id from public.conversations where client_id = v_profile.id and provider_id = p_provider_id;
  if v_id is not null then
    return v_id;
  end if;
  perform private.enforce_rate_limit('conversation_start', 20, interval '1 day');
  return private.ensure_conversation(v_profile.id, p_provider_id, null);
end;
$$;

-- Contrôles avant envoi : participant, compte actif, anti-spam.
-- SECURITY INVOKER volontaire : current_user permet de distinguer un appel API
-- (rôle authenticated) d'un appel interne depuis une fonction sécurisée.
create or replace function private.message_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.account_status;
  v_other uuid;
begin
  if new.kind = 'system' then
    -- Les messages système ne sont créés que par les fonctions internes (rôle propriétaire).
    if current_user not in ('postgres', 'supabase_admin', 'service_role') then
      raise exception 'Type de message non autorisé.' using errcode = '42501';
    end if;
    return new;
  end if;
  if auth.uid() is null or new.sender_id is distinct from auth.uid() then
    raise exception 'Expéditeur invalide.' using errcode = '42501';
  end if;
  if not private.is_conversation_member(new.conversation_id) then
    raise exception 'Conversation introuvable.' using errcode = '42501';
  end if;
  select status into v_status from public.profiles where id = auth.uid();
  if v_status <> 'active' then
    raise exception 'Votre compte est suspendu.' using errcode = '42501';
  end if;
  -- L'autre participant doit toujours exister.
  select user_id into v_other from public.conversation_members
   where conversation_id = new.conversation_id and user_id <> auth.uid() limit 1;
  if v_other is null then
    raise exception 'Ce compte n''existe plus : impossible d''envoyer un message.' using errcode = '42501';
  end if;
  new.body := trim(new.body);
  if char_length(new.body) = 0 then
    raise exception 'Le message est vide.' using errcode = '23514';
  end if;
  perform private.enforce_rate_limit('message_minute', 20, interval '1 minute');
  perform private.enforce_rate_limit('message_day', 500, interval '1 day');
  new.created_at := now();
  new.is_hidden := false;
  return new;
end;
$$;
create trigger messages_guard before insert on public.messages
  for each row execute function private.message_guard();

-- Après envoi : aperçu de conversation + notification (sans doublon tant que non lue).
create or replace function private.message_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member record;
  v_sender text;
begin
  update public.conversations
     set last_message_at = new.created_at,
         last_message_preview = left(regexp_replace(new.body, '\s+', ' ', 'g'), 120),
         last_sender_id = new.sender_id
   where id = new.conversation_id;

  if new.sender_id is not null then
    update public.conversation_members set last_read_at = new.created_at
     where conversation_id = new.conversation_id and user_id = new.sender_id;
  end if;

  if new.kind = 'text' then
    select coalesce(pp.public_name, p.username::text) into v_sender
    from public.profiles p left join public.provider_profiles pp on pp.id = p.id
    where p.id = new.sender_id;
    for v_member in
      select user_id from public.conversation_members
      where conversation_id = new.conversation_id and user_id is distinct from new.sender_id
    loop
      if not exists (
        select 1 from public.notifications
        where user_id = v_member.user_id and type = 'message'
          and ref_id = new.conversation_id and read_at is null) then
        perform private.notify(v_member.user_id, 'message', 'Nouveau message',
          coalesce(v_sender, 'Un utilisateur') || ' vous a écrit.',
          '/messages/' || new.conversation_id, new.conversation_id);
      end if;
    end loop;
  end if;
  return null;
end;
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function private.message_after_insert();

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversation_members set last_read_at = now()
   where conversation_id = p_conversation_id and user_id = auth.uid();
  update public.notifications set read_at = now()
   where user_id = auth.uid() and type = 'message' and ref_id = p_conversation_id and read_at is null;
end;
$$;

-- Liste de mes conversations avec l'autre participant et le nombre de messages non lus.
create or replace function public.my_conversations()
returns table (
  id uuid,
  other_user_id uuid,
  other_username text,
  other_display_name text,
  other_avatar_path text,
  other_is_provider boolean,
  listing_id uuid,
  listing_title text,
  last_message_at timestamptz,
  last_message_preview text,
  last_sender_id uuid,
  unread_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.id,
         o.id,
         o.username::text,
         coalesce(pp.public_name, o.username::text),
         o.avatar_path,
         (o.account_type = 'provider'),
         c.listing_id,
         l.title,
         c.last_message_at,
         c.last_message_preview,
         c.last_sender_id,
         (select count(*) from public.messages m
           where m.conversation_id = c.id and m.created_at > me.last_read_at
             and m.sender_id is distinct from auth.uid())
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join public.profiles o on o.id = case when c.client_id = auth.uid() then c.provider_id else c.client_id end
  left join public.provider_profiles pp on pp.id = o.id
  left join public.listings l on l.id = c.listing_id
  where me.user_id = auth.uid()
  order by c.last_message_at desc nulls last, c.created_at desc;
$$;

create or replace function public.unread_messages_count()
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)
  from public.conversation_members me
  join public.messages m on m.conversation_id = me.conversation_id
  where me.user_id = auth.uid()
    and m.created_at > me.last_read_at
    and m.sender_id is distinct from auth.uid();
$$;
