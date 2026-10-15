# 给 Agent 的说明

这是一个可以同时维护多个行业主题的热点站：采集信源、用模型筛选和写作、归组事件、出日报周报月报，并通过网站、RSS、公开 API、Agent Markdown 和 MCP 对外提供。每个主题有自己的分类、提示词、门槛和出刊；信源全局只采集一次，各主题各自订阅。仓库里带了 `ai`、`macro`、`quant` 和 `web3` 四个示例主题。先读 README，再按任务读 `docs/` 里对应的文档。

## 最常见的任务：新增一个行业

新增一个行业就是加一个主题包。站名、品牌、条款和模型仍在 `site/`，那是整站的身份。主题自己的知识在 `themes/<theme>/`。字段含义见 `docs/customize.md` 里分类、提示词和门槛那几节。

按这个顺序做：

1. 在 `themes/<theme>/` 建包：分类标签（`taxonomy.ts`）、左侧导航（`chrome.ts`）、主题（`topics.json`）、这个行业自己的提示词（`prompts/`）、门槛（`selection.ts`）。“全部动态”的筛选栏用各类别的 `label`，不另写一份。和各主题相同的提示词在 `themes/shared/prompts/`，读取时先看主题目录，没有再用共享目录。照 `themes/ai/` 或 `themes/macro/` 的文件结构来，内容换成这个行业的。
2. 在 `themes/manifest.ts` 加一行（编号、显示名、是否启用、是否默认）。在 `themes/index.ts` 的 `PACKS` 里加一行导入，并在 `themes/chrome.ts` 登记这份导航，编号都与清单一致；对不上时启动会报错。网址前缀就是编号。迁移时按清单写入数据库。网页读的是这份清单和导航，不要再抄一份。
3. 信源是全局对象，主题只订阅，不改抓取频率、分级或全文许可。要盯的信源在后台“信源”页维护，订阅关系在后台“主题”或信源详情里勾。取消订阅只影响以后的分发，已有内容留着。没有勾选订阅的信源不会进入任何主题，启动时也不会自动挂到默认主题。每个启用主题的示范信源在 `themes/<theme>/sources.json`，由 `scripts/seed.ts` 导入并只订阅给这个主题；已经有的信源和订阅不会在启动时改写。

通常不需要改 `apps/` 和 `packages/`。框架里没有、只有这个站要的功能，做成模块放进 `modules/`（`docs/architecture.md` 的“模块”）。

这些事要问使用者本人，不要替他决定：这个行业的名字和编号（编号就是网址前缀）；要盯哪些信源；什么消息重要、什么是噪声；分类怎么分。

改评分标准时保留原有结构（内容类型、五个维度加权、噪声压制、安全边界），替换的是“什么算重要”“什么算噪声”的例子。门槛要用使用者标注的样本重新校准（`docs/selection.md`），不要凭感觉改数字。已有示例主题的测试留着；只有改了测试正在用的那个主题的 `taxonomy.ts`，才把测试里的分类、标签和公司换成对应项。

## 运行与检查

- Node.js 24 直接运行 TypeScript，后端没有构建步骤。npm workspaces：`apps/*`、`packages/*`、`site`、`modules/*`。
- 本机运行和 Docker 见 `docs/deploy.md`。
- 改完至少跑：
  ```bash
  npm run typecheck
  DATABASE_URL=postgres://127.0.0.1:5432/<名字>_test npm test   # 名字必须以 _test 或 _ci 结尾；没有会自动建好并迁移，账号要能建库
  npm run build -w @aihot/web && node --test apps/web/tests/*.test.ts
  node scripts/smoke.ts --base http://localhost:3000             # 站点跑起来以后
  ```
- `tests/` 里部分测试用的是示例主题（`ai`）的分类、标签和公司。新增主题时不要改这些例子；改了被测试引用的那个 `themes/<theme>/taxonomy.ts` 后，才把例子换成对应项。

## 要守住的规则

- 前端（`apps/web`）只通过 HTTP 读 `apps/api`，数据库、模型调用和密钥只在后端。
- 所有公开出口都从 `packages/backend/src/publication/` 这一个读取层读，新增公开出口也一样。
- 读者打开页面不触发模型调用；模型只在 worker 的任务里调用。
- 付费请求都经过回执（`providers/receipts.ts`）和预算熔断，不要绕开。
- 安全阀只有设成 `true` 才打开。开发时保持关闭：`COLLECT_ENABLED`、`MODEL_CALLS_ENABLED`、`FEISHU_*_ENABLED`、`INDEXNOW_SUBMIT_ENABLED`。测试里推送一直关着，采集和模型调用只连本地假服务，不访问任何外部服务。
- 信源默认只展示摘要和原文链接（`site_fulltext` 关）；只有来源明确允许时才打开全文。
- 公开内容匿名，管理员和访客看到的一样；后台只允许管理员。
- 停用或替换一个功能、机制时，同一个改动删掉它的代码、测试、文档和存下的状态（库表与列、定时任务、settings、环境变量和 `.env.example` 里的项）；会删掉使用者已有数据的，在 `docs/deploy.md` 的更新说明里写明。加锁、重试、兼容旧格式、开关和兜底，先要有证据：真实部署里发生过，或平台的语义决定它会发生。
- 数据库迁移放在 `database/migrations/`（只属于某个模块的表放在它的 `migrations/`），按完整文件名排序执行和记账；编号相同的不同文件分别执行，新增迁移使用新的文件名，已经发布的迁移不改。从 `0055` 起，每个文件只放一条允许在线执行的语句，PR 会检查；索引使用 `CONCURRENTLY IF NOT EXISTS`，大批数据回填不放进发布迁移。约束验证和破坏性变更先按 [迁移约定](docs/architecture.md#数据库迁移) 设计，不能修改历史文件或关闭检查绕过。
- 不要提交 `.env`、密钥和 `.data/`。
- 不要使用 AIHOT 的名字和 Logo。

## 写代码

匹配周围代码的写法、命名和注释密度。选能清楚解决问题的简单方案，只定义正在使用的抽象。验证改动涉及的重要行为，不为简单的样式改动写测试。
