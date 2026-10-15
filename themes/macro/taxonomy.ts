// 宏观主题的分类体系：政策、市场、公司、外汇和观点。
// 模型按这里的词表打标签，主题页（topics.json）按标签归类，筛选栏按类别分组。
// 类别的 key 会出现在网址里，上线后不要再改。

export const CATEGORIES = [
  {
    key: "policy",
    label: "政策",
    feedLabel: "宏观政策",
    section: "政策与监管",
    guide: "央行决议、利率与购债、财政与产业政策、监管规则和执法的正式动作。征求意见、正式发布和开始施行要分开，不能把草案写成已生效规则。单一公司的经营新闻不归这里。",
  },
  {
    key: "market",
    label: "市场",
    feedLabel: "宏观市场",
    section: "市场",
    guide: "指数、成交、资金、通胀、就业和增长数据，以及已经发生的市场价格变化。单一公司的业绩归公司；汇率本身归外汇；只有预测、没有新数据时归观点。",
  },
  {
    key: "company",
    label: "公司",
    feedLabel: "公司动态",
    section: "公司与行业",
    guide: "单一公司的业绩、融资、并购、人事、更名和经营变化。行业性的规则、多家公司的汇总数据归行业或市场。",
  },
  {
    key: "fx",
    label: "外汇",
    feedLabel: "外汇",
    section: "外汇",
    guide: "汇率、央行外汇操作、跨境资金和外汇市场状态。利率决议本身仍归政策；只在讨论汇率后果时才归外汇。",
  },
  {
    key: "industry",
    label: "行业",
    feedLabel: "行业动态",
    section: "公司与行业",
    guide: "交易所、行业组织和多家机构的共同动作，以及无法归入单一公司或单条政策的行业事实。没归上类的资料放在这一节。",
  },
  {
    key: "opinion",
    label: "观点",
    feedLabel: "宏观观点",
    section: "观点",
    guide: "解释、预测、评论和访谈。有新增的可核实数据或正式动作时，优先按那个事实归类。",
    commentary: true,
  },
] as const satisfies ReadonlyArray<{ key: string; label: string; feedLabel?: string; section: string; guide: string; commentary?: true }>;

export const RELEASE: { category: string; tag: string; unit: string } | null = null;

export const PLAIN_TERMS: readonly string[] = ["gdp", "cpi", "ppi", "pmi", "fomc", "ecb", "pboc", "fx", "etf", "ipo"];

export const ITEM_TYPES = ["policy_action", "market_event", "company_event", "fx_event", "industry_event", "opinion_analysis", "tutorial_explainer"] as const;

export const CATEGORY_TAGS = ["政策/监管", "央行行动", "市场数据", "公司事件", "外汇", "行业动态", "观点/评论", "教程/解读", "其他"] as const;

export const TOPIC_TAGS = [
  "AI算力", "传媒互联网", "军工", "农业", "北交所", "医药", "周期", "国企改革", "地产基建", "大盘指数", "市场情绪", "并购重组", "指数产品", "政策监管", "新能源", "消费", "科技", "红利策略", "财报业绩", "资金面", "金融", "高端制造",
  "人民币汇率", "利率预期", "商品货币", "地缘政治", "外汇衍生品", "央行政策", "套息交易", "宏观数据", "新兴市场货币", "日元", "欧元", "汇率干预", "美元周期", "美元指数", "英镑", "跨境资金", "避险货币",
] as const;

export const ENTITY_TAGS = ["美联储", "欧洲央行", "英国央行", "日本央行", "中国人民银行", "中国证监会", "国家金融监督管理总局", "港交所", "美国证监会"] as const;

export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  政策: "政策/监管",
  监管: "政策/监管",
  法规: "政策/监管",
  央行: "央行行动",
  降息: "央行行动",
  加息: "央行行动",
  数据: "市场数据",
  行情: "市场数据",
  财报: "公司事件",
  并购: "公司事件",
  汇率: "外汇",
  观点: "观点/评论",
  评论: "观点/评论",
  教程: "教程/解读",
  解读: "教程/解读",
  行业: "行业动态",
  美联储: "美联储",
  fed: "美联储",
  fomc: "美联储",
  ecb: "欧洲央行",
  欧洲央行: "欧洲央行",
  boe: "英国央行",
  boj: "日本央行",
  人民银行: "中国人民银行",
  证监会: "中国证监会",
  csrc: "中国证监会",
  金融监管总局: "国家金融监督管理总局",
  nfra: "国家金融监督管理总局",
  港交所: "港交所",
  hkex: "港交所",
  sec: "美国证监会",
};

export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[]; otherNames?: string[] }> = {
  "federal-reserve": { name: "美联储", displayTag: "美联储", aliases: ["Federal Reserve", "美联储", "FOMC"] },
  ecb: { name: "欧洲央行", displayTag: "欧洲央行", aliases: ["European Central Bank", "欧洲央行", "ECB"] },
  boe: { name: "英国央行", displayTag: "英国央行", aliases: ["Bank of England", "英国央行", "英伦银行"] },
  boj: { name: "日本央行", displayTag: "日本央行", aliases: ["Bank of Japan", "日本央行", "日本银行"] },
  pboc: { name: "中国人民银行", displayTag: "中国人民银行", aliases: ["People's Bank of China", "中国人民银行", "央行"] },
  csrc: { name: "中国证监会", displayTag: "中国证监会", aliases: ["中国证监会", "中国证券监督管理委员会"] },
  nfra: { name: "国家金融监督管理总局", displayTag: "国家金融监督管理总局", aliases: ["国家金融监督管理总局", "金融监管总局"] },
  hkex: { name: "港交所", displayTag: "港交所", aliases: ["HKEX", "香港交易所", "港交所"] },
  sec: { name: "美国证监会", displayTag: "美国证监会", aliases: ["SEC", "Securities and Exchange Commission", "美国证监会"] },
};

export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "federal-reserve", name: "美联储", patterns: [/federal reserve|\bfomc\b|美联储/i] },
  { id: "ecb", name: "欧洲央行", patterns: [/european central bank|\becb\b|欧洲央行/i] },
  { id: "boe", name: "英国央行", patterns: [/bank of england|英国央行|英伦银行/i] },
  { id: "boj", name: "日本央行", patterns: [/bank of japan|日本央行|日本银行/i] },
  { id: "pboc", name: "中国人民银行", patterns: [/people'?s bank of china|中国人民银行/i] },
  { id: "csrc", name: "中国证监会", patterns: [/中国证券监督管理委员会|中国证监会|\bcsrc\b/i] },
  { id: "nfra", name: "国家金融监督管理总局", patterns: [/国家金融监督管理总局|金融监管总局/] },
  { id: "hkex", name: "港交所", patterns: [/\bhkex\b|香港交易所|港交所/i] },
  { id: "sec", name: "美国证监会", patterns: [/securities and exchange commission|\bsec\b|美国证监会/i] },
];

export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "federal-reserve", domains: ["federalreserve.gov"] },
  { entityId: "ecb", domains: ["ecb.europa.eu"] },
  { entityId: "boe", domains: ["bankofengland.co.uk"] },
  { entityId: "boj", domains: ["boj.or.jp"] },
  { entityId: "sec", domains: ["sec.gov"] },
  { entityId: "hkex", domains: ["hkex.com.hk"] },
];

export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [];
