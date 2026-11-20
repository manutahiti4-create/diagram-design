// API de synchronisation "Notre petit cocon" (Cloudflare Pages Functions + D1)
// Routes : POST /api/household · POST /api/join · POST /api/invite · POST /api/sync · GET /api/status

const MAX_CHANGES = 400;          // documents envoyés par requête
const MAX_PULL = 500;             // documents renvoyés par requête
const MAX_DOC_BYTES = 256 * 1024; // taille max d'un document
const INVITE_DAYS = 7;
const MAX_MEMBERS = 2;
const MAX_HOUSEHOLDS = 1;        // appli privée : un seul foyer (le vôtre)

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
const fail = (status, code, message) => json({ error: code, message }, status);

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomToken(bytes = 32) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I pour éviter les confusions
function inviteCode() {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  const s = [...a].map((b) => ALPHA[b % 32]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}
const normCode = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const nowIso = () => new Date().toISOString();
const validUid = (u) => typeof u === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(u);
const validPath = (p) =>
  typeof p === "string" && p.length <= 300 && /^[A-Za-z0-9_\-.~:@+]+(\/[A-Za-z0-9_\-.~:@+]+)*$/.test(p) && !p.split("/").some((s) => s === "." || s === "..");
const ownerOf = (path) => {
  const s = path.split("/");
  return s[0] === "data" && s[1] === "users" && s[2] ? s[2] : null;
};

async function readBody(request) {
  try {
    const t = await request.text();
    if (t.length > 4 * 1024 * 1024) return null;
    return t ? JSON.parse(t) : {};
  } catch {
    return null;
  }
}

async function auth(env, request) {
  const h = request.headers.get("authorization") || "";
  const m = /^Bearer ([a-f0-9]{64})$/.exec(h);
  if (!m) return null;
  const dev = await env.DB.prepare("SELECT household_id, user_id FROM devices WHERE token_hash = ?").bind(await sha256(m[1])).first();
  return dev || null;
}

async function newDevice(env, household, uid) {
  const token = randomToken();
  await env.DB.prepare("INSERT INTO devices (token_hash, household_id, user_id, created_at, last_seen) VALUES (?, ?, ?, ?, ?)")
    .bind(await sha256(token), household, uid, nowIso(), nowIso()).run();
  return token;
}
async function setInvite(env, household) {
  const code = inviteCode();
  const exp = new Date(Date.now() + INVITE_DAYS * 864e5).toISOString();
  await env.DB.prepare("UPDATE households SET invite_hash = ?, invite_expires = ? WHERE id = ?").bind(await sha256(normCode(code)), exp, household).run();
  return { code, expires: exp };
}
async function memberIds(env, household) {
  const r = await env.DB.prepare("SELECT DISTINCT user_id FROM devices WHERE household_id = ?").bind(household).all();
  return r.results.map((x) => x.user_id);
}

async function routeHousehold(env, body) {
  if (!validUid(body.uid)) return fail(400, "bad_uid", "Identifiant d'appareil invalide.");
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM households").first();
  if (n && n.n >= MAX_HOUSEHOLDS) return fail(403, "exists", "Le foyer existe déjà : rejoins-le avec un code d'invitation.");
  const id = "h_" + randomToken(12);
  await env.DB.prepare("INSERT INTO households (id, seq, created_at) VALUES (?, 0, ?)").bind(id, nowIso()).run();
  const token = await newDevice(env, id, body.uid);
  const invite = await setInvite(env, id);
  return json({ household: id, token, invite });
}

async function routeJoin(env, body) {
  if (!validUid(body.uid)) return fail(400, "bad_uid", "Identifiant d'appareil invalide.");
  const code = normCode(body.code);
  if (code.length !== 12) return fail(400, "bad_code", "Le code doit contenir 12 caractères.");
  const h = await env.DB.prepare("SELECT id, invite_expires FROM households WHERE invite_hash = ?").bind(await sha256(code)).first();
  if (!h) return fail(404, "unknown_code", "Code inconnu. Vérifie-le ou demande un nouveau code.");
  if (!h.invite_expires || h.invite_expires < nowIso()) return fail(410, "expired_code", "Ce code a expiré. Demande un nouveau code.");
  const members = await memberIds(env, h.id);
  if (!members.includes(body.uid) && members.length >= MAX_MEMBERS)
    return fail(403, "full", "Ce foyer a déjà ses deux profils.");
  const token = await newDevice(env, h.id, body.uid);
  await env.DB.prepare("UPDATE households SET invite_hash = NULL, invite_expires = NULL WHERE id = ?").bind(h.id).run(); // code à usage unique
  return json({ household: h.id, token });
}

async function routeSync(env, dev, body) {
  const since = Number.isInteger(body.since) && body.since >= 0 ? body.since : 0;
  const changes = Array.isArray(body.changes) ? body.changes.slice(0, MAX_CHANGES) : [];
  const conflicts = [];
  let rejected = 0;
  for (const c of changes) {
    if (!c || !validPath(c.path) || typeof c.updated_at !== "string" || c.updated_at.length > 40) { rejected++; continue; }
    const owner = ownerOf(c.path);
    if (owner && owner !== dev.user_id) { rejected++; continue; } // jamais d'écriture dans l'espace privé de l'autre
    const data = c.deleted ? null : JSON.stringify(c.data ?? null);
    if (data && data.length > MAX_DOC_BYTES) { rejected++; continue; }
    const cur = await env.DB.prepare("SELECT data, deleted, updated_at FROM docs WHERE household_id = ? AND path = ?").bind(dev.household_id, c.path).first();
    if (cur && cur.updated_at > c.updated_at) {
      // le serveur a plus récent : on le renvoie à l'appareil
      conflicts.push({ path: c.path, data: cur.data ? JSON.parse(cur.data) : null, deleted: !!cur.deleted, updated_at: cur.updated_at });
      continue;
    }
    const s = await env.DB.prepare("UPDATE households SET seq = seq + 1 WHERE id = ? RETURNING seq").bind(dev.household_id).first();
    await env.DB.prepare(
      "INSERT INTO docs (household_id, path, data, deleted, owner, updated_at, seq) VALUES (?, ?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT(household_id, path) DO UPDATE SET data = excluded.data, deleted = excluded.deleted, owner = excluded.owner, updated_at = excluded.updated_at, seq = excluded.seq"
    ).bind(dev.household_id, c.path, data, c.deleted ? 1 : 0, owner, c.updated_at, s.seq).run();
  }
  const rows = await env.DB.prepare(
    "SELECT path, data, deleted, updated_at, seq FROM docs WHERE household_id = ? AND seq > ? AND (owner IS NULL OR owner = ?) ORDER BY seq LIMIT ?"
  ).bind(dev.household_id, since, dev.user_id, MAX_PULL + 1).all();
  const more = rows.results.length > MAX_PULL;
  const list = rows.results.slice(0, MAX_PULL);
  let seq = since;
  if (list.length) seq = list[list.length - 1].seq;
  else {
    const h = await env.DB.prepare("SELECT seq FROM households WHERE id = ?").bind(dev.household_id).first();
    seq = Math.max(since, h ? h.seq : since);
  }
  await env.DB.prepare("UPDATE devices SET last_seen = ? WHERE household_id = ? AND user_id = ?").bind(nowIso(), dev.household_id, dev.user_id).run();
  return json({
    seq, more, rejected, conflicts,
    docs: list.map((r) => ({ path: r.path, data: r.data ? JSON.parse(r.data) : null, deleted: !!r.deleted, updated_at: r.updated_at })),
  });
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (!env.DB) return fail(500, "no_db", "Base de données non reliée (binding DB manquant).");
  const route = (params.path || []).join("/");
  const method = request.method;
  try {
    if (method === "GET" && route === "status") {
      const dev = await auth(env, request);
      if (!dev) return fail(401, "auth", "Appareil non reconnu.");
      return json({ ok: true, household: dev.household_id, members: (await memberIds(env, dev.household_id)).length });
    }
    if (method !== "POST") return fail(405, "method", "Méthode non autorisée.");
    const body = await readBody(request);
    if (body === null) return fail(400, "bad_json", "Requête illisible.");
    if (route === "household") return await routeHousehold(env, body);
    if (route === "join") return await routeJoin(env, body);
    const dev = await auth(env, request);
    if (!dev) return fail(401, "auth", "Appareil non reconnu. Reconnecte la synchronisation.");
    if (route === "invite") return json({ invite: await setInvite(env, dev.household_id) });
    if (route === "sync") return await routeSync(env, dev, body);
    return fail(404, "not_found", "Route inconnue.");
  } catch (e) {
    return fail(500, "server", "Erreur du serveur. Réessaie dans un instant.");
  }
}
