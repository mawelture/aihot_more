// 主题身份的唯一清单。浏览器和后端都读它，所以这里只有数据，不读文件、不引分类。
// 网址前缀就是 id。新增主题时在这里加一行，并在 themes/index.ts 的 PACKS 里挂上同编号的主题包。

export interface ThemeManifestEntry {
  id: string;
  name: string;
  enabled: boolean;
  isDefault: boolean;
}

export const THEME_MANIFEST: readonly ThemeManifestEntry[] = [
  { id: "ai", name: "AI", enabled: true, isDefault: true },
  { id: "finance", name: "Finance", enabled: true, isDefault: false },
];

const defaults = THEME_MANIFEST.filter((theme) => theme.isDefault);
if (defaults.length !== 1 || new Set(THEME_MANIFEST.map((theme) => theme.id)).size !== THEME_MANIFEST.length) {
  throw new Error("themes/manifest.ts needs unique ids and exactly one default theme");
}

export const DEFAULT_THEME_ID = defaults[0]!.id;
