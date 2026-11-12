# État d'avancement — V1 (12/11/2026)

## ✅ Terminé et testé
| Domaine | Détail |
|---|---|
| Identité | Logo SVG original (F + lien de connexion), favicon, icônes PWA (192, 512, maskable), image de partage, couleurs et polices (Poppins / Inter hébergées localement) |
| Accueil | Recherche, exemples, deux actions, métiers populaires, prestataires et dernières annonces (membres), fonctionnement ; aucun faux contenu |
| Comptes | Inscription client/prestataire, vérification e-mail (renvoi, liens expirés, adresse déjà utilisée), connexion, déconnexion (un appareil / tous), mot de passe oublié, changement de mot de passe (avec code si connexion ancienne), changement d'e-mail sécurisé (double confirmation), nom d'utilisateur (règles + 90 jours), export des données, suppression du compte |
| Prestataires | Fiche (nom, photo, métier principal + secondaires, commune, description, disponibilité, téléphone, horaires, zone, infos), publication/dépublication, galerie 10 photos avec légendes |
| Recherche | Texte (métier, spécialité, nom, description, début de mot, sans accents), filtres catégorie / métier / commune / « Tout Tahiti » / disponibilité, classement par pertinence, chargement par lots |
| Annonces | Création (photos ×3, JPG/PNG 5 Mo, aperçu), brouillon, publication 30 jours, 3 modifications avec historique, renouvellement gratuit illimité, annulation, expiration automatique, 8 statuts |
| Propositions / missions | Réponse avec message et prix indicatif, retrait, refus, choix par le client, **confirmation réciproque**, refus/annulation, fin de mission ; protection contre la double attribution |
| Messagerie | Conversations privées texte, temps réel + actualisation de secours, non-lus, horodatage (heure de Tahiti), règles de contact (le prestataire ne peut pas démarcher) |
| Notifications | Centre intégré (proposition, message, choix, confirmation, annulation, expiration, modération), lien vers l'élément, compteur |
| Tableaux de bord | Client et prestataire (chiffres réels, actions rapides, emplacements V2 marqués « pas encore disponibles ») |
| Modération | Signalement profil/annonce/message, 6 motifs, anti-doublon, masquage auto à 3 comptes distincts (> 24 h), contestation, notification du propriétaire |
| Administration | Statistiques réelles, comptes (recherche, masquage, suspension), annonces (filtre, masquer/restaurer), signalements et contestations, catégories et métiers (ajout, renommage, ordre, désactivation), journal des actions |
| Sécurité | RLS sur toutes les tables, écritures sensibles par fonctions serveur, limites anti-abus, validation des fichiers (taille, type, extension, chemin, ré-encodage côté navigateur qui retire le GPS), CSP, aucun secret dans le frontend |
| PWA | Manifeste, icônes, plein écran, service worker (fichiers de l'app uniquement, aucune donnée personnelle en cache) |
| Pages | Juridiques (projets à valider), contact, 404, erreurs, configuration manquante |

## ⚠️ Fait partiellement / à faire avant l'ouverture publique
1. **Mise en ligne réelle** : non effectuée — je n'ai pas eu l'autorisation de créer le projet Supabase depuis cet environnement, ni d'accès à Cloudflare. Tout est prêt : suivre `docs/DEPLOIEMENT.md`.
2. **E-mails pour les événements de mission** (acceptation, confirmation) : V1 = notification dans l'application uniquement. Les e-mails de compte (confirmation, mot de passe, changement d'adresse) fonctionnent via Supabase. Pour envoyer aussi un e-mail lors des missions : ajouter un fournisseur SMTP/API (ex. Resend) puis une *Database Webhook* sur la table `notifications` (types `proposal_selected`, `mission_confirmed`, `mission_cancelled`) vers une fonction Edge. Non développé pour ne pas créer de dépendance payante sans votre accord.
3. **E-mail de rappel d'inactivité (6 mois)** : la règle tourne chaque nuit (champs + notification + masquage à 6 mois + 30 jours), mais l'**e-mail** dépend du point 2.
4. **Textes juridiques** : à compléter (champs « À compléter avant publication ») et à faire valider.
5. **Mineurs** : règle prudente appliquée — inscription réservée aux 18 ans et plus (déclaration). Ce n'est **pas** une preuve légale ; le dispositif d'autorisation parentale est à concevoir après vérification juridique.
6. **Domaine** : `fenuamatch.pf` / `.com` non vérifiés.
7. **Communes** : libellés usuels utilisés (« Faa'a », « Hitiaa O Te Ra », « Teva I Uta »…) ; à confirmer avec la liste officielle (ISPF / Haut-commissariat). Modifiables dans la table `communes`.

## 🐞 Problèmes connus / limites
- Safari iOS réel non testé (testé en simulation de taille d'écran avec Chromium).
- La vérification du contenu réel des images se fait dans le navigateur (signature du fichier + ré-encodage) ; côté serveur, Supabase contrôle taille, type déclaré, extension et chemin, mais pas le contenu binaire. Un contrôle serveur complet demanderait une fonction Edge (V2).
- Les fichiers d'un compte sont supprimés par l'application avant la suppression du compte ; si l'opération est interrompue, des fichiers orphelins peuvent rester (nettoyage manuel possible dans *Storage*).
- La « disponibilité » est déclarative et l'interface l'indique.
- Un même compte ne peut pas être à la fois client et prestataire (choix fait à l'inscription). Évolution possible en V2.

## 🚀 Plan d'extension V2 (sans reconstruire)
Ordre conseillé, chaque étape = une nouvelle migration SQL + quelques pages :

1. **E-mails transactionnels** (SMTP + fonction Edge déclenchée par `notifications`).
2. **Avis clients** : table `reviews` (mission_id unique, note 1–5, commentaire, réponse du prestataire) ; RLS : seul le client d'une mission `completed` peut écrire. Affichage « Nouveau prestataire » sans avis. Filtre « note » dans `search_providers`.
3. **Vérification professionnelle** : table `verifications` (prestataire, métiers couverts, statut, admin) + bucket **privé** `verification-docs` lisible uniquement par l'admin. Badge par métier vérifié uniquement.
4. **Paiements** (après choix d'un prestataire compatible avec la Polynésie française) : tables `subscriptions`, `payments`, `payment_events` (webhooks idempotents, signature vérifiée dans une fonction Edge, jamais côté navigateur). Statut Premium calculé côté serveur.
5. **Premium** (1 500 F CFP/mois ou 15 000 F CFP/an, essai 7 jours) : la limite de galerie est déjà centralisée dans `private.gallery_limit()` → passer à 20 pour les abonnés ; masquer (sans supprimer) les photos > 10 à la résiliation.
6. **Devis** : tables `quotes`, `quote_lines`, génération PDF ; taux de taxes **configurables** (aucun taux inventé) ; validation juridique avant activation.
7. **Calendrier / rendez-vous** : tables `appointments`, `availability_slots`, rappels via pg_cron.
8. **Mises en avant** : table `promotions` (cible, durée, prix configurable, statut `pending_review → approved → paid → active`), début seulement à la publication, étiquette « Sponsorisé ».
9. **Messagerie enrichie** : photos/PDF (bucket privé par conversation), archivage, filtre non-lus.
10. **Notifications push** (Web Push, après consentement explicite, réglage on/off).
11. **Plusieurs prestataires par annonce** : déjà prévu — la table `missions` accepte plusieurs lignes par annonce ; il suffit d'assouplir l'index `missions_one_active_per_listing`.
12. **Autres îles** : ajouter des lignes dans `islands` et `communes` (aucune modification de structure).
