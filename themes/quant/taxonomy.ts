// 量化交易行业的分类体系：类别、标签词表、机构与平台名录、身份词典。
// 模型按这里的词表打标签，主题页（topics.json）按标签归类，筛选栏按类别分组。
//
// 覆盖范围：量化策略、投研工具、交易基础设施、市场结构、行业动态与量化研究。
// 股票、期货、期权、外汇、数字资产等通过主题标签区分，不拆成顶层内容类别。
//
// 换行业时：类别的 key 会出现在网址里（/all?category=…），上线后不要再改。
// 若原 AI 站已经上线，应同步迁移历史数据、分类订阅和旧网址映射。

/**
 * 网页上的类别：筛选栏、卡片角标、RSS 分类订阅。
 *
 * key 是网址和接口里的身份，上线后不要改。
 * section 是日报里的分节标题；多个类别可以共用一节，按这里的顺序排列。
 * guide 告诉结构抽取模型这一类收什么，以及和相邻类别的边界。
 * commentary 标出评论类内容，沿用日报的评论去重逻辑。
 *
 * 没归上类的资料，放进第一个 key 为 industry 的类别所在的节。
 * feedLabel 是分类 RSS 标题里的名字，不写就用 label。
 *
 * 公开接口、RSS 和 MCP 的分类合并规则：
 * 在 site/site.ts 的 PUBLIC_CATEGORIES 中同步设置。
 *
 * 总体原则：
 * 1. 按文章主要贡献分类，不按作者、机构名或某个关键词分类。
 * 2. 回测、模拟交易、实盘表现必须区分，不能互相替代。
 * 3. 收益、回撤、夏普等数字必须保留原文的期间、条件和统计口径。
 * 4. 普通行情播报、喊单、荐股、收益营销不作为本站的主要收录对象。
 * 5. AI 内容只有与量化投研、交易、数据或风控直接相关时才收录。
 */
