# 本地 API

默认 http://127.0.0.1:8313，仅供本机演示。无用户系统和生产限流。

## GET /api/health
返回 status、mode=sample、model_configured。配置存在不等于连接成功。

## POST /api/query
JSON 对象 {"sql":"SELECT COUNT(*) FROM clean_orders"}，或 question 为固定目录中的完整问题。sql 优先。
单条 SELECT/WITH，1..10000 字符，最多 200 行。返回 sql、columns、rows、counts、truncated。
每次创建内存模拟数据库。SQLite authorizer 限制表/函数；query_only 加指令与约两秒执行预算。

## POST /api/model
JSON 对象 {"question":"有效订单扣除退款后的净额是多少？"}，问题 1..2000 字符。
需服务端环境变量 DEEPSEEK_API_KEY；可选 DEEPSEEK_MODEL（默认 deepseek-flash）。
返回 mode=live-model-synthetic-data、model、question、draft、refused、usage；执行成功另有 result，其数据模式仍为 sample。
draft 包含 sql、explanation、assumptions。sql=null 表示拒答，不执行 SQL。
模型草稿先经相同只读门禁再执行，不提供网络/文件/系统表访问。解释文字不等于已核验结论。
密钥不发浏览器；接口固定官方 HTTPS，不跟随重定向；不自动重试或回退样例。

## 错误
400：输入、JSON 或 SQL 不合法。
403：非本机 Host 或浏览器跨源 POST。
404：未知接口。
502：无模型凭据、上游错误、超时或模型响应格式错误。
500：未预期内部错误（不返回请求正文）。
请求体上限 200000 字节。服务不记录请求正文。

## 验证边界
HTTP 回归覆盖查询、坏 JSON、未知路径、Host/Origin、模型错误、模型路由和健康状态。
真实模型检查与 mock 测试分别记录，见 README。不是任意 SQL 沙箱或公网服务安全审计。
