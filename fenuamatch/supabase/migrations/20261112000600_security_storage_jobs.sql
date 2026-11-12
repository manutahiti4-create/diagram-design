-- =====================================================================
-- FenuaMatch — 06 : Row Level Security, droits, stockage, tâches planifiées
-- =====================================================================

-- ---------------------------------------------------------------------
-- RLS activée sur toutes les tables exposées
-- ---------------------------------------------------------------------
alter table public.islands enable row level security;
alter table public.communes enable row level security;
alter table public.categories enable row level security;
alter table public.trades enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.user_roles enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.status_history enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.provider_trades enable row level security;
alter table public.provider_photos enable row level security;
alter table public.listings enable row level security;
alter table public.listing_categories enable row level security;
alter table public.listing_photos enable row level security;
alter table public.listing_revisions enable row level security;
alter table public.proposals enable row level security;
alter table public.missions enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_appeals enable row level security;

-- ---------------------------------------------------------------------
-- Droits de base : on part de zéro, puis on accorde le strict nécessaire
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;

-- Référentiels publics
grant select on public.islands, public.communes, public.categories, public.trades to anon, authenticated;

-- Lecture (filtrée par RLS) pour les utilisateurs connectés
grant select on
  public.profiles, public.profile_private, public.user_roles, public.notifications, public.admin_audit_log,
  public.status_history, public.provider_profiles, public.provider_trades, public.provider_photos,
  public.listings, public.listing_categories, public.listing_photos, public.listing_revisions,
  public.proposals, public.missions, public.conversations, public.conversation_members, public.messages,
  public.reports, public.moderation_appeals
to authenticated;

-- Écritures directes autorisées (colonnes limitées), toujours filtrées par RLS
grant update (avatar_path, commune_id) on public.profiles to authenticated;
grant update (phone) on public.profile_private to authenticated;
grant insert (id, public_name, description, main_trade_id, commune_id, availability, phone,
              opening_hours, service_area, extra_info, is_published) on public.provider_profiles to authenticated;
grant update (public_name, description, main_trade_id, commune_id, availability, phone,
              opening_hours, service_area, extra_info, is_published) on public.provider_profiles to authenticated;
grant insert, delete on public.provider_trades to authenticated;
grant insert (provider_id, storage_path, caption, position), delete on public.provider_photos to authenticated;
grant update (caption, position) on public.provider_photos to authenticated;
grant insert (listing_id, storage_path, position), delete on public.listing_photos to authenticated;
grant delete on public.listings to authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;
grant delete on public.notifications to authenticated;
grant insert (category_id, slug, name, keywords, sort_order, is_active) , update (category_id, slug, name, keywords, sort_order, is_active)
  on public.trades to authenticated;
grant insert (slug, name, icon, sort_order, is_active), update (slug, name, icon, sort_order, is_active)
  on public.categories to authenticated;

-- ---------------------------------------------------------------------
-- Politiques
-- ---------------------------------------------------------------------
create policy "référentiel lisible" on public.islands for select to anon, authenticated using (true);
create policy "référentiel lisible" on public.communes for select to anon, authenticated using (true);
create policy "catégories lisibles" on public.categories for select to anon, authenticated
  using (is_active or (select private.is_admin()));
create policy "métiers lisibles" on public.trades for select to anon, authenticated
  using (is_active or (select private.is_admin()));
create policy "admin crée catégories" on public.categories for insert to authenticated with check ((select private.is_admin()));
create policy "admin modifie catégories" on public.categories for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin crée métiers" on public.trades for insert to authenticated with check ((select private.is_admin()));
create policy "admin modifie métiers" on public.trades for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Profils : noms d'utilisateur et avatars visibles des membres connectés (jamais l'e-mail ni le téléphone).
create policy "profils visibles des membres" on public.profiles for select to authenticated using (true);
create policy "modifier son profil" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "lire ses données privées" on public.profile_private for select to authenticated
  using (user_id = (select auth.uid()));
create policy "modifier ses données privées" on public.profile_private for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "voir ses rôles" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));

create policy "voir ses notifications" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "supprimer ses notifications" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "admin lit le journal" on public.admin_audit_log for select to authenticated
  using ((select private.is_admin()));
create policy "admin lit l'historique" on public.status_history for select to authenticated
  using ((select private.is_admin()));

