# Architecture et choix techniques

## Vue d'ensemble
```
Téléphone / ordinateur
   │  (HTTPS)
   ▼
Cloudflare Pages ── fichiers statiques de l'application React (PWA)
   │  (HTTPS + WebSocket, clé publique uniquement)
   ▼
Supabase ── Auth (comptes, e-mails) · PostgreSQL (données + règles RLS + fonctions) · Storage (photos) · Realtime (messages)
```
Il n'y a **pas de serveur applicatif à maintenir** : toute la logique sensible est dans la base (fonctions SQL `security definer`
et règles RLS). Le navigateur ne peut faire que ce que ces règles autorisent, même en appelant l'API directement.

## Dépendances principales (et pourquoi)
| Outil | Rôle |
|---|---|
| React 19, React Router, Vite | interface, navigation, build rapide |
| TypeScript (strict) | types générés depuis la base (`src/types/database.ts`) |
| Tailwind CSS 4 | styles ; thème centralisé dans `src/index.css` (variables → thème sombre facile à ajouter) |
| TanStack Query | cache des données, rechargement, états chargement/erreur |
| React Hook Form + Zod | formulaires et validation (doublée côté serveur) |
| Lucide | icônes cohérentes |
| @fontsource | polices Poppins/Inter hébergées avec le site (pas d'appel à Google) |
| vite-plugin-pwa | manifeste + service worker |
| supabase-js | client officiel |

## Décisions documentées
- **Écritures sensibles uniquement via des fonctions serveur** (annonces, propositions, missions, signalements, admin) : les transitions d'état sont atomiques et verrouillent l'annonce (`FOR UPDATE`) + index unique « une mission active par annonce » → pas de double attribution.
- **Une conversation par couple client/prestataire** (le contexte de la dernière annonce est affiché). Les prestataires ne peuvent pas créer de conversation : elle naît d'une proposition ou d'un premier message du client.
- **Messagerie** : Supabase Realtime quand une conversation est ouverte + actualisation toutes les 20–30 s en secours (coût maîtrisé).
- **Photos** : redimensionnées (1600 px max, 512 px pour l'avatar) et ré-encodées en JPEG dans le navigateur → fichiers légers, métadonnées GPS supprimées. Avatars et galeries en stockage public (noms aléatoires) pour la rapidité ; photos d'annonces en stockage **privé** (URL signées, membres connectés).
- **Expiration, inactivité, purge anti-spam** : tâches `pg_cron` dans la base (toutes les 10 min / chaque nuit).
- **Liens e-mail au format `token_hash`** : fonctionnent même si l'e-mail est ouvert sur un autre appareil que celui de l'inscription.
- **Dates** stockées en UTC (`timestamptz`), affichées en `Pacific/Tahiti`, format jj/mm/aaaa ; montants en entiers F CFP.
- **Extension à d'autres îles** : tables `islands` / `communes`.
- **Comptes de démonstration** : uniquement via `npm run seed:demo`, qui refuse toute base non locale ; marqués `is_demo` et badge « Compte de démonstration ».

## Modèle de données (tables principales)
| Table | Contenu |
|---|---|
| `profiles` / `profile_private` / `user_roles` | compte public, données privées (téléphone, majorité, CGU), rôles admin |
| `islands`, `communes`, `categories`, `trades` | référentiels administrables |
| `provider_profiles`, `provider_trades`, `provider_photos` | fiches, métiers secondaires, galerie |
| `listings`, `listing_categories`, `listing_photos`, `listing_revisions` | annonces, catégories, photos, historique |
| `proposals`, `missions`, `status_history` | réponses, attributions (V2 : plusieurs par annonce), historique des états |
| `conversations`, `conversation_members`, `messages` | messagerie |
| `notifications` | centre de notifications |
| `reports`, `moderation_appeals`, `admin_audit_log` | signalements, contestations, journal |

Schéma `private` (non exposé par l'API) : fonctions internes et limitation de débit.

## Sécurité — points clés
- RLS activée sur **toutes** les tables ; droits de colonnes (ex. un prestataire ne peut pas modifier `is_hidden`).
- Administrateur vérifié côté serveur (`private.is_admin()`), rôle attribuable seulement en SQL.
- Limites : 20 messages/min, 500/jour ; 10 annonces/jour ; 30 propositions/jour ; 20 nouvelles conversations/jour ; 10 signalements/jour.
- Garde-fou : l'application refuse de démarrer si on lui fournit une clé secrète Supabase.
- En-têtes HTTP de sécurité (CSP stricte sans script en ligne, HSTS, interdiction des iframes).

## Coûts et limites
- **Cloudflare Pages** : offre gratuite généralement suffisante pour un site statique de cette taille.
- **Supabase gratuit** : quotas de base de données, stockage, bande passante et utilisateurs actifs ; projet mis en pause après une période d'inactivité ; sauvegardes limitées. Postes susceptibles de devenir payants en premier : **stockage/bande passante des photos**, **e-mails (SMTP)**, puis passage à l'offre Pro pour les sauvegardes et l'absence de mise en pause. Vérifiez les chiffres à jour sur les pages tarifs officielles avant de vous engager.
- Aucun service d'IA payant, aucun traceur publicitaire.
