import { expect, test } from '@playwright/test';
import type {} from '../src/main';

test('boots, plays and pauses without errors or CSP violations', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || /Content Security Policy/i.test(m.text())) problems.push(`console: ${m.text()}`);
  });

  await page.goto('./?seed=1234');
  await expect(page.locator('#overlay')).toContainText('RECOMPILE');
  await expect(page.locator('#overlay')).toContainText('seed 1234');
  await expect(page.locator('canvas')).toBeVisible();
  // Wait until the game loop is actually ticking before sending input.
  await page.waitForFunction(() => (window.__recompile?.loop.frame ?? 0) > 10);

  await page.keyboard.press('Enter');
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#log')).toContainText('ECHO-7 online');
  await expect(page.locator('#seed')).toHaveText('1234');

  // Walk for a moment, then pause.
  await page.keyboard.down('d');
  await page.waitForTimeout(600);
  await page.keyboard.up('d');
  await page.keyboard.press('Escape');
  await expect(page.locator('#overlay')).toContainText('PAUSED');

  expect(problems).toEqual([]);
});