-- Fiches prestataires
create policy "fiches visibles" on public.provider_profiles for select to authenticated
  using (id = (select auth.uid()) or private.provider_is_visible(id) or (select private.is_admin()));
create policy "créer sa fiche" on public.provider_profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "modifier sa fiche" on public.provider_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "métiers des fiches visibles" on public.provider_trades for select to authenticated
  using (provider_id = (select auth.uid()) or private.provider_is_visible(provider_id) or (select private.is_admin()));
create policy "gérer ses métiers" on public.provider_trades for insert to authenticated
  with check (provider_id = (select auth.uid()));
create policy "retirer ses métiers" on public.provider_trades for delete to authenticated
  using (provider_id = (select auth.uid()));

create policy "galerie visible" on public.provider_photos for select to authenticated
  using (provider_id = (select auth.uid()) or private.provider_is_visible(provider_id) or (select private.is_admin()));
create policy "ajouter à sa galerie" on public.provider_photos for insert to authenticated
  with check (provider_id = (select auth.uid()));
create policy "modifier sa galerie" on public.provider_photos for update to authenticated
  using (provider_id = (select auth.uid())) with check (provider_id = (select auth.uid()));
create policy "supprimer de sa galerie" on public.provider_photos for delete to authenticated
  using (provider_id = (select auth.uid()));

-- Annonces (écritures par fonctions sécurisées uniquement, sauf suppression d'un brouillon)
create policy "annonces visibles" on public.listings for select to authenticated
  using ((not is_hidden and status <> 'draft') or client_id = (select auth.uid()) or (select private.is_admin()));
create policy "supprimer son brouillon" on public.listings for delete to authenticated
  using (client_id = (select auth.uid()) and status = 'draft');

create policy "catégories des annonces visibles" on public.listing_categories for select to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy "photos des annonces visibles" on public.listing_photos for select to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy "ajouter des photos à son annonce" on public.listing_photos for insert to authenticated
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.client_id = (select auth.uid())));
create policy "retirer des photos de son annonce" on public.listing_photos for delete to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.client_id = (select auth.uid())
                 and l.status in ('draft', 'published', 'in_discussion', 'expired')));
create policy "historique visible du propriétaire" on public.listing_revisions for select to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.client_id = (select auth.uid()))
         or (select private.is_admin()));

-- Propositions et missions : uniquement les parties concernées
create policy "propositions des parties" on public.proposals for select to authenticated
  using (provider_id = (select auth.uid())
         or exists (select 1 from public.listings l where l.id = listing_id and l.client_id = (select auth.uid()))
         or (select private.is_admin()));
create policy "missions des parties" on public.missions for select to authenticated
  using (client_id = (select auth.uid()) or provider_id = (select auth.uid()) or (select private.is_admin()));

-- Messagerie : participants uniquement (pas d'accès administrateur général)
create policy "conversations des participants" on public.conversations for select to authenticated
  using (private.is_conversation_member(id));
create policy "membres visibles des participants" on public.conversation_members for select to authenticated
  using (private.is_conversation_member(conversation_id));
create policy "messages des participants" on public.messages for select to authenticated
  using (private.is_conversation_member(conversation_id));
create policy "envoyer un message" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and kind = 'text' and private.is_conversation_member(conversation_id));

-- Modération
create policy "voir ses signalements" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_admin()));
create policy "voir ses contestations" on public.moderation_appeals for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

-- ---------------------------------------------------------------------
-- Fonctions exposées (RPC) : uniquement pour les utilisateurs connectés
-- ---------------------------------------------------------------------
grant execute on function public.check_username(text) to anon, authenticated;
grant execute on function
  public.is_admin(),
  public.touch_activity(),
  public.change_username(text),
  public.mark_notifications_read(uuid[]),
  public.search_providers(text, integer, integer, smallint, public.availability, integer, integer),
  public.create_listing(text, text, smallint, integer[], integer, public.date_mode, date, boolean),
  public.publish_listing(uuid),
  public.update_listing(uuid, text, text, smallint, integer[], integer, public.date_mode, date),
  public.renew_listing(uuid),
  public.cancel_listing(uuid),
  public.submit_proposal(uuid, text, integer),
  public.withdraw_proposal(uuid),
  public.decline_proposal(uuid),
  public.select_proposal(uuid),
  public.confirm_mission(uuid),
  public.decline_mission(uuid, text),
  public.cancel_mission(uuid, text),
  public.complete_mission(uuid),
  public.start_conversation(uuid),
  public.mark_conversation_read(uuid),
  public.my_conversations(),
  public.unread_messages_count(),
  public.report_content(public.report_target, uuid, public.report_reason, text),
  public.submit_appeal(public.report_target, uuid, text),
  public.my_hidden_content(),
  public.admin_stats(),
  public.admin_list_users(text, integer, integer),
  public.admin_set_user_status(uuid, public.account_status, text),
  public.admin_set_content_hidden(public.report_target, uuid, boolean, text),
  public.admin_resolve_reports(public.report_target, uuid, public.report_status, text),
  public.admin_resolve_appeal(uuid, boolean, text),
  public.admin_report_queue(public.report_status),
  public.export_my_data(),
  public.delete_my_account(text)
