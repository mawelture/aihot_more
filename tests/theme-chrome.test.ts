import assert from "node:assert/strict";
import test from "node:test";
import { categoryLabel, isThemeCategory, themeChrome } from "../themes/chrome.ts";

test("quant filter tabs follow the quant taxonomy, and the sidebar is that theme's config", () => {
  const quant = themeChrome("quant");
  assert.deepEqual(quant.categories.map((category) => category.label), ["策略", "工具", "市场", "行业", "论文", "教程", "观点"]);
  assert.equal(isThemeCategory("quant", "quant-strategies"), true);
  assert.equal(isThemeCategory("quant", "ai-models"), false);
  assert.equal(categoryLabel("quant", "quant-strategies"), "策略");
  assert.deepEqual(quant.sidebar.map((item) => item.label), ["精选", "全部量化动态", "热点榜", "量化日报", "主题", "收藏"]);
});

test("macro and web3 sidebars use their own names", () => {
  assert.deepEqual(themeChrome("macro").categories.map((category) => category.label), ["政策", "市场", "公司", "外汇", "行业", "观点"]);
  assert.equal(themeChrome("macro").sidebar.find((item) => item.to === "/daily")?.label, "宏观日报");
  assert.deepEqual(themeChrome("web3").categories.map((category) => category.label), ["市场", "协议", "产品", "行业", "观点"]);
  assert.equal(themeChrome("web3").sidebar.find((item) => item.to === "/all")?.label, "全部 Web3 动态");
});

test("ai filter tabs and sidebar stay with the ai pack", () => {
  const ai = themeChrome("ai");
  assert.deepEqual(ai.categories.map((category) => category.label), ["模型", "产品", "行业", "论文", "教程", "观点"]);
  assert.equal(isThemeCategory("ai", "ai-models"), true);
  assert.equal(isThemeCategory("ai", "quant-strategies"), false);
  assert.deepEqual(ai.sidebar.map((item) => item.label), ["精选", "全部 AI 动态", "热点榜", "AI 日报", "主题", "收藏"]);
});
