import assert from 'node:assert/strict';
import test from 'node:test';
import { CATEGORIES as AI_THEME_CATEGORIES, RELEASE as AI_THEME_RELEASE } from '../themes/ai/taxonomy.ts';
import { SELECTION as AI_THEME_SELECTION } from '../themes/ai/selection.ts';
import { CATEGORIES as QUANT_THEME_CATEGORIES } from '../themes/quant/taxonomy.ts';
import { SELECTION as QUANT_THEME_SELECTION } from '../themes/quant/selection.ts';
import path from 'node:path';

test('loadThemePack returns the seeded ai theme pack with current seeded AI theme values', async () => {
  const { loadThemePack } = await import('../themes/index.ts');
  const pack = loadThemePack('ai');
  assert.equal(pack.id, 'ai');
  assert.equal(pack.isDefault, true);
  assert.deepEqual(pack.taxonomy.CATEGORIES, AI_THEME_CATEGORIES);
  assert.deepEqual(pack.taxonomy.RELEASE, AI_THEME_RELEASE);
  assert.deepEqual(pack.selection, AI_THEME_SELECTION);
  assert.ok(pack.topics.groups.length > 0);
  assert.equal(path.basename(pack.promptsDir), 'prompts');
  assert.match(pack.promptsDir, /themes\/ai\/prompts$/);
});

test('loadThemePack returns the quant pack instead of falling back to ai', async () => {
  const { loadThemePack } = await import('../themes/index.ts');
  const pack = loadThemePack('quant');
  assert.equal(pack.id, 'quant');
  assert.equal(pack.isDefault, false);
  assert.deepEqual(pack.taxonomy.CATEGORIES, QUANT_THEME_CATEGORIES);
  assert.deepEqual(pack.selection, QUANT_THEME_SELECTION);
  assert.match(pack.promptsDir, /themes\/quant\/prompts$/);
});

test('macro and web3 packs load on their own', async () => {
  const { loadThemePack } = await import('../themes/index.ts');
  for (const id of ['macro', 'web3'] as const) {
    const pack = loadThemePack(id);
    assert.equal(pack.id, id);
    assert.equal(pack.isDefault, false);
    assert.notDeepEqual(pack.taxonomy.CATEGORIES, AI_THEME_CATEGORIES);
    assert.match(pack.promptsDir, new RegExp(`themes/${id}/prompts$`));
  }
});

test('loadThemePack rejects a theme that is not registered', async () => {
  const { loadThemePack } = await import('../themes/index.ts');
  assert.throws(() => loadThemePack('missing'), /Unknown theme: missing/);
});

test('theme registry lists ai as an enabled seeded theme', async () => {
  const { listThemeDefinitions, getThemeDefinition } = await import('../themes/index.ts');
  assert.ok(listThemeDefinitions().some((theme) => theme.id === 'ai' && theme.enabled));
  assert.equal(getThemeDefinition('ai')?.id, 'ai');
  assert.equal(getThemeDefinition('missing'), null);
});
