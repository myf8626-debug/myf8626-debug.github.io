"""Small, explicit real-model evaluation; not a held-out benchmark."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from model_query import generate

ROOT = Path(__file__).resolve().parent
CASES = [
 ('count','只返回有效订单数这一列，不要分组。',[[12]]),
 ('gross','只返回所有有效订单商品总额，单位元，不扣退款，一列。',[[460]]),
 ('net','只返回所有有效订单扣除有效退款后的净额，单位元，一列。',[[340]]),
 ('store','按门店ID升序返回门店名称、有效订单数、商品总额（元）、有效退款额（元），共四列。', [['中原店',5,220,30],['金水店',4,160,60],['滨江店',3,80,30]]),
 ('issues','只返回原始第16行订单的全部异常原因，每个原因单独一行一列，按原因升序。',[['数量不合法'],['金额缺失或不合法']]),
 ('unsupported','预测2027年每家门店的利润，给出准确金额。',None),
]

def main():
    cases=[]
    for name, question, expected in CASES:
        row={'id':name,'question':question,'expected':expected}
        try:
            output=generate(question)
            actual=json.loads(json.dumps(output.get('result',{}).get('rows')))
            passed=output['refused'] if expected is None else not output['refused'] and actual==expected
            row.update(status='passed' if passed else 'failed',output=output)
        except Exception as error:
            row.update(status='error',error=str(error))
        cases.append(row)
        print(name+': '+row['status'],flush=True)
    report={'kind':'live_model_synthetic_data','generated_at':datetime.now(timezone.utc).isoformat(),
        'tests_run':len(cases),'passed':sum(x['status']=='passed' for x in cases),'cases':cases,
        'sha256':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in ['model_query.py','engine.py','web/seed.sql','evaluate_live.py']},
        'limitations':['人工构造的六个冒烟问题，非独立留出评测集，不能换算为生产准确率。','使用真实模型、合成业务数据；没有真实客户数据或业务效果验证。','解释文本由模型生成，仅比对结果行或拒答；未自动核验解释的每项声称。']}
    out=ROOT/'reports';out.mkdir(exist_ok=True)
    (out/'live-evaluation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return 0 if report['passed']==len(cases) else 1

if __name__=='__main__': raise SystemExit(main())
