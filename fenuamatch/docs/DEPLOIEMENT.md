# Mettre FenuaMatch en ligne

Objectif : obtenir une vraie adresse (ex. `https://fenuamatch.pages.dev`) utilisable depuis un téléphone.

Il y a **deux services** à créer, tous deux avec une offre gratuite :
1. **Supabase** : la base de données, les comptes, les photos.
2. **Cloudflare Pages** : l'hébergement du site.

Durée estimée : 45 minutes à 1 heure la première fois.

> Règle d'or : ne mettez **jamais** la clé « secret » / « service_role » de Supabase dans le site, dans GitHub ou dans un message.
> Seule la clé **publishable** (ou « anon ») va dans le site : elle est faite pour être publique, la sécurité est assurée par les règles RLS.

---

## Étape 1 — Créer le projet Supabase

1. Allez sur <https://supabase.com>, connectez-vous.
2. **New project**.
   - Organisation : la vôtre.
   - Nom : `FenuaMatch`.
   - Mot de passe de la base : générez-en un fort et **gardez-le dans un gestionnaire de mots de passe** (il sert à l'étape 2).
   - Région : **West US (North California)** est en général la plus proche de Tahiti en temps de réponse. (Choix à confirmer selon vos besoins ; la région ne peut pas être changée ensuite.)
3. Attendez 1 à 2 minutes que le projet soit prêt.

> Offre gratuite : Supabase limite le nombre de projets actifs gratuits par organisation, et met en pause un projet gratuit
> resté inactif un certain temps. Vérifiez les conditions actuelles sur <https://supabase.com/pricing> avant l'ouverture publique.

## Étape 2 — Installer la base de données (migrations)

Sur votre ordinateur, dans le dossier `fenuamatch` :

```bash
npx supabase login                 # ouvre le navigateur pour vous connecter
npx supabase link --project-ref <REFERENCE_DU_PROJET>
npx supabase db push               # envoie les 6 migrations (tables, sécurité, stockage, tâches)
```
- La **référence du projet** est dans l'adresse du tableau de bord : `https://supabase.com/dashboard/project/<REFERENCE>`.
- `db push` demande le mot de passe de la base de l'étape 1.
- Les **données de démonstration ne sont pas envoyées** (elles ne sont créées que par `npm run seed:demo` en local).

Vérification : *Table Editor* doit montrer les tables `profiles`, `listings`, `messages`… et *Storage* les dossiers
`avatars`, `provider-photos`, `listing-photos`.

Si `db push` signale que l'extension `pg_cron` n'est pas activée : *Database → Extensions* → activez **pg_cron**, puis relancez `npx supabase db push`.

## Étape 3 — Configurer l'authentification

Dans Supabase → **Authentication** :

1. **Sign In / Providers → Email** :
   - *Enable Email provider* : activé.
   - *Confirm email* : **activé** (obligatoire : les comptes doivent confirmer leur adresse).
   - *Secure email change* : activé (confirmation sur l'ancienne ET la nouvelle adresse).
   - *Secure password change* : activé.
   - Longueur minimale du mot de passe : **8**, exigence « lettres et chiffres ».
2. **URL Configuration** :
   - *Site URL* : l'adresse définitive du site, ex. `https://fenuamatch.pages.dev` (à mettre à jour après l'étape 5 si besoin).
   - *Redirect URLs* : ajoutez `https://fenuamatch.pages.dev/**` (et plus tard `https://www.votre-domaine/**`).
   > Les liens des e-mails utilisent la *Site URL*. Si elle est fausse, la confirmation ouvrira un autre site et l'utilisateur ne sera pas connecté.
3. **Emails → Templates** : copiez le contenu des fichiers du dossier `supabase/templates/` :
   | Modèle Supabase | Fichier | Sujet conseillé |
   |---|---|---|
   | Confirm signup | `confirmation.html` | Confirmez votre adresse e-mail — FenuaMatch |
   | Reset password | `recovery.html` | Réinitialisation de votre mot de passe — FenuaMatch |
   | Change email address | `email_change.html` | Confirmez votre nouvelle adresse e-mail — FenuaMatch |
   | Reauthentication | `reauthentication.html` | Votre code de vérification — FenuaMatch |

   Ces modèles utilisent un lien `…/auth/confirmer?token_hash=…` qui fonctionne **même si l'e-mail est ouvert sur un autre appareil**.

### E-mails : fournisseur SMTP (indispensable avant l'ouverture au public)
Le service d'e-mail intégré à Supabase est prévu pour les tests : il est fortement limité en volume (et, selon la documentation
Supabase, peut n'envoyer qu'aux membres de votre équipe). Pour de vrais utilisateurs, configurez un fournisseur SMTP :
**Authentication → Emails → SMTP Settings**.

