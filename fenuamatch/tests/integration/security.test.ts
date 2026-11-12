import { describe, expect, it, beforeAll } from 'vitest';
import {
  admin, anonClient, createUser, publishProvider, createListing, sql, communeId, categoryId,
  PNG_BYTES, fileName, type TestUser,
} from './helpers';

describe('Inscription et comptes', () => {
  it('refuse la connexion tant que l\'e-mail n\'est pas confirmé', async () => {
    const c = anonClient();
    const email = `nonconfirme_${Date.now()}@example.test`;
    const username = `nc_${Date.now().toString(36)}`;
    const { data, error } = await c.auth.signUp({
      email, password: 'motdepasse123',
      options: { data: { username, account_type: 'client', adult_confirmed: 'true', terms_version: '2026-11' } },
    });
    expect(error).toBeNull();
    expect(data.session).toBeNull(); // pas de session sans confirmation
    const login = await c.auth.signInWithPassword({ email, password: 'motdepasse123' });
    expect(login.error?.message ?? '').toMatch(/not confirmed/i);
    // Profil bien créé côté base
    expect(sql(`select account_type from public.profiles where username = '${username}'`)).toBe('client');
  });

  it('refuse un e-mail déjà utilisé (pas de second compte)', async () => {
    const u = await createUser('client');
    const c = anonClient();
    const { data } = await c.auth.signUp({
      email: u.email, password: 'motdepasse123',
      options: { data: { username: `dup_${Date.now().toString(36)}`, account_type: 'client' } },
    });
    // Supabase masque l'existence du compte : aucun nouvel utilisateur n'est créé.
    expect(sql(`select count(*) from auth.users where email = '${u.email}'`)).toBe('1');
    expect(data.user?.identities ?? []).toHaveLength(0);
  });

  it('refuse un mot de passe trop faible', async () => {
    const c = anonClient();
    const { error } = await c.auth.signUp({
      email: `faible_${Date.now()}@example.test`, password: 'abc',
      options: { data: { username: `fa_${Date.now().toString(36)}`, account_type: 'client' } },
    });
    expect(error).not.toBeNull();
  });

  it('valide les noms d\'utilisateur (format, réservés, injurieux, doublon)', async () => {
    const c = anonClient();
    const u = await createUser('client');
    const check = async (name: string) => (await c.rpc('check_username', { p_username: name })).data as string | null;
    expect(await check('ab')).toMatch(/3 à 24/);
    expect(await check('admin')).toMatch(/réservé/);
    expect(await check('superconnard')).toMatch(/pas autorisé/);
    expect(await check(u.username)).toMatch(/déjà pris/);
    expect(await check(`libre_${Date.now().toString(36)}`)).toBeNull();
    const { error } = await c.auth.signUp({
      email: `bad_${Date.now()}@example.test`, password: 'motdepasse123',
      options: { data: { username: 'admin', account_type: 'client' } },
    });
    expect(error).not.toBeNull();
  });

  it('empêche de modifier son type de compte, son statut ou le profil d\'un autre', async () => {
    const a = await createUser('client');
    const b = await createUser('client');
    const r1 = await a.client.from('profiles').update({ account_type: 'provider' }).eq('id', a.id);
    expect(r1.error).not.toBeNull();
    const r2 = await a.client.from('profiles').update({ status: 'active' }).eq('id', a.id);
    expect(r2.error).not.toBeNull();
    const r3 = await a.client.from('profiles').update({ commune_id: communeId('arue') }).eq('id', b.id).select();
    expect(r3.data ?? []).toHaveLength(0);
    expect(sql(`select coalesce(commune_id::text, 'null') from public.profiles where id = '${b.id}'`)).toBe('null');
  });

  it('les données privées (téléphone) ne sont visibles que par leur titulaire', async () => {
    const a = await createUser('client');
    const b = await createUser('client');
    await a.client.from('profile_private').update({ phone: '87 00 00 00' }).eq('user_id', a.id);
    const { data } = await b.client.from('profile_private').select('*').eq('user_id', a.id);
    expect(data).toHaveLength(0);
    const own = await a.client.from('profile_private').select('phone').single();
    expect(own.data?.phone).toBe('87 00 00 00');
  });

  it('nom d\'utilisateur : premier changement libre puis 90 jours d\'attente', async () => {
    const a = await createUser('client');
    const n1 = `nouveau_${Date.now().toString(36)}`;
    expect((await a.client.rpc('change_username', { p_new_username: n1 })).error).toBeNull();
    const second = await a.client.rpc('change_username', { p_new_username: `${n1}x` });
    expect(second.error?.message).toMatch(/à partir du/);
    sql(`update public.profiles set username_changed_at = now() - interval '91 days' where id = '${a.id}'`);
    expect((await a.client.rpc('change_username', { p_new_username: `${n1}y` })).error).toBeNull();
  });
});