to authenticated;

-- Fonctions internes appelées dans un contexte "invoker" (politiques RLS, recherche, déclencheurs)
grant execute on function
  private.is_admin(),
  private.provider_is_visible(uuid),
  private.is_conversation_member(uuid),
  private.normalize_text(text),
  private.enforce_rate_limit(text, integer, interval)
to anon, authenticated;

-- Confirmation de majorité (déclaration de l'utilisateur, conservée avec sa date).
create or replace function public.confirm_adult()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profile_private set adult_confirmed_at = coalesce(adult_confirmed_at, now())
   where user_id = auth.uid();
$$;
revoke all on function public.confirm_adult() from public, anon;
grant execute on function public.confirm_adult() to authenticated;

-- Journalise les modifications du référentiel par un administrateur.
create or replace function private.audit_reference_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.audit(lower(tg_op) || '_' || tg_table_name, tg_table_name, new.id::text, null,
                        jsonb_build_object('name', new.name, 'is_active', new.is_active));
  return null;
end;
$$;
create trigger categories_audit after insert or update on public.categories
  for each row when (auth.uid() is not null) execute function private.audit_reference_change();
create trigger trades_audit after insert or update on public.trades
  for each row when (auth.uid() is not null) execute function private.audit_reference_change();

-- ---------------------------------------------------------------------
-- Stockage des fichiers
--   avatars          public  — photo de profil       {uid}/{fichier}
--   provider-photos  public  — galerie prestataire   {uid}/{fichier}
--   listing-photos   privé   — photos des annonces   {uid}/{listing_id}/{fichier}
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('provider-photos', 'provider-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('listing-photos', 'listing-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.valid_image_name(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_name ~ '^[0-9a-f-]{36}/([0-9a-f-]{36}/)?[A-Za-z0-9_-]{8,64}\.(jpg|jpeg|png|webp)$';
$$;
grant execute on function private.valid_image_name(text) to authenticated;

create policy "avatars : dépôt dans son dossier" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
              and private.valid_image_name(name));
create policy "avatars : suppression dans son dossier" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars : lecture de son dossier" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "galerie : dépôt par le prestataire" on storage.objects for insert to authenticated
  with check (bucket_id = 'provider-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
              and private.valid_image_name(name)
              and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.account_type = 'provider'));
create policy "galerie : suppression par le prestataire" on storage.objects for delete to authenticated
  using (bucket_id = 'provider-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "galerie : lecture de son dossier" on storage.objects for select to authenticated
  using (bucket_id = 'provider-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "annonces : dépôt pour sa propre annonce" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
              and private.valid_image_name(name)
              and exists (select 1 from public.listings l
                          where l.id::text = (storage.foldername(name))[2] and l.client_id = (select auth.uid())));
create policy "annonces : suppression par le propriétaire" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "annonces : lecture si l'annonce est visible" on storage.objects for select to authenticated
  using (bucket_id = 'listing-photos'
         and exists (select 1 from public.listings l where l.id::text = (storage.foldername(name))[2]));

-- ---------------------------------------------------------------------
-- Temps réel (messages et notifications) — RLS appliquée par Supabase Realtime
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages, public.notifications;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Tâches planifiées (pg_cron)
-- ---------------------------------------------------------------------
create extension if not exists pg_cron;

select cron.schedule('fenuamatch-expire-listings', '*/10 * * * *', $$select private.expire_listings()$$);
select cron.schedule('fenuamatch-inactive-accounts', '17 3 * * *', $$select private.process_inactive_accounts()$$);
select cron.schedule('fenuamatch-purge-rate-events', '43 3 * * *', $$select private.purge_rate_events()$$);
