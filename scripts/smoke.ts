// Opens the site's main pages and machine exits and checks each answers: the whole-site check after a
// deploy, and CI's check of the built site on an empty database.
//   node scripts/smoke.ts [--base http://localhost:3000/ai]
import { pathToFileURL } from 'node:url';
import { SITE } from '@aihot/site';

const THEMED_PAGES = ['/', '/all', '/hot', '/daily', '/daily/archive', '/topics', '/starred', '/agent', '/about', '/changelog', '/feedback', '/terms', '/privacy', '/more'] as const;
const ROOT_PAGES = ['/admin/login'] as const;
const ROOT_MACHINE: Array<[path: string, type: RegExp]> = [
  ['/api/health', /json/],
  ['/robots.txt', /text\/plain/],
  ['/sitemap.xml', /xml/],
  ['/manifest.webmanifest', /manifest/],
  ['/og/site.png', /image\/png/],
  ['/icon.png', /image\/png/],
  ['/favicon.ico', /icon/],
];

export interface SmokeTarget {
  url: string;
  type: RegExp;
}

export interface SmokePlan {
  themedBase: string;
  rootBase: string;
  themeId: string | null;
  pageUrls: string[];
  machineTargets: SmokeTarget[];
  mcpUrl: string;
}

function normalizeBase(base: string) {
  const url = new URL(base);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const themeMatch = /^\/([^/]+)$/.exec(pathname);
  return {
    rootBase: url.origin,
    themedBase: `${url.origin}${pathname === '/' ? '' : pathname}`,
    themeId: themeMatch?.[1] ?? null,
  };
}

function themedMachineTargets(rootBase: string, themedBase: string, themeId: string | null): SmokeTarget[] {
  if (!themeId) {
    return [
      { url: `${rootBase}/api/site/stats`, type: /json/ },
      { url: `${rootBase}/api/v1/items`, type: /json/ },
      { url: `${rootBase}/api/v1/hot-topics`, type: /json/ },
      { url: `${rootBase}/api/v1/selected/snapshot`, type: /json/ },
      { url: `${rootBase}/feed.xml`, type: /xml/ },
      { url: `${rootBase}/feed/all.xml`, type: /xml/ },
      { url: `${rootBase}/llms.txt`, type: /text\/plain/ },
      { url: `${rootBase}/openapi-v1.json`, type: /json/ },
    ];
  }
  return [
    { url: `${rootBase}/api/site/themes/${themeId}/stats`, type: /json/ },
    { url: `${rootBase}/api/v1/themes/${themeId}/items`, type: /json/ },
    { url: `${rootBase}/api/v1/themes/${themeId}/hot-topics`, type: /json/ },
    { url: `${rootBase}/api/v1/themes/${themeId}/selected/snapshot`, type: /json/ },
    { url: `${themedBase}/feed.xml`, type: /xml/ },
    { url: `${themedBase}/feed/all.xml`, type: /xml/ },
    { url: `${themedBase}/llms.txt`, type: /text\/plain/ },
    { url: `${themedBase}/openapi-v1.json`, type: /json/ },
  ];
}

export function smokePlan(base: string): SmokePlan {
  const { rootBase, themedBase, themeId } = normalizeBase(base);
  return {
    rootBase,
    themedBase,
    themeId,
    pageUrls: [
      ...THEMED_PAGES.map((path) => `${themedBase}${path === '/' ? '' : path}`),
      ...ROOT_PAGES.map((path) => `${rootBase}${path}`),
    ],
    machineTargets: [
      ...ROOT_MACHINE.map(([path, type]) => ({ url: `${rootBase}${path}`, type })),
      ...themedMachineTargets(rootBase, themedBase, themeId),
    ],
    mcpUrl: `${rootBase}${themeId ? `/api/mcp/${themeId}` : '/api/mcp'}`,
  };
}

async function check(url: string, expect: (res: Response, body: string) => string | null) {
  try {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
    const body = res.headers.get('content-type')?.startsWith('image/') ? '' : await res.text();
    const problem = res.status !== 200 ? `HTTP ${res.status}` : expect(res, body);
    console.log(`${problem ? '✗' : '✓'} ${new URL(url).pathname}${problem ? `  ${problem}` : ''}`);
    return !problem;
  } catch (error) {
    console.log(`✗ ${new URL(url).pathname}  ${String(error)}`);
    return false;
  }
}

export async function runSmoke(base: string): Promise<boolean> {
  const plan = smokePlan(base);
  let failed = 0;
  const htmlName = SITE.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  for (const url of plan.pageUrls) {
    if (!(await check(url, (_res, body) => (body.includes(SITE.name) || body.includes(htmlName) ? null : `the page does not name ${SITE.name}`)))) failed += 1;
  }
  for (const target of plan.machineTargets) {
    if (!(await check(target.url, (res) => (target.type.test(res.headers.get('content-type') ?? '') ? null : `content-type ${res.headers.get('content-type')}`)))) failed += 1;
  }
  const mcp = await fetch(plan.mcpUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } } }),
  }).then((r) => r.text()).catch((e) => String(e));
  const mcpOk = mcp.includes(`"name":"${SITE.mcpPrefix}`);
  console.log(`${mcpOk ? '✓' : '✗'} ${new URL(plan.mcpUrl).pathname} initialize${mcpOk ? '' : `  ${mcp.slice(0, 200)}`}`);
  if (!mcpOk) failed += 1;

  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  return failed === 0;
}

const at = process.argv.indexOf('--base');
const base = (at > 0 ? process.argv[at + 1] : process.env.SITE_URL) ?? 'http://localhost:3000/ai';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ok = await runSmoke(base);
  process.exit(ok ? 0 : 1);
}
