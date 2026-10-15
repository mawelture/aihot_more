// Small site-wide facts for the web shell (e.g. the changelog red-dot anchor).
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ChangelogResponse, SiteMeta } from "@aihot/contracts/site";
import { REPO_ROOT } from "../config.ts";
import { currentDefaultThemeId } from "../themes/runtime.ts";

let changelogCache: ChangelogResponse | null = null;

/** Changelog is published as a data file of the site (site/changelog.json), newest first. */
export function loadChangelog(): ChangelogResponse {
  changelogCache ??= JSON.parse(readFileSync(path.join(REPO_ROOT, "site/changelog.json"), "utf8")) as ChangelogResponse;
  return changelogCache;
}

export async function siteMeta(): Promise<SiteMeta> {
  return { changelogVersion: loadChangelog().latestVersion, defaultThemeId: await currentDefaultThemeId() };
}
