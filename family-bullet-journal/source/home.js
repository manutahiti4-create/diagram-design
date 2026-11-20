// Accueil "Notre petit cocon" — utilise uniquement les données déjà renvoyées par /api/today
var FBJ_EMPTY = { check: "tasks", wallet: "budget", pen: "wellbeing" };
var FBJ_MSGS = [
  "Chaque petite chose faite ensemble compte.",
  "Une journée à la fois, main dans la main.",
  "Prenez le temps de vous dire merci aujourd'hui.",
  "Les petits gestes font les grandes maisons.",
  "Un foyer, c'est d'abord deux cœurs qui s'organisent.",
  "Doucement, mais ensemble.",
  "Aujourd'hui aussi, vous êtes une belle équipe.",
];
function fbjMoment(time) {
  var h = Number(String(time || "12").slice(0, 2));
  if (h >= 18 || h < 5) return { k: "Ce soir", night: true };
  if (h < 11) return { k: "Ce matin", night: false };
  if (h < 14) return { k: "Ce midi", night: false };
  return { k: "Cet après-midi", night: false };
}
function FbjHome({ t, loading, onNote }) {
  var J_ = FbjJ, app = J(), me = app.session.me;
  var tk = t.tasks, todo = tk.today.length + tk.overdue.length, done = tk.done_today || 0;
  var total = todo + done, mo = fbjMoment(t.time);
  var day = Number(String(t.date).slice(8, 10)) || 1;
  var msg = t.phrase || FBJ_MSGS[day % FBJ_MSGS.length];
  var sum = todo === 0
    ? (done > 0 ? "Tout est fait pour aujourd'hui. Bravo à vous deux." : "Rien d'urgent aujourd'hui. Profitez-en.")
    : todo + (todo > 1 ? " tâches prévues" : " tâche prévue") + " aujourd'hui" + (done > 0 ? " · " + done + (done > 1 ? " déjà faites" : " déjà faite") : "") + ".";
  var f = t.finance, hasBudget = f.budget > 0;
  var note = t.notes && ((t.notes.shared && t.notes.shared.content) || (t.notes.private && t.notes.private.content));
  var dots = [];
  for (var i = 0; i < Math.min(total, 8); i++) dots.push(J_.jsx("i", { className: i < Math.round(done * Math.min(total, 8) / Math.max(total, 1)) ? "on" : "" }, i));
  return J_.jsxs(J_.Fragment, { children: [
    J_.jsxs("header", { className: "home-head", children: [
      J_.jsxs("div", { children: [
        J_.jsx("p", { className: "home-eyebrow", children: "Notre petit cocon" }),
        J_.jsx("h1", { children: t.greeting + " " + t.name }),
        J_.jsxs("p", { className: "home-date", children: [Oi(t.date), loading && J_.jsx("span", { className: "sr-only", children: " (mise à jour…)" })] }),
        typeof FbjSyncDot !== "undefined" && J_.jsx(FbjSyncDot, {}),
      ] }),
      J_.jsxs("div", { className: "home-tools", children: [
        J_.jsx("a", { className: "icon-btn settings-shortcut", href: nt("settings"), "aria-label": "Réglages", children: J_.jsx(z, { name: "settings" }) }),
        J_.jsxs("button", { type: "button", className: "home-who", onClick: function () { app.openSheet({ kind: "profile" }); }, "aria-label": "Profil actif : " + me.name + ". Ouvrir mon compte", children: [
          J_.jsx(Rt, { profile: me, size: 34 }),
          J_.jsxs("span", { children: [J_.jsx("small", { children: "Profil" }), me.name] }),
        ] }),
      ] }),
    ] }),
    J_.jsxs("section", { className: "hero" + (mo.night ? " is-night" : ""), "aria-label": "Message du jour", children: [
      J_.jsxs("div", { className: "hero-text", children: [
        J_.jsx("p", { className: "hero-kicker", children: mo.k }),
        J_.jsx("p", { className: "hero-msg", children: msg }),
        J_.jsx("p", { className: "hero-sum", children: sum }),
      ] }),
      J_.jsx(FbjIll, { name: "home" }),
    ] }),
    J_.jsxs("nav", { className: "glance", "aria-label": "En un coup d'œil", children: [
      J_.jsxs("a", { href: nt("tasks"), children: [
        J_.jsxs("span", { className: "g-lab", children: [J_.jsx(z, { name: "tasks", size: 15 }), "Tâches"] }),
        J_.jsx("span", { className: "g-val", children: total > 0 ? done + "/" + total : String(tk.open_count) }),
        total > 0 ? J_.jsx("span", { className: "progress-dots", "aria-hidden": "true", children: dots })
                  : J_.jsx("span", { className: "g-sub", children: "en cours" }),
      ] }),
      J_.jsxs("a", { href: nt("budget"), children: [
        J_.jsxs("span", { className: "g-lab", children: [J_.jsx(z, { name: "wallet", size: 15 }), "Budget"] }),
        J_.jsx("span", { className: "g-val" + (hasBudget && (f.remaining ?? 0) < 0 ? " neg" : ""), children: ne(hasBudget ? (f.remaining ?? 0) : f.spent) }),
        J_.jsx("span", { className: "g-sub", children: hasBudget ? "restant ce mois" : "dépensés ce mois" }),
      ] }),
      J_.jsxs("a", { href: "#aujourdhui", onClick: function (ev) { ev.preventDefault(); onNote(); }, children: [
        J_.jsxs("span", { className: "g-lab", children: [J_.jsx(z, { name: "pen", size: 15 }), "Note"] }),
        J_.jsx("span", { className: "g-val", children: note ? "Écrite" : "À écrire" }),
        J_.jsx("span", { className: "g-sub", children: "du jour" }),
      ] }),
    ] }),
    J_.jsxs("div", { className: "soon-row", children: [
      J_.jsxs("a", { className: "soon-pill", href: nt("calendar"), children: [J_.jsx(z, { name: "calendar", size: 16 }), "Rendez-vous · bientôt"] }),
      J_.jsxs("a", { className: "soon-pill", href: nt("meals"), children: [J_.jsx(z, { name: "utensils", size: 16 }), "Repas · bientôt"] }),
    ] }),
  ] });
}
function FbjTaskProgress({ e }) {
  var J_ = FbjJ, done = e.tasks.done_today || 0, todo = e.tasks.today.length + e.tasks.overdue.length, total = done + todo;
  if (total === 0) return null;
  var pct = Math.round(done * 100 / total);
  return J_.jsxs("div", { className: "tasks-progress", children: [
    J_.jsx("span", { children: done + " sur " + total + " faite" + (done > 1 ? "s" : "") }),
    J_.jsx("div", { className: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": pct, "aria-label": "Tâches du jour terminées", children: J_.jsx("div", { className: "bar-fill", style: { width: pct + "%" } }) }),
  ] });
}
