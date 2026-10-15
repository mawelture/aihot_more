// 浏览器能读的主题界面：筛选栏来自各类别的 label，左侧导航来自各主题的 chrome.ts。
// 这里不读文件。新增主题时加一份 chrome.ts，并在下面登记，编号与 manifest 一致。
import { THEME_MANIFEST } from "./manifest.ts";
import { CATEGORIES as aiCategories } from "./ai/taxonomy.ts";
import { sidebar as aiSidebar } from "./ai/chrome.ts";
import { CATEGORIES as financeCategories } from "./finance/taxonomy.ts";
import { sidebar as financeSidebar } from "./finance/chrome.ts";

export interface ThemeCategoryTab {
  key: string;
  label: string;
}

export interface ThemeNavItem {
  to: string;
  label: string;
  end?: boolean;
}

export interface ThemeChrome {
  categories: readonly ThemeCategoryTab[];
  sidebar: readonly ThemeNavItem[];
}

function categoriesOf(categories: ReadonlyArray<{ key: string; label: string }>): ThemeCategoryTab[] {
  return categories.map((category) => ({ key: category.key, label: category.label }));
}

export const THEME_CHROME: Record<string, ThemeChrome> = {
  ai: { categories: categoriesOf(aiCategories), sidebar: aiSidebar },
  finance: { categories: categoriesOf(financeCategories), sidebar: financeSidebar },
};

const manifestIds = THEME_MANIFEST.map((theme) => theme.id);
const chromeIds = Object.keys(THEME_CHROME);
if (manifestIds.length !== chromeIds.length || manifestIds.some((id) => !chromeIds.includes(id))) {
  throw new Error(`Theme manifest [${manifestIds.join(", ")}] does not match chrome [${chromeIds.join(", ")}]`);
}

const defaultThemeId = THEME_MANIFEST.find((theme) => theme.isDefault)?.id ?? manifestIds[0]!;

export function themeChrome(themeId: string): ThemeChrome {
  return THEME_CHROME[themeId] ?? THEME_CHROME[defaultThemeId]!;
}

export function isThemeCategory(themeId: string, value: string): boolean {
  return themeChrome(themeId).categories.some((category) => category.key === value);
}

export function categoryLabel(themeId: string, key: string): string {
  return themeChrome(themeId).categories.find((category) => category.key === key)?.label ?? key;
}
