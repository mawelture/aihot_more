import assert from "node:assert/strict";
import test from "node:test";
import { categoryLabel, isThemeCategory, themeChrome } from "../themes/chrome.ts";

test("finance filter tabs follow the finance taxonomy, and the sidebar is that theme's config", () => {
  const finance = themeChrome("finance");
  assert.deepEqual(finance.categories.map((category) => category.label), ["策略", "工具", "市场", "行业", "论文", "教程", "观点"]);
  assert.equal(isThemeCategory("finance", "quant-strategies"), true);
  assert.equal(isThemeCategory("finance", "ai-models"), false);
  assert.equal(categoryLabel("finance", "quant-strategies"), "策略");
  assert.deepEqual(finance.sidebar.map((item) => item.label), ["精选", "全部 Finance 动态", "热点榜", "Finance 日报", "主题", "收藏"]);
});

test("ai filter tabs and sidebar stay with the ai pack", () => {
  const ai = themeChrome("ai");
  assert.deepEqual(ai.categories.map((category) => category.label), ["模型", "产品", "行业", "论文", "教程", "观点"]);
  assert.equal(isThemeCategory("ai", "ai-models"), true);
  assert.equal(isThemeCategory("ai", "quant-strategies"), false);
  assert.deepEqual(ai.sidebar.map((item) => item.label), ["精选", "全部 AI 动态", "热点榜", "AI 日报", "主题", "收藏"]);
});