describe('Visiteurs non connectés', () => {
  it('voient les référentiels mais aucune donnée privée', async () => {
    const c = anonClient();
    const communes = await c.from('communes').select('name');
    expect(communes.data?.length).toBe(12);
    for (const table of ['profiles', 'provider_profiles', 'listings', 'messages', 'proposals', 'notifications']) {
      const r = await c.from(table).select('*').limit(1);
      expect(r.data ?? [], table).toHaveLength(0);
    }
    const s = await c.rpc('search_providers', {});
    expect(s.error).not.toBeNull();
    const l = await c.rpc('create_listing', {
      p_title: 'Titre valide', p_description: 'Description valide', p_commune_id: 1, p_category_ids: [1],
    });
    expect(l.error).not.toBeNull();
  });
});

describe('Fiches prestataires et recherche', () => {
  let pro: TestUser;
  let client: TestUser;
  beforeAll(async () => {
    pro = await createUser('provider');
    client = await createUser('client');
  });

  it('un client ne peut pas créer de fiche prestataire', async () => {
    const { error } = await client.client.from('provider_profiles').insert({
      id: client.id, public_name: 'Faux pro', description: 'x', main_trade_id: 1, commune_id: 1,
    });
    expect(error).not.toBeNull();
  });

  it('un mineur (non confirmé majeur) ne peut pas créer de fiche', async () => {
    const minor = await createUser('provider', { adult: false });
    const { error } = await minor.client.from('provider_profiles').insert({
      id: minor.id, public_name: 'Jeune pro', description: 'x', main_trade_id: 1, commune_id: 1,
    });
    expect(error?.message).toMatch(/majeur/);
  });

  it('la publication exige une photo de profil', async () => {
    const p = await createUser('provider');
    const { error } = await p.client.from('provider_profiles').insert({
      id: p.id, public_name: 'Sans photo', description: 'Description', main_trade_id: 1, commune_id: 1, is_published: true,
    });
    expect(error?.message).toMatch(/photo de profil/);
  });

  it('création, métiers secondaires, disponibilité et recherche', async () => {
    const unique = `Zorglub${Date.now().toString(36)}`;
    await publishProvider(pro, { name: `${unique} Services`, tradeSlug: 'electricien', commune: 'papara',
      description: 'Électricité générale, pose de prises et tableaux.' });
    const clim = Number(sql(`select id from public.trades where slug = 'climaticien'`));
    expect((await pro.client.from('provider_trades').insert({ provider_id: pro.id, trade_id: clim })).error).toBeNull();
    expect((await pro.client.from('provider_profiles').update({ availability: 'busy' }).eq('id', pro.id)).error).toBeNull();
    // Interdit : se masquer/démasquer soi-même (colonne de modération)
    expect((await pro.client.from('provider_profiles').update({ is_hidden: false }).eq('id', pro.id)).error).not.toBeNull();

    const byName = await client.client.rpc('search_providers', { p_query: unique.toLowerCase().slice(0, 9) });
    expect(byName.error).toBeNull();
    expect(byName.data?.map((r: { id: string }) => r.id)).toContain(pro.id);

    const byPrefix = await client.client.rpc('search_providers', { p_query: `${unique} electri` });
    expect(byPrefix.data?.[0]?.id).toBe(pro.id);

    const bySecondary = await client.client.rpc('search_providers', { p_trade_id: clim, p_query: unique });
    expect(bySecondary.data?.map((r: { id: string }) => r.id)).toContain(pro.id);

    const wrongCommune = await client.client.rpc('search_providers', { p_query: unique, p_commune_id: communeId('arue') });
    expect(wrongCommune.data).toHaveLength(0);
    const wrongAvail = await client.client.rpc('search_providers', { p_query: unique, p_availability: 'available' });
    expect(wrongAvail.data).toHaveLength(0);
    const okAvail = await client.client.rpc('search_providers', { p_query: unique, p_availability: 'busy' });
    expect(okAvail.data).toHaveLength(1);
  });

  it('un client ne peut pas modifier la fiche d\'un prestataire', async () => {
    const r = await client.client.from('provider_profiles').update({ public_name: 'Piraté' }).eq('id', pro.id).select();
    expect(r.data ?? []).toHaveLength(0);
    expect(sql(`select public_name from public.provider_profiles where id = '${pro.id}'`)).not.toBe('Piraté');
  });

  it('galerie : 10 photos maximum, suppression possible', async () => {
    for (let i = 0; i < 10; i += 1) {
      const path = `${pro.id}/${fileName()}`;
      const { error } = await pro.client.from('provider_photos').insert({ provider_id: pro.id, storage_path: path, position: i });
      expect(error).toBeNull();
    }
    const eleventh = await pro.client.from('provider_photos').insert({ provider_id: pro.id, storage_path: `${pro.id}/${fileName()}` });
    expect(eleventh.error?.message).toMatch(/10 photos/);
    const { data } = await pro.client.from('provider_photos').select('id').limit(1);
    expect((await pro.client.from('provider_photos').delete().eq('id', data![0].id)).error).toBeNull();
    // Chemin hors de son dossier refusé
    const bad = await pro.client.from('provider_photos').insert({ provider_id: pro.id, storage_path: `${client.id}/${fileName()}` });
    expect(bad.error).not.toBeNull();
  });

  it('stockage : impossible de déposer un fichier dans le dossier d\'un autre ou avec une extension interdite', async () => {
    const other = await client.client.storage.from('avatars').upload(`${pro.id}/${fileName()}`, PNG_BYTES, { contentType: 'image/png' });
    expect(other.error).not.toBeNull();
    const exe = await client.client.storage.from('avatars').upload(`${client.id}/${fileName('exe')}`, PNG_BYTES, { contentType: 'image/png' });
    expect(exe.error).not.toBeNull();
    const svg = await client.client.storage.from('avatars').upload(`${client.id}/${fileName('png')}`, Buffer.from('<svg/>'), { contentType: 'image/svg+xml' });
    expect(svg.error).not.toBeNull();
    const gallery = await client.client.storage.from('provider-photos').upload(`${client.id}/${fileName()}`, PNG_BYTES, { contentType: 'image/png' });
    expect(gallery.error).not.toBeNull(); // un client n'a pas de galerie
    const big = await client.client.storage.from('avatars').upload(`${client.id}/${fileName('jpg')}`, Buffer.alloc(5_300_000), { contentType: 'image/jpeg' });
    expect(big.error).not.toBeNull(); // > 5 Mo
  });
});

