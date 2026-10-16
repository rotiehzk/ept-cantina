import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { SourceTextModule, SyntheticModule } from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const domainSource = stripTypeScriptTypes(read('app/domain.ts'));
const routeSource = stripTypeScriptTypes(read('app/api/demo/route.ts'));
const fields = ['normalAllergens', 'vegetarianAllergens', 'soupAllergens', 'dessertAllergens'];

// Execute the actual route against SQLite. Only platform auth and the D1 transport
// are replaced; validation, queries, migrations and round trips are production code.
async function fixture(t, legacyChoice = false) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  sqlite.exec(read('drizzle/0000_faithful_aaron_stack.sql'));
  const domain = new SourceTextModule(domainSource);
  await domain.link(() => { throw Error('Unexpected domain import'); });
  await domain.evaluate();
  const dates = domain.namespace.weekDates();
  sqlite.prepare('INSERT INTO menus VALUES (?, ?, ?, ?, ?, ?)')
    .run('account-a', dates[1], 'Prato antigo', 'Vegetariano antigo', 'Sopa antiga', 'Fruta');
  if (legacyChoice) sqlite.prepare('INSERT INTO meal_choices VALUES (?, ?, ?, ?, ?)')
    .run('account-a', 'demo-1001', dates[1], 'normal', '2026-01-01T00:00:00Z');
  const journal = JSON.parse(read('drizzle/meta/_journal.json'));
  for (const entry of journal.entries.slice(1)) sqlite.exec(read(`drizzle/${entry.tag}.sql`));
  let account = 'account-a';
  const db = {
    prepare(sql) {
      return {
        bind(...values) {
          const statement = sqlite.prepare(sql);
          return {
            all: async () => ({ results: statement.all(...values) }),
            run: async () => statement.run(...values),
          };
        },
      };
    },
  };
  const env = { DB: db };
  const platform = new SyntheticModule(['env'], function () { this.setExport('env', env); });
  const auth = new SyntheticModule(['getChatGPTUser'], function () {
    this.setExport('getChatGPTUser', async () => account ? { userId: account } : null);
  });
  const route = new SourceTextModule(routeSource);
  await route.link(specifier => {
    if (specifier === 'cloudflare:workers') return platform;
    if (specifier === '../../chatgpt-auth') return auth;
    if (specifier === '../../domain') return domain;
    throw Error(`Unexpected route import: ${specifier}`);
  });
  await route.evaluate();
  const menu = { ...domain.namespace.defaultMenu(dates[1], 1) };
  return {
    sqlite, env, menu, dates,
    account: value => { account = value; },
    get: () => route.namespace.GET(new Request('https://cantina.test/api/demo?week=0')),
    post: menu => route.namespace.POST(new Request('https://cantina.test/api/demo', {
      method: 'POST', headers: { origin: 'https://cantina.test', 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'menu', menu }),
    })),
  };
}

test('migration preserves old menus and choices, with unknown allergens', async t => {
  const f = await fixture(t, true);
  const result = await f.get();
  assert.equal(result.status, 200);
  const { menus, choices } = await result.json();
  assert.equal(choices.length, 1);
  assert.equal(choices[0].choice, 'normal');
  assert.equal(menus[1].normal, 'Prato antigo');
  for (const menu of menus) for (const field of fields) assert.equal(menu[field], null);
  assert.equal(f.sqlite.prepare('PRAGMA table_info(menus)').all().length, 10);
});

test('all four components persist, update and clear independently without changing counts', async t => {
  const f = await fixture(t);
  f.sqlite.prepare('INSERT INTO meal_choices VALUES (?, ?, ?, ?, ?)')
    .run('account-a', 'demo-1001', f.dates[1], 'normal', new Date().toISOString());
  const values = [' Peixe; pode conter leite. ', 'Soja', 'Aipo', ''];
  const menu = { ...f.menu, ...Object.fromEntries(fields.map((field, i) => [field, values[i]])) };
  assert.equal((await f.post(menu)).status, 200);
  let data = await (await f.get()).json();
  assert.deepEqual(fields.map(field => data.menus[1][field]), ['Peixe; pode conter leite.', 'Soja', 'Aipo', null]);
  assert.equal(data.choices.length, 1);
  assert.equal(data.choices[0].choice, 'normal');
  menu.normalAllergens = null;
  menu.dessertAllergens = 'Leite';
  assert.equal((await f.post(menu)).status, 200);
  data = await (await f.get()).json();
  assert.deepEqual(fields.map(field => data.menus[1][field]), [null, 'Soja', 'Aipo', 'Leite']);
  assert.equal(data.choices.length, 1);
  // First-time insert, not just upsert of a legacy row.
  menu.date = f.dates[2];
  assert.equal((await f.post(menu)).status, 200);
  data = await (await f.get()).json();
  assert.equal(data.menus[2].dessertAllergens, 'Leite');
  assert.equal(data.menus[1].dessertAllergens, 'Leite');
  f.account('account-b');
  data = await (await f.get()).json();
  assert.equal(data.choices.length, 0);
  for (const menu of data.menus) for (const field of fields) assert.equal(menu[field], null);
});

test('invalid or omitted allergen fields return 400 without partially overwriting a menu', async t => {
  const f = await fixture(t);
  const before = await (await f.get()).json();
  for (const field of fields) {
    for (const value of [1, true, {}, [], ['Leite'], 'a'.repeat(501), undefined]) {
      const result = await f.post({ ...f.menu, normal: 'Não guardar', [field]: value });
      assert.equal(result.status, 400, `${field}: ${JSON.stringify(value)}`);
      assert.match((await result.json()).error, /alergénios/);
      assert.deepEqual(await (await f.get()).json(), before);
    }
  }
});

test('500 characters and whitespace-only unknown values are accepted', async t => {
  const f = await fixture(t);
  const menu = { ...f.menu, normalAllergens: 'á'.repeat(500), soupAllergens: ' \n\t ' };
  assert.equal((await f.post(menu)).status, 200);
  const { menus } = await (await f.get()).json();
  assert.equal(menus[1].normalAllergens, menu.normalAllergens);
  assert.equal(menus[1].soupAllergens, null);
});

test('menu writes still require a session and an editable date', async t => {
  const f = await fixture(t);
  f.account(null);
  assert.equal((await f.post(f.menu)).status, 401);
  f.account('account-a');
  assert.equal((await f.post({ ...f.menu, date: '2020-01-01' })).status, 409);
});

test('database unavailability is not reported as invalid allergen information', async t => {
  const f = await fixture(t);
  f.env.DB = undefined;
  const original = console.error;
  console.error = () => {};
  try { assert.equal((await f.post(f.menu)).status, 503); }
  finally { console.error = original; }
});