export const CATEGORIES = [
    {
        key: "quant-strategies",
        label: "策略",
        feedLabel: "量化策略",
        section: "策略与研究",
        guide:
            "以具体量化策略、因子组合或交易规则的首次公开、实质更新及明确策略的评估结果为核心。" +
            "应披露足以理解的方法、规则或实验条件；只有收益截图、营销宣传或产品名称不算策略披露。" +
            "以学术创新和实验发现为核心归论文；以逐步教学和复现为核心归教程；" +
            "机构募资、基金发行、规模与经营业绩新闻归行业；跨策略市场表现归市场。" +
            "不得把回测或模拟结果描述为实盘收益。",
    },
    {
        key: "quant-products",
        label: "工具",
        feedLabel: "量化工具与数据",
        section: "工具与数据",
        guide:
            "量化研究平台、回测引擎、交易框架、行情与基本面数据服务、券商接口、" +
            "执行系统、风控组件和投研工程工具的发布、更新或商业服务调整。" +
            "可直接使用的数据产品更新也归这里；以研究贡献为核心的新数据集归论文。" +
            "工具使用教学归教程；金融产品发行、交易规则调整和机构合作本身不归工具。",
    },
    {
        key: "market",
        label: "市场",
        feedLabel: "量化市场观察",
        section: "市场与行业",
        guide:
            "以可核实的市场数据和已经发生的市场现象为核心，" +
            "报道因子与策略群体表现、拥挤交易、流动性、波动率、成交结构和市场微观结构变化。" +
            "应与量化交易直接相关，不收泛化的涨跌播报和荐股喊单。" +
            "单一机构的经营业绩归行业；单一明确策略的评估归策略；" +
            "新研究方法归论文；以预测、解释和立场为核心且缺少新增事实的内容归观点；" +
            "交易规则和监管措施的正式发布归行业。",
    },
    {
        key: "industry",
        label: "行业",
        feedLabel: "量化行业动态",
        section: "市场与行业",
        guide:
            "量化机构、做市商、券商、交易所和数据服务商的经营、融资并购、人事、合作、" +
            "基金或金融产品发行、经营业绩披露，以及政策监管、交易规则、执法诉讼、" +
            "真实交易事故和调查进展。" +
            "区分征求意见、正式发布、开始施行和执法处罚，不得把草案写成已生效规则。" +
            "当事人发帖或报道带有态度，也不因此变成观点。",
    },
    {
        key: "paper",
        label: "论文",
        feedLabel: "量化论文与研究",
        section: "策略与研究",
        guide:
            "以新研究方法、实验设计或系统性发现为核心的论文、工作论文、技术报告、" +
            "研究基准与研究数据集，涵盖资产定价、因子投资、组合优化、交易执行、" +
            "市场微观结构、风险建模和金融机器学习等。" +
            "是否发表在学术平台不是唯一判断标准，应看研究贡献。" +
            "单纯复现已有方法归教程；工具发布归工具；机构宣传材料不自动视为研究。",
    },
    {
        key: "tip",
        label: "教程",
        feedLabel: "量化教程与实践",
        section: "实践与观点",
        guide:
            "读者可以照着实施的方法、代码示例、策略复现、因子检验、数据清洗、" +
            "回测设计、组合构建、交易接口接入、部署监控和工程复盘。" +
            "重点是可复用步骤、实现细节和适用条件；单纯发布工具归工具。" +
            "真实事故新闻归行业，以事故为例讲解可复用改进方法可归教程。" +
            "不得将教学示例表述为已验证的盈利策略。",
        commentary: true,
    },
    {
        key: "opinion",
        label: "观点",
        feedLabel: "量化观点与分析",
        section: "实践与观点",
        guide:
            "重点是作者对量化策略、市场结构、行业发展、监管影响和技术路线的解释、" +
            "判断、主张、预测、评论或访谈观点。" +
            "讨论市场不自动归市场，作者是知名基金经理也不自动归观点。" +
            "有新增可核实事件时优先按事件归类；有完整操作步骤时归教程。",
        commentary: true,
    },
] as const satisfies ReadonlyArray<{
    key: string;
    label: string;
    feedLabel?: string;
    section: string;
    guide: string;
    commentary?: true;
}>;

/**
 * 本配置暂不统计“新策略数量”。
 *
 * 策略披露、代码开源、论文发表和基金产品发行是不同事件，
 * 不统一包装成“发布了一个新策略”。
 *
 * 如果以后建立了严格的策略首次披露标准，可以改为：
 * {
 *     category: "quant-strategies",
 *     tag: "策略披露",
 *     unit: "项策略披露",
 * }
 *
 * 启用前需同步提示词，并明确首次披露与版本更新的计数边界。
 */
export const RELEASE: {
    category: string;
    tag: string;
    unit: string;
} | null = null;

/**
 * 周报月报总述可以直接使用、不必逐条寻找报道出处的行业通用词。
 * 英文字母保持小写。
 *
 * 此白名单只允许使用术语，不代表允许无来源生成收益、规模、
 * 因果判断或投资结论。
 */
export const PLAIN_TERMS: readonly string[] = [
    "quant",
    "alpha",
    "beta",
    "api",
    "sdk",
    "etf",
    "cta",
    "hft",
    "pnl",
    "aum",
    "nav",
    "vwap",
    "twap",
    "ic",
    "ir",
    "var",
    "cvar",
    "ai",
    "ml",
    "llm",
];

/**
 * 内容理解阶段的内容类型。
 *
 * 类型和网页类别不是一一对应关系：
 * tool_or_code 可以是工具发布，也可以是代码实践；
 * research_paper 按研究贡献判断，不仅按发布网站判断。
 *
 * 相对原 AI 配置：
 * - model_release → strategy_release
 * - tool_or_prompt → tool_or_code
 * - 新增 market_event
 *
 * 必须同步：
 * - prompts/content-understanding.md
 * - prompts/selection-score.md
 * - 所有类型枚举、校验器、数据库约束和分支判断
 */
