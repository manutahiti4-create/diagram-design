# 🌺 Fenua Survivor

Jeu de survie sur une île polynésienne. Ton héros attaque tout seul, tu bouges avec le doigt.

## Ce qu'il y a dans ce dossier

```
fenua-survivor/
├── www/                     ← LE JEU (c'est ça que tu modifies)
│   ├── index.html           ← tout le code du jeu
│   ├── manifest.webmanifest ← nom, icône, couleurs de l'appli
│   ├── sw.js                ← permet de jouer sans Internet
│   └── icons/               ← icônes de l'appli
├── android/                 ← projet Android (généré, à ouvrir dans Android Studio)
├── capacitor.config.json    ← réglages de l'appli (nom, identifiant)
└── package.json             ← liste des outils utilisés
```

**Règle d'or :** tu modifies seulement `www/index.html`. Ensuite tu "synchronises" vers Android (voir plus bas).

---

## Option 1 — Appli web installable (gratuit, le plus simple)

Le jeu est une "PWA" : une fois mis en ligne, on l'ouvre dans le navigateur
et on l'ajoute à l'écran d'accueil. Il a son icône, s'ouvre en plein écran
et marche sans Internet.

1. Mets le dossier `www/` en ligne (Netlify, Vercel ou GitHub Pages, tous gratuits).
2. Ouvre le lien sur ton téléphone.
3. **Android (Chrome)** : bouton « 📲 Installer l'appli » dans le menu du jeu,
   ou menu ⋮ → « Ajouter à l'écran d'accueil ».
4. **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».

## Option 2 — Vraie appli Android (APK / Play Store)

Il faut un ordinateur (Windows, Mac ou Linux).

1. Installe **Node.js** (version 22 ou plus) : https://nodejs.org
2. Installe **Android Studio** : https://developer.android.com/studio
3. Récupère ce dossier sur ton ordinateur, ouvre un terminal dedans et tape :
   ```
   npm install
   npm run android
   ```
4. Android Studio s'ouvre avec le projet. Attends la fin du chargement (barre en bas).
5. Branche ton téléphone en USB (avec le « débogage USB » activé dans les options développeur),
   puis clique sur ▶️ en haut. Le jeu s'installe sur ton téléphone.
6. Pour le Play Store : menu **Build → Generate Signed App Bundle**.
   Il faut un compte Google Play Console (25 $ US, une seule fois).
   ⚠️ Garde précieusement le fichier de signature (`.jks`) et son mot de passe :
   sans lui, tu ne pourras plus jamais mettre à jour l'appli.

**Après chaque modification du jeu** : `npx cap sync android`, puis ▶️ dans Android Studio.

## iPhone (App Store)

Possible avec le même projet (`npx cap add ios`), mais il faut **obligatoirement un Mac**
et un compte Apple Developer (99 $ US par an).

## Tester sur l'ordinateur

```
npm run serve
```
Puis ouvre http://localhost:8080 dans le navigateur.

## Mettre à jour la version hors-ligne

Quand tu changes le jeu, change aussi `VERSION` dans `www/sw.js`
(par ex. `fenua-v1` → `fenua-v2`) pour que les téléphones récupèrent la nouvelle version.
