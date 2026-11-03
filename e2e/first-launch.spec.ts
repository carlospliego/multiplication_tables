import { expect, test, type Page } from '@playwright/test';

/** Reads "a × b" from the visible QuestionCard, taps the digits and Go. */
async function answerQuestion(page: Page): Promise<void> {
  const heading = page.getByRole('region', { name: 'Question' }).getByRole('heading');
  const text = (await heading.textContent()) ?? '';
  const m = /(\d+)\s*×\s*(\d+)/.exec(text);
  if (!m) throw new Error(`Unrecognised question text: ${text}`);
  const product = String(Number(m[1]) * Number(m[2]));
  const pad = page.getByRole('group', { name: 'Number pad' });
  for (const d of product) await pad.getByRole('button', { name: d, exact: true }).click();
  await pad.getByRole('button', { name: 'Go' }).click();
}

test('first launch to first quest', async ({ page }) => {
  // 24 placement answers plus the warm-up take ~40s of real UI time (feedback pauses
  // included), well over Playwright's 30s default.
  test.setTimeout(120_000);

  await page.goto('/');
  await page.getByLabel("What's your name, Captain?").fill('Leo');
  await page.getByRole('button', { name: 'Launch!' }).click();

  await expect(page.getByRole('heading', { name: 'Systems Check' })).toBeVisible();
  for (let i = 1; i <= 24; i++) {
    await expect(page.getByText(`${i} / 24`, { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Question' })).toBeVisible();
    await answerQuestion(page);
    if (i < 24) await expect(page.getByRole('status')).toHaveText('logged!');
  }

  await expect(page.getByRole('heading', { name: 'Captain Leo' })).toBeVisible();
  // A "new planet" overlay may appear after placement; dismiss it if so.
  const ok = page.getByRole('dialog').getByRole('button', { name: 'OK' });
  if (await ok.isVisible()) await ok.click();

  await page.getByRole('button', { name: 'Launch Mission' }).click();
  await expect(page.getByRole('heading', { name: 'Warm-up' })).toBeVisible();

  // Warm-up: 5 review questions, no discovery cards (new facts are never introduced in a
  // warm-up), and all-correct answers add no re-asks. Finishing it auto-advances to Quest 1.
  const question = page.getByRole('region', { name: 'Question' });
  for (let i = 0; i < 5; i++) {
    await expect(question).toBeVisible();
    await answerQuestion(page);
    await expect(question).toBeHidden(); // "Great!" feedback replaces the card
  }
  await expect(page.getByRole('heading', { name: 'Quest 1' })).toBeVisible();

  // Leave through the in-game exit, then reload: the map comes back and the mission resumes at Quest 1.
  await page.getByRole('button', { name: '⟵ Map' }).click();
  await expect(page.getByRole('heading', { name: 'Captain Leo' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Captain Leo' })).toBeVisible();
  const raw = await page.evaluate(() => localStorage.getItem('ttr.save'));
  const save = JSON.parse(raw as string);
  expect(save.captainName).toBe('Leo');
  expect(save.placementDone).toBe(true);
  expect(save.mission.step).toBe('quest1');
  expect(save.mission.tally.answered).toBe(5);
});

test('parent gate opens dashboard', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel("What's your name, Captain?").fill('Mia');
  await page.getByRole('button', { name: 'Launch!' }).click();
  // Seed a finished placement so the map is reachable without 24 answers.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ttr.save') as string);
    s.placementDone = true;
    localStorage.setItem('ttr.save', JSON.stringify(s));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Grown-ups' }).click();

  const problem = (await page.getByTestId('gate-problem').textContent()) ?? '';
  const m = /(\d+)\s*×\s*(\d+)/.exec(problem);
  if (!m) throw new Error(`Unrecognised gate problem: ${problem}`);
  const product = String(Number(m[1]) * Number(m[2]));
  const pad = page.getByRole('group', { name: 'Number pad' });
  for (const d of product) await pad.getByRole('button', { name: d, exact: true }).click();
  await pad.getByRole('button', { name: 'Go' }).click();

  await expect(page.getByRole('heading', { name: 'Grown-ups' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Facts' })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="grid-title"] button')).toHaveCount(81);
});

test('export, reset, then restore from the Welcome screen', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel("What's your name, Captain?").fill('Zoe');
  await page.getByRole('button', { name: 'Launch!' }).click();
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ttr.save') as string);
    s.placementDone = true;
    localStorage.setItem('ttr.save', JSON.stringify(s));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Grown-ups' }).click();

  const problem = (await page.getByTestId('gate-problem').textContent()) ?? '';
  const m = /(\d+)\s*×\s*(\d+)/.exec(problem);
  if (!m) throw new Error(`Unrecognised gate problem: ${problem}`);
  const pad = page.getByRole('group', { name: 'Number pad' });
  for (const d of String(Number(m[1]) * Number(m[2]))) await pad.getByRole('button', { name: d, exact: true }).click();
  await pad.getByRole('button', { name: 'Go' }).click();
  await expect(page.getByRole('heading', { name: 'Backup' })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export progress' }).click(),
  ]);
  const backupPath = await download.path();

  await page.getByLabel('Type RESET to erase all progress').fill('RESET');
  await page.getByRole('button', { name: /^reset/i }).click();
  await expect(page.getByLabel("What's your name, Captain?")).toBeVisible();

  await page.getByLabel('Restore from a backup file').setInputFiles(backupPath);
  await expect(page.getByText("Restore Captain Zoe's progress?")).toBeVisible();
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Captain Zoe' })).toBeVisible();
});