Options courantes (tarifs à vérifier au moment du choix) : Resend, Brevo, Amazon SES, Postmark. La plupart ont une offre gratuite
de quelques milliers d'e-mails par mois, suffisante pour démarrer. Il vous faudra une adresse d'envoi sur **votre propre domaine**
(ex. `no-reply@fenuamatch.pf`), donc un nom de domaine (voir étape 7).

## Étape 4 — Récupérer les deux valeurs publiques

Supabase → **Project Settings → API** (ou bouton **Connect**) :
- **Project URL** → ex. `https://abcd1234.supabase.co`
- **Publishable key** (`sb_publishable_…`) — à défaut l'ancienne **anon key**.

## Étape 5 — Publier le site sur Cloudflare Pages

1. Mettez le code sur **GitHub** (c'est déjà le cas si vous lisez ceci sur GitHub).
2. <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages → Connect to Git**.
3. Choisissez le dépôt, puis :
   | Réglage | Valeur |
   |---|---|
   | Production branch | la branche à publier (ex. `main`) |
   | Framework preset | `None` (ou `Vite`) |
   | **Root directory** | `fenuamatch` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
4. **Environment variables** (Production ET Preview) :
   | Nom | Valeur |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL (étape 4) |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key (étape 4) |
   | `VITE_SITE_URL` | `https://fenuamatch.pages.dev` (votre adresse Pages) |
   | `NODE_VERSION` | `22` |
5. **Save and Deploy**. Après 1 à 2 minutes, l'adresse `https://<nom>.pages.dev` est active.
6. Retournez dans Supabase (étape 3, *URL Configuration*) et vérifiez que la *Site URL* et les *Redirect URLs* correspondent exactement à cette adresse.

Ce qui est déjà prévu dans le code :
- `public/_redirects` : toutes les routes renvoient vers l'application → **pas d'erreur 404 quand on actualise** une page.
- `public/_headers` : en-têtes de sécurité (CSP, HSTS, anti-iframe…). Si vous utilisez plus tard un domaine personnalisé pour
  Supabase, ajoutez-le dans la ligne `Content-Security-Policy` (`img-src` et `connect-src`).

> Alternative en ligne de commande : `npm run build` puis `npx wrangler pages deploy dist --project-name fenuamatch`
> (les variables `VITE_…` doivent alors être présentes dans `.env.local` au moment du build).

## Étape 6 — Créer le compte administrateur

1. Inscrivez-vous normalement sur le site avec votre adresse, confirmez l'e-mail.
2. Supabase → **SQL Editor** → exécutez (en remplaçant le nom d'utilisateur) :
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from public.profiles where username = 'votre_nom_utilisateur';
   ```
3. Déconnectez-vous / reconnectez-vous : le lien **Admin** apparaît. Ce rôle ne peut être donné **que** par cette requête
   (aucun utilisateur ne peut se l'attribuer depuis le site).

## Étape 7 — Domaine (plus tard)

`fenuamatch.pf` et `fenuamatch.com` n'ont **pas** été vérifiés ni réservés. Pour les vérifier :
- `.pf` : registre géré en Polynésie française (vérifier auprès de l'OPT / du registre `.pf` actuel les conditions et prix) ;
- `.com` : n'importe quel registraire (Cloudflare Registrar, OVH, Gandi…).

Une fois le domaine acheté : Cloudflare Pages → **Custom domains** → ajouter le domaine, puis mettre à jour
`VITE_SITE_URL`, la *Site URL* et les *Redirect URLs* Supabase, et redéployer.

## Étape 8 — Contrôles avant ouverture publique
- [ ] Inscription → e-mail reçu (vérifier aussi les spams) → confirmation → connexion.
- [ ] Mot de passe oublié → e-mail → nouveau mot de passe.
- [ ] Un prestataire publie sa fiche avec photo ; un client la trouve et lui écrit.
- [ ] Un client publie une annonce avec photo ; un prestataire répond ; choix → confirmation.
- [ ] Ajouter le site à l'écran d'accueil (Android : menu ⋮ → *Installer l'application* ; iPhone : Safari → Partager → *Sur l'écran d'accueil*).
- [ ] Supabase → **Advisors** (Security et Performance) : aucun avertissement critique.
- [ ] Pages juridiques complétées (champs « À compléter avant publication ») et relues.
- [ ] SMTP configuré.
- [ ] Sauvegardes : vérifier ce que propose votre offre Supabase (Database → Backups). L'offre gratuite ne garantit pas de
      restauration à un instant précis ; pour plus de sécurité, faire un export régulier : `npx supabase db dump -f sauvegarde.sql`
      (structure) et `npx supabase db dump --data-only -f donnees.sql` (données), à conserver en lieu sûr (contient des données personnelles).