describe('Annonces, propositions et missions', () => {
  let client: TestUser;
  let pro1: TestUser;
  let pro2: TestUser;
  let outsider: TestUser;
  beforeAll(async () => {
    client = await createUser('client');
    pro1 = await createUser('provider');
    pro2 = await createUser('provider');
    outsider = await createUser('client');
    await publishProvider(pro1);
    await publishProvider(pro2, { tradeSlug: 'jardinier' });
  });

  it('valide les champs côté serveur', async () => {
    const short = client.client.rpc('create_listing', {
      p_title: 'abc', p_description: 'Description assez longue', p_commune_id: communeId('papara'),
      p_category_ids: [categoryId('electricite')],
    });
    expect((await short).error?.message).toMatch(/5 caractères/);
    const noCat = await client.client.rpc('create_listing', {
      p_title: 'Titre correct', p_description: 'Description assez longue', p_commune_id: communeId('papara'), p_category_ids: [],
    });
    expect(noCat.error?.message).toMatch(/catégorie/);
    const pastDate = await client.client.rpc('create_listing', {
      p_title: 'Titre correct', p_description: 'Description assez longue', p_commune_id: communeId('papara'),
      p_category_ids: [categoryId('electricite')], p_date_mode: 'precise', p_desired_date: '2020-01-01',
    });
    expect(pastDate.error?.message).toMatch(/date à venir/);
  });

  it('un prestataire ne peut pas publier ni modifier une annonce', async () => {
    const r = await pro1.client.rpc('create_listing', {
      p_title: 'Titre correct', p_description: 'Description assez longue', p_commune_id: communeId('papara'),
      p_category_ids: [categoryId('electricite')],
    });
    expect(r.error?.message).toMatch(/clients/);
    const id = await createListing(client);
    const upd = await pro1.client.from('listings').update({ title: 'Piraté !!' }).eq('id', id);
    expect(upd.error).not.toBeNull();
    const rpc = await pro1.client.rpc('update_listing', {
      p_listing_id: id, p_title: 'Piraté !!', p_description: 'Description piratée', p_commune_id: communeId('papara'),
      p_category_ids: [categoryId('electricite')],
    });
    expect(rpc.error).not.toBeNull();
  });

  it('modifications : 3 maximum, historique conservé, prestataires prévenus', async () => {
    const id = await createListing(client);
    await pro1.client.rpc('submit_proposal', { p_listing_id: id, p_message: 'Disponible demain.' });
    for (let i = 1; i <= 3; i += 1) {
      const { error } = await client.client.rpc('update_listing', {
        p_listing_id: id, p_title: `Installation de prises v${i}`, p_description: 'Description modifiée suffisamment longue',
        p_commune_id: communeId('papara'), p_category_ids: [categoryId('electricite')], p_budget_xpf: 15000 + i,
      });
      expect(error).toBeNull();
    }
    const fourth = await client.client.rpc('update_listing', {
      p_listing_id: id, p_title: 'Installation de prises v4', p_description: 'Description modifiée suffisamment longue',
      p_commune_id: communeId('papara'), p_category_ids: [categoryId('electricite')],
    });
    expect(fourth.error?.message).toMatch(/limite de 3/);
    const revs = await client.client.from('listing_revisions').select('id').eq('listing_id', id);
    expect(revs.data).toHaveLength(3);
    const notifs = await pro1.client.from('notifications').select('type').eq('type', 'listing_updated').eq('ref_id', id);
    expect(notifs.data?.length).toBe(3);
  });

  it('photos d\'annonce : 3 maximum, stockage privé lisible par les membres seulement', async () => {
    const id = await createListing(client);
    for (let i = 0; i < 3; i += 1) {
      const path = `${client.id}/${id}/${fileName()}`;
      expect((await client.client.storage.from('listing-photos').upload(path, PNG_BYTES, { contentType: 'image/png' })).error).toBeNull();
      expect((await client.client.from('listing_photos').insert({ listing_id: id, storage_path: path, position: i })).error).toBeNull();
    }
    const fourth = await client.client.from('listing_photos').insert({ listing_id: id, storage_path: `${client.id}/${id}/${fileName()}` });
    expect(fourth.error?.message).toMatch(/3 photos/);
    // Un autre utilisateur ne peut pas ajouter de photo à cette annonce
    const foreign = await outsider.client.storage.from('listing-photos')
      .upload(`${outsider.id}/${id}/${fileName()}`, PNG_BYTES, { contentType: 'image/png' });
    expect(foreign.error).not.toBeNull();
    const { data: photos } = await pro1.client.from('listing_photos').select('storage_path').eq('listing_id', id);
    const signed = await pro1.client.storage.from('listing-photos').createSignedUrl(photos![0].storage_path, 60);
    expect(signed.error).toBeNull();
    const anon = await anonClient().storage.from('listing-photos').createSignedUrl(photos![0].storage_path, 60);
    expect(anon.error).not.toBeNull();
  });

  it('parcours complet : proposition → choix → confirmation → terminée', async () => {
    const id = await createListing(client);
    const { data: p1, error } = await pro1.client.rpc('submit_proposal', { p_listing_id: id, p_message: 'Je peux passer jeudi.', p_price_xpf: 12000 });
    expect(error).toBeNull();
    const dup = await pro1.client.rpc('submit_proposal', { p_listing_id: id, p_message: 'Encore moi' });
    expect(dup.error?.message).toMatch(/déjà répondu/);
    const { data: p2 } = await pro2.client.rpc('submit_proposal', { p_listing_id: id, p_message: 'Moi aussi.' });
    expect(sql(`select status from public.listings where id = '${id}'`)).toBe('in_discussion');

    // Confidentialité des propositions
    const pro2sees = await pro2.client.from('proposals').select('id').eq('listing_id', id);
    expect(pro2sees.data).toHaveLength(1);
    const outsiderSees = await outsider.client.from('proposals').select('id').eq('listing_id', id);
    expect(outsiderSees.data).toHaveLength(0);
    const clientSees = await client.client.from('proposals').select('id').eq('listing_id', id);
    expect(clientSees.data).toHaveLength(2);

    // Le client ne peut pas falsifier une proposition
    expect((await client.client.from('proposals').update({ status: 'accepted' }).eq('id', p1)).error).not.toBeNull();

    // Seul le client propriétaire peut choisir
    expect((await outsider.client.rpc('select_proposal', { p_proposal_id: p1 })).error).not.toBeNull();
    const { data: missionId, error: selErr } = await client.client.rpc('select_proposal', { p_proposal_id: p1 });
    expect(selErr).toBeNull();
    expect(sql(`select status from public.listings where id = '${id}'`)).toBe('awaiting_confirmation');

    // Annonce fermée aux nouvelles propositions
    const late = await createUser('provider');
    await publishProvider(late);
    expect((await late.client.rpc('submit_proposal', { p_listing_id: id, p_message: 'Trop tard ?' })).error?.message).toMatch(/n'accepte plus/);

    // Une simple discussion ne vaut pas acceptation : seul le prestataire choisi confirme
    expect((await pro2.client.rpc('confirm_mission', { p_mission_id: missionId })).error).not.toBeNull();
    expect((await client.client.rpc('confirm_mission', { p_mission_id: missionId })).error).not.toBeNull();
    expect((await pro1.client.rpc('confirm_mission', { p_mission_id: missionId })).error).toBeNull();
    expect(sql(`select status from public.listings where id = '${id}'`)).toBe('assigned');
    expect(sql(`select status from public.proposals where id = '${p2}'`)).toBe('not_selected');

    // Champs verrouillés après confirmation
    const edit = await client.client.rpc('update_listing', {
      p_listing_id: id, p_title: 'Nouveau titre ici', p_description: 'Nouvelle description longue',
      p_commune_id: communeId('papara'), p_category_ids: [categoryId('electricite')],
    });
    expect(edit.error?.message).toMatch(/ne peut plus être modifiée/);

    expect((await pro1.client.rpc('complete_mission', { p_mission_id: missionId })).error).not.toBeNull();
    expect((await client.client.rpc('complete_mission', { p_mission_id: missionId })).error).toBeNull();
    expect(sql(`select status from public.listings where id = '${id}'`)).toBe('completed');

    const types = (await client.client.from('notifications').select('type').eq('ref_id', missionId)).data?.map((n) => n.type);
    expect(types).toContain('mission_confirmed');
  });

  it('refus du prestataire et annulation : l\'annonce redevient ouverte', async () => {
    const id = await createListing(client);
    const { data: p1 } = await pro1.client.rpc('submit_proposal', { p_listing_id: id, p_message: 'Dispo.' });
    const { data: p2 } = await pro2.client.rpc('submit_proposal', { p_listing_id: id, p_message: 'Dispo aussi.' });
    const { data: m1 } = await client.client.rpc('select_proposal', { p_proposal_id: p1 });
    expect((await pro1.client.rpc('decline_mission', { p_mission_id: m1 })).error).toBeNull();
    expect(sql(`select status from public.listings where id = '${id}'`)).toBe('in_discussion');

    const { data: m2 } = await client.client.rpc('select_proposal', { p_proposal_id: p2 });
    expect((await pro2.client.rpc('confirm_mission', { p_mission_id: m2 })).error).toBeNull();
    expect((await outsider.client.rpc('cancel_mission', { p_mission_id: m2 })).error).not.toBeNull();
    expect((await pro2.client.rpc('cancel_mission', { p_mission_id: m2, p_reason: 'Empêchement' })).error).toBeNull();
    expect(sql(`select status from public.missions where id = '${m2}'`)).toBe('cancelled');
    expect(['published', 'in_discussion']).toContain(sql(`select status from public.listings where id = '${id}'`));

    // Refus d'une proposition par le client
    const { data: p3 } = await (await (async () => {
      const p3u = await createUser('provider');
      await publishProvider(p3u);
      return p3u;
    })()).client.rpc('submit_proposal', { p_listing_id: id, p_message: 'Autre offre' });
    expect((await client.client.rpc('decline_proposal', { p_proposal_id: p3 })).error).toBeNull();
    expect(sql(`select status from public.proposals where id = '${p3}'`)).toBe('declined');
  });

  it('clics simultanés : une annonce ne peut pas être attribuée deux fois', async () => {
    const id = await createListing(client);
    const { data: p1 } = await pro1.client.rpc('submit_proposal', { p_listing_id: id, p_message: 'A' });
    const { data: p2 } = await pro2.client.rpc('submit_proposal', { p_listing_id: id, p_message: 'B' });
    const results = await Promise.all([
      client.client.rpc('select_proposal', { p_proposal_id: p1 }),
      client.client.rpc('select_proposal', { p_proposal_id: p2 }),
      client.client.rpc('select_proposal', { p_proposal_id: p1 }),
    ]);
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    expect(sql(`select count(*) from public.missions where listing_id = '${id}'`)).toBe('1');
  });

  it('expiration, renouvellement gratuit et annulation', async () => {
    const id = await createListing(client);
    await pro1.client.rpc('submit_proposal', { p_listing_id: id, p_message: 'Ok' });
    sql(`update public.listings set expires_at = now() - interval '1 minute' where id = '${id}'`);
    sql('select private.expire_listings()');
    expect(sql(`select status from public.listings where id = '${id}'`)).toBe('expired');
    const late = await pro2.client.rpc('submit_proposal', { p_listing_id: id, p_message: 'Après expiration' });
    expect(late.error).not.toBeNull();
    const n = await client.client.from('notifications').select('type').eq('ref_id', id).eq('type', 'listing_expired');
    expect(n.data).toHaveLength(1);
    expect((await client.client.rpc('renew_listing', { p_listing_id: id })).error).toBeNull();
    expect(sql(`select status from public.listings where id = '${id}'`)).toBe('in_discussion');
    expect(sql(`select renewal_count from public.listings where id = '${id}'`)).toBe('1');
    // L'historique des propositions est conservé
    expect(sql(`select count(*) from public.proposals where listing_id = '${id}'`)).toBe('1');
    expect((await client.client.rpc('cancel_listing', { p_listing_id: id })).error).toBeNull();
    expect((await pro2.client.rpc('submit_proposal', { p_listing_id: id, p_message: 'Après annulation' })).error).not.toBeNull();
  });
});

describe('Messagerie', () => {
  let client: TestUser;
  let pro: TestUser;
  let intruder: TestUser;
  let conversationId: string;
  beforeAll(async () => {
    client = await createUser('client');
    pro = await createUser('provider');
    intruder = await createUser('provider');
    await publishProvider(pro);
    await publishProvider(intruder);
  });

  it('un prestataire ne peut pas démarrer une conversation avec un client', async () => {
    const r = await pro.client.rpc('start_conversation', { p_provider_id: client.id });
    expect(r.error).not.toBeNull();
  });

  it('un client contacte un prestataire, qui peut répondre', async () => {
    const { data, error } = await client.client.rpc('start_conversation', { p_provider_id: pro.id });
    expect(error).toBeNull();
    conversationId = data as string;
    expect((await client.client.from('messages').insert({ conversation_id: conversationId, body: 'Bonjour, êtes-vous dispo ?' })).error).toBeNull();
    expect((await pro.client.from('messages').insert({ conversation_id: conversationId, body: 'Oui, demain matin.' })).error).toBeNull();
    const list = await client.client.rpc('my_conversations');
    const conv = list.data?.find((c: { id: string }) => c.id === conversationId);
    expect(conv?.unread_count).toBe(1);
    expect(conv?.last_message_preview).toBe('Oui, demain matin.');
    await client.client.rpc('mark_conversation_read', { p_conversation_id: conversationId });
    expect((await client.client.rpc('unread_messages_count')).data).toBe(0);
    const notif = await pro.client.from('notifications').select('type').eq('ref_id', conversationId);
    expect(notif.data?.[0]?.type).toBe('message');
  });

  it('un troisième compte ne peut ni lire, ni écrire, ni modifier', async () => {
    const read = await intruder.client.from('messages').select('*').eq('conversation_id', conversationId);
    expect(read.data).toHaveLength(0);
    const conv = await intruder.client.from('conversations').select('*').eq('id', conversationId);
    expect(conv.data).toHaveLength(0);
    const write = await intruder.client.from('messages').insert({ conversation_id: conversationId, body: 'Intrusion' });
    expect(write.error).not.toBeNull();
    const msgId = sql(`select id from public.messages where conversation_id = '${conversationId}' limit 1`);
    const upd = await client.client.from('messages').update({ body: 'modifié' }).eq('id', msgId);
    expect(upd.error).not.toBeNull();
    const del = await client.client.from('messages').delete().eq('id', msgId).select();
    expect(del.data ?? []).toHaveLength(0);
    expect(sql(`select count(*) from public.messages where conversation_id = '${conversationId}'`)).toBe('2');
  });

  it('usurpation et faux messages système refusés', async () => {
    const spoof = await client.client.from('messages').insert({ conversation_id: conversationId, body: 'Faux', sender_id: pro.id });
    expect(spoof.error).not.toBeNull();
    const system = await client.client.from('messages').insert({ conversation_id: conversationId, body: 'Faux système', kind: 'system' });
    expect(system.error).not.toBeNull();
  });

  it('anti-spam : envoi en masse bloqué', async () => {
    let blocked = false;
    for (let i = 0; i < 25; i += 1) {
      const r = await client.client.from('messages').insert({ conversation_id: conversationId, body: `spam ${i}` });
      if (r.error) {
        blocked = true;
        expect(r.error.message).toMatch(/patienter/);
        break;
      }
    }
    expect(blocked).toBe(true);
  });
});

describe('Signalements, modération et administration', () => {
  it('signalements : pas de doublon, masquage auto à 3 comptes distincts, contestation', async () => {
    const owner = await createUser('client');
    const listingId = await createListing(owner);
    const reporters = await Promise.all([createUser('client'), createUser('provider'), createUser('client')]);
    // Comptes "anciens" (> 24 h) pour compter dans le seuil
    sql(`update public.profiles set created_at = now() - interval '2 days' where id in (${reporters.map((r) => `'${r.id}'`).join(',')})`);

    expect((await owner.client.rpc('report_content', { p_target_type: 'listing', p_target_id: listingId, p_reason: 'spam' })).error).not.toBeNull();
    expect((await reporters[0].client.rpc('report_content', { p_target_type: 'listing', p_target_id: listingId, p_reason: 'spam' })).error).toBeNull();
    const dup = await reporters[0].client.rpc('report_content', { p_target_type: 'listing', p_target_id: listingId, p_reason: 'fraud' });
    expect(dup.error?.message).toMatch(/déjà signalé/);
    await reporters[1].client.rpc('report_content', { p_target_type: 'listing', p_target_id: listingId, p_reason: 'fraud' });
    expect(sql(`select is_hidden from public.listings where id = '${listingId}'`)).toBe('f');
    await reporters[2].client.rpc('report_content', { p_target_type: 'listing', p_target_id: listingId, p_reason: 'other', p_details: 'Arnaque' });
    expect(sql(`select is_hidden from public.listings where id = '${listingId}'`)).toBe('t');

    // Invisible pour les autres, toujours visible pour son propriétaire
    expect((await reporters[0].client.from('listings').select('id').eq('id', listingId)).data).toHaveLength(0);
    expect((await owner.client.from('listings').select('id').eq('id', listingId)).data).toHaveLength(1);
    const hidden = await owner.client.rpc('my_hidden_content');
    expect(hidden.data?.[0]?.target_id).toBe(listingId);
    expect((await owner.client.rpc('submit_appeal', { p_target_type: 'listing', p_target_id: listingId, p_message: 'Mon annonce est légitime.' })).error).toBeNull();
    expect((await reporters[0].client.rpc('submit_appeal', { p_target_type: 'listing', p_target_id: listingId, p_message: 'Je conteste' })).error).not.toBeNull();
  });

  it('les comptes récents ne suffisent pas à masquer un contenu (protection contre les abus)', async () => {
    const owner = await createUser('client');
    const listingId = await createListing(owner);
    for (const r of await Promise.all([createUser('client'), createUser('client'), createUser('client')])) {
      await r.client.rpc('report_content', { p_target_type: 'listing', p_target_id: listingId, p_reason: 'spam' });
    }
    expect(sql(`select is_hidden from public.listings where id = '${listingId}'`)).toBe('f');
  });

  it('un compte normal ne peut pas accéder à l\'administration ni se donner le rôle', async () => {
    const u = await createUser('client');
    expect((await u.client.rpc('admin_stats')).error?.message).toMatch(/réservé/);
    expect((await u.client.rpc('admin_list_users', {})).error).not.toBeNull();
    expect((await u.client.from('user_roles').insert({ user_id: u.id, role: 'admin' })).error).not.toBeNull();
    expect((await u.client.from('admin_audit_log').select('*')).data).toHaveLength(0);
    expect((await u.client.from('categories').insert({ slug: 'pirate', name: 'Pirate' })).error).not.toBeNull();
    expect((await u.client.rpc('is_admin')).data).toBe(false);
  });

  it('un administrateur gère les comptes, contenus et métiers (actions journalisées)', async () => {
    const a = await createUser('client');
    sql(`insert into public.user_roles (user_id, role) values ('${a.id}', 'admin')`);
    expect((await a.client.rpc('is_admin')).data).toBe(true);
    const stats = await a.client.rpc('admin_stats');
    expect(stats.error).toBeNull();
    expect(stats.data.accounts).toBeGreaterThan(0);

    const target = await createUser('provider');
    await publishProvider(target);
    expect((await a.client.rpc('admin_set_user_status', { p_user_id: target.id, p_status: 'suspended', p_reason: '' })).error).not.toBeNull();
    expect((await a.client.rpc('admin_set_user_status', { p_user_id: target.id, p_status: 'suspended', p_reason: 'Fraude avérée' })).error).toBeNull();
    expect(sql(`select banned_until is not null from auth.users where id = '${target.id}'`)).toBe('t');
    const viewer = await createUser('client');
    const s = await viewer.client.rpc('search_providers', { p_query: target.username });
    expect((s.data ?? []).map((r: { id: string }) => r.id)).not.toContain(target.id);
    expect((await a.client.rpc('admin_set_user_status', { p_user_id: target.id, p_status: 'active', p_reason: 'Erreur' })).error).toBeNull();

    const cat = await a.client.from('categories').insert({ slug: `test-${Date.now().toString(36)}`, name: 'Catégorie test', sort_order: 999 }).select().single();
    expect(cat.error).toBeNull();
    expect((await a.client.from('categories').update({ is_active: false }).eq('id', cat.data!.id)).error).toBeNull();
    const log = await a.client.from('admin_audit_log').select('action').order('id', { ascending: false }).limit(5);
    expect(log.data?.map((l) => l.action)).toEqual(expect.arrayContaining(['update_categories', 'reactivate_user']));
  });
});

describe('Suppression de compte et export', () => {
  it('export des données puis suppression : messages anonymisés chez l\'autre partie', async () => {
    const client = await createUser('client');
    const pro = await createUser('provider');
    await publishProvider(pro);
    const { data: conv } = await client.client.rpc('start_conversation', { p_provider_id: pro.id });
    await client.client.from('messages').insert({ conversation_id: conv, body: 'Bonjour !' });

    const exp = await client.client.rpc('export_my_data');
    expect(exp.error).toBeNull();
    expect(exp.data.profile.username).toBe(client.username);
    expect(exp.data.messages_sent).toHaveLength(1);

    expect((await client.client.rpc('delete_my_account', { p_confirm_username: 'mauvais' })).error).not.toBeNull();
    expect((await client.client.rpc('delete_my_account', { p_confirm_username: client.username })).error).toBeNull();
    expect(sql(`select count(*) from auth.users where id = '${client.id}'`)).toBe('0');
    expect(sql(`select count(*) from public.profiles where id = '${client.id}'`)).toBe('0');
    const msgs = await pro.client.from('messages').select('sender_id, body').eq('conversation_id', conv);
    expect(msgs.data?.[0]).toMatchObject({ sender_id: null, body: 'Bonjour !' });
    // L'autre partie ne peut plus écrire dans le vide
    expect((await pro.client.from('messages').insert({ conversation_id: conv, body: 'Allô ?' })).error).not.toBeNull();
  });
});

describe('Comptes inactifs', () => {
  it('rappel après 6 mois puis masquage 30 jours plus tard, réactivation au retour', async () => {
    const pro = await createUser('provider');
    await publishProvider(pro);
    sql(`update public.profiles set last_active_at = now() - interval '7 months' where id = '${pro.id}'`);
    sql('select private.process_inactive_accounts()');
    expect(sql(`select inactivity_reminder_sent_at is not null from public.profiles where id = '${pro.id}'`)).toBe('t');
    sql(`update public.profiles set inactivity_reminder_sent_at = now() - interval '31 days' where id = '${pro.id}'`);
    sql('select private.process_inactive_accounts()');
    expect(sql(`select hidden_for_inactivity from public.profiles where id = '${pro.id}'`)).toBe('t');
    expect(sql(`select private.provider_is_visible('${pro.id}')`)).toBe('f');
    expect(sql(`select count(*) from auth.users where id = '${pro.id}'`)).toBe('1'); // jamais supprimé
    await pro.client.rpc('touch_activity');
    expect(sql(`select private.provider_is_visible('${pro.id}')`)).toBe('t');
  });
});

void admin;
