import assert from 'node:assert/strict';
import test from 'node:test';

test('prompt versions include the theme pack content they render', async () => {
  const { promptTextForTheme, promptVersionForTheme } = await import('../packages/backend/src/editorial/prompts.ts');
  assert.notEqual(promptVersionForTheme('ai', 'selection-score'), promptVersionForTheme('finance', 'selection-score'));
  assert.equal(promptTextForTheme('ai', 'group-batch'), promptTextForTheme('finance', 'group-batch'));
  assert.equal(promptTextForTheme('ai', 'story-digest'), promptTextForTheme('finance', 'story-digest'));
  assert.notEqual(promptTextForTheme('ai', 'translate-body'), promptTextForTheme('finance', 'translate-body'));
});
