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
function FbjDevice() {
  var J_ = FbjJ, app = J(), s = app.session;
  var on = (0, Dt.useState)(navigator.onLine), online = on[0], setOnline = on[1];
  (0, Dt.useEffect)(function () {
    var u = function () { setOnline(navigator.onLine); };
    window.addEventListener("online", u); window.addEventListener("offline", u);
    return function () { window.removeEventListener("online", u); window.removeEventListener("offline", u); };
  }, []);
  return J_.jsxs("section", { className: "card", children: [
    J_.jsxs("h2", { children: [J_.jsx(z, { name: "users", size: 18 }), " Sur ce téléphone"] }),
    J_.jsxs("p", { className: "muted small", children: ["Profil actif : ", J_.jsx("strong", { children: s.me.name }), ". Membres : ", s.profiles.map(function (p) { return p.name; }).join(" et "), "."] }),
    J_.jsxs("p", { className: "device-status" + (online ? "" : " off"), children: [J_.jsx(z, { name: online ? "wifi" : "offline", size: 16 }), online ? " En ligne · tout est enregistré sur ce téléphone" : " Hors ligne · tout est quand même enregistré sur ce téléphone"] }),
    J_.jsx("p", { className: "muted small", children: "L'appli fonctionne sans Internet. La synchronisation entre vos deux téléphones (courses, tâches et budget partagés) sera ajoutée dans une prochaine étape : vos éléments partagés sont déjà rangés pour être envoyés automatiquement dès que vous serez connectés." }),
  ] });
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
    "✅ Tes données sont enregistrées uniquement dans ce téléphone, pas sur un serveur.",
    "✅ Aucune publicité, aucun suivi, aucun service externe.",
    "✅ Les éléments « personnels » restent dans ton espace privé.",
    "⚠️ Si tu désinstalles l'appli ou vides les données de Chrome, tout est effacé : fais des sauvegardes.",
    "⚠️ Un fichier de sauvegarde n'est pas chiffré : range-le en lieu sûr.",
  ];
  return J_.jsxs("section", { className: "card", children: [
    J_.jsx("h2", { children: "Confidentialité" }),
    J_.jsx("ul", { className: "plain small", children: items.map(function (t) { return J_.jsx("li", { children: t }, t); }) }),
  ] });
}
