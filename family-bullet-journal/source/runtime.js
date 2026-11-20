/* Family Bullet Journal — moteur de stockage local (hors ligne d'abord).
 * Remplace le stockage claude.ai par IndexedDB, avec la même interface (collection/doc/get/set/delete).
 * Chaque document garde updated_at + dirty + deleted (pierre tombale) : c'est ce qui permettra
 * plus tard de synchroniser avec Supabase sans changer le reste de l'appli. */
(function () {
  "use strict";
  var DB_NAME = "fbj-cocon", STORE = "docs", META = "meta";
  var mem = new Map();          // path -> {path, data, updated_at, deleted, dirty}
  var idb = null, uid = null;

  function openIdb() {
    return new Promise(function (res) {
      if (!("indexedDB" in window)) return res(null);
      var r;
      try { r = indexedDB.open(DB_NAME, 1); } catch (e) { return res(null); }
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: "path" });
        if (!d.objectStoreNames.contains(META)) d.createObjectStore(META);
      };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { res(null); };
    });
  }
  function all(store) {
    return new Promise(function (res) {
      if (!idb) return res([]);
      var out = [], c = idb.transaction(store).objectStore(store).openCursor();
      c.onsuccess = function () { var cur = c.result; if (cur) { out.push([cur.key, cur.value]); cur.continue(); } else res(out); };
      c.onerror = function () { res(out); };
    });
  }
  function put(store, value, key) {
    return new Promise(function (res, rej) {
      if (!idb) return res();
      var tx = idb.transaction(store, "readwrite");
      key === undefined ? tx.objectStore(store).put(value) : tx.objectStore(store).put(value, key);
      tx.oncomplete = function () { res(); };
      tx.onerror = function () { rej(tx.error); };
      tx.onabort = function () { rej(tx.error); };
    });
  }
  function clearStore(store) {
    return new Promise(function (res) {
      if (!idb) return res();
      var tx = idb.transaction(store, "readwrite"); tx.objectStore(store).clear();
      tx.oncomplete = function () { res(); }; tx.onerror = function () { res(); };
    });
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function newId() {
    var r = (crypto.randomUUID && crypto.randomUUID()) || (Date.now().toString(16) + Math.random().toString(16).slice(2));
    return "u_local_" + r.replace(/-/g, "").slice(0, 22);
  }

  var ready = (async function () {
    idb = await openIdb();
    var rows = await all(STORE);
    rows.forEach(function (kv) { mem.set(kv[0], kv[1]); });
    var meta = await all(META);
    meta.forEach(function (kv) { if (kv[0] === "uid") uid = kv[1]; });
    uid = uid || lsGet("fbj.uid") || newId();
    lsSet("fbj.uid", uid);
    await put(META, uid, "uid").catch(function () {});
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
  })();

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function snap(path) {
    var r = mem.get(path), ok = !!(r && !r.deleted);
    return { exists: ok, id: path.split("/").pop(), data: function () { return ok ? clone(r.data) : undefined; } };
  }
  async function write(path, data, deleted) {
    var rec = { path: path, data: deleted ? null : clone(data), updated_at: new Date().toISOString(), deleted: !!deleted, dirty: true };
    var prev = mem.get(path);
    mem.set(path, rec);
    try { await put(STORE, rec); }
    catch (e) {
      prev ? mem.set(path, prev) : mem.delete(path);
      var err = new Error("quota"); err.code = (e && e.name === "QuotaExceededError") ? "quota_exceeded" : "write_failed"; throw err;
    }
    window.dispatchEvent(new CustomEvent("fbj-local-change", { detail: { path: path } }));
  }
  function docRef(path) {
    return {
      id: path.split("/").pop(), path: path,
      get: async function () { await ready; return snap(path); },
      set: async function (d) { await ready; return write(path, d, false); },
      delete: async function () { await ready; return write(path, null, true); },
      acquire: async function () { return { acquired: true }; },
      collection: function (n) { return colRef(path + "/" + n); },
    };
  }
  function colRef(path) {
    return {
      path: path,
      doc: function (id) { return docRef(path + "/" + id); },
      get: async function () {
        await ready;
        var pre = path + "/", docs = [];
        mem.forEach(function (r, k) {
          if (!r.deleted && k.indexOf(pre) === 0 && k.slice(pre.length).indexOf("/") < 0) docs.push(snap(k));
        });
        return { docs: docs, size: docs.length, empty: docs.length === 0 };
      },
    };
  }
  var db = Object.freeze({ collection: colRef, doc: docRef });
  var userNs = Object.freeze({ id: async function () { await ready; return uid; }, isOwner: function () { return true; }, canEdit: function () { return true; } });
  var downloads = Object.freeze({
    save: async function (o) {
      var blob = o.data instanceof Blob ? o.data : new Blob([typeof o.data === "string" ? o.data : JSON.stringify(o.data, null, 2)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = o.filename || "export.json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      return true;
    },
  });

  // --- Sauvegarde / restauration complète (tous les documents bruts) ---
  async function backup() {
    await ready;
    var docs = [];
    mem.forEach(function (r) { if (!r.deleted) docs.push({ path: r.path, data: r.data, updated_at: r.updated_at }); });
    return { format: "fbj-cocon-backup", version: 1, exported_at: new Date().toISOString(), uid: uid, docs: docs };
  }
  async function restore(obj, chooseUid) {
    await ready;
    if (!obj || obj.format !== "fbj-cocon-backup" || !Array.isArray(obj.docs)) throw new Error("Ce fichier n'est pas une sauvegarde du journal.");
    var members = obj.docs.filter(function (d) { return /^members\/[^/]+$/.test(d.path) && d.data; }).map(function (d) { return d.data; });
    var newUid = uid;
    if (!members.some(function (m) { return m.user_id === uid; })) {
      if (members.length === 1) newUid = members[0].user_id;
      else if (members.length > 1) newUid = await chooseUid(members);
      if (!newUid) throw new Error("Restauration annulée.");
    }
    await clearStore(STORE); mem.clear();
    for (var i = 0; i < obj.docs.length; i++) {
      var d = obj.docs[i];
      if (typeof d.path !== "string") continue;
      var rec = { path: d.path, data: d.data, updated_at: d.updated_at || new Date().toISOString(), deleted: false, dirty: true };
      mem.set(d.path, rec); await put(STORE, rec);
    }
    uid = newUid; lsSet("fbj.uid", uid); await put(META, uid, "uid");
    window.dispatchEvent(new CustomEvent("fbj-local-change", { detail: { path: "*" } }));
  }
  // Points d'accroche pour la future synchro (Supabase) : documents modifiés hors ligne
  async function pending() { await ready; var o = []; mem.forEach(function (r) { if (r.dirty) o.push(clone(r)); }); return o; }

  // ===== Synchronisation avec Cloudflare (D1) =====
  // Principe : chaque appareil envoie ses documents modifiés (dirty) et reçoit ceux de l'autre.
  // En cas de conflit, la modification la plus récente (updated_at) gagne.
  var sync = { cfg: null, busy: false, last: null, error: null, timer: null };
  var syncReady = ready.then(async function () {
    var m = await all(META);
    m.forEach(function (kv) { if (kv[0] === "sync") sync.cfg = kv[1]; });
  });
  function syncState() {
    var n = 0; mem.forEach(function (r) { if (r.dirty) n++; });
    return { enabled: !!(sync.cfg && sync.cfg.token), busy: sync.busy, last: sync.last, error: sync.error, pending: n, online: navigator.onLine };
  }
  function emitState() { window.dispatchEvent(new CustomEvent("fbj-sync-state", { detail: syncState() })); }
  async function saveCfg() { await put(META, sync.cfg, "sync"); }
  async function api(path, body, token) {
    var h = { "content-type": "application/json" };
    if (token) h.authorization = "Bearer " + token;
    var res = await fetch("/api/" + path, { method: "POST", headers: h, body: JSON.stringify(body || {}), cache: "no-store" });
    var out = null; try { out = await res.json(); } catch (e) {}
    if (!res.ok) { var err = new Error((out && out.message) || "Erreur " + res.status); err.code = out && out.error; err.status = res.status; throw err; }
    return out;
  }
  async function applyRemote(d) {
    var loc = mem.get(d.path);
    if (loc && loc.dirty && loc.updated_at > d.updated_at) return false; // ma version locale est plus récente
    if (loc && !loc.dirty && loc.updated_at === d.updated_at && !!loc.deleted === !!d.deleted) return false;
    var rec = { path: d.path, data: d.deleted ? null : d.data, updated_at: d.updated_at, deleted: !!d.deleted, dirty: false };
    mem.set(d.path, rec); await put(STORE, rec);
    return true;
  }
  async function syncNow() {
    await syncReady;
    if (!sync.cfg || !sync.cfg.token || sync.busy) return syncState();
    if (!navigator.onLine) { emitState(); return syncState(); }
    sync.busy = true; emitState();
    var changed = false;
    try {
      for (var round = 0; round < 20; round++) {
        var outgoing = [];
        mem.forEach(function (r) { if (r.dirty && outgoing.length < 400) outgoing.push({ path: r.path, data: r.data, deleted: r.deleted, updated_at: r.updated_at }); });
        var res = await api("sync", { since: sync.cfg.seq || 0, changes: outgoing }, sync.cfg.token);
        for (var i = 0; i < outgoing.length; i++) {
          var cur = mem.get(outgoing[i].path);
          if (cur && cur.dirty && cur.updated_at === outgoing[i].updated_at) { cur.dirty = false; await put(STORE, cur); }
        }
        var incoming = (res.conflicts || []).concat(res.docs || []);
        for (var j = 0; j < incoming.length; j++) if (await applyRemote(incoming[j])) { changed = true; if (/^members\//.test(incoming[j].path)) sync.membersChanged = true; }
        sync.cfg.seq = res.seq; await saveCfg();
        var stillDirty = false; mem.forEach(function (r) { if (r.dirty) stillDirty = true; });
        if (!res.more && !(stillDirty && outgoing.length === 400)) break;
      }
      sync.last = new Date().toISOString(); sync.error = null;
    } catch (e) {
      sync.error = e.status === 401 ? "Cet appareil n'est plus reconnu : reconnecte la synchronisation." : (e.status ? e.message : null);
    } finally {
      sync.busy = false; emitState();
    }
    if (sync.membersChanged) reloadWhenIdle();
    if (changed) {
      window.dispatchEvent(new CustomEvent("fbj-remote-change"));
      window.dispatchEvent(new Event("focus")); // l'appli se rafraîchit sur cet événement
    }
    return syncState();
  }
  // un profil a changé (ex. l'autre vient de rejoindre) : on recharge l'appli quand personne n'écrit
  function reloadWhenIdle() {
    var a = document.activeElement, typing = a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA") && a.value;
    if (typing || document.querySelector(".sheet")) { setTimeout(reloadWhenIdle, 5000); return; }
    sync.membersChanged = false; location.reload();
  }
  function schedule(ms) { clearTimeout(sync.timer); sync.timer = setTimeout(syncNow, ms); }
  window.addEventListener("fbj-local-change", function () { if (sync.cfg && sync.cfg.token) { emitState(); schedule(1500); } });
  window.addEventListener("online", function () { emitState(); schedule(300); });
  window.addEventListener("offline", emitState);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") schedule(300); });
  setInterval(function () { if (document.visibilityState === "visible") syncNow(); }, 20000);
  syncReady.then(function () { schedule(500); });

  async function enableSync() {
    await syncReady;
    var r = await api("household", { uid: uid });
    sync.cfg = { token: r.token, household: r.household, seq: 0 };
    await saveCfg();
    mem.forEach(function (rec) { rec.dirty = true; }); // tout envoyer la 1re fois
    for (var v of mem.values()) await put(STORE, v);
    await syncNow();
    return r.invite;
  }
  async function joinSync(code) {
    await syncReady;
    var r = await api("join", { uid: uid, code: code });
    await clearStore(STORE); mem.clear();       // on repart des données du foyer
    sync.cfg = { token: r.token, household: r.household, seq: 0 };
    await saveCfg();
    await syncNow();
    return true;
  }
  async function newInvite() { await syncReady; return (await api("invite", {}, sync.cfg && sync.cfg.token)).invite; }
  async function disableSync() { await syncReady; sync.cfg = null; await put(META, null, "sync"); emitState(); }

  window.FbjLocal = Object.freeze({ ready: ready, backup: backup, restore: restore, pending: pending, sync: Object.freeze({ now: syncNow, state: syncState, enable: enableSync, join: joinSync, invite: newInvite, disable: disableSync }), count: function () { var n = 0; mem.forEach(function (r) { if (!r.deleted) n++; }); return n; } });
  window.claude = Object.freeze({
    use: async function (name) {
      await ready;
      return name === "db" ? db : name === "user" ? userNs : name === "downloads" ? downloads : null;
    },
  });
})();