export const ITEM_TYPES = [
    "strategy_release",
    "product_launch",
    "tool_or_code",
    "research_paper",
    "market_event",
    "industry_event",
    "opinion_analysis",
    "tutorial_explainer",
] as const;

// ── 标签词表 ──────────────────────────────────────────────────────────────

/**
 * 每篇资料的第一个标签必须是这些“分类标签”之一。
 *
 * 分类标签描述内容性质，主题标签描述讨论对象。
 * “回测”“风控”“高频”等不能单独决定文章的顶层类别。
 */
export const CATEGORY_TAGS = [
    "策略披露",
    "策略评估",
    "产品更新",
    "数据更新",
    "论文/研究",
    "开源/仓库",
    "教程/实践",
    "市场观察",
    "观点/评论",
    "评测/基准",
    "行业动态",
    "政策/监管",
    "风险事件",
    "通用工具",
    "其他",
] as const;

/**
 * 可选主题标签。
 *
 * 资产、市场、策略、方法和工程主题可以组合使用。
 * 只添加正文确实涉及的标签，不根据机构业务范围推断。
 * 主题页的板块和策略话题用这里的词，不用 entityId。
 */
export const TOPIC_TAGS = [
    // 资产与市场
    "股票",
    "期货",
    "期权",
    "外汇",
    "固定收益",
    "ETF",
    "数字资产",
    "A股",
    "港股",
    "美股",

    // 策略与组合
    "因子投资",
    "指数增强",
    "市场中性",
    "统计套利",
    "趋势跟踪",
    "均值回归",
    "CTA",
    "做市",
    "高频交易",
    "事件驱动",
    "波动率策略",
    "套利交易",
    "资产配置",
    "组合优化",

    // 数据与研究方法
    "金融机器学习",
    "深度学习",
    "强化学习",
    "LLM/智能体",
    "另类数据",
    "行情数据",
    "基本面数据",
    "因子挖掘",
    "因子检验",
    "时间序列",
    "回测",
    "样本外验证",
    "过拟合/数据泄漏",
    "交易成本/滑点",
    "绩效归因",
    "策略容量/拥挤度",
    "市场微观结构",
    "风险管理",

    // 工程与执行
    "算法执行",
    "交易接口",
    "低延迟",
    "数据工程",
    "实盘系统",
    "部署/监控",
    "开源生态",
    "合规",

    // 大A 主题页
    "大盘指数",
    "科技",
    "金融",
    "消费",
    "医药",
    "新能源",
    "高端制造",
    "军工",
    "周期",
    "地产基建",
    "农业",
    "传媒互联网",
    "国企改革",
    "政策监管",
    "资金面",
    "财报业绩",
    "并购重组",
    "市场情绪",
    "指数产品",
    "北交所",
    "红利策略",
    "AI算力",

    // 外汇主题页
    "美元指数",
    "人民币汇率",
    "欧元",
    "日元",
    "英镑",
    "商品货币",
    "新兴市场货币",
    "央行政策",
    "利率预期",
    "宏观数据",
    "地缘政治",
    "避险货币",
    "套息交易",
    "汇率干预",
    "跨境资金",
    "外汇衍生品",
    "美元周期",

    // 加密货币主题页
    "比特币",
    "以太坊",
    "主流山寨币",
    "公链",
    "Layer2",
    "DeFi",
    "稳定币",
    "Meme币",
    "NFT与GameFi",
    "RWA",
    "AI+Crypto",
    "交易所",
    "机构与ETF",
    "监管政策",
    "链上数据",
    "矿业",
    "安全事件",
    "宏观流动性",

    // 量化主题页里词表原先没有的策略名
    "多因子",
    "动量",
    "反转",
    "价值",
    "质量",
    "成长",
    "低波",
    "红利",
    "小市值",
    "因子择时",
    "宏观量化",
    "跨资产策略",
    "舆情量化",
    "加密量化",
    "外汇量化",
] as const;

