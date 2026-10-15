【量化交易领域翻译规则 — 本平台 100% 是量化交易/金融工程/投资策略行业内容，严格遵守】

1. 歧义默认值：以下词在中文有非量化歧义，**一律按量化含义翻译**：
   - Alpha = 超额收益 / 阿尔法因子（保留 Alpha；绝不译“阿尔法狗”）
   - Beta = 市场暴露 / 贝塔系数（保留 Beta）
   - Factor = 因子（绝不译“因素”泛化）
   - Signal = 交易信号
   - Backtest = 回测
   - Drawdown = 回撤
   - Sharpe = 夏普比率
   - Sortino = 索提诺比率
   - Calmar = 卡玛比率
   - Turnover = 换手率
   - Slippage = 滑点
   - Liquidity = 流动性
   - Spread = 买卖价差
   - Execution = 交易执行
   - Position = 持仓 / 头寸
   - Long / Short = 多头 / 空头
   - Hedge = 对冲
   - Arbitrage = 套利
   - Market making = 做市
   - Momentum = 动量
   - Mean reversion = 均值回归
   - Carry = Carry / 持有收益（保留 Carry）
   - Volatility = 波动率
   - Option = 期权
   - Future = 期货
   - Swap = 互换
   - Derivative = 衍生品
   - Portfolio = 组合
   - Optimization = 优化 / 组合优化
   - Overfitting = 过拟合
   - Look-ahead bias = 前视偏差
   - Survivorship bias = 幸存者偏差
   - Transaction cost = 交易成本
   - Capacity = 策略容量
   - PnL = 盈亏
   - AUM = 管理规模
   - NAV = 净值
   - Benchmark = 基准
   - Max drawdown = 最大回撤
   - CAGR = 年化复合增长率
   - IR = 信息比率
   - IC = 信息系数
   - Rank IC = 秩信息系数
   - Factor exposure = 因子暴露
   - Risk parity = 风险平价
   - Kelly = 凯利公式
   - VaR = 在险价值
   - CVaR = 条件在险价值
   - Stop loss = 止损
   - Take profit = 止盈
   - Leverage = 杠杆
   - Margin = 保证金
   - Short squeeze = 空头挤压
   - Gamma squeeze = Gamma 挤压
   - Token / tokens = 加密代币；若指接口鉴权或数据接口令牌，保留 token
   - Transformer = Transformer 架构（保留英文；不译“变压器”）
   - Diffusion = 扩散模型（AI 生成；不译“物理扩散”）
   - Agent / Agentic = 智能体 / 智能体的（不译“代理人”/“中介”）
   - Alignment = 对齐（AI 安全语境）；量化风控语境可指风险对齐
   - Inference = 推断 / 推理（统计推断或模型生成）
   - Reasoning = 推理（注意：与 inference 都译“推理”，必要时用“链式推理”区分 CoT；reasoning model 指 o1/o3/R1 这类思考型模型）
   - Embedding = 嵌入向量（也可保留英文）
   - Distillation = 知识蒸馏
   - Hallucination = 模型幻觉
   - Fine-tune / Fine-tuning = 微调
   - Pretrain / Pretraining = 预训练
   - Context window = 上下文窗口
   - Prompt = 提示词
   - Skill / Skills = 技能（Agent 框架的能力包，不译“特长”）
