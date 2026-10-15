import { useLoaderData } from "react-router";
import type { Route } from "./+types/report-latest";
import type { ReportLatestPage } from "@aihot/contracts/site";
import { REPORTS, subjectAfter, withSubject } from "@aihot/site";
import { cachedPage, loadOr404 } from "../lib/api.server";
import { pageReuse } from "../lib/page-reuse";
import { pageMeta, reportLd } from "../lib/seo";
import { beijingDate } from "@aihot/contracts/time";
import { EmptyState } from "../components/ui/Page";
import { ReportLayout } from "../features/report/ReportLayout";
import { ReportPaper, reportOutline } from "../features/report/ReportPaper";
import { KIND_LABEL, feedLink, kindFromPath } from "../features/report/format";
import type { Screen } from "../components/shell/screens";
import { requireTheme, siteApiPath, themeName } from "../lib/theme";

export const handle: Screen = { tab: "daily", name: "日报" };
export { pageHeaders as headers } from "../lib/api.server";
export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>();

export async function loader({ request }: Route.LoaderArgs) {
  const theme = requireTheme(new URL(request.url).pathname.split("/")[1]);
  const kind = kindFromPath(new URL(request.url).pathname);
  const { index, report } = await loadOr404<ReportLatestPage>(siteApiPath(theme.id, `/reports/${kind}/latest-page`), { signal: request.signal });
  return cachedPage(600, { kind, report, index, today: beijingDate(Date.now()), themeId: theme.id });
}

export function meta({ loaderData, location }: Route.MetaArgs) {
  const kind = loaderData?.kind ?? "daily";
  const subject = themeName(loaderData?.themeId);
  const description = `${REPORTS.descriptions[kind]}。`;
  const report = loaderData?.report;
  return [...pageMeta({
    title: withSubject(KIND_LABEL[kind], subject),
    description,
    path: location.pathname,
    image: `/og/pages/${kind}.png`,
    // The latest issue, described at this page's own address (its canonical).
    jsonLd: report ? reportLd(report, location.pathname, report.lead?.leadParagraph ?? description) : undefined,
  }), feedLink(kind, loaderData?.themeId ?? "ai")];
}

export default function ReportLatestPage() {
  const { kind, report, index, today, themeId } = useLoaderData<typeof loader>();
  return (
    <ReportLayout kind={kind} index={index} current={report?.key ?? null} today={today} outline={report ? reportOutline(report) : []}>
      {report ? <ReportPaper report={report} index={index} /> : <EmptyState title={subjectAfter("还没有发布", KIND_LABEL[kind], themeName(themeId))}>第一期发布后会出现在这里。</EmptyState>}
    </ReportLayout>
  );
}
