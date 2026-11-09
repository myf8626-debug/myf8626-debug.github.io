# API 契约

默认服务地址：http://127.0.0.1:8312 。仅本机开发用途。

## POST /api/ask

Content-Type: application/json，最大请求体 200000 字节。返回 JSON。

```json
{
  "query": "竞赛学分",
  "cohort": 2024,
  "as_of": "2026-11-09"
}
```

query：1..500 字符；cohort：2000..2100 整数入学年份；as_of：严格 YYYY-MM-DD。可选 dataset 为包含 clauses 数组的对象，最多 100 条；每条包含 id/document/section/topic/text/value/cohorts/effective_from/effective_to。格式见 web/sample.json。

## 状态码
- 200：成功，mode 固定为 sample。
- 400：输入格式 / SQL 错误；error 字段说明原因。
- 403：浏览器跨源 POST 被拒绝。
- 404：未知接口。
- 501：POST /api/model，真实模型未接入。

## 模型替换边界
未来 provider 只负责生成候选结论 / 检索候选条款 / SQL 草稿，核验器仍决定输出边界。
当前没有已实现的 live provider，不能只填一个 API Key 就宣称完成了接入。

## 验证范围
接口测试覆盖正常请求、无效 JSON、错误路径、超过请求体上限、模型未实现和跨源请求。
无用户系统、生产级并发控制、外网部署或安全审计结论。