/**
 * 可选实体标签：机构、平台、项目、交易所和监管主体。
 * 实体标签不表示文章由该主体发布，也不表示该主体认可文章。
 */
export const ENTITY_TAGS = [
    "QuantConnect",
    "聚宽",
    "米筐",
    "VeighNa",
    "Two Sigma",
    "WorldQuant",
    "Citadel",
    "Citadel Securities",
    "CME Group",
    "中国证监会",
] as const;

/**
 * 将明确的近义词统一成词表里的写法。
 *
 * 注意：
 * - 不把“发布”直接映射成“策略披露”。
 * - 不把“模型”直接映射成“金融机器学习”。
 * - 不把“投资”直接映射成“行业动态”。
 * - 不把“套利”自动等同于“统计套利”。
 * - 不把“CTA”自动等同于“趋势跟踪”。
 *
 * 有歧义的词由内容理解阶段结合上下文判断。
 */
export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
    // 内容性质
    策略发布: "策略披露",
    策略公开: "策略披露",
    策略测评: "策略评估",

    产品发布: "产品更新",
    工具发布: "产品更新",
    工具更新: "产品更新",
    平台更新: "产品更新",
    数据发布: "数据更新",

    论文: "论文/研究",
    研究: "论文/研究",
    paper: "论文/研究",
    papers: "论文/研究",

    "open-source": "开源/仓库",
    "open source": "开源/仓库",
    开源: "开源/仓库",
    仓库: "开源/仓库",
    repo: "开源/仓库",

    教程: "教程/实践",
    实践: "教程/实践",
    指南: "教程/实践",
    最佳实践: "教程/实践",
    策略复现: "教程/实践",
    工程复盘: "教程/实践",

    市场动态: "市场观察",
    行情观察: "市场观察",
    观点: "观点/评论",
    评论: "观点/评论",
    大佬观点: "观点/评论",

    评测: "评测/基准",
    基准测试: "评测/基准",

    公司动态: "行业动态",
    机构动态: "行业动态",
    融资: "行业动态",
    并购: "行业动态",
    "融资/收购": "行业动态",
    "合作/生态": "行业动态",

    政策: "政策/监管",
    监管: "政策/监管",
    法规: "政策/监管",
    交易规则: "政策/监管",

    交易事故: "风险事件",
    系统事故: "风险事件",

    // 资产与市场
    权益: "股票",
    债券: "固定收益",
    加密资产: "数字资产",
    加密货币: "数字资产",
    crypto: "数字资产",
    etf: "ETF",
    a股: "A股",

    // 策略与组合
    多因子策略: "多因子",
    风险控制: "风险管理",
    因子拥挤: "策略容量/拥挤度",
    机器学习: "金融机器学习",
    期权波动率: "波动率策略",
    交易执行: "算法执行",
    回测与过拟合: "回测",
    指增: "指数增强",
    中性策略: "市场中性",
    "statistical arbitrage": "统计套利",
    "stat arb": "统计套利",
    配对交易: "统计套利",
    "trend following": "趋势跟踪",
    "mean reversion": "均值回归",
    cta: "CTA",
    "market making": "做市",
    hft: "高频交易",
    高频: "高频交易",
    波动率交易: "波动率策略",
    套利: "套利交易",
    投资组合优化: "组合优化",

    // 数据与研究
    金融ML: "金融机器学习",
    金融大模型: "LLM/智能体",
    量化智能体: "LLM/智能体",
    另类数据集: "另类数据",
    "alternative data": "另类数据",
    因子测试: "因子检验",
    回测分析: "回测",
    backtest: "回测",
    backtesting: "回测",
    样本外测试: "样本外验证",
    "out-of-sample": "样本外验证",
    过拟合: "过拟合/数据泄漏",
    数据泄漏: "过拟合/数据泄漏",
    前视偏差: "过拟合/数据泄漏",
    未来函数: "过拟合/数据泄漏",
    滑点: "交易成本/滑点",
    交易成本: "交易成本/滑点",
    收益归因: "绩效归因",
    策略容量: "策略容量/拥挤度",
    拥挤交易: "策略容量/拥挤度",
    风控: "风险管理",

    // 工程
    执行算法: "算法执行",
    算法执行交易: "算法执行",
    券商API: "交易接口",
    交易API: "交易接口",
    低时延: "低延迟",
    实盘部署: "实盘系统",
    运维监控: "部署/监控",

    // 实体的明确别名
    quantconnect: "QuantConnect",
    JoinQuant: "聚宽",
    joinquant: "聚宽",
    RiceQuant: "米筐",
    ricequant: "米筐",
    "vn.py": "VeighNa",
    vnpy: "VeighNa",
    veighna: "VeighNa",
    "two sigma": "Two Sigma",
    worldquant: "WorldQuant",
    "citadel securities": "Citadel Securities",
    "cme group": "CME Group",
    CSRC: "中国证监会",
    csrc: "中国证监会",
};

