import { useSyncExternalStore } from "react";
import { data, useLocation } from "react-router";
import { lastPage } from "./local-state";
import { categoryLabel, isThemeCategory, themeChrome } from "../../../../themes/chrome.ts";
import { DEFAULT_THEME_ID, THEME_MANIFEST, type ThemeManifestEntry } from "../../../../themes/manifest.ts";

export { categoryLabel, isThemeCategory, themeChrome };

export type ThemeDefinition = ThemeManifestEntry;
export const THEMES: readonly ThemeDefinition[] = THEME_MANIFEST;
export { DEFAULT_THEME_ID };

export function defaultTheme(): ThemeDefinition {
  return THEMES.find((theme) => theme.id === DEFAULT_THEME_ID) ?? THEMES[0]!;
}

/** 页面标题里的行业词：主题清单上的显示名。AI 主题仍是「AI」。 */
export function themeName(themeId: string | null | undefined): string {
  return THEMES.find((theme) => theme.id === themeId)?.name ?? defaultTheme().name;
}

export function resolveTheme(themeId: string | undefined | null): ThemeDefinition | null {
  if (!themeId) return null;
  return THEMES.find((theme) => theme.id === themeId && theme.enabled) ?? null;
}

export function requireTheme(themeId: string | undefined | null): ThemeDefinition {
  const theme = resolveTheme(themeId);
  if (!theme) throw data({ message: "not_found" }, { status: 404 });
  return theme;
}

export function themePath(themeId: string, path = "/"): string {
  const normalized = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${themeId}${normalized}`;
}

export function siteApiPath(themeId: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/api/site/themes/${themeId}${normalized}`;
}

export function splitThemePath(pathname: string): { themeId: string | null; rest: string } {
  const match = /^\/([^/]+)(\/.*)?$/.exec(pathname);
  if (!match) return { themeId: null, rest: pathname };
  const theme = resolveTheme(match[1] ?? null);
  if (!theme) return { themeId: null, rest: pathname };
  return { themeId: theme.id, rest: match[2] ?? "/" };
}

export function switchThemePath(pathname: string, targetThemeId: string): string {
  const { themeId, rest } = splitThemePath(pathname);
  if (!themeId) return themePath(targetThemeId);
  return themePath(targetThemeId, rest);
}

const subscribeRememberedTheme = () => () => {};

/** The theme of the last real page, when this address itself has none. */
function rememberedThemeId(): string {
  return splitThemePath(lastPage() ?? "").themeId ?? DEFAULT_THEME_ID;
}

export function useActiveTheme(): ThemeDefinition {
  const { pathname } = useLocation();
  const fromPath = splitThemePath(pathname).themeId;
  const fallback = useSyncExternalStore(subscribeRememberedTheme, rememberedThemeId, () => DEFAULT_THEME_ID);
  return requireTheme(fromPath ?? fallback);
}
