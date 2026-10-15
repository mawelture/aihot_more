// Site navigation in one place: the desktop sidebar's sections and the phone tab bar's tabs, the engine's
// and the site's modules'.
import type { ReactNode } from "react";
import { webModules } from "../../site-modules";
import { splitThemePath, themeChrome, themePath } from "../../lib/theme";
import {
  IconBolt, IconBookmark, IconDoc, IconFlame, IconGrid, IconHeart, IconHistory, IconList, IconMessage, IconPlug, IconUser,
} from "../icons";

export interface NavItem {
  to: string;
  label: string;
  icon: (p: { size?: number }) => ReactNode;
  /** Match the path exactly (the home page). */
  end?: boolean;
  /** Shows the unread dot while the changelog has news. */
  changelog?: boolean;
}

const MORE: { title: string; items: NavItem[] } = {
  title: "更多",
  items: [
    { to: "/agent", label: "Agent 接入", icon: IconPlug },
    { to: "/about", label: "关于", icon: IconHeart },
    { to: "/changelog", label: "更新日志", icon: IconHistory, changelog: true },
    { to: "/feedback", label: "反馈", icon: IconMessage },
  ],
};

const NAV_ICONS = {
  "/": IconBolt,
  "/all": IconList,
  "/hot": IconFlame,
  "/daily": IconDoc,
  "/topics": IconGrid,
  "/starred": IconBookmark,
} as const;

function contentSection(themeId: string): { title: string; items: NavItem[] } {
  return {
    title: "内容",
    items: themeChrome(themeId).sidebar.map((item) => ({
      to: item.to,
      label: item.label,
      icon: NAV_ICONS[item.to as keyof typeof NAV_ICONS] ?? IconList,
      end: item.end,
    })),
  };
}

/**
 * The sidebar: the engine's sections with the modules' between 内容 and 更多; a module naming a section
 * that is already there adds to it.
 */
export function sidebar(themeId: string): Array<{ title: string; items: NavItem[] }> {
  const mapItem = (item: NavItem): NavItem => ({ ...item, to: themePath(themeId, item.to) });
  const sections = [contentSection(themeId)].map((s) => ({ ...s, items: s.items.map(mapItem) }));
  for (const m of webModules()) {
    if (!m.sidebar) continue;
    const section = sections.find((s) => s.title === m.sidebar!.section);
    const themed = m.sidebar.items.map(mapItem);
    if (section) section.items.push(...themed);
    else sections.push({ title: m.sidebar.section, items: themed });
  }
  return [...sections, { ...MORE, items: MORE.items.map(mapItem) }];
}

/** A sidebar entry is lit on its pages; 日报 also covers weekly and monthly reports. */
export function sidebarIsActive(item: NavItem, pathname: string): boolean {
  const rest = splitThemePath(pathname).rest;
  const itemRest = splitThemePath(item.to).rest;
  if (item.end) return pathname === item.to;
  if (itemRest === "/daily") return /^\/(daily|weekly|monthly)(\/|$)/.test(rest);
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

/**
 * The phone tab bar: 全部 lives beside 精选 as a switch, 热点 and 日报 are tabs, and "我的" at /more holds
 * 收藏, 外观, the tools and the site's own pages. Which tab a page sits under is declared by the page
 * itself (components/shell/screens.ts).
 */
export type TabKey =
  | "featured"
  | "hot"
  | "daily"
  | "me"
  // A module's tab.
  | (string & {});

export interface Tab {
  key: TabKey;
  to: string;
  label: string;
  icon: (p: { size?: number }) => ReactNode;
  changelog?: boolean;
}

const ENGINE_TABS: Tab[] = [
  { key: "featured", to: "/", label: "精选", icon: IconBolt },
  { key: "hot", to: "/hot", label: "热点", icon: IconFlame },
  { key: "daily", to: "/daily", label: "日报", icon: IconDoc },
  { key: "me", to: "/more", label: "我的", icon: IconUser, changelog: true },
];

/** The tab bar: the engine's, the modules' before 我的. */
export function tabs(themeId: string): Tab[] {
  const mapTab = (tab: Tab): Tab => ({ ...tab, to: themePath(themeId, tab.to) });
  return [...ENGINE_TABS.slice(0, -1), ...webModules().flatMap((m) => m.tabs ?? []), ENGINE_TABS.at(-1)!].map(mapTab);
}
