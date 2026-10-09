import { expect, test, type Page, type Route } from '@playwright/test';
import { defaultMenu, weekDates, type Choice } from '../app/domain';

// Keep server-rendered dates and the browser clock in the same week.
const now = new Date();
type Row = { student: string; date: string; choice: Choice };
const dates = weekDates(0, now);
const savedChoices: Row[] = [
  { student: 'demo-1001', date: dates[0], choice: 'normal' },
  { student: 'demo-1002', date: dates[0], choice: 'vegetarian' },
  { student: 'demo-1001', date: dates[1], choice: 'normal' },
];
function weekData(week: number, choices = week === 0 ? savedChoices : []) {
  return { menus: weekDates(week, now).map(defaultMenu), choices };
}
async function mockDemo(page: Page, handlers: {
  get?: (route: Route, week: number) => Promise<void>;
  post?: (route: Route) => Promise<void>;
} = {}) {
  await page.clock.install({ time: now });
  await page.route('**/api/demo**', async route => {
    if (route.request().method() === 'GET') {
      const week = Number(new URL(route.request().url()).searchParams.get('week'));
      if (handlers.get) return handlers.get(route, week);
      return route.fulfill({ json: weekData(week) });
    }
    if (handlers.post) return handlers.post(route);
    throw new Error('Unexpected write in a read-only test');
  });
}
async function openView(page: Page, view: 'menu' | 'choices' | 'kitchen') {
  const names = {
    menu: /^(Ementa semanal|Ementa)$/,
    choices: /^(Minhas escolhas.*|Escolhas)$/,
    kitchen: /^(Painel da cantina|Cantina)$/,
  };
  await page.getByRole('button', { name: names[view] }).click();
}
const stats = (page: Page) => page.locator('.kitchen-stats strong');
const exportButton = (page: Page) => page.getByRole('button', { name: 'Exportar CSV' });
const confirmButton = (page: Page) => page.getByRole('button', { name: 'Confirmar escolhas', exact: true });
const vegetarian = (page: Page) => page.getByRole('button', { name: /^Vegetariano .*Selecion/ });

