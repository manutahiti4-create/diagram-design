// Données de DÉMONSTRATION — réservées au développement local.
// Usage : npm run seed:demo   (Supabase local démarré)
//
// Crée (ou recrée) des comptes fictifs clairement marqués « démo » :
//   demo_client@fenuamatch.test, demo_electricien@…, demo_jardinier@…, demo_admin@…  (mot de passe : demo1234)
// Refuse de s'exécuter sur une base distante (production).
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const url = process.env.TEST_SUPABASE_URL;
const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY;
const anonKey = process.env.TEST_SUPABASE_ANON_KEY;
const dbUrl = process.env.TEST_DB_URL;
if (!url || !serviceKey || !anonKey) {
  console.error('Lancez ce script via : npm run seed:demo');
  process.exit(1);
}
if (!/127\.0\.0\.1|localhost/.test(url)) {
  console.error('Refusé : les données de démonstration ne doivent jamais être injectées dans une base distante.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const PASSWORD = 'demo1234';
const sql = (q) => execFileSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-At', '-c', q], { encoding: 'utf8' }).trim();

async function avatarPng(initials, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="${color}"/>
    <text x="128" y="160" font-family="Arial, Helvetica, sans-serif" font-size="110" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

async function workPhoto(label, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="${color}"/>
    <text x="400" y="290" font-family="Arial, Helvetica, sans-serif" font-size="44" fill="#fff" text-anchor="middle">${label}</text>
    <text x="400" y="350" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#ffffffcc" text-anchor="middle">Image de démonstration</text></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
}

async function resetUser(email, username, type) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list.users.find((u) => u.email === email);
  if (existing) await admin.auth.admin.deleteUser(existing.id);
  const { data, error } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
    user_metadata: { username, account_type: type, adult_confirmed: 'true', terms_version: '2026-11' },
  });
  if (error) throw error;
  sql(`update public.profiles set is_demo = true where id = '${data.user.id}'`);
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: e2 } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (e2) throw e2;
  return { id: data.user.id, client };
}

const ids = (q) => Object.fromEntries(sql(q).split('\n').map((l) => l.split('|')).map(([k, v]) => [k, Number(v)]));
const communes = ids('select slug, id from public.communes');
const trades = ids('select slug, id from public.trades');
const categories = ids('select slug, id from public.categories');

async function uploadAvatar(u, initials, color) {
  const path = `${u.id}/${randomUUID()}.jpg`;
  const { error } = await u.client.storage.from('avatars').upload(path, await avatarPng(initials, color), { contentType: 'image/jpeg' });
  if (error) throw error;
  await u.client.from('profiles').update({ avatar_path: path }).eq('id', u.id);
}

async function provider(u, { name, trade, secondary = [], commune, description, availability, phone, hours, area, photos }) {
  const { error } = await u.client.from('provider_profiles').insert({
    id: u.id, public_name: name, main_trade_id: trades[trade], commune_id: communes[commune], description,
    availability, phone, opening_hours: hours, service_area: area, is_published: true,
  });
  if (error) throw error;
  if (secondary.length) await u.client.from('provider_trades').insert(secondary.map((s) => ({ provider_id: u.id, trade_id: trades[s] })));
  for (const [i, [label, color]] of photos.entries()) {
    const path = `${u.id}/${randomUUID()}.jpg`;
    await u.client.storage.from('provider-photos').upload(path, await workPhoto(label, color), { contentType: 'image/jpeg' });
    await u.client.from('provider_photos').insert({ provider_id: u.id, storage_path: path, caption: label, position: i });
  }
}

async function listing(u, { title, description, commune, cats, budget, dateMode = 'flexible' }) {
  const { data, error } = await u.client.rpc('create_listing', {
    p_title: title, p_description: description, p_commune_id: communes[commune], p_category_ids: cats.map((c) => categories[c]),
    p_budget_xpf: budget, p_date_mode: dateMode, p_publish: true,
  });
  if (error) throw error;
  sql(`update public.listings set is_demo = true where id = '${data}'`);
  return data;
}

