// RSS routes. Unknown query parameters are accepted and never change content.
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { feedCacheControl, isFeedCategory, itemFeed, reportFeed, type ItemFeedKind } from "@aihot/backend/publication/feeds";
import { requestNotice, serverModules } from "@aihot/backend/modules";
import { applyPublicHeaders, sendTextWithEtag } from "../http/respond.ts";
import { listThemeDefinitions } from "../../../../themes/index.ts";

async function sendFeed(req: FastifyRequest, reply: FastifyReply, xml: string, cacheControl: string) {
  applyPublicHeaders(reply, { cors: false });
  for (const m of serverModules()) m.on?.exitServed?.("rss", req);
  return sendTextWithEtag(req, reply, xml, { etagPrefix: "rss", cacheControl, contentType: "application/rss+xml; charset=utf-8" });
}

/** A module's reminder for the person behind the request, ahead of the feed at a path (publication/feeds). */
const noticeFor = (req: FastifyRequest) => (feedPath: string) => requestNotice("feed", req, feedPath);

function feedError(reply: FastifyReply) {
  return reply.code(503).header("Retry-After", "60").header("Cache-Control", "no-store").type("text/plain; charset=utf-8").send("Feed temporarily unavailable");
}

export function registerFeeds(app: FastifyInstance) {
  const themed = listThemeDefinitions().filter((theme) => theme.enabled).map((theme) => ({ themeId: theme.id, prefix: `/${theme.id}` }));
  const register = (prefix = "", themeId?: string | null) => {
    for (const url of [`${prefix}/feed.xml`, `${prefix}/feed/full.xml`, `${prefix}/feed/all.xml`, `${prefix}/feed/daily.xml`, `${prefix}/feed/weekly.xml`, `${prefix}/feed/monthly.xml`, `${prefix}/feed/category/:file`, `${prefix}/feed/full/category/:file`]) {
      app.options(url, async (_req, reply) => reply.code(204).header("Allow", "GET, HEAD, OPTIONS").send());
    }
    const item = (kind: ItemFeedKind) => async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        return await sendFeed(req, reply, await itemFeed(kind, null, { notice: noticeFor(req), themeId }), feedCacheControl(kind));
      } catch (error) {
        req.log.error({ err: error }, "feed error");
        return feedError(reply);
      }
    };
    app.get(`${prefix}/feed.xml`, item("selected"));
    app.get(`${prefix}/feed/full.xml`, item("selected-full"));
    app.get(`${prefix}/feed/all.xml`, item("all"));
    for (const kind of ["daily", "weekly", "monthly"] as const) {
      app.get(`${prefix}/feed/${kind}.xml`, async (req, reply) => {
        try {
          return await sendFeed(req, reply, await reportFeed(kind, noticeFor(req), themeId), feedCacheControl(kind));
        } catch (error) {
          req.log.error({ err: error }, "feed error");
          return feedError(reply);
        }
      });
    }
    for (const full of [false, true]) {
      app.get(full ? `${prefix}/feed/full/category/:file` : `${prefix}/feed/category/:file`, async (req, reply) => {
        const file = (req.params as { file: string }).file;
        const slug = file.replace(/\.xml$/, "");
        if (!file.endsWith(".xml") || !isFeedCategory(slug)) return reply.code(404).type("text/plain; charset=utf-8").send("Not found");
        const kind = full ? "selected-full" : "selected";
        try {
          return await sendFeed(req, reply, await itemFeed(kind, slug, { notice: noticeFor(req), themeId }), feedCacheControl(kind));
        } catch (error) {
          req.log.error({ err: error }, "feed error");
          return feedError(reply);
        }
      });
    }
  };

  register();
  for (const theme of themed) register(theme.prefix, theme.themeId);
}
