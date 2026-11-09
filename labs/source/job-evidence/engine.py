"""Deterministic provenance checks, not semantic entailment or web research."""

import json
from pathlib import Path

SAMPLE = Path(__file__).parent / "web/sample.json"


def validate(data):
    if (
        not isinstance(data, dict)
        or not isinstance(data.get("sources"), list)
        or not isinstance(data.get("claims"), list)
    ):
        raise ValueError("需要 sources 和 claims 数组")
    if len(data["sources"]) > 40 or len(data["claims"]) > 80:
        raise ValueError("最多 40 个来源、80 条结论")
    seen = set()
    for source in data["sources"]:
        if not isinstance(source, dict):
            raise ValueError("来源必须是对象")
        for key in ("id", "title", "text", "date"):
            if not isinstance(source.get(key), str) or not source[key]:
                raise ValueError("来源字段缺失：" + key)
        if source["id"] in seen:
            raise ValueError("来源 ID 重复")
        seen.add(source["id"])
        if len(source["text"]) > 10000:
            raise ValueError("单个来源超过 10000 字符")
        if not isinstance(source.get("facts"), dict) or any(
            not isinstance(v, str) for v in source["facts"].values()
        ):
            raise ValueError("facts 必须是字符串映射")
    seen = set()
    for claim in data["claims"]:
        if not isinstance(claim, dict):
            raise ValueError("结论必须是对象")
        for key in ("id", "text", "field", "value"):
            if not isinstance(claim.get(key), str) or not claim[key]:
                raise ValueError("结论字段缺失：" + key)
        if claim["id"] in seen:
            raise ValueError("结论 ID 重复")
        seen.add(claim["id"])
        if not isinstance(claim.get("evidence"), list) or len(claim["evidence"]) > 20:
            raise ValueError("evidence 必须是最多 20 项的数组")
        for ref in claim["evidence"]:
            if (
                not isinstance(ref, dict)
                or not isinstance(ref.get("source_id"), str)
                or not isinstance(ref.get("quote"), str)
            ):
                raise ValueError("引文格式不正确")
            if type(ref.get("start")) is not int or type(ref.get("end")) is not int:
                raise ValueError("引文位置必须为整数")


def analyze(data):
    validate(data)
    by_id = {s["id"]: s for s in data["sources"]}
    results = []
    for claim in data["claims"]:
        refs = []
        for ref in claim["evidence"]:
            source = by_id.get(ref["source_id"])
            good = bool(
                source
                and ref["quote"]
                and 0 <= ref["start"] < ref["end"] <= len(source["text"])
                and source["text"][ref["start"] : ref["end"]] == ref["quote"]
            )
            field_match = bool(
                good
                and source["facts"].get(claim["field"]) == claim["value"]
                and claim["value"] in ref["quote"]
            )
            refs.append(
                {
                    **ref,
                    "title": source["title"] if source else "来源不存在",
                    "date": source["date"] if source else "",
                    "quote_match": good,
                    "field_match": field_match,
                }
            )
        values = {
            s["facts"][claim["field"]]
            for s in data["sources"]
            if claim["field"] in s["facts"]
        }
        conflicts = (
            [
                {
                    "source_id": s["id"],
                    "title": s["title"],
                    "value": s["facts"][claim["field"]],
                    "text": s["text"],
                }
                for s in data["sources"]
                if claim["field"] in s["facts"]
            ]
            if len(values) > 1
            else []
        )
        if not refs or any(r["source_id"] not in by_id for r in refs):
            status = "missing"
        elif any(not r["quote_match"] for r in refs):
            status = "mismatch"
        elif any(not r["field_match"] for r in refs):
            status = "unsupported"
        elif conflicts:
            status = "conflict"
        else:
            status = "traceable"
        results.append(
            {**claim, "status": status, "evidence": refs, "conflicts": conflicts}
        )
    counts = {
        s: sum(r["status"] == s for r in results)
        for s in ("traceable", "conflict", "missing", "mismatch", "unsupported")
    }
    return {
        "mode": "sample",
        "method": "exact_quote_and_manual_field_match",
        "company": data.get("company", "自定义资料"),
        "claims": results,
        "counts": counts,
        "source_count": len(by_id),
        "limitation": "引文匹配不等于事实真实性或语义蕴含已验证；facts 为人工结构化字段。",
    }


def dispatch(route, body):
    if route != "/api/analyze":
        raise KeyError(route)
    return analyze(
        body["dataset"]
        if "dataset" in body
        else json.loads(SAMPLE.read_text(encoding="utf-8"))
    )
