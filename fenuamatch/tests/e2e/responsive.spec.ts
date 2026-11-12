import { test, expect } from '@playwright/test';
import { login, noHorizontalScroll } from './helpers';

const PAGES = ['/', '/rechercher?q=elec', '/annonces', '/mes-annonces', '/messages', '/tableau-de-bord', '/parametres', '/annonces/nouvelle', '/notifications', '/cgu'];

test('aucun défilement horizontal et navigation visible', async ({ page }) => {
  await page.goto('/');
  await noHorizontalScroll(page);
  await page.goto('/inscription');
  await noHorizontalScroll(page);
  await login(page, 'demo_client@fenuamatch.test');
  for (const p of PAGES) {
    await page.goto(p);
    await page.waitForLoadState('networkidle');
    await noHorizontalScroll(page);
  }
  await expect(page.getByRole('navigation', { name: 'Navigation principale' }).filter({ visible: true }).first()).toBeVisible();
});
