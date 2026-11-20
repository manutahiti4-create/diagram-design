# Notre petit cocon — Family Bullet Journal (version installable, hors ligne d'abord)

Le journal familial (tâches, budget, notes du jour) avec le design « Notre petit cocon ».

- **`app/`** : le projet Cloudflare Pages (dossier racine à indiquer à Cloudflare).
  - `public/` : le site. `index.html` contient tout (code, police Nunito, illustrations) ; `sw.js` le met en cache pour qu'il s'ouvre **sans Internet**.
  - `functions/api/[[path]].js` : l'API de synchronisation (Pages Functions).
  - `wrangler.toml` : relie la base D1 `notre-petit-cocon` (binding `DB`).
  - `schema.sql` : les tables de la base (déjà créées).
- **`source/`** : de quoi reconstruire l'appli.
  - `original.html` : l'appli d'origine (artefact claude.ai compilé).
  - `theme.css`, `ill.js`, `home.js` : le design « Notre petit cocon » (couleurs, illustrations, accueil).
  - `runtime.js` : le stockage local (IndexedDB) qui remplace claude.ai. Chaque document garde
    `updated_at`, `dirty` et `deleted` pour brancher plus tard la **synchronisation Supabase**.
  - `pwa.js` : réglages de la version installable (installation, sauvegarde/restauration complète).
  - `build.py` puis `build_pwa.py` : reconstruisent `app/index.html`.

## Reconstruire
```
cd source
python3 build.py       # design cocon -> build/cocon.html
python3 build_pwa.py   # version installable -> ../app/index.html
```

## Synchronisation
- Hors ligne d'abord : tout est enregistré dans le téléphone (IndexedDB), puis envoyé au serveur dès qu'Internet revient.
- Un seul foyer par serveur, deux profils maximum. Un téléphone rejoint le foyer avec un code d'invitation (12 caractères, 7 jours, usage unique).
- Conflits : la modification la plus récente gagne (par document).
- Les documents `data/users/<id>/…` (éléments « personnels ») ne sont renvoyés qu'à leur propriétaire.

## Mise en ligne (Cloudflare Pages, intégration GitHub)
Root directory : `family-bullet-journal/app` · Build command : (vide) · Output : `public` · Branche : celle de ce projet.

Police : Nunito, licence SIL OFL 1.1 (`source/font/OFL-Nunito.txt`). Illustrations : originales, créées pour ce projet.
