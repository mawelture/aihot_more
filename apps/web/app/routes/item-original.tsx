import type { Route } from "./+types/item-original";
import type { SiteItemDetail } from "@aihot/contracts/site";
import { cachedPage, loadOr404 } from "../lib/api.server";
import { pageReuse } from "../lib/page-reuse";
import { requireTheme, siteApiPath } from "../lib/theme";
export { default, handle, headers, meta } from "./item";

export const { clientLoader, shouldRevalidate } = pageReuse<typeof loader>();
export async function loader({ params, request }: Route.LoaderArgs) {
  const theme = requireTheme(new URL(request.url).pathname.split("/")[1]);
  const item = await loadOr404<SiteItemDetail>(siteApiPath(theme.id, `/items/${encodeURIComponent(params.id)}/original`), { signal: request.signal });
  return cachedPage(600, { item, themeId: theme.id });
}
