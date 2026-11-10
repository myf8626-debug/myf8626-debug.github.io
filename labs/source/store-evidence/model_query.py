"""Opt-in DeepSeek SQL drafts. Only validated SQL executes on synthetic local data."""
import argparse
import json
import os
import urllib.request
import urllib.error
from engine import query

ENDPOINT = 'https://api.deepseek.com/chat/completions'
SYSTEM = '''你为模拟门店数据库生成 SQLite 只读查询。只返回 JSON：
{"sql":"SELECT ... 或 null","explanation":"口径和限制","assumptions":[]}。
无法用现有字段回答、预测未来、执行写操作时 sql=null 并说明原因。不要返回猜测数字。
严格遵守用户请求的输出列数和顺序。排序字段可仅用于 ORDER BY，不要擅自加入 SELECT 输出列。
表：stores(store_id,store_name,city), products(product_id,product_name,category,unit_price),
orders(row_id,order_id,store_id,product_id,order_date,quantity,amount,status),
refunds(refund_id,order_id,refund_amount)。原始表保留异常数据。
视图 clean_orders 包含 orders 全部字段及整数 amount_cents；clean_refunds 包含 refunds 全部字段及整数 refund_cents。
order_issues(row_id,issue) 和 refund_issues(refund_id,issue) 每项异常一行；flagged_orders 包含原始订单字段和合并 issue。
业务分析默认使用 clean_orders/clean_refunds。金额先以分求和，最后除100.0显示元。
退款必须先按 order_id 聚合再 JOIN，避免放大订单数和商品总额。退款订单按正退款额计算。
商品总额不扣退款；净额为商品总额减有效退款。没有利润成本数据。只有2026年10、11月的合成数据。
可用函数 sum,count,avg,min,max,round,abs,coalesce,nullif,ifnull,cast,date,strftime,length,trim,lower,upper,substr,group_concat,row_number,lag,lead,rank,dense_rank。
不支持文件、网络、系统表、随机blob、扩展函数。最多返回200行。'''


class ModelError(RuntimeError):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def configured():
    return bool(os.environ.get('DEEPSEEK_API_KEY', '').strip())


def generate(question):
    if not isinstance(question, str) or not question.strip() or len(question) > 2000:
        raise ValueError('question 须为 1..2000 字符')
    key = os.environ.get('DEEPSEEK_API_KEY', '').strip()
    if not key:
        raise ModelError('未配置 DEEPSEEK_API_KEY；未调用模型，也未回退样例答案')
    model = os.environ.get('DEEPSEEK_MODEL', 'deepseek-flash')
    payload = {'model': model, 'messages': [{'role': 'system', 'content': SYSTEM},
        {'role': 'user', 'content': question}], 'response_format': {'type': 'json_object'},
        'max_tokens': 1600, 'temperature': 0, 'thinking': {'type': 'disabled'}}
    req = urllib.request.Request(ENDPOINT, data=json.dumps(payload).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': 'Bearer '+key}, method='POST')
    try:
        with urllib.request.build_opener(NoRedirect).open(req, timeout=45) as response:
            raw = response.read(200001)
        if len(raw) > 200000:
            raise ModelError('模型响应超过大小限制')
        envelope = json.loads(raw)
        choice = envelope['choices'][0]
        if choice.get('finish_reason') != 'stop':
            raise ModelError('模型未正常完成；未执行 SQL')
        draft = json.loads(choice['message']['content'])
        if not isinstance(draft, dict) or not isinstance(draft.get('explanation'), str) or not isinstance(draft.get('assumptions'), list):
            raise ModelError('模型输出不符合 JSON 契约')
        if 'sql' not in draft or (draft['sql'] is not None and not isinstance(draft['sql'], str)):
            raise ModelError('模型输出缺少有效 sql 字段')
        if not all(isinstance(x, str) for x in draft['assumptions']):
            raise ModelError('assumptions 必须是字符串数组')
    except urllib.error.HTTPError as e:
        raise ModelError(f'模型服务 HTTP {e.code}；未执行 SQL') from None
    except ModelError:
        raise
    except Exception:
        raise ModelError('模型连接或响应解析失败；未执行 SQL') from None
    result = {'mode': 'live-model-synthetic-data', 'model': model,
        'question': question, 'draft': draft, 'refused': draft['sql'] is None,
        'usage': {k: envelope.get('usage', {}).get(k) for k in ('prompt_tokens','completion_tokens','total_tokens')}}
    if draft['sql'] is not None:
        result['result'] = query(draft['sql'])
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--question', required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(generate(args.question), ensure_ascii=False, indent=2))
    except (ModelError, ValueError) as error:
        print(str(error))
        raise SystemExit(1)
