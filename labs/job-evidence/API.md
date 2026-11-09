# API 契约

默认服务地址：http://127.0.0.1:8311 。仅本机开发用途。

## POST /api/analyze

Content-Type: application/json，最大请求体 200000 字节。返回 JSON。

```json
{
  "dataset": "可选：与 web/sample.json 同格式的对象"
}
```

dataset 可省略以使用内置样例。自定义 dataset 必须包含 sources、claims 数组；结构见 web/sample.json。最多 40 个来源、80 条结论、每条最多 20 个引文。start/end 是 Unicode 码点位置，左闭右开。facts 为人工提供的字段，并不是模型推断结果。

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