2. 以下专有名词**一律保留英文原文**，不翻译不加中文括注：
   - 量化机构/平台：Two Sigma / Renaissance Technologies / Citadel / Millennium / Point72 / AQR / DE Shaw / Jane Street / Optiver / IMC / Jump Trading / HRT / WorldQuant / Man Group / Bridgewater / BlackRock / Vanguard / Fidelity / Susquehanna / DRW / Squarepoint / Balyasny / ExodusPoint / Schonfeld / Verition / Graham / Tudor / Caxton / Brevan Howard / Marshall Wace
   - 模型/策略族（举例 + 通用规则）：Alpha101 / Alpha191 / WorldQuant Alpha / Qlib / Alphalens / Pyfolio / Zipline / Backtrader / vn.py / LightGBM / XGBoost / CatBoost / LSTM / GRU / Transformer / GARCH / ARIMA / Kalman / HMM / PCA / PPO / DDPG / SAC / TD3 / DQN
     **规则**：任何量化策略族名、因子集名、模型代号、产品代号一律保留英文
   - 版本号（举例 + 通用规则）：Qlib v0.9 / vn.py 3.x / LightGBM 4.x / Alpha101 / Alpha191 / GPT-5 / Claude 4.7 / Llama 4 / DeepSeek-V4 / Qwen3.7
     **规则**：版本号一字不改（包括字母数字后缀如 4o / 4.7 / 405B / V4 / R1），绝不“翻译性扩写”（不要把 "405B" 译成 "4050 亿"，不要把 "V4" 译成 "第 4 代"）
   - 技术缩写（举例 + 通用规则）：Alpha / Beta / IC / IR / Sharpe / Sortino / Calmar / VaR / CVaR / ES / MDD / CAGR / PnL / AUM / NAV / ETF / ETN / CTA / HFT / T0 / T+1 / OHLC / VWAP / TWAP / POV / IS / OOS / WFO / CPCV / DSR / PBO / MCPT / FDR / PCA / GARCH / ARIMA / Kalman / HMM / LSTM / GRU / Transformer / RL / DRL / PPO / DDPG / SAC / TD3 / A2C / A3C / DQN / GAN / VAE / SVM / RF / GBDT / LASSO / Ridge / ElasticNet / OLS / WLS / GLS / GMM / MLE / EM / MCMC / HMC / VI / SHAP / LIME / PDP / ICE
     **规则**：任何 2-5 字母的全大写缩写，默认按量化含义保留英文
   - 评测基准/指标（举例 + 通用规则）：Sharpe / Sortino / Calmar / Max Drawdown / Annualized Return / Volatility / Alpha / Beta / IR / IC / Rank IC / Turnover / Capacity / Slippage / Fill Rate / Hit Rate / Profit Factor / Win Rate / Payoff Ratio / Kelly / VaR / CVaR / Stress Test / Monte Carlo / Walk-forward / Cross-validation / Deflated Sharpe / Probabilistic Sharpe / PBO / DSR / CSCV
     **规则**：以 -ratio / -test / -forward / -validation 结尾或全大写的指标名一律保留英文
   - 量化工具/产品：Wind / 同花顺 / 东方财富 / 聚宽（JoinQuant）/ 米筐（RiceQuant）/ 优矿（Uqer）/ 掘金量化 / 果仁网 / 文华财经 / 交易开拓者 / MultiCharts / TradeStation / MetaTrader / Interactive Brokers / Bloomberg / Refinitiv / Reuters / FactSet / S&P Capital IQ / Compustat / CRSP / TAQ / WRDS / QuantConnect / Zipline / Backtrader / vn.py / Qlib / Alphalens / Pyfolio / empyrical / TA-Lib / pandas / NumPy / scikit-learn / PyTorch / TensorFlow / XGBoost / LightGBM / CatBoost / Optuna / MLflow / DVC / Airflow / Kafka / Redis / ClickHouse / DolphinDB / KDB+ / Arctic / Parquet / Arrow / DuckDB / Snowflake / Databricks / Spark / Flink / Ray / Dask / Kubernetes / Docker / AWS / GCP / Azure / 阿里云 / 腾讯云 / 华为云
   - 交易框架/协议：FIX / ITCH / OUCH / SBE / FAST / CME MDP / Nasdaq ITCH / OPRA / SIP / FIX 4.4 / FIX 5.0
   - 通用技术：API / SDK / CLI / IDE / SaaS / CDN / SSO / OAuth / JWT / WebSocket / SSE / gRPC
3. 中国厂商**优先用官方中文品牌名**（首次出现可双标"幻方量化（High-Flyer）"，后续选一种保持一致）：
   - 幻方量化（High-Flyer）/ 九坤投资 / 明汯投资 / 灵均投资 / 诚奇资产 / 衍复投资 / 鸣石投资 / 因诺资产 / 天演资本 / 稳博投资 / 黑翼资产 / 思勰投资 / 白鹭资管 / 世纪前沿 / 佳期投资 / 宽德投资 / 金锝资产 / 蒙玺投资 / 千象资产 / 涵德投资 / 洛书投资 / 呈瑞投资 / 思晔投资 / 锐天投资 / 致诚卓远 / 概率投资 / 量派投资 / 玄元投资 / 启林投资 / 赫富投资 / 星阔投资 / 卓识投资 / 鹿秀投资 / 靖奇投资 / 半鞅资产 / 博润投资 / 微丰投资 / 信弘天禾 / 时代复兴 / 富善投资 / 双隆投资 / 淘利资产 / 雁丰投资 / 淳臻投资
4. 代码 / 命令 / URL / 数字单位 **一字不改**保留：
   - 反引号代码 `code` 不翻译
   - 命令如 `pip install`、`npm run`、`python backtest.py`、`qlib run`、`vnpy` 不译（不要译“代码审查”）
   - URL 原样
   - 数字+单位：8% annual return / 2.5 Sharpe / 15% max drawdown / 5bps slippage / 20-day rebalance / $3 per M shares / 99.9% / 1e6 shares
   - 金额、比例、区间必须保留原文的阿拉伯数字和单位；不要把 $10B-$100B 改写成“数百亿至数千亿美元”等中文数量词
