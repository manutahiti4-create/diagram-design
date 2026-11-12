# Faire évoluer FenuaMatch

## Modifications simples (sans toucher à la logique)
| Je veux changer… | Où |
|---|---|
| Le slogan, le titre de l'accueil, les exemples de recherche | `src/config/brand.ts` |
| Les couleurs | `src/index.css` (bloc `@theme`) |
| Le logo | `src/assets/logo-mark.svg` puis `npm run icons` |
| Les textes juridiques | `src/pages/legal/LegalPage.tsx` |
| Les e-mails | `supabase/templates/*.html` (puis les recopier dans Supabase, voir DEPLOIEMENT.md) |
| Les catégories et métiers | **Depuis le site** : Administration → Catégories et métiers (aucun code) |
| Les communes | table `communes` dans Supabase (Table Editor) |

## Procédure sûre pour toute modification
1. Créez une branche : `git checkout -b ma-modification`.
2. Lancez le site en local : `npx supabase start`, `npm run seed:demo`, `npm run dev:local`.
3. Faites la modification, vérifiez à l'écran (sur téléphone : outils développeur du navigateur → mode mobile).
4. Vérifiez : `npm run build` puis `npm test`, `npm run test:db`, `npm run test:e2e`.
5. Envoyez sur GitHub (`git push`) : Cloudflare crée automatiquement une **prévisualisation** de la branche.
6. Si tout va bien, fusionnez dans la branche de production → mise en ligne automatique.

## Modifier la base de données
**Ne modifiez jamais une migration déjà envoyée en production.** Créez-en une nouvelle :
```bash
npx supabase migration new nom_de_la_modification   # crée supabase/migrations/<date>_nom.sql
# écrivez le SQL dans ce fichier
npx supabase db reset                                # teste en local
npx supabase gen types typescript --local --schema public > src/types/database.ts
npm run test:db
npx supabase db push                                 # envoie en production (projet lié)
```
Pour chaque nouvelle table : `enable row level security`, des politiques, et des droits (`grant`) minimaux — voir
`supabase/migrations/20261112000600_security_storage_jobs.sql` comme modèle.

## Ajouter une page
1. Créez `src/pages/<domaine>/MaPage.tsx` (inspirez-vous d'une page existante).
2. Déclarez la route dans `src/App.tsx` (entourez-la de `auth(...)` si elle est réservée aux membres).
3. Ajoutez un lien depuis la navigation ou une page.
