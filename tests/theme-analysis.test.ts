import assert from 'node:assert/strict';
import test from 'node:test';

test('the same score can be selected in ai and rejected in quant', async () => {
  const { selectionDecisionForTheme } = await import('../packages/backend/src/editorial/analyze.ts');
  const ai = selectionDecisionForTheme('ai', 'T1', [62, 60]);
  const quant = selectionDecisionForTheme('quant', 'T1', [62, 60]);
  assert.equal(ai.selected, true);
  assert.equal(quant.selected, false);
});

test('non-default themes store editorial overrides in a dedicated shadow table', async () => {
  const { editorialOverrideStorageForTheme } = await import('../packages/backend/src/editorial/storage.ts');
  assert.equal(editorialOverrideStorageForTheme('ai').table, 'editorial_overrides');
  assert.equal(editorialOverrideStorageForTheme('macro').table, 'theme_editorial_overrides');
});
