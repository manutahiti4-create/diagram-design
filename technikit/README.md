# TechniKit

Appli de terrain pour technicien : planning, rapports d'intervention, clients, photos, aide-mémoire technique.

- En ligne : https://technikit-pf.netlify.app (Netlify, projet `technikit-pf`)
- `index.html` : toute l'appli (HTML + CSS + JavaScript), données dans le navigateur du téléphone
- `netlify/functions/send-report.mjs` : envoi des rapports par mail depuis Gmail (mot de passe d'application saisi dans l'appli)
- `manifest.webmanifest` + `sw.js` : appli installable, fonctionne sans réseau

## Mettre à jour le site
Depuis ce dossier : déployer sur le projet Netlify `technikit-pf` (Netlify installe `nodemailer` pendant le build).