// ── 公司、机构与项目主体 ───────────────────────────────────────────────────

/**
 * 主体主题：id → 显示名、卡片标签、明确别名。
 *
 * 此处主体不局限于公司，也可以是平台、开源项目或监管机构。
 *
 * aliases 给结构抽取模型看。
 * otherNames 只记录可以明确对应到该主体的其他称呼。
 *
 * 注意：
 * - 提到某平台上的用户文章，不代表平台发布或认可了该策略。
 * - 提到某机构员工，不代表观点属于该机构。
 * - 相近名称必须优先匹配完整名称，不能仅凭名称包含关系合并主体。
 * - 不使用 Alpha、Quant、CTA、LEAN 等通用或有歧义的单词认定机构。
 */
export const ENTITIES: Record<
    string,
    {
        name: string;
        displayTag: string | null;
        aliases: string[];
        otherNames?: string[];
    }
> = {
    quantconnect: {
        name: "QuantConnect",
        displayTag: "QuantConnect",
        aliases: ["QuantConnect"],
    },
    joinquant: {
        name: "聚宽量化平台",
        displayTag: "聚宽",
        aliases: ["JoinQuant", "聚宽量化平台", "聚宽投研平台"],
    },
    ricequant: {
        name: "米筐 RiceQuant",
        displayTag: "米筐",
        aliases: ["RiceQuant", "米筐", "米筐科技"],
    },
    vnpy: {
        name: "VeighNa / vn.py",
        displayTag: "VeighNa",
        aliases: ["VeighNa", "vn.py", "vnpy"],
        otherNames: ["VeighNa量化社区"],
    },
    "two-sigma": {
        name: "Two Sigma",
        displayTag: "Two Sigma",
        aliases: ["Two Sigma"],
    },
    worldquant: {
        name: "WorldQuant",
        displayTag: "WorldQuant",
        aliases: ["WorldQuant"],
    },
    citadel: {
        name: "Citadel",
        displayTag: "Citadel",
        aliases: ["Citadel"],
    },
    "citadel-securities": {
        name: "Citadel Securities",
        displayTag: "Citadel Securities",
        aliases: ["Citadel Securities"],
    },
    "cme-group": {
        name: "CME Group",
        displayTag: "CME Group",
        aliases: ["CME Group", "芝商所"],
    },
    csrc: {
        name: "中国证券监督管理委员会",
        displayTag: "中国证监会",
        aliases: ["中国证券监督管理委员会", "中国证监会", "CSRC", "China Securities Regulatory Commission"],
    },
};

