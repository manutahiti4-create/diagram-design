-- FenuaMatch — DERNIÈRE ÉTAPE à coller dans Supabase > SQL Editor > New query, puis "Run".
-- (Les 5 autres parties sont déjà installées.) Si Supabase avertit d'opérations "destructives" : "Run this query".

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


grant execute on function public.confirm_adult() to authenticated;
grant execute on function private.valid_image_name(text) to authenticated;
