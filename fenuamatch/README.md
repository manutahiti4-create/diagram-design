# FenuaMatch

> **Le bon talent, au bon endroit.** — Plateforme de mise en relation entre particuliers et prestataires à Tahiti.

Application web (PWA installable sur téléphone) construite avec **React + TypeScript + Vite + Tailwind CSS**,
**Supabase** (base PostgreSQL, authentification, fichiers, sécurité RLS) et hébergée sur **Cloudflare Pages**.

| Document | Contenu |
|---|---|
| [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) | **Mettre le site en ligne** pas à pas (Supabase + Cloudflare) |
| [docs/ETAT_AVANCEMENT.md](docs/ETAT_AVANCEMENT.md) | Ce qui est fait, ce qui reste, problèmes connus, plan V2 |
| [docs/TESTS.md](docs/TESTS.md) | Tests réellement exécutés et résultats |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Choix techniques, base de données, sécurité, coûts |
| [docs/MODIFIER_LE_SITE.md](docs/MODIFIER_LE_SITE.md) | Faire évoluer FenuaMatch sans tout reconstruire |

---

## Démarrer sur votre ordinateur (débutant)

### 1. Installer les logiciels (une seule fois)
1. **Node.js** version 20 ou plus : <https://nodejs.org> (prendre la version « LTS »).
2. **Docker Desktop** : <https://www.docker.com/products/docker-desktop> — sert à faire tourner Supabase sur votre ordinateur.
3. **Git** : <https://git-scm.com>.
4. Un éditeur de code, par exemple **Visual Studio Code**.

Vérifiez dans un terminal :
```bash
node -v    # doit afficher v20 ou plus
docker -v
```

### 2. Récupérer le projet et installer les dépendances
```bash
git clone <adresse-de-votre-dépôt>
cd diagram-design/fenuamatch
npm install
```

### 3. Lancer la base de données locale
Docker Desktop doit être ouvert.
```bash
npx supabase start      # 1er lancement : quelques minutes (téléchargement)
npm run seed:demo       # crée des comptes de démonstration (local uniquement)
```

### 4. Lancer le site
```bash
npm run dev:local
```
Ouvrez <http://localhost:5173>. Comptes de démonstration (mot de passe `demo1234`) :

| E-mail | Rôle |
|---|---|
| demo_client@fenuamatch.test | client |
| demo_electricien@fenuamatch.test | prestataire |
| demo_jardinier@fenuamatch.test | prestataire |
| demo_admin@fenuamatch.test | administrateur |

Les e-mails envoyés en local (confirmation, mot de passe oublié) s'affichent dans **Mailpit** : <http://127.0.0.1:54324>.

### 5. Commandes utiles
| Commande | Rôle |
|---|---|
| `npm run dev:local` | site en développement relié au Supabase local |
| `npm run build` | vérifie TypeScript et fabrique la version de production (`dist/`) |
| `npm test` | tests unitaires |
| `npm run test:db` | tests de sécurité de la base (Supabase local requis) |
| `npm run test:e2e` | tests navigateur de bout en bout (Supabase local + `seed:demo`) |
| `npx supabase db reset` | remet la base locale à zéro (rejoue les migrations) |
| `npm run icons` | régénère favicon et icônes depuis `src/assets/logo-mark.svg` |

## Arborescence
```
fenuamatch/
├── public/            favicon, icônes PWA, _redirects et _headers (Cloudflare)
├── src/
│   ├── assets/        logo SVG
│   ├── auth/          session, protections des routes
│   ├── components/    ui/ (boutons, champs…), layout/, domain/ (cartes, badges…)
│   ├── config/        marque (slogan…), variables d'environnement
│   ├── lib/           Supabase, formatage F CFP/dates, images, erreurs, libellés
│   ├── pages/         une page par écran (auth, recherche, annonces, messagerie, admin…)
│   ├── schemas/       validations des formulaires (Zod)
│   ├── services/      accès aux données (requêtes Supabase)
│   └── types/         types générés depuis la base
├── supabase/
│   ├── migrations/    schéma SQL versionné, RLS, fonctions sécurisées, stockage, tâches planifiées
│   ├── templates/     e-mails en français
│   └── config.toml    configuration locale (auth, e-mails)
├── scripts/           données de démo, icônes
└── tests/             integration/ (sécurité base) et e2e/ (navigateur)
```
