import './setup.ts';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { closeDb, sql } from '@aihot/backend/db';
import { currentDefaultThemeId, setDefaultTheme, settingsOverview, listThemes } from '@aihot/backend/admin/settings';
import { stopBoss } from '@aihot/backend/jobs/queue';
import { tag } from './setup.ts';

const T = tag();
after(async () => {
  await stopBoss();
  await closeDb();
});

async function resetThemeState() {
  await sql`UPDATE themes SET is_default = (id = 'ai'), enabled = CASE WHEN id IN ('ai', 'macro') THEN true ELSE enabled END`;
}

test('admin can set the default theme', async () => {
  await resetThemeState();
  const themeId = `macro`;
  const actor = `test-admin-${T}`;
  const before = await currentDefaultThemeId();
  assert.equal(before, 'ai');

  const updated = await setDefaultTheme(themeId, '切换默认主题', actor);
  assert.equal(updated.id, themeId);
  assert.equal(await currentDefaultThemeId(), 'macro');

  const settings = await settingsOverview();
  assert.equal(settings.defaultThemeId, 'macro');
  assert.equal(settings.themes.find((theme) => theme.id === 'macro')?.is_default, true);
  assert.equal(settings.themes.find((theme) => theme.id === 'ai')?.is_default, false);

  const rows = await listThemes();
  assert.equal(rows.some((theme) => theme.id === 'macro' && theme.is_default), true);
  const [audit] = await sql<{ action: string; subject: string | null }[]>`SELECT action, subject FROM audit_log WHERE actor = ${actor} ORDER BY id DESC LIMIT 1`;
  assert.equal(audit?.action, 'theme.default');
  assert.equal(audit?.subject, 'theme:macro');
});

test('disabled or unknown themes cannot become the default', async () => {
  await resetThemeState();
  const disabledThemeId = `disabled-theme-${T}`;
  await sql`
    INSERT INTO themes (id, name, path_prefix, enabled, is_default, pack_key)
    VALUES (${disabledThemeId}, 'Disabled theme', ${disabledThemeId}, false, false, 'macro')
    ON CONFLICT (id) DO UPDATE
    SET enabled = EXCLUDED.enabled,
        is_default = EXCLUDED.is_default,
        updated_at = now()`;
  await assert.rejects(() => setDefaultTheme(disabledThemeId, '禁用主题不可设默认', `test-admin-${T}`), /enabled/i);
  await assert.rejects(() => setDefaultTheme('missing-theme', '不存在主题不可设默认', `test-admin-${T}`), /theme/i);
});
