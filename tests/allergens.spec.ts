import { expect, test, type Page } from '@playwright/test';
import { defaultMenu, weekDates, type Menu } from '../app/domain';

const now = new Date();
const kitchen = (page: Page) => page.getByRole('button', { name: /^(Painel da cantina|Cantina)$/ }).click();
const menuView = (page: Page) => page.getByRole('button', { name: /^(Ementa semanal|Ementa)$/ }).click();
const info = (page: Page) => page.locator('.daily-menu .allergen-info');
const labels = ['Prato do dia', 'Vegetariano', 'Sopa', 'Sobremesa'];

async function mockMenus(page: Page, failWrite = false) {
  let menus = weekDates(0, now).map(defaultMenu);
  const writes: Menu[] = [];
  await page.clock.install({ time: now });
  await page.route('**/api/demo**', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { menus, choices: [] } });
    const body = route.request().postDataJSON();
    expect(body.type).toBe('menu');
    writes.push(body.menu);
    if (failWrite) return route.fulfill({ status: 503, json: { error: 'Não foi possível guardar.' } });
    menus = menus.map(m => m.date === body.menu.date ? body.menu : m);
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto('/');
  await expect(info(page)).toHaveCount(4);
  return writes;
}

async function editTuesday(page: Page) {
  await kitchen(page);
  await page.getByRole('button', { name: 'Editar ementa', exact: true }).nth(1).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('allergens for each component can be edited, reloaded and cleared', async ({ page }) => {
  const writes = await mockMenus(page);
  await expect(info(page)).toHaveText(Array(4).fill('Alergénios: Não informado'));
  await editTuesday(page);
  await expect(page.getByText(/Transcreve a informação de alergénios/)).toBeVisible();
  const values = ['Peixe; pode conter leite.', 'Soja', 'Aipo', 'Leite'];
  for (let i = 0; i < labels.length; i++) {
    await page.getByRole('textbox', { name: 'Alergénios · ' + labels[i], exact: true }).fill(values[i]);
  }
  await page.getByRole('button', { name: 'Guardar ementa', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(writes).toHaveLength(1);
  await page.reload();
  // Wait for the initial week effect before choosing a different day.
  await expect(info(page)).toHaveCount(4);
  await page.getByRole('tab', { name: /^Terça/ }).click();
  await expect(info(page)).toHaveText(values.map(value => 'Alergénios: ' + value));
  await expect(page.getByRole('button', { name: /^Prato do dia .*Peixe/ })).toBeEnabled();
  await expect(page.getByRole('button', { name: /^Vegetariano .*Soja/ })).toBeEnabled();
  await expect(page.locator('.kitchen-stats')).toHaveCount(0);
  await editTuesday(page);
  await expect(page.getByRole('textbox', { name: 'Alergénios · Sopa', exact: true })).toHaveValue('Aipo');
  await page.getByRole('textbox', { name: 'Alergénios · Sopa', exact: true }).fill('');
  await page.getByRole('button', { name: 'Guardar ementa', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await menuView(page);
  await expect(info(page)).toHaveText(['Alergénios: Peixe; pode conter leite.', 'Alergénios: Soja', 'Alergénios: Não informado', 'Alergénios: Leite']);
  await kitchen(page);
  await expect(page.locator('.kitchen-stats strong')).toHaveText(['0', '0', '0', '15']);
});

test('a failed save preserves the allergen draft and does not show it as saved', async ({ page }) => {
  await mockMenus(page, true);
  await editTuesday(page);
  const field = page.getByRole('textbox', { name: 'Alergénios · Prato do dia', exact: true });
  await field.fill('Peixe');
  await page.getByRole('button', { name: 'Guardar ementa', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Não foi possível guardar.');
  await expect(field).toHaveValue('Peixe');
  await expect(page.getByRole('status')).toHaveCount(0);
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await menuView(page);
  await page.getByRole('tab', { name: /^Terça/ }).click();
  await expect(info(page)).toHaveText(Array(4).fill('Alergénios: Não informado'));
});

for (const width of [360, 393]) {
  test(`long allergen information and editor fit a ${width}px screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await mockMenus(page);
    await editTuesday(page);
    const longText = 'Informação fornecida pela cantina: ' + 'alergénio'.repeat(45);
    for (const label of labels) {
      await page.getByRole('textbox', { name: 'Alergénios · ' + label, exact: true }).fill(longText);
    }
    const save = page.getByRole('button', { name: 'Guardar ementa', exact: true });
    await save.scrollIntoViewIfNeeded();
    await expect(save).toBeInViewport();
    const dialog = page.getByRole('dialog');
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await save.click();
    await expect(dialog).not.toBeVisible();
    await menuView(page);
    await page.getByRole('tab', { name: /^Terça/ }).click();
    await expect(info(page)).toHaveText(Array(4).fill('Alergénios: ' + longText));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const item of await info(page).all()) {
      expect(await item.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    }
  });
}