/**
 * 身份词典：
 * 摘要和标题出现的主体，必须在原文或经过验证的发布方上下文中有依据。
 *
 * 所有 id 均应存在于 ENTITIES。
 * 正则不使用 g 标志，避免重复调用 test() 时受到 lastIndex 影响。
 *
 * 这是保守的文本检查，不是完整实体消歧：
 * - 名称出现不等于观点归属；
 * - 产品出现不一定等于运营公司被提及；
 * - 未收录的中文译名不应擅自补成机构名称。
 */
export const IDENTITY_LEXICON: ReadonlyArray<{
    id: string;
    name: string;
    patterns: RegExp[];
}> = [
    {
        id: "quantconnect",
        name: "QuantConnect",
        patterns: [/\bquantconnect\b/i],
    },
    {
        id: "joinquant",
        name: "聚宽量化平台",
        patterns: [/\bjoinquant\b/i, /聚宽(?:量化(?:投研)?平台|投研平台)/],
    },
    {
        id: "ricequant",
        name: "米筐 RiceQuant",
        patterns: [/\bricequant\b|米筐/i],
    },
    {
        id: "vnpy",
        name: "VeighNa / vn.py",
        patterns: [/\bveighna\b|\bvn\.?py\b/i],
    },
    {
        id: "two-sigma",
        name: "Two Sigma",
        patterns: [/\btwo\s+sigma\b/i],
    },
    {
        id: "worldquant",
        name: "WorldQuant",
        patterns: [/\bworldquant\b/i],
    },
    {
        id: "citadel-securities",
        name: "Citadel Securities",
        patterns: [/\bcitadel\s+securities\b/i],
    },
    {
        id: "citadel",
        name: "Citadel",
        // 不让 Citadel Securities 同时触发 Citadel。
        patterns: [/\bcitadel\b(?!\s+securities\b)/i],
    },
    {
        id: "cme-group",
        name: "CME Group",
        patterns: [/\bcme\s+group\b|芝商所/i],
    },
    {
        id: "csrc",
        name: "中国证监会",
        patterns: [/中国证券监督管理委员会|中国证监会/, /\bcsrc\b|\bchina\s+securities\s+regulatory\s+commission\b/i],
    },
];

/**
 * 可用于识别官方站点归属的域名。
 *
 * 域名归属只证明网站运营主体，不自动证明文章观点、策略或研究的主体。
 *
 * 如果当前消费代码会把域名直接认定为“文章发布方”，
 * 必须排除社区、论坛、用户策略、转载和第三方投稿。
 * 因此这里暂不加入聚宽、VeighNa 等带有社区内容的平台域名。
 *
 * QuantConnect 等站点也要在调用方做路径与作者过滤，
 * 不能把社区用户文章视为机构官方发布。
 *
 * 匹配时使用解析后的 hostname：
 * hostname === domain || hostname.endsWith("." + domain)
 * 不使用 includes(domain)，避免误认相似或恶意域名。
 *
 * GitHub、arXiv 等托管平台不作为机构身份依据。
 */
export const PUBLISHER_DOMAINS: ReadonlyArray<{
    entityId: string;
    domains: readonly string[];
}> = [
    {
        entityId: "quantconnect",
        domains: ["quantconnect.com"],
    },
    {
        entityId: "ricequant",
        domains: ["ricequant.com"],
    },
    {
        entityId: "two-sigma",
        domains: ["twosigma.com"],
    },
    {
        entityId: "worldquant",
        domains: ["worldquant.com"],
    },
    {
        entityId: "citadel",
        domains: ["citadel.com"],
    },
    {
        entityId: "citadel-securities",
        domains: ["citadelsecurities.com"],
    },
    {
        entityId: "cme-group",
        domains: ["cmegroup.com"],
    },
    {
        entityId: "csrc",
        domains: ["csrc.gov.cn"],
    },
];

/**
 * 原文里额外允许的主体称呼。
 *
 * 默认留空，避免未经核实的账号名、产品名和简称造成误匹配。
 * 后续只添加已核实且具有足够辨识度的写法。
 */
export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{
    entityId: string;
    pattern: RegExp;
}> = [];
