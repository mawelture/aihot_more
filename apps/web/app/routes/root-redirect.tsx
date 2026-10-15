import { redirect } from "react-router";
import type { SiteMeta } from "@aihot/contracts/site";
import { apiGet } from "../lib/api.server";
import { defaultTheme, resolveTheme, themePath } from "../lib/theme";

export async function loader() {
  const meta = await apiGet<SiteMeta>("/api/site/meta").catch((): SiteMeta => ({ changelogVersion: "" }));
  const theme = resolveTheme(meta.defaultThemeId ?? null) ?? defaultTheme();
  throw redirect(themePath(theme.id), 302);
}

export default function RootRedirect() {
  return null;
}
