// Composants de la version installable (hors ligne d'abord)
async function fbjPickFile() {
  return new Promise(function (res) {
    var i = document.createElement("input");
    i.type = "file"; i.accept = "application/json,.json";
    i.onchange = function () { res(i.files && i.files[0]); };
    i.click();
  });
}
async function fbjRestoreFlow(toast) {
  var f = await fbjPickFile();
  if (!f) return;
  var obj;
  try { obj = JSON.parse(await f.text()); } catch (e) { (toast ? toast("Fichier illisible.", "error") : alert("Fichier illisible.")); return; }
  if (!confirm("Restaurer cette sauvegarde ? Les données actuelles de ce téléphone seront remplacées.")) return;
  try {
    await window.FbjLocal.restore(obj, async function (members) {
      var list = members.map(function (m, i) { return (i + 1) + ". " + m.name; }).join("\n");
      var n = Number(prompt("Qui es-tu dans cette sauvegarde ?\n" + list + "\n\nTape le numéro :", "1"));
      return members[n - 1] ? members[n - 1].user_id : null;
    });
    location.reload();
  } catch (e) { (toast ? toast(e.message || "Restauration impossible.", "error") : alert(e.message)); }
}
function fbjAgo(iso) {
  if (!iso) return "jamais";
  var s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return "il y a " + Math.round(s / 60) + " min";
  return "il y a " + Math.round(s / 3600) + " h";
}
function useFbjSync() {
  var st = (0, Dt.useState)(function () { return window.FbjLocal.sync.state(); }), v = st[0], set = st[1];
  (0, Dt.useEffect)(function () {
    var f = function () { set(window.FbjLocal.sync.state()); };
    window.addEventListener("fbj-sync-state", f); window.addEventListener("online", f); window.addEventListener("offline", f);
    var t = setInterval(f, 15000);
    return function () { window.removeEventListener("fbj-sync-state", f); window.removeEventListener("online", f); window.removeEventListener("offline", f); clearInterval(t); };
  }, []);
  return v;
}
async function fbjJoinFlow(toast) {
  var code = prompt("Code d'invitation (12 caractères, ex. ABCD-EFGH-JKLM) :");
  if (!code) return;
  if (!confirm("Rejoindre le foyer ? Les données déjà présentes sur ce téléphone seront remplacées par celles du foyer.")) return;
  try { await window.FbjLocal.sync.join(code); location.reload(); }
  catch (e) { var m = !navigator.onLine ? "Pas de connexion : il faut Internet pour rejoindre le foyer." : (e.message || "Impossible de rejoindre."); toast ? toast(m, "error") : alert(m); }
}
function FbjDevice() {
  var J_ = FbjJ, app = J(), s = app.session, st = useFbjSync();
  var inv = (0, Dt.useState)(null), invite = inv[0], setInvite = inv[1];
  var bz = (0, Dt.useState)(false), busy = bz[0], setBusy = bz[1];
  async function run(fn) { setBusy(true); try { await fn(); } catch (e) { app.toast(!navigator.onLine ? "Pas de connexion Internet." : (e.message || "Erreur"), "error"); } finally { setBusy(false); } }
  var status = !st.enabled ? null
    : !st.online ? { cls: " off", icon: "offline", text: "Hors ligne · " + (st.pending ? st.pending + " modification(s) seront envoyées au retour d'Internet" : "tout est enregistré sur ce téléphone") }
    : st.error ? { cls: " off", icon: "alert", text: st.error }
    : st.busy ? { cls: "", icon: "refresh", text: "Synchronisation…" }
    : { cls: "", icon: "check", text: "Synchronisé " + fbjAgo(st.last) + (st.pending ? " · " + st.pending + " en attente" : "") };
  return J_.jsxs("section", { className: "card", children: [
    J_.jsxs("h2", { children: [J_.jsx(z, { name: "users", size: 18 }), " Notre foyer"] }),
    J_.jsxs("p", { className: "muted small", children: ["Profil actif : ", J_.jsx("strong", { children: s.me.name }), ". Membres : ", s.profiles.map(function (p) { return p.name; }).join(" et "), "."] }),
    !st.enabled ? J_.jsxs(J_.Fragment, { children: [
      J_.jsx("p", { className: "muted small", children: "Active la synchronisation pour retrouver les mêmes tâches, notes et budget sur vos deux téléphones, même à distance. L'appli continue de marcher sans Internet." }),
      J_.jsx("button", { type: "button", className: "btn primary full", disabled: busy, onClick: function () { run(async function () { var i = await window.FbjLocal.sync.enable(); setInvite(i); app.toast("Synchronisation activée"); }); }, children: "Activer la synchronisation" }),
      J_.jsx("button", { type: "button", className: "btn ghost full", disabled: busy, onClick: function () { fbjJoinFlow(app.toast); }, children: "J'ai un code d'invitation" }),
    ] }) : J_.jsxs(J_.Fragment, { children: [
      J_.jsxs("p", { className: "device-status" + status.cls, role: "status", children: [J_.jsx(z, { name: status.icon, size: 16 }), " ", status.text] }),
      J_.jsxs("div", { className: "row gap wrap", children: [
        J_.jsx("button", { type: "button", className: "btn small primary", disabled: busy || st.busy, onClick: function () { run(function () { return window.FbjLocal.sync.now(); }); }, children: "Synchroniser maintenant" }),
        s.profiles.length < 2 && J_.jsx("button", { type: "button", className: "btn small ghost", disabled: busy, onClick: function () { run(async function () { setInvite(await window.FbjLocal.sync.invite()); }); }, children: "Inviter ma femme" }),
      ] }),
    ] }),
    invite && J_.jsxs("div", { className: "invite-box", children: [
      J_.jsx("p", { className: "small", children: "Code à taper sur son téléphone (Réglages → « J'ai un code d'invitation », ou sur l'écran de bienvenue) :" }),
      J_.jsx("p", { className: "invite-code", children: invite.code }),
      J_.jsx("p", { className: "muted small", children: "Valable 7 jours, une seule fois. Ne le partage qu'avec elle." }),
    ] }),
    st.enabled && J_.jsx("button", { type: "button", className: "link-btn", onClick: function () { if (confirm("Déconnecter ce téléphone de la synchronisation ? Les données restent sur le téléphone.")) window.FbjLocal.sync.disable(); }, children: "Déconnecter ce téléphone" }),
  ] });
}
function FbjJoinLink() {
  return FbjJ.jsx("button", { type: "button", className: "btn ghost full", onClick: function () { fbjJoinFlow(null); }, children: "J'ai un code d'invitation" });
}
function FbjSyncDot() {
  var st = useFbjSync();
  if (!st.enabled) return null;
  var off = !st.online || st.error;
  return FbjJ.jsxs("a", { className: "sync-dot" + (off ? " off" : ""), href: nt("settings"), "aria-label": off ? "Hors ligne : les modifications seront synchronisées plus tard" : "Synchronisé", children: [FbjJ.jsx(z, { name: off ? "offline" : "wifi", size: 14 }), off ? (st.pending ? st.pending + " en attente" : "Hors ligne") : "Synchro"] });
}
function FbjInstall() {
  var J_ = FbjJ;
  var st = (0, Dt.useState)(!!window.__fbjInstallPrompt), can = st[0], setCan = st[1];
  var standalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
  (0, Dt.useEffect)(function () {
    var f = function () { setCan(true); };
    window.addEventListener("fbj-installable", f);
    return function () { window.removeEventListener("fbj-installable", f); };
  }, []);
  return J_.jsxs("section", { className: "card", children: [
    J_.jsxs("h2", { children: [J_.jsx(z, { name: "download", size: 18 }), " Installer l'appli"] }),
    standalone ? J_.jsx("p", { className: "muted", children: "C'est fait : le journal est installé sur ce téléphone." })
    : can ? J_.jsx("button", { type: "button", className: "btn primary full", onClick: async function () {
        var p = window.__fbjInstallPrompt; if (!p) return; p.prompt();
        try { await p.userChoice; } catch (e) {} window.__fbjInstallPrompt = null; setCan(false);
      }, children: "Installer sur l'écran d'accueil" })
    : J_.jsxs("ol", { className: "steps", children: [
        J_.jsxs("li", { children: ["Ouvre le journal dans ", J_.jsx("strong", { children: "Chrome" }), "."] }),
        J_.jsxs("li", { children: ["Menu ", J_.jsx("strong", { children: "⋮" }), " → ", J_.jsx("strong", { children: "« Installer l'application »" }), " (ou « Ajouter à l'écran d'accueil »)."] }),
      ] }),
    J_.jsx("p", { className: "muted small", children: "Une fois installé, le journal s'ouvre et s'utilise même sans connexion." }),
  ] });
}
function FbjBackup() {
  var J_ = FbjJ, app = J();
  return J_.jsxs("section", { className: "card", children: [
    J_.jsxs("h2", { children: [J_.jsx(z, { name: "refresh", size: 18 }), " Sauvegarde complète"] }),
    J_.jsx("p", { className: "muted small", children: "Tes données vivent dans ce téléphone. Fais une sauvegarde de temps en temps (avant de changer de téléphone ou de vider Chrome) et garde le fichier en lieu sûr." }),
    J_.jsxs("div", { className: "row gap wrap", children: [
      J_.jsx("button", { type: "button", className: "btn primary", onClick: async function () {
        var b = await window.FbjLocal.backup();
        var d = new Date().toISOString().slice(0, 10);
        var dl = await claude.use("downloads");
        await dl.save({ filename: "journal-sauvegarde-" + d + ".json", data: JSON.stringify(b, null, 2) });
        app.toast("Sauvegarde téléchargée");
      }, children: "Sauvegarder" }),
      J_.jsx("button", { type: "button", className: "btn ghost", onClick: function () { fbjRestoreFlow(app.toast); }, children: "Restaurer" }),
    ] }),
  ] });
}
function FbjRestoreLink() {
  return FbjJ.jsx("button", { type: "button", className: "link-btn center-self", onClick: function () { fbjRestoreFlow(null); }, children: "J'ai déjà une sauvegarde : restaurer" });
}
function FbjPrivacy() {
  var J_ = FbjJ;
  var items = [
    "✅ Tes données sont d\u2019abord enregistrées dans ce téléphone. Si la synchronisation est active, une copie est gardée sur votre serveur Cloudflare privé, accessible uniquement à vos deux téléphones.",
    "✅ Aucune publicité, aucun suivi.",
    "✅ Les éléments « personnels » ne sont jamais envoyés au téléphone de l\u2019autre.",
    "⚠️ Sans synchronisation, désinstaller l'appli ou vider Chrome efface tout : fais des sauvegardes.",
    "⚠️ Un fichier de sauvegarde n'est pas chiffré : range-le en lieu sûr.",
  ];
  return J_.jsxs("section", { className: "card", children: [
    J_.jsx("h2", { children: "Confidentialité" }),
    J_.jsx("ul", { className: "plain small", children: items.map(function (t) { return J_.jsx("li", { children: t }, t); }) }),
  ] });
}
