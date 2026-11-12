import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { latestEmailLink, login } from './helpers';

const here = path.dirname(fileURLToPath(import.meta.url));

test('inscription client avec confirmation de l\'e-mail puis déconnexion', async ({ page }) => {
  const id = Date.now().toString(36);
  const email = `e2e_${id}@example.test`;
  await page.goto('/inscription');
  await page.getByLabel('Adresse e-mail').fill('pas-un-email');
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page.getByText('Adresse e-mail invalide.')).toBeVisible();

  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Nom d\'utilisateur').fill(`e2e_${id}`);
  await page.getByLabel(/^Mot de passe/).first().fill('motdepasse1');
  await page.getByLabel('Confirmer le mot de passe').fill('motdepasse1');
  await page.getByLabel('Je certifie avoir 18 ans ou plus.').check();
  await page.getByRole('checkbox', { name: /J'accepte les/ }).check();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/verifier-email/);

  // Connexion refusée tant que l'adresse n'est pas confirmée
  await page.goto('/connexion');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill('motdepasse1');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByText(/pas encore confirmée/)).toBeVisible();

  const link = await latestEmailLink(email);
  await page.goto(link);
  await expect(page).toHaveURL(/tableau-de-bord/);
  await expect(page.getByRole('heading', { name: new RegExp(`Bonjour e2e_${id}`) })).toBeVisible();

  await page.goto('/parametres');
  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await page.goto('/tableau-de-bord');
  await expect(page).toHaveURL(/connexion\?redirect=/);
});

test('mot de passe oublié : lien reçu par e-mail puis nouveau mot de passe', async ({ page }) => {
  await page.goto('/mot-de-passe-oublie');
  await page.getByLabel('Adresse e-mail').fill('demo_cliente2@fenuamatch.test');
  await page.getByRole('button', { name: 'Envoyer le lien' }).click();
  await expect(page.getByText('Vérifiez votre messagerie')).toBeVisible();
  const link = await latestEmailLink('demo_cliente2@fenuamatch.test');
  await page.goto(link);
  await expect(page).toHaveURL(/nouveau-mot-de-passe/);
  await page.getByLabel('Nouveau mot de passe').fill('demo1234');
  await page.getByLabel('Confirmer').fill('demo1234');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  // Même mot de passe refusé par Supabase OU accepté selon la configuration : on vérifie un retour clair.
  await expect(page.getByText(/Mot de passe modifié|différent de l'ancien/)).toBeVisible();
});

test('lien partagé vers une fiche : connexion puis retour sur la fiche', async ({ page }) => {
  await page.goto('/rechercher?q=teva');
  await expect(page).toHaveURL(/connexion\?redirect=/);
  await page.getByLabel('Adresse e-mail').fill('demo_client@fenuamatch.test');
  await page.getByLabel('Mot de passe').fill('demo1234');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/rechercher\?q=teva/);
  await expect(page.getByText('[Démo] Teva Électricité').first()).toBeVisible();
  // Rafraîchissement d'une route profonde (pas d'erreur 404)
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Rechercher un prestataire' })).toBeVisible();
});

test('parcours complet : annonce avec photo → proposition → choix → confirmation → messagerie', async ({ browser }) => {
  const title = `Pose de ventilateur ${Date.now().toString(36)}`;
  const client = await (await browser.newContext()).newPage();
  await login(client, 'demo_cliente2@fenuamatch.test');
  await client.goto('/annonces/nouvelle');
  await client.getByLabel('Titre').fill(title);
  await client.getByLabel('Décrivez votre besoin').fill('Installer un ventilateur de plafond dans la chambre.');
  await client.getByLabel('Commune').selectOption({ label: 'Punaauia' });
  await client.getByRole('button', { name: 'Électricité' }).click();
  await client.getByLabel('Budget').fill('9000');
  await client.locator('input[type=file]').setInputFiles(path.join(here, 'fixtures', 'photo.png'));
  await expect(client.getByAltText('Photo 1')).toBeVisible();
  await client.getByRole('button', { name: 'Publier l\'annonce' }).click();
  await expect(client.getByRole('heading', { name: title })).toBeVisible();
  await expect(client.getByText('Budget : 9 000 F CFP')).toBeVisible();
  await expect(client.getByAltText('Photo 1 de l\'annonce')).toBeVisible();
  const listingUrl = client.url();

  const pro = await (await browser.newContext()).newPage();
  await login(pro, 'demo_electricien@fenuamatch.test');
  await pro.goto('/annonces');
  await pro.getByRole('link', { name: title }).click();
  await pro.getByLabel('Votre message au client').fill('Bonjour, je peux le faire samedi.');
  await pro.getByLabel('Prix indicatif').fill('8500');
  await pro.getByRole('button', { name: 'Envoyer ma proposition' }).click();
  await expect(pro.getByRole('heading', { name: 'Votre proposition' })).toBeVisible();

  await client.goto(listingUrl);
  await expect(client.getByText('Prix indicatif : 8 500 F CFP')).toBeVisible();
  await client.getByRole('button', { name: 'Choisir', exact: true }).click();
  await client.getByRole('button', { name: 'Choisir ce prestataire' }).click();
  await expect(client.getByText('En attente de confirmation du prestataire')).toBeVisible();

  await pro.goto('/tableau-de-bord');
  await expect(pro.getByText(/mission.* à confirmer/)).toBeVisible();
  await pro.goto(listingUrl);
  await pro.getByRole('button', { name: 'Confirmer la mission' }).click();
  await pro.getByRole('button', { name: 'Je confirme la mission' }).click();
  await expect(pro.getByText('Confirmée', { exact: true })).toBeVisible();

  await client.goto(listingUrl);
  await expect(client.getByText('Attribuée').first()).toBeVisible();
  await client.goto('/notifications');
  await expect(client.getByText('Mission confirmée').first()).toBeVisible();

  // Messagerie : la conversation ouverte par la proposition
  await client.goto('/messages');
  await client.getByRole('link', { name: /Teva/ }).first().click();
  const msg = `Merci, à samedi ! (${Date.now().toString(36)})`;
  await client.getByLabel('Votre message').fill(msg);
  await client.getByRole('button', { name: 'Envoyer' }).click();
  await expect(client.getByRole('paragraph').filter({ hasText: msg })).toBeVisible();
  await expect(client.getByLabel('Votre message')).toHaveValue('');
  await pro.goto('/messages');
  await expect(pro.getByText(msg)).toBeVisible();
});

test('un compte normal ne peut pas accéder à l\'administration', async ({ page }) => {
  await login(page, 'demo_client@fenuamatch.test');
  await page.goto('/admin');
  await expect(page.getByText('Accès refusé')).toBeVisible();
});

test('l\'administrateur voit les statistiques réelles', async ({ page }) => {
  await login(page, 'demo_admin@fenuamatch.test');
  await page.goto('/admin');
  await expect(page.getByText('Signalements en attente')).toBeVisible();
  await page.goto('/admin/comptes');
  await expect(page.getByText('@demo_electricien')).toBeVisible();
});

test('page inexistante : 404 claire', async ({ page }) => {
  await page.goto('/cette-page-nexiste-pas');
  await expect(page.getByText('Page introuvable (erreur 404)')).toBeVisible();
});
