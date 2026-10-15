import { DEFAULT_THEME_ID } from "../../../../themes/index.ts";
import { themeIdOf } from "../publication/scope.ts";

export function usesLegacyReportTables(themeId?: string | null): boolean {
  return themeIdOf(themeId) === DEFAULT_THEME_ID;
}

export function reportStorageForTheme(themeId?: string | null) {
  return usesLegacyReportTables(themeId)
    ? { reportsTable: "reports", revisionsTable: "report_revisions" }
    : { reportsTable: "theme_reports", revisionsTable: "theme_report_revisions" };
}
