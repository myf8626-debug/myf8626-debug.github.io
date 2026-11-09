"""Scope and effective-date filters over a manually structured sample corpus."""

import json, re
from datetime import date
from pathlib import Path

SAMPLE = Path(__file__).parent / "web/sample.json"
TOPICS = {
    "competition": ["竞赛", "比赛", "创新学分"],
    "scholarship": ["奖学金", "综测"],
    "internship": ["实习", "实践周"],
    "graduation": ["毕业", "学分要求"],
}


def valid_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("日期必须为 YYYY-MM-DD")
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise ValueError("无效日期")


def validate(data):
    if (
        not isinstance(data, dict)
        or not isinstance(data.get("clauses"), list)
        or len(data["clauses"]) > 100
    ):
        raise ValueError("需要最多 100 项的 clauses 数组")
    seen = set()
    for c in data["clauses"]:
        if not isinstance(c, dict):
            raise ValueError("条款必须是对象")
        for k in (
            "id",
            "document",
            "section",
            "topic",
            "text",
            "value",
            "effective_from",
            "effective_to",
        ):
            if not isinstance(c.get(k), str) or not c[k]:
                raise ValueError("条款字段缺失：" + k)
        if c["id"] in seen:
            raise ValueError("条款 ID 重复")
        seen.add(c["id"])
        if c["topic"] not in TOPICS:
            raise ValueError("未知条款主题")
        if len(c["text"]) > 5000:
            raise ValueError("条款正文过长")
        if valid_date(c["effective_from"]) >= valid_date(c["effective_to"]):
            raise ValueError("生效起止范围不正确")
        if (
            not isinstance(c.get("cohorts"), list)
            or not c["cohorts"]
            or any(type(y) is not int for y in c["cohorts"])
        ):
            raise ValueError("cohorts 必须是入学年份数组")


def answer(data, query, cohort, as_of):
    validate(data)
    if not isinstance(query, str) or not query.strip() or len(query) > 500:
        raise ValueError("问题须为 1..500 字符")
    if type(cohort) is not int or not 2000 <= cohort <= 2100:
        raise ValueError("入学年份不正确")
    valid_date(as_of)
    topics = [t for t, words in TOPICS.items() if any(w in query for w in words)]
    if len(topics) != 1:
        return {
            "mode": "sample",
            "status": "abstain",
            "answer": "请一次询问一个已支持主题：竞赛、奖学金、实习或毕业要求。",
            "clauses": [],
            "excluded": [],
            "query": query,
            "cohort": cohort,
            "as_of": as_of,
        }
    relevant = [c for c in data["clauses"] if c["topic"] == topics[0]]
    eligible = []
    excluded = []
    for c in relevant:
        reasons = []
        if cohort not in c["cohorts"]:
            reasons.append("不适用该入学年级")
        if as_of < c["effective_from"]:
            reasons.append("尚未生效")
        if as_of >= c["effective_to"]:
            reasons.append("已失效")
        if reasons:
            excluded.append({**c, "reason": "；".join(reasons)})
        else:
            eligible.append(c)
    if not eligible:
        status = "abstain"
        text = "当前资料中没有适用条款，无法给出结论。"
    elif len({c["value"] for c in eligible}) > 1:
        status = "conflict"
        text = "适用范围内存在相互冲突的条款，需要核对原文件或咨询发布方。"
    else:
        status = "answered"
        text = eligible[0]["text"]
    return {
        "mode": "sample",
        "status": status,
        "answer": text,
        "clauses": eligible,
        "excluded": excluded,
        "query": query,
        "cohort": cohort,
        "as_of": as_of,
        "topic": topics[0],
    }


def dispatch(route, body):
    if route != "/api/ask":
        raise KeyError(route)
    return answer(
        (
            body["dataset"]
            if "dataset" in body
            else json.loads(SAMPLE.read_text(encoding="utf-8"))
        ),
        body.get("query"),
        body.get("cohort"),
        body.get("as_of"),
    )
