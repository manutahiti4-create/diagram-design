-- =====================================================================
-- FenuaMatch — 05 : signalements, contestations, administration, compte
-- =====================================================================

create type public.report_target as enum ('profile', 'listing', 'message');
create type public.report_reason as enum ('fraud', 'harassment', 'spam', 'forbidden', 'impersonation', 'other');
create type public.report_status as enum ('open', 'upheld', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  target_id uuid not null,
  target_owner_id uuid references public.profiles (id) on delete set null,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 1000),
  status public.report_status not null default 'open',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index reports_open_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);

create table public.moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target not null,
  target_id uuid not null,
  message text not null check (char_length(trim(message)) between 5 and 2000),
  status text not null default 'open' check (status in ('open', 'accepted', 'rejected')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now()
);
create unique index moderation_appeals_one_open on public.moderation_appeals (target_type, target_id) where status = 'open';

-- Propriétaire d'un contenu signalable.
create or replace function private.report_target_owner(p_type public.report_target, p_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case p_type
    when 'profile' then (select id from public.profiles where id = p_id)
    when 'listing' then (select client_id from public.listings where id = p_id)
    when 'message' then (select sender_id from public.messages where id = p_id)
  end;
$$;

-- Masque / démasque un contenu (profil = profil + fiche prestataire).
create or replace function private.set_content_hidden(p_type public.report_target, p_id uuid, p_hidden boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_type = 'profile' then
    update public.profiles set is_hidden = p_hidden, hidden_reason = case when p_hidden then p_reason end where id = p_id;
    update public.provider_profiles set is_hidden = p_hidden, hidden_reason = case when p_hidden then p_reason end where id = p_id;
  elsif p_type = 'listing' then
    update public.listings set is_hidden = p_hidden, hidden_reason = case when p_hidden then p_reason end where id = p_id;
  elsif p_type = 'message' then
    update public.messages set is_hidden = p_hidden where id = p_id;
  end if;
end;
$$;

create or replace function private.target_link(p_type public.report_target, p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case p_type
    when 'profile' then '/parametres'
    when 'listing' then '/annonces/' || p_id
    when 'message' then '/messages/' || (select conversation_id from public.messages where id = p_id)
  end;
$$;

-- Signaler un contenu.
create or replace function public.report_content(
  p_target_type public.report_target, p_target_id uuid, p_reason public.report_reason, p_details text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_active_user();
  v_owner uuid;
  v_distinct integer;
  v_already_hidden boolean;
begin
  v_owner := private.report_target_owner(p_target_type, p_target_id);
  if v_owner is null then
    raise exception 'Contenu introuvable.' using errcode = 'P0002';
  end if;
  if v_owner = v_profile.id then
    raise exception 'Vous ne pouvez pas signaler votre propre contenu.' using errcode = '42501';
  end if;
  -- Un message ne peut être signalé que par un participant de la conversation.
  if p_target_type = 'message' and not private.is_conversation_member(
       (select conversation_id from public.messages where id = p_target_id)) then
    raise exception 'Contenu introuvable.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.reports where reporter_id = v_profile.id
              and target_type = p_target_type and target_id = p_target_id) then
    raise exception 'Vous avez déjà signalé ce contenu. Merci, il sera examiné.' using errcode = '23505';
  end if;
  perform private.enforce_rate_limit('report', 10, interval '1 day');

  insert into public.reports (reporter_id, target_type, target_id, target_owner_id, reason, details)
  values (v_profile.id, p_target_type, p_target_id, v_owner, p_reason, nullif(trim(p_details), ''));

  -- Masquage temporaire automatique : 3 signalements ouverts de 3 comptes distincts,
  -- chacun inscrit depuis plus de 24 h (protection contre les comptes créés pour nuire).
  select count(distinct r.reporter_id) into v_distinct
  from public.reports r
  join public.profiles p on p.id = r.reporter_id
  where r.target_type = p_target_type and r.target_id = p_target_id and r.status = 'open'
    and p.created_at < now() - interval '24 hours' and p.status = 'active';

  v_already_hidden := case p_target_type
    when 'profile' then (select is_hidden from public.profiles where id = p_target_id)
    when 'listing' then (select is_hidden from public.listings where id = p_target_id)
    when 'message' then (select is_hidden from public.messages where id = p_target_id)
  end;

  if v_distinct >= 3 and not coalesce(v_already_hidden, false) then
    perform private.set_content_hidden(p_target_type, p_target_id, true, 'auto_reports');
    insert into public.admin_audit_log (admin_id, action, target_type, target_id, reason)
    values (null, 'auto_hide', p_target_type::text, p_target_id::text, '3 signalements de comptes distincts');
    perform private.notify(v_owner, 'moderation', 'Contenu temporairement masqué',
      'Suite à plusieurs signalements, un de vos contenus est masqué en attendant un examen par l''équipe. '
      || 'Vous pouvez contester cette décision depuis vos paramètres.',
      '/parametres/moderation', p_target_id);
  end if;
end;
$$;

-- Contester un masquage.
create or replace function public.submit_appeal(p_target_type public.report_target, p_target_id uuid, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Vous devez être connecté.' using errcode = '28000';
  end if;
  if private.report_target_owner(p_target_type, p_target_id) is distinct from v_uid then
    raise exception 'Contenu introuvable.' using errcode = 'P0002';
  end if;
  perform private.enforce_rate_limit('appeal', 5, interval '1 day');
  insert into public.moderation_appeals (user_id, target_type, target_id, message)
  values (v_uid, p_target_type, p_target_id, trim(p_message));
exception when unique_violation then
  raise exception 'Une contestation est déjà en cours pour ce contenu.' using errcode = '23505';
end;
$$;

-- Mes contenus masqués (pour pouvoir les contester).
create or replace function public.my_hidden_content()
returns table (target_type public.report_target, target_id uuid, label text, hidden_reason text, appeal_status text)
language sql
stable
security definer
set search_path = ''
as $$
  select 'profile'::public.report_target, p.id, 'Votre profil'::text, p.hidden_reason,
         (select a.status from public.moderation_appeals a where a.target_type = 'profile' and a.target_id = p.id order by a.created_at desc limit 1)
  from public.profiles p where p.id = auth.uid() and p.is_hidden
  union all
  select 'listing', l.id, 'Annonce : ' || l.title, l.hidden_reason,
         (select a.status from public.moderation_appeals a where a.target_type = 'listing' and a.target_id = l.id order by a.created_at desc limit 1)
  from public.listings l where l.client_id = auth.uid() and l.is_hidden
  union all
  select 'message', m.id, 'Message : ' || left(m.body, 60), 'reports',
         (select a.status from public.moderation_appeals a where a.target_type = 'message' and a.target_id = m.id order by a.created_at desc limit 1)
  from public.messages m where m.sender_id = auth.uid() and m.is_hidden;
$$;

-- ---------------------------------------------------------------------
-- Administration (toutes les fonctions vérifient le rôle côté serveur)
-- ---------------------------------------------------------------------
create or replace function private.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Accès réservé à l''administration.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'accounts', (select count(*) from public.profiles),
    'clients', (select count(*) from public.profiles where account_type = 'client'),
    'providers', (select count(*) from public.profiles where account_type = 'provider'),
    'published_providers', (select count(*) from public.provider_profiles where is_published and not is_hidden),
    'listings', (select count(*) from public.listings where status <> 'draft'),
    'active_listings', (select count(*) from public.listings
                         where status in ('published', 'in_discussion', 'awaiting_confirmation') and expires_at > now() and not is_hidden),
    'confirmed_missions', (select count(*) from public.missions where status in ('confirmed', 'completed')),
    'open_reports', (select count(*) from public.reports where status = 'open'),
    'open_appeals', (select count(*) from public.moderation_appeals where status = 'open'),
    'suspended_accounts', (select count(*) from public.profiles where status = 'suspended'));
end;
$$;

create or replace function public.admin_list_users(p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns table (
  id uuid, username text, account_type public.account_type, status public.account_status,
  is_hidden boolean, hidden_reason text, is_demo boolean, created_at timestamptz, last_active_at timestamptz,
  provider_name text, provider_published boolean, is_admin boolean, open_reports bigint, total_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select p.id, p.username::text, p.account_type, p.status, p.is_hidden, p.hidden_reason, p.is_demo, p.created_at, p.last_active_at,
         pp.public_name, pp.is_published,
         exists (select 1 from public.user_roles r where r.user_id = p.id and r.role = 'admin'),
         (select count(*) from public.reports r where r.target_owner_id = p.id and r.status = 'open'),
         count(*) over ()
  from public.profiles p
  left join public.provider_profiles pp on pp.id = p.id
  where p_search is null or p_search = ''
     or p.username::text ilike '%' || p_search || '%'
     or pp.public_name ilike '%' || p_search || '%'
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end;
$$;

create or replace function public.admin_set_user_status(p_user_id uuid, p_status public.account_status, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  if p_user_id = auth.uid() then
    raise exception 'Vous ne pouvez pas modifier votre propre statut.' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Indiquez une justification.' using errcode = '23514';
  end if;
  update public.profiles set status = p_status where id = p_user_id;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  -- Bloque (ou rétablit) la connexion côté Supabase Auth.
  update auth.users
     set banned_until = case when p_status = 'suspended' then 'infinity'::timestamptz else null end
   where id = p_user_id;
  perform private.audit(case when p_status = 'suspended' then 'suspend_user' else 'reactivate_user' end,
                        'profile', p_user_id::text, p_reason);
end;
$$;

create or replace function public.admin_set_content_hidden(
  p_target_type public.report_target, p_target_id uuid, p_hidden boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  perform private.require_admin();
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Indiquez une justification.' using errcode = '23514';
  end if;
  v_owner := private.report_target_owner(p_target_type, p_target_id);
  if v_owner is null then
    raise exception 'Contenu introuvable.' using errcode = 'P0002';
  end if;
  perform private.set_content_hidden(p_target_type, p_target_id, p_hidden, case when p_hidden then 'moderation' end);
  perform private.audit(case when p_hidden then 'hide' else 'restore' end, p_target_type::text, p_target_id::text, p_reason);
  perform private.notify(v_owner, 'moderation',
    case when p_hidden then 'Contenu masqué par la modération' else 'Contenu rétabli' end,
    case when p_hidden then 'Un de vos contenus a été masqué. Motif : ' || left(trim(p_reason), 200)
                            || '. Vous pouvez contester cette décision depuis vos paramètres.'
         else 'Un de vos contenus a été rétabli après examen.' end,
    case when p_hidden then '/parametres/moderation' else private.target_link(p_target_type, p_target_id) end, p_target_id);
end;
$$;

-- Clôture des signalements d'un contenu : maintenu masqué (upheld) ou rejeté (dismissed → rétabli si masqué automatiquement).
create or replace function public.admin_resolve_reports(
  p_target_type public.report_target, p_target_id uuid, p_decision public.report_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := private.report_target_owner(p_target_type, p_target_id);
  v_auto boolean;
begin
  perform private.require_admin();
  if p_decision = 'open' then
    raise exception 'Décision invalide.' using errcode = '22023';
  end if;
  update public.reports
     set status = p_decision, reviewed_by = auth.uid(), reviewed_at = now(), decision_note = p_note
   where target_type = p_target_type and target_id = p_target_id and status = 'open';

  v_auto := case p_target_type
    when 'profile' then (select hidden_reason = 'auto_reports' from public.profiles where id = p_target_id)
    when 'listing' then (select hidden_reason = 'auto_reports' from public.listings where id = p_target_id)
    when 'message' then (select is_hidden from public.messages where id = p_target_id)
  end;

  if p_decision = 'upheld' then
    perform private.set_content_hidden(p_target_type, p_target_id, true, 'moderation');
    perform private.notify(v_owner, 'moderation', 'Décision de modération',
      'Après examen, un de vos contenus reste masqué.' || coalesce(' Motif : ' || left(p_note, 200), ''),
      '/parametres/moderation', p_target_id);
  elsif coalesce(v_auto, false) then
    perform private.set_content_hidden(p_target_type, p_target_id, false, null);
    perform private.notify(v_owner, 'moderation', 'Contenu rétabli',
      'Après examen, votre contenu est de nouveau visible.', private.target_link(p_target_type, p_target_id), p_target_id);
  end if;
  perform private.audit('resolve_reports_' || p_decision::text, p_target_type::text, p_target_id::text, p_note);
end;
$$;

create or replace function public.admin_resolve_appeal(p_appeal_id uuid, p_accept boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a public.moderation_appeals;
begin
  perform private.require_admin();
  select * into v_a from public.moderation_appeals where id = p_appeal_id and status = 'open' for update;
  if not found then
    raise exception 'Contestation introuvable ou déjà traitée.' using errcode = 'P0002';
  end if;
  update public.moderation_appeals
     set status = case when p_accept then 'accepted' else 'rejected' end,
         resolved_by = auth.uid(), resolved_at = now(), resolution_note = p_note
   where id = p_appeal_id;
  if p_accept then
    perform private.set_content_hidden(v_a.target_type, v_a.target_id, false, null);
    update public.reports set status = 'dismissed', reviewed_by = auth.uid(), reviewed_at = now(), decision_note = 'Contestation acceptée'
     where target_type = v_a.target_type and target_id = v_a.target_id and status = 'open';
  end if;
  perform private.notify(v_a.user_id, 'moderation', 'Réponse à votre contestation',
    case when p_accept then 'Votre contestation a été acceptée : le contenu est de nouveau visible.'
         else 'Votre contestation n''a pas été retenue.' || coalesce(' ' || left(p_note, 200), '') end,
    '/parametres/moderation', v_a.target_id);
  perform private.audit(case when p_accept then 'appeal_accepted' else 'appeal_rejected' end,
                        v_a.target_type::text, v_a.target_id::text, p_note);
end;
$$;

-- Signalements regroupés par contenu (avec un aperçu limité au strict nécessaire).
create or replace function public.admin_report_queue(p_status public.report_status default 'open')
returns table (
  target_type public.report_target, target_id uuid, target_owner_id uuid, owner_username text,
  report_count bigint, reasons text[], details text[], first_reported_at timestamptz,
  is_hidden boolean, preview text, link_path text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select r.target_type, r.target_id, max(r.target_owner_id::text)::uuid, max(o.username::text),
         count(*), array_agg(distinct r.reason::text), array_remove(array_agg(r.details), null), min(r.created_at),
         case r.target_type
           when 'profile' then (select p.is_hidden from public.profiles p where p.id = r.target_id)
           when 'listing' then (select l.is_hidden from public.listings l where l.id = r.target_id)
           when 'message' then (select m.is_hidden from public.messages m where m.id = r.target_id) end,
         case r.target_type
           when 'profile' then (select coalesce(pp.public_name, p.username::text) || coalesce(' — ' || left(pp.description, 200), '')
                                  from public.profiles p left join public.provider_profiles pp on pp.id = p.id where p.id = r.target_id)
           when 'listing' then (select l.title || ' — ' || left(l.description, 200) from public.listings l where l.id = r.target_id)
           when 'message' then (select left(m.body, 400) from public.messages m where m.id = r.target_id) end,
         case r.target_type
           when 'profile' then '/prestataires/' || r.target_id
           when 'listing' then '/annonces/' || r.target_id
           else null end
  from public.reports r
  left join public.profiles o on o.id = r.target_owner_id
  where r.status = p_status
  group by r.target_type, r.target_id
  order by count(*) desc, min(r.created_at);
end;
$$;

-- ---------------------------------------------------------------------
-- Compte : export et suppression
-- ---------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Vous devez être connecté.' using errcode = '28000';
  end if;
  return jsonb_build_object(
    'generated_at', now(),
    'account', (select to_jsonb(u) - 'encrypted_password' from (select id, email, created_at, last_sign_in_at, email_confirmed_at from auth.users where id = v_uid) u),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = v_uid),
    'private', (select to_jsonb(x) from public.profile_private x where x.user_id = v_uid),
    'provider_profile', (select to_jsonb(pp) - 'search_document' from public.provider_profiles pp where pp.id = v_uid),
    'provider_trades', (select coalesce(jsonb_agg(t), '[]') from public.provider_trades t where t.provider_id = v_uid),
    'provider_photos', (select coalesce(jsonb_agg(ph), '[]') from public.provider_photos ph where ph.provider_id = v_uid),
    'listings', (select coalesce(jsonb_agg(to_jsonb(l) - 'search_document'), '[]') from public.listings l where l.client_id = v_uid),
    'proposals', (select coalesce(jsonb_agg(p), '[]') from public.proposals p where p.provider_id = v_uid),
    'missions', (select coalesce(jsonb_agg(m), '[]') from public.missions m where m.client_id = v_uid or m.provider_id = v_uid),
    'messages_sent', (select coalesce(jsonb_agg(jsonb_build_object('conversation_id', m.conversation_id, 'body', m.body, 'created_at', m.created_at)), '[]')
                       from public.messages m where m.sender_id = v_uid),
    'notifications', (select coalesce(jsonb_agg(n), '[]') from public.notifications n where n.user_id = v_uid),
    'reports_sent', (select coalesce(jsonb_agg(jsonb_build_object('target_type', r.target_type, 'reason', r.reason, 'created_at', r.created_at)), '[]')
                      from public.reports r where r.reporter_id = v_uid));
end;
$$;

-- Suppression définitive : le compte Auth et les données personnelles sont supprimées.
-- Les messages envoyés à d'autres personnes sont conservés pour leurs destinataires, mais anonymisés
-- (expéditeur = « Compte supprimé »). Les fichiers sont supprimés par l'application avant cet appel.
create or replace function public.delete_my_account(p_confirm_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_m record;
begin
  if v_uid is null then
    raise exception 'Vous devez être connecté.' using errcode = '28000';
  end if;
  select * into v_profile from public.profiles where id = v_uid;
  if lower(coalesce(p_confirm_username, '')) <> v_profile.username::text then
    raise exception 'Le nom d''utilisateur saisi ne correspond pas.' using errcode = '22023';
  end if;
  if exists (select 1 from public.user_roles where user_id = v_uid and role = 'admin') then
    raise exception 'Un compte administrateur ne peut pas être supprimé depuis l''application.' using errcode = '42501';
  end if;

  -- Annule proprement les missions en cours et prévient l'autre partie.
  for v_m in
    select m.id, m.client_id, m.provider_id, m.listing_id, l.title
    from public.missions m join public.listings l on l.id = m.listing_id
    where (m.client_id = v_uid or m.provider_id = v_uid) and m.status in ('awaiting_provider', 'confirmed')
  loop
    update public.missions set status = 'cancelled', closed_at = now(), close_reason = 'Compte supprimé' where id = v_m.id;
    if v_m.provider_id = v_uid then
      update public.proposals set status = 'pending' where listing_id = v_m.listing_id and status = 'not_selected';
      perform private.set_listing_status(v_m.listing_id, private.reopen_status(v_m.listing_id));
    end if;
    perform private.notify(case when v_m.client_id = v_uid then v_m.provider_id else v_m.client_id end,
      'mission_cancelled', 'Mission annulée',
      'La mission « ' || v_m.title || ' » a été annulée : l''autre compte a été supprimé.', '/annonces/' || v_m.listing_id, v_m.id);
  end loop;

  -- Les propositions en attente du prestataire sont retirées.
  update public.proposals set status = 'withdrawn' where provider_id = v_uid and status = 'pending';

  insert into public.admin_audit_log (admin_id, action, target_type, target_id)
  values (null, 'account_deleted', 'profile', v_uid::text);

  delete from auth.users where id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------
-- Comptes inactifs (tâche planifiée quotidienne)
--   • 6 mois sans activité : notification de rappel (et e-mail via la fonction Edge si configurée)
--   • 30 jours de plus : profil public masqué (jamais supprimé) ; réactivé à la reconnexion.
-- ---------------------------------------------------------------------
create or replace function private.process_inactive_accounts()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
begin
  for v_row in
    select id from public.profiles
    where last_active_at < now() - interval '6 months'
      and inactivity_reminder_sent_at is null and not hidden_for_inactivity
  loop
    update public.profiles set inactivity_reminder_sent_at = now() where id = v_row.id;
    perform private.notify(v_row.id, 'inactivity', 'Votre compte est inactif',
      'Connectez-vous dans les 30 jours pour garder votre profil visible sur FenuaMatch.', '/tableau-de-bord', null);
  end loop;

  update public.profiles
     set hidden_for_inactivity = true
   where not hidden_for_inactivity
     and inactivity_reminder_sent_at is not null
     and inactivity_reminder_sent_at < now() - interval '30 days'
     and last_active_at < inactivity_reminder_sent_at;
end;
$$;
