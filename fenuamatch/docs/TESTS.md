# Tests réellement exécutés

Environnement : conteneur Linux, Node 22, **Supabase local complet** (PostgreSQL 17, Auth, Storage, Realtime, Mailpit pour les e-mails)
lancé avec Docker via `npx supabase start`, navigateur Chromium piloté par Playwright. Date : 12/11/2026.

**Aucun test n'a été exécuté contre un vrai projet Supabase en ligne ni sur Cloudflare** (pas d'accès à ces comptes depuis cet environnement).
Les tests ci-dessous utilisent les mêmes logiciels que Supabase en ligne, mais en local.

## Résumé

| Suite | Commande | Résultat |
|---|---|---|
| Compilation TypeScript (81 fichiers) | `npx tsc -b` | ✅ 0 erreur |
| Build de production + PWA | `npm run build` | ✅ réussi (service worker + manifeste générés) |
| Analyse du schéma SQL | `npx supabase db lint` | ✅ aucune erreur |
| Tests unitaires | `npm test` | ✅ 8 / 8 |
| Tests de sécurité de la base (API réelle) | `npm run test:db` | ✅ 34 / 34 |
| Tests navigateur de bout en bout | `npm run test:e2e` | ✅ 11 / 11 |
| Parcours visuel (17 écrans, mobile 390 px + ordinateur) | script Playwright | ✅ 0 erreur console, 0 débordement horizontal |

## Détail — sécurité de la base (`tests/integration/security.test.ts`)
Chaque test se connecte avec de **vrais comptes** et appelle l'API Supabase comme le ferait un pirate depuis son navigateur.

**Inscription et comptes**
- Connexion refusée tant que l'e-mail n'est pas confirmé ; profil créé automatiquement.
- Adresse déjà utilisée : aucun second compte créé.
- Mot de passe trop faible refusé.
- Nom d'utilisateur : format, noms réservés (`admin`…), mots injurieux, doublons.
- Impossible de modifier son type de compte, son statut, ou le profil d'un autre.
- Téléphone privé invisible pour les autres comptes.
- Nom d'utilisateur : 1er changement libre, 2e refusé avant 90 jours, accepté après.

**Visiteurs non connectés** : voient les communes/métiers mais **aucune** fiche, annonce, message, proposition ni notification ; ne peuvent ni chercher ni publier.

**Prestataires et recherche**
- Un client ne peut pas créer de fiche ; un compte non déclaré majeur non plus ; la publication exige une photo.
- Création, métier secondaire, disponibilité ; recherche par nom, par début de mot (« electri »), par métier secondaire, filtres commune et disponibilité.
- Un prestataire ne peut pas se démasquer lui-même ; un client ne peut pas modifier une fiche.
- Galerie : 10 photos maximum, suppression, chemin de fichier d'un autre refusé.
- Stockage : dépôt dans le dossier d'un autre refusé, extension `.exe` refusée, SVG refusé, fichier > 5 Mo refusé, galerie interdite aux clients.

**Annonces, propositions, missions**
- Validation serveur (titre < 5, sans catégorie, date passée).
- Un prestataire ne peut ni publier ni modifier une annonce (ni par la table, ni par la fonction).
- 3 modifications maximum, historique conservé, prestataires prévenus.
- Photos d'annonce : 3 maximum ; stockage privé lisible par les membres connectés, refusé aux visiteurs ; un autre compte ne peut pas ajouter de photo.
- Parcours complet : proposition → doublon refusé → confidentialité des propositions → choix → annonce fermée aux nouvelles propositions →
  seule le prestataire choisi peut confirmer → attribuée → champs verrouillés → terminée.
- Refus de mission par le prestataire, annulation, refus d'une proposition : retour à l'état ouvert.
- **Clics simultanés** : 3 sélections envoyées en même temps → une seule réussit, une seule mission créée.
- Expiration (tâche planifiée), refus de proposition après expiration, notification, renouvellement gratuit, historique conservé, annulation.

**Messagerie**
- Un prestataire ne peut pas démarrer une conversation avec un client.
- Client ↔ prestataire : envoi, réception, compteur de non-lus, notification.
- Un troisième compte ne peut **ni lire, ni écrire, ni modifier, ni supprimer** (même avec l'identifiant exact de la conversation).
- Usurpation d'expéditeur et faux messages « système » refusés.
- Anti-spam : envoi en masse bloqué après 20 messages par minute.

**Signalements, modération, administration**
- Pas de signalement de son propre contenu ; pas de doublon ; masquage automatique au 3e compte distinct ; contenu toujours visible de son auteur ; contestation possible uniquement par l'auteur.
- Comptes créés depuis moins de 24 h : ne déclenchent pas le masquage automatique (anti-abus).
- Compte normal : administration refusée, impossible de se donner le rôle admin, journal invisible, catégories non modifiables.
- Administrateur : statistiques, suspension avec justification obligatoire (connexion bloquée côté Auth), prestataire suspendu absent de la recherche, réactivation, gestion des catégories, actions journalisées.

**Compte** : export des données, suppression avec confirmation, messages conservés mais anonymisés chez l'autre partie, plus d'envoi possible vers un compte supprimé.

**Comptes inactifs** : rappel à 6 mois, masquage 30 jours plus tard, jamais de suppression, réactivation à la reconnexion.

## Détail — bout en bout (`tests/e2e/`, build de production servi localement)
1. Inscription client via le formulaire → erreur d'e-mail invalide affichée → connexion refusée avant confirmation → **lecture du vrai e-mail** (Mailpit) → lien → connecté sur le tableau de bord → déconnexion → page privée renvoie vers la connexion.
2. Mot de passe oublié → e-mail → lien → page « nouveau mot de passe » → enregistrement.
3. Lien partagé vers une page privée → connexion → retour automatique sur la page demandée → **actualisation de la page sans erreur 404**.
4. Parcours complet à deux navigateurs : client publie une annonce **avec photo** et budget → le prestataire répond avec un prix → le client choisit → le prestataire voit « mission à confirmer » et confirme → statut « Attribuée » → notification → messages échangés et reçus des deux côtés.
5. Compte normal sur `/admin` → « Accès refusé ».
6. Administrateur → statistiques et liste des comptes.
7. Page inexistante → 404 claire.
8. Absence de défilement horizontal sur 12 pages, sur **Pixel 7, iPhone 13, iPad, ordinateur 1366 px** (moteur Chromium pour tous).

## Limites honnêtes
- Les profils « iPhone » et « iPad » simulent la taille d'écran avec Chromium : **Safari iOS réel n'a pas été testé** (installation PWA sur iPhone non vérifiée).
- Test de charge non réalisé.
- Envoi d'e-mails réels (SMTP en production) non testé.
- Les en-têtes de sécurité Cloudflare (`_headers`) n'ont pas été testés en conditions réelles (le build ne contient aucun script en ligne, ce qui est compatible avec la CSP prévue).
- Tests d'accessibilité automatisés (lecteur d'écran) non exécutés ; l'accessibilité a été traitée dans le code (libellés, erreurs reliées aux champs, focus visibles, contrastes AA).
