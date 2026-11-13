# Notre petit cocon — Family Bullet Journal (version installable, hors ligne d'abord)

Le journal familial (tâches, budget, notes du jour) avec le design « Notre petit cocon ».

- **`app/`** : l'appli à publier (Netlify). `index.html` contient tout (code, police Nunito, illustrations).
  `sw.js` met l'appli en cache pour qu'elle s'ouvre **sans Internet**.
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

## État
- Hors ligne : oui (les données restent dans le téléphone).
- Synchronisation entre les deux téléphones : **pas encore** (prochaine étape : Supabase + lien magique).

Police : Nunito, licence SIL OFL 1.1 (`source/font/OFL-Nunito.txt`). Illustrations : originales, créées pour ce projet.
