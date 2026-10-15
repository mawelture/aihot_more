// Web3 主题的分类体系：行情、协议、产品和行业。
// 模型按这里的词表打标签，主题页（topics.json）按标签归类，筛选栏按类别分组。
// 类别的 key 会出现在网址里，上线后不要再改。

export const CATEGORIES = [
  {
    key: "market",
    label: "市场",
    feedLabel: "加密市场",
    section: "市场",
    guide: "价格、成交、资金流、持仓和已经发生的市场状态。单一协议升级归协议；交易所产品功能归产品。",
  },
  {
    key: "protocol",
    label: "协议",
    feedLabel: "协议与链",
    section: "协议与产品",
    guide: "公链、Layer2、DeFi 协议和合约的发布、升级、参数变更。只讲价格不归这里。",
  },
  {
    key: "product",
    label: "产品",
    feedLabel: "加密产品",
    section: "协议与产品",
    guide: "交易所、钱包、托管和面向使用者的产品功能。协议本身的升级归协议。",
  },
  {
    key: "industry",
    label: "行业",
    feedLabel: "加密行业",
    section: "行业",
    guide: "机构、融资、监管、执法、安全事件和矿业等已经发生的行业事实。没归上类的资料放在这一节。只有评论、没有新事实时归观点。",
  },
  {
    key: "opinion",
    label: "观点",
    feedLabel: "加密观点",
    section: "观点",
    guide: "解释、预测、评论和访谈。有新增的可核实事件时，优先按那个事实归类。",
    commentary: true,
  },
] as const satisfies ReadonlyArray<{ key: string; label: string; feedLabel?: string; section: string; guide: string; commentary?: true }>;

export const RELEASE: { category: string; tag: string; unit: string } | null = null;

export const PLAIN_TERMS: readonly string[] = ["btc", "eth", "defi", "nft", "dao", "etf", "tvl", "l2"];

export const ITEM_TYPES = ["market_event", "protocol_release", "product_launch", "industry_event", "policy_action", "opinion_analysis"] as const;

export const CATEGORY_TAGS = ["行情", "协议更新", "产品更新", "行业动态", "政策/监管", "安全事件", "观点/评论", "其他"] as const;

export const TOPIC_TAGS = [
  "AI+Crypto", "DeFi", "Layer2", "Meme币", "NFT与GameFi", "RWA", "主流山寨币", "交易所", "以太坊", "公链", "安全事件", "宏观流动性", "机构与ETF", "比特币", "监管政策", "矿业", "稳定币", "链上数据",
] as const;

export const ENTITY_TAGS = ["Bitcoin", "Ethereum", "Binance", "Coinbase", "Tether"] as const;

export const TAG_SYNONYMS: Readonly<Record<string, string>> = {
  价格: "行情",
  行情: "行情",
  升级: "协议更新",
  分叉: "协议更新",
  产品: "产品更新",
  上线: "产品更新",
  融资: "行业动态",
  监管: "政策/监管",
  政策: "政策/监管",
  黑客: "安全事件",
  被盗: "安全事件",
  观点: "观点/评论",
  比特币: "比特币",
  bitcoin: "比特币",
  btc: "比特币",
  以太坊: "以太坊",
  ethereum: "以太坊",
  eth: "以太坊",
  defi: "DeFi",
  layer2: "Layer2",
  "layer 2": "Layer2",
  l2: "Layer2",
  稳定币: "稳定币",
  stablecoin: "稳定币",
  nft: "NFT与GameFi",
  rwa: "RWA",
  交易所: "交易所",
  矿工: "矿业",
  挖矿: "矿业",
  etf: "机构与ETF",
  binance: "Binance",
  币安: "Binance",
  coinbase: "Coinbase",
  tether: "Tether",
  usdt: "Tether",
};

export const ENTITIES: Record<string, { name: string; displayTag: string | null; aliases: string[]; otherNames?: string[] }> = {
  bitcoin: { name: "Bitcoin", displayTag: "Bitcoin", aliases: ["Bitcoin", "比特币", "BTC"] },
  ethereum: { name: "Ethereum", displayTag: "Ethereum", aliases: ["Ethereum", "以太坊", "ETH"] },
  binance: { name: "Binance", displayTag: "Binance", aliases: ["Binance", "币安"] },
  coinbase: { name: "Coinbase", displayTag: "Coinbase", aliases: ["Coinbase"] },
  tether: { name: "Tether", displayTag: "Tether", aliases: ["Tether", "USDT"] },
};

export const IDENTITY_LEXICON: ReadonlyArray<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "bitcoin", name: "Bitcoin", patterns: [/\bbitcoin\b|\bbtc\b|比特币/i] },
  { id: "ethereum", name: "Ethereum", patterns: [/\bethereum\b|\beth\b|以太坊/i] },
  { id: "binance", name: "Binance", patterns: [/\bbinance\b|币安/i] },
  { id: "coinbase", name: "Coinbase", patterns: [/\bcoinbase\b/i] },
  { id: "tether", name: "Tether", patterns: [/\btether\b|\busdt\b/i] },
];

export const PUBLISHER_DOMAINS: ReadonlyArray<{ entityId: string; domains: readonly string[] }> = [
  { entityId: "binance", domains: ["binance.com"] },
  { entityId: "coinbase", domains: ["coinbase.com"] },
  { entityId: "tether", domains: ["tether.to"] },
];

export const IDENTITY_CONTEXT_ALIASES: ReadonlyArray<{ entityId: string; pattern: RegExp }> = [];
