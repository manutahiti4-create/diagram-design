import { expect, type Page } from '@playwright/test';

const MAILPIT = process.env.TEST_MAILPIT_URL ?? 'http://127.0.0.1:54324';

export async function login(page: Page, email: string, password = 'demo1234') {
  await page.goto('/connexion');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/tableau-de-bord/);
}

/** Récupère le lien du dernier e-mail reçu par une adresse (boîte de test Mailpit). */
export async function latestEmailLink(to: string): Promise<string> {
  for (let i = 0; i < 30; i += 1) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const data = (await res.json()) as { messages: { ID: string }[] };
    if (data.messages?.length) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${data.messages[0].ID}`)).json()) as { HTML: string };
      const m = msg.HTML.match(/href="([^"]*auth\/confirmer[^"]*)"/);
      // Le lien utilise l'URL du site configurée dans Supabase : on garde seulement le chemin.
      if (m) {
        const u = new URL(m[1].replace(/&amp;/g, '&'));
        return u.pathname + u.search;
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Aucun e-mail reçu pour ${to}`);
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'défilement horizontal').toBeLessThanOrEqual(0);
}