console.log('Création des comptes de démonstration…');
const client = await resetUser('demo_client@fenuamatch.test', 'demo_client', 'client');
const client2 = await resetUser('demo_cliente2@fenuamatch.test', 'demo_hina', 'client');
const elec = await resetUser('demo_electricien@fenuamatch.test', 'demo_electricien', 'provider');
const jardin = await resetUser('demo_jardinier@fenuamatch.test', 'demo_jardinier', 'provider');
const adminUser = await resetUser('demo_admin@fenuamatch.test', 'demo_gestion', 'client');
sql(`insert into public.user_roles (user_id, role) values ('${adminUser.id}', 'admin') on conflict do nothing`);

await uploadAvatar(client, 'C', '#5b6573');
await uploadAvatar(elec, 'TE', '#0F2A5A');
await uploadAvatar(jardin, 'JV', '#1b7f3b');

await provider(elec, {
  name: '[Démo] Teva Électricité', trade: 'electricien', secondary: ['climaticien', 'videosurveillance', 'depannage-informatique'],
  commune: 'papara', availability: 'available', phone: '87 00 00 01', hours: 'Du lundi au samedi, 7h–17h', area: 'Toute la côte ouest, de Faa\'a à Teva I Uta',
  description: 'Compte de démonstration. Électricien : installation et mise aux normes, tableaux électriques, prises et éclairage. Également pose de climatiseurs et de caméras de surveillance.',
  photos: [['Tableau électrique', '#0F2A5A'], ['Pose de spots', '#1b3d7a'], ['Climatiseur installé', '#00796f']],
});
await provider(jardin, {
  name: '[Démo] Jardins de Vairao', trade: 'jardinier', secondary: ['elagueur'], commune: 'taiarapu-ouest', availability: 'busy',
  hours: 'Tous les jours sauf dimanche', area: 'Presqu\'île et Taravao',
  description: 'Compte de démonstration. Entretien de jardins, tonte, taille de haies, élagage de cocotiers et évacuation des déchets verts.',
  photos: [['Tonte de pelouse', '#1b7f3b'], ['Élagage', '#2e7d32']],
});

console.log('Création des annonces…');
const l1 = await listing(client, {
  title: '[Démo] Installation de trois prises électriques', commune: 'papara', cats: ['electricite'], budget: 15000,
  description: 'Annonce de démonstration. Je recherche quelqu\'un pour installer trois prises électriques dans le salon.',
});
await listing(client, {
  title: '[Démo] Entretien de jardin mensuel', commune: 'paea', cats: ['jardinage'], dateMode: 'asap',
  description: 'Annonce de démonstration. Tonte et taille de haie une fois par mois, terrain d\'environ 600 m².',
});
await listing(client2, {
  title: '[Démo] Fuite sous l\'évier de la cuisine', commune: 'pirae', cats: ['plomberie'], budget: 8000, dateMode: 'asap',
  description: 'Annonce de démonstration. Petite fuite sous l\'évier, le meuble commence à gonfler.',
});

const { data: p1, error: pe } = await elec.client.rpc('submit_proposal', {
  p_listing_id: l1, p_message: 'Ia ora na ! Je peux passer jeudi matin pour voir l\'installation. Matériel compris.', p_price_xpf: 14000,
});
if (pe) throw pe;
const { data: conv } = await client.client.rpc('start_conversation', { p_provider_id: elec.id });
await client.client.from('messages').insert({ conversation_id: conv, body: 'Bonjour, jeudi matin ça me va. Vers 8h ?' });
await elec.client.from('messages').insert({ conversation_id: conv, body: 'Parfait, 8h jeudi. Je vous demanderai l\'adresse exacte la veille.' });
console.log(`Proposition ${p1} et conversation créées.`);

console.log('\nTerminé. Comptes de démonstration (mot de passe : demo1234) :');
console.log('  demo_client@fenuamatch.test      (client)');
console.log('  demo_cliente2@fenuamatch.test    (client)');
console.log('  demo_electricien@fenuamatch.test (prestataire)');
console.log('  demo_jardinier@fenuamatch.test   (prestataire)');
console.log('  demo_admin@fenuamatch.test       (administrateur)');
