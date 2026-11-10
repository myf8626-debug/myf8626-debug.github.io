# 门店数据分析台

**状态：固定样例可离线运行；本机可选接入 DeepSeek，已完成小样本真实调用验证。数据全部为合成数据。**

把模拟门店数据中的业务问题对应到可编辑 SQL，并展示清洗原因、关联结果和计算口径。

## 已实现
- stores、products、orders、refunds 四张表；Python sqlite3 与浏览器 sql.js 实际执行查询。
- 原始订单保留，order_issues 保留全部异常原因，flagged_orders 合并展示，clean_orders 视图隔离不合格记录。
- ROW_NUMBER 去重，关联缺失、数量、金额、状态检查；完全相同的重复订单保留最早 row_id；同订单号内容冲突则整组隔离；校验日历日期及分以下金额，隔离无有效订单、负值与累计超额退款。
- 退款先按订单预聚合，再多表关联，避免一对多连接放大计数。
- LAG 月度环比、窗口聚合类别占比、超过 2 倍总体标准差的探索性偏离检查。
- 单条只读查询；Python authorizer + query_only + 指令 / 时间预算，浏览器独立 Worker + query_only + 5 秒超时。
- 返回最多 200 行，导出 JSON / CSV，CSV 对公式前缀作转义。

## 一个可复现案例
O005 有两笔退款（20 元和 10 元），先 GROUP BY order_id 聚合为 30 元再关联。
中原店结果仍为 5 笔订单、220 元商品总额、1 笔退款订单、30 元退款额，退款订单占比为 20%。
直接对退款明细做 JOIN 会重复计算 O005，这也是回归测试专门覆盖的问题。

## 结果与限制
20 行模拟原始订单，12 行有效、8 行隔离；有效商品总额 460 元，退款总额 120 元。
金额异常统计的当前结果为 0 条，不把它解释为“数据没有问题”。所有数字仅描述内置模拟样例。
固定问题目录映射到事先编写的 SQL，不是模型生成。本机另有 DeepSeek Text-to-SQL 入口，未集成 Vanna；没有预测销量或因果诊断。
原始金额保留 REAL 供核查，通过校验后以整数分聚合，最后转换为元。尚未覆盖超大金额、跨币种、折扣和退款时序；不等同于生产财务规则。冲突按门店、商品、日期、数量、金额、状态逐字段比较（包括 NULL 差异）；冲突订单的退款也隔离，不推断哪条记录更可信。
SQL 词法门禁是保守子集，可能拒绝含敏感词的合法字符串 / 别名；不是任意 SQL 沙箱或生产服务。

## 技术栈
Python 3.11+ 标准库、原生 HTML / CSS / JavaScript。无需 npm 构建、数据库服务或 API Key。
浏览器附带 sql.js 1.13.0（SQLite WASM），Python 使用自带 sqlite3。

## 启动
在解压后的项目根目录运行：

```powershell
python server.py --port 8313
```

打开 http://127.0.0.1:8313/ 。默认只监听本机，不作为公网后端部署。
也可只把 web/ 部署到静态网站；在线样例在浏览器本地计算，不会上传导入的资料。
跨项目导航链接面向作品集的 /labs/ 目录，单独运行时会自动指向在线作品集。

## API
- GET /api/health：model_configured 仅表示已配置密钥，不表示连接成功。
- POST /api/query：请求字段及样例见下。
- POST /api/model：真实模型生成 SQL 草稿后，经本地只读门禁执行；缺少凭据或服务失败返回 HTTP 502，不回退固定答案。
- 完整字段说明见 API.md；没有鉴权、持久化用户资料或在线模型配置。

```json
{
  "question": "哪些门店的退款订单占比更高？"
}
```

## 验证
```powershell
python evaluate.py
```

本次运行 46 项确定性回归检查，46 项通过；详细用例、样例哈希和执行时间在 web/evaluation.json。
这是已知预期的小样本逻辑检查，不是模型评测，不可换算成真实准确率或编造率下降。

## 关键文件
- engine.py：后端核验 / 查询逻辑。
- server.py：仅本机 API 与静态资源服务。
- web/：界面、浏览器计算逻辑及人工构造样例。
- test_engine.py / evaluate.py：回归测试与结果导出。
- API.md / THIRD_PARTY.md：接口契约与来源边界。

## 我的工作与来源
使用 AI 辅助开发，负责样例场景、核验规则、交互设计、接口与回归检查的设计及实现。
这是个人实验作品，不是实习业务交付，也不等同于独立手写所有代码。
参考项目及实际使用的第三方资产在 THIRD_PARTY.md；没有把上游完整能力计入本项目。

## 可选真实模型

在启动终端配置 DEEPSEEK_API_KEY（不要写入源码或提交仓库），可选 DEEPSEEK_MODEL，默认 deepseek-flash，再运行 python server.py。页面会显示本地模型查询入口，点击才向官方 API 发送问题和合成表结构，不发送密钥给浏览器。程序不自动读取 .env，也不读取其他项目配置。

```powershell
python model_query.py --question "有效订单扣除退款后的净额是多少？"
python evaluate_live.py
```

API 地址固定为 https://api.deepseek.com/chat/completions，拒绝重定向，超时 45 秒，输出上限 1600 tokens。请求和模型响应正文不写服务日志。参考 [DeepSeek JSON Output 文档](https://api-docs.deepseek.com/guides/json_mode/)。

模型只生成 SQL、口径解释与假设；只读执行成功并不证明业务口径正确。界面标明解释需核对。该服务仅绑定 127.0.0.1，拒绝外部 Host/Origin；没有用户认证、生产限流或资源隔离，不应部署到公网。

## 本轮真实验证

- reports/live-evaluation-first-run.json：首次 5/6 通过；门店汇总多返回一列 ID，按契约判失败，未隐藏。
- reports/live-evaluation.json：增加通用输出列约束后，同六题复测 6/6；属于开发回归，不是独立留出评测。
- reports/browser-qa.json：五组 Python/sql.js 结果一致；真实模型页面查询净额得到 340 元；模拟 HTTP 502 后旧结果清除；390px 手机页面无横向溢出。
- reports/desktop.png、mobile.png：本地验收截图。

6/6 不能写成模型准确率 100%，也没有真实业务效果数据。模型解释文本没有逐句自动事实核验。

浏览器验收使用外部安装的 playwright-core 和 Edge，运行 browser-qa.mjs 时传入模块的 file:/// 绝对 URL；它连接本地 8314 端口且会产生一次真实模型调用。普通使用不需要安装这些验收依赖。


## 补充：冲突重复订单

同订单号但内容不同，不应因导入顺序而决定财务结果。新增测试逐项改变六个字段，检查整组订单及其退款被隔离；原始数据保留。浏览器 WASM 与 Python 的变异样例结果由 `node check_sql_parity.cjs` 比较，报告在 `reports/sql-parity.json`。这项检查不调用模型；前述真实模型报告保留原运行时的源码哈希，不代表后续所有版本均重跑了模型。
