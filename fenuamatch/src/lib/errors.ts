/** Transforme une erreur technique en message compréhensible (en français). */
export function errorMessage(error: unknown, fallback = 'Une erreur est survenue. Réessayez dans un instant.'): string {
  if (!error) return fallback;
  const e = error as { message?: string; code?: string; status?: number; name?: string };
  const msg = e.message ?? (typeof error === 'string' ? error : '');

  if (e.name === 'TypeError' && /fetch|network/i.test(msg)) {
    return 'Connexion impossible. Vérifiez votre accès à Internet puis réessayez.';
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
    return 'Connexion impossible. Vérifiez votre accès à Internet puis réessayez.';
  }
  // Messages d'authentification Supabase (en anglais) → français
  const auth: Array<[RegExp, string]> = [
    [/Invalid login credentials/i, 'Adresse e-mail ou mot de passe incorrect.'],
    [/Email not confirmed/i, 'Votre adresse e-mail n\'est pas encore confirmée. Ouvrez le lien reçu par e-mail.'],
    [/User already registered|already been registered/i, 'Un compte existe déjà avec cette adresse e-mail.'],
    [/Password should be at least|weak.?password|Password is known to be weak/i, 'Mot de passe trop faible : au moins 8 caractères, avec des lettres et des chiffres.'],
    [/should contain at least one character of each/i, 'Le mot de passe doit contenir au moins une lettre et un chiffre.'],
    [/Unable to validate email address|invalid format/i, 'Adresse e-mail invalide.'],
    [/rate limit|too many requests|For security purposes, you can only request/i, 'Trop de tentatives. Patientez une minute puis réessayez.'],
    [/expired|invalid.*(token|otp|link)|otp_expired|Token has expired/i, 'Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.'],
    [/New password should be different/i, 'Le nouveau mot de passe doit être différent de l\'ancien.'],
    [/reauthentication|requires recent login/i, 'Pour des raisons de sécurité, reconnectez-vous puis recommencez.'],
    [/JWT expired|refresh_token_not_found|session.*(missing|expired)/i, 'Votre session a expiré. Reconnectez-vous.'],
    [/username_taken/i, 'Ce nom d\'utilisateur est déjà pris.'],
    [/username_invalid: (.*)/i, '$1'],
    [/Database error saving new user/i, 'Inscription impossible avec ce nom d\'utilisateur. Essayez-en un autre.'],
    [/User is banned/i, 'Ce compte est suspendu. Contactez l\'équipe FenuaMatch.'],
    [/Payload too large|exceeded the maximum allowed size/i, 'Fichier trop volumineux (5 Mo maximum).'],
    [/mime type .* is not supported|invalid_mime_type/i, 'Format de fichier non accepté (JPG ou PNG).'],
    [/new row violates row-level security|permission denied|violates row-level security/i, 'Action non autorisée.'],
  ];
  for (const [re, text] of auth) {
    const m = msg.match(re);
    if (m) return text.replace('$1', m[1] ?? '');
  }
  // Messages métier : nos fonctions SQL lèvent déjà des messages en français.
  if (msg && /[éèàùç]|Vous |Votre |Cette |Ce |Seuls |Choisissez|Le |La |Les |Un |Une |Trop |Limite|Maximum|Action|Annonce|Proposition|Mission|Contenu|Ajoutez|Publiez|Écrivez|Indiquez|Accès|Catégorie|Commune|Budget|Prix|Profil|Compte|Conversation|Expéditeur|Type /.test(msg)) {
    return msg;
  }
  if (e.code === '23505') return 'Cet élément existe déjà.';
  if (e.code === '42501') return 'Action non autorisée.';
  return fallback;
}