// The first GET succeeds; the next week's GET fails, then succeeds on retry.
test('failed week loads hide old counts and block actions until retry succeeds', async ({ page }) => {
  let nextWeekLoads = 0;
  let releaseFailure!: () => void;
  const failureGate = new Promise<void>(resolve => { releaseFailure = resolve; });
  await mockDemo(page, { get: async (route, week) => {
    if (week === 1 && ++nextWeekLoads === 1) {
      await failureGate;
      return route.fulfill({ status: 503, json: { error: 'Não foi possível carregar a semana.' } });
    }
    return route.fulfill({ json: weekData(week) });
  } });
  await page.goto('/');
  await expect(page.locator('.summary-footnote')).toHaveText(/confirmados|nenhuma/);
  await openView(page, 'kitchen');
  await expect(stats(page)).toHaveText(['3', '2', '1', '12']);
  await page.getByRole('button', { name: 'Semana seguinte', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('A carregar');
  await expect(stats(page)).toHaveText(['—', '—', '—', '—']);
  await expect(exportButton(page)).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Editar ementa' }).first()).toBeDisabled();
  releaseFailure();
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar a semana.');
  await expect(stats(page)).toHaveText(['—', '—', '—', '—']);
  await expect(page.locator('tbody tr').first().locator('td').filter({ hasText: /^—$/ })).toHaveCount(5);
  await expect(exportButton(page)).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Editar ementa' }).first()).toBeDisabled();
  await openView(page, 'menu');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(vegetarian(page)).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Não vou almoçar neste dia' })).toBeDisabled();
  await expect(confirmButton(page)).toBeDisabled();
  await expect(page.locator('.summary-footnote')).toHaveText('Dados indisponíveis');
  await openView(page, 'choices');
  await expect(page.locator('.status-badge')).toHaveText(Array(5).fill('Dados indisponíveis'));
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await openView(page, 'kitchen');
  await expect(stats(page)).toHaveText(['0', '0', '0', '15']);
  await expect(exportButton(page)).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Editar ementa' }).first()).toBeEnabled();
  await openView(page, 'menu');
  await expect(vegetarian(page)).toBeEnabled();
});

test('retry preserves pending choices through a failed reload and confirmation', async ({ page }) => {
  let gets = 0;
  let writes = 0;
  let choices = [...savedChoices];
  await mockDemo(page, {
    get: async route => {
      if (++gets === 2) return route.abort('failed');
      return route.fulfill({ json: weekData(0, choices) });
    },
    post: async route => {
      if (++writes === 1) return route.fulfill({ status: 503, json: { error: 'Não foi possível guardar.' } });
      const body = route.request().postDataJSON();
      expect(body).toEqual({ type: 'choices', student: 'demo-1001', items: [{ date: dates[1], choice: 'vegetarian' }] });
      choices = choices.map(row => row.student === 'demo-1001' && row.date === dates[1] ? { ...row, choice: 'vegetarian' } : row);
      return route.fulfill({ json: { ok: true } });
    },
  });
  await page.goto('/');
  await expect(page.locator('.summary-footnote')).toHaveText(/confirmados|nenhuma/);
  // Tuesday's deadline is still in the future, including weekend runs.
  await page.getByRole('tab', { name: /^Terça/ }).click();
  await vegetarian(page).click();
  await confirmButton(page).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível guardar.');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(confirmButton(page)).toBeDisabled();
  await expect(vegetarian(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.summary-footnote')).toHaveText('1 escolha por confirmar');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(confirmButton(page)).toBeEnabled();
  await expect(vegetarian(page)).toHaveAttribute('aria-pressed', 'true');
  await openView(page, 'kitchen');
  await expect(stats(page)).toHaveText(['3', '2', '1', '12']);
  await openView(page, 'menu');
  await confirmButton(page).click();
  await expect(page.locator('.summary-footnote')).toHaveText('2 de 5 dias confirmados');
  await page.reload();
  await expect(page.locator('.summary-footnote')).toHaveText('2 de 5 dias confirmados');
  await openView(page, 'kitchen');
  await expect(stats(page)).toHaveText(['3', '1', '2', '12']);
  // The export reflects the reloaded confirmed choices, including the changed meal.
  const downloadPromise = page.waitForEvent('download');
  await exportButton(page).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let csv = '';
  for await (const chunk of stream!) csv += chunk.toString();
  expect(csv).toContain(`${dates[1]};0;1;0;2;1`);
  await page.locator('.profile-button').click();
  await page.getByRole('textbox', { name: 'Número de aluno' }).fill('1002');
  await page.getByRole('button', { name: 'Continuar em demonstração' }).click();
  await openView(page, 'menu');
  await expect(page.locator('.summary-footnote')).toHaveText('1 de 5 dias confirmados');
  await expect(vegetarian(page)).toHaveAttribute('aria-pressed', 'true');
});

test('a slow response for an older week cannot replace the selected week', async ({ page }) => {
  let releaseOlderWeek!: () => void;
  const olderWeekGate = new Promise<void>(resolve => { releaseOlderWeek = resolve; });
  await mockDemo(page, { get: async (route, week) => {
    if (week === 1) await olderWeekGate;
    const choices: Row[] = week === 1 ? [{ student: 'demo-1001', date: weekDates(1, now)[0], choice: 'normal' }] : [];
    return route.fulfill({ json: weekData(week, choices) });
  } });
  await page.goto('/');
  await expect(page.locator('.summary-footnote')).toHaveText(/confirmados|nenhuma/);
  await openView(page, 'kitchen');
  await expect(exportButton(page)).toBeEnabled();
  await page.getByRole('button', { name: 'Semana seguinte', exact: true }).click();
  await expect(exportButton(page)).toBeDisabled();
  await page.getByRole('button', { name: 'Semana seguinte', exact: true }).click();
  await expect(exportButton(page)).toBeEnabled();
  const olderResponse = page.waitForResponse('**/api/demo?week=1');
  releaseOlderWeek();
  await olderResponse;
  await expect(stats(page)).toHaveText(['0', '0', '0', '15']);
  const downloadPromise = page.waitForEvent('download');
  await exportButton(page).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`cantina-${weekDates(2, now)[0]}.csv`);
});

test('initial unauthorized load keeps activation available across views', async ({ page }) => {
  await mockDemo(page, { get: async route => route.fulfill({ status: 401, json: { error: 'Inicia sessão para guardar a demonstração.' } }) });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Ativar demonstração' })).toBeVisible();
  await expect(vegetarian(page)).toBeDisabled();
  await openView(page, 'kitchen');
  await expect(page.getByRole('link', { name: 'Ativar demonstração' })).toHaveAttribute('href', '/signin-with-chatgpt?return_to=/');
  await expect(stats(page)).toHaveText(['—', '—', '—', '—']);
  await expect(exportButton(page)).toBeDisabled();
});
