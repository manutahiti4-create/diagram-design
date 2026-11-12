// TechniKit : envoie un rapport par mail depuis le Gmail du technicien (mot de passe d'application).
// Rien n'est enregistré ici : les identifiants arrivent avec la demande et ne servent qu'à cet envoi.
import nodemailer from "nodemailer";

const ok = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
const isAddr = (a) => typeof a === "string" && /^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$/.test(a);

export default async (req) => {
  if (req.method !== "POST") return ok({ ok: false, error: "Méthode non autorisée" }, 405);
  let b;
  try { b = await req.json(); } catch { return ok({ ok: false, error: "Demande illisible" }, 400); }
  const user = String(b.user || "").trim(), pass = String(b.pass || "").replace(/\s+/g, "");
  const to = (Array.isArray(b.to) ? b.to : []).filter(isAddr).slice(0, 10);
  const cc = (Array.isArray(b.cc) ? b.cc : []).filter(isAddr).slice(0, 10);
  const subject = String(b.subject || "Rapport TechniKit").slice(0, 300);
  const text = String(b.text || "").slice(0, 200000);
  if (!isAddr(user) || pass.length < 8) return ok({ ok: false, error: "Adresse Gmail ou mot de passe d'application manquant (⚙️ Réglages → Envoi automatique)." }, 400);
  if (!to.length) return ok({ ok: false, error: "Aucun destinataire valide (⚙️ Réglages → Envoi automatique)." }, 400);
  const attachments = (Array.isArray(b.attachments) ? b.attachments : []).slice(0, 40)
    .filter((a) => a && typeof a.content === "string" && a.content.length)
    .map((a) => ({ filename: String(a.filename || "photo.jpg").replace(/[^\w.\-]/g, "_").slice(0, 80), content: a.content, encoding: "base64", contentType: "image/jpeg" }));

  const tr = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
  try {
    const name = String(b.name || "").replace(/["<>\r\n]/g, "").slice(0, 60);
    const info = await tr.sendMail({ from: name ? `"${name}" <${user}>` : user, to, cc: cc.filter((x) => !to.includes(x)), subject, text, attachments });
    return ok({ ok: true, id: info.messageId });
  } catch (e) {
    const m = String((e && (e.response || e.message)) || e);
    let error = "Envoi refusé : " + m.slice(0, 200);
    if (/535|534|Username and Password not accepted|BadCredentials|Invalid login/i.test(m))
      error = "Gmail refuse la connexion : vérifie ton adresse Gmail et le mot de passe d'application (16 lettres, pas ton mot de passe Gmail normal).";
    else if (/552|size|too large/i.test(m)) error = "Mail trop lourd : enlève quelques photos et réessaie.";
    return ok({ ok: false, error }, 502);
  }
};
