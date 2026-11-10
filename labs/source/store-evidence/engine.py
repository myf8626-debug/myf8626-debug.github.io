"""Execute bounded read-only SQLite queries against a synthetic fixture."""

from pathlib import Path
import json, re, sqlite3, time

WEB = Path(__file__).parent / "web"


def validate_sql(sql):
    if not isinstance(sql, str) or not sql.strip() or len(sql) > 10000:
        raise ValueError("SQL 须为 1..10000 字符")
    sql = sql.strip().removesuffix(";").strip()
    if ";" in sql or not re.match(r"^(SELECT|WITH)\b", sql, re.I):
        raise ValueError("仅支持单条 SELECT / WITH 查询")
    if re.search(
        r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|DETACH|PRAGMA|REPLACE|VACUUM|REINDEX|LOAD_EXTENSION)\b",
        sql,
        re.I,
    ):
        raise ValueError("查询包含不支持的操作")
    return sql


def query(sql):
    sql = validate_sql(sql)
    conn = sqlite3.connect(":memory:")
    try:
        conn.executescript((WEB / "seed.sql").read_text(encoding="utf-8"))
        counts = dict(
            zip(
                ("raw", "clean", "excluded"),
                conn.execute(
                    "SELECT (SELECT COUNT(*) FROM orders),(SELECT COUNT(*) FROM clean_orders),(SELECT COUNT(*) FROM flagged_orders WHERE issue IS NOT NULL)"
                ).fetchone(),
            )
        )
        conn.execute("PRAGMA query_only=ON")
        allowed = {
            sqlite3.SQLITE_SELECT,
            sqlite3.SQLITE_READ,
            sqlite3.SQLITE_FUNCTION,
            sqlite3.SQLITE_RECURSIVE,
        }

        def authorizer(action, a, b, db, trigger):
            tables = {'stores','products','orders','refunds','order_issues','flagged_orders','clean_orders','refund_issues','clean_refunds'}
            functions = {'abs','round','sum','count','avg','min','max','coalesce','ifnull','nullif','cast','date','strftime','length','trim','lower','upper','substr','group_concat','row_number','lag','lead','rank','dense_rank'}
            if action == sqlite3.SQLITE_READ and a not in tables:
                return sqlite3.SQLITE_DENY
            if action == sqlite3.SQLITE_FUNCTION and str(b).lower() not in functions:
                return sqlite3.SQLITE_DENY
            return sqlite3.SQLITE_OK if action in allowed else sqlite3.SQLITE_DENY

        conn.set_authorizer(authorizer)
        start = time.monotonic()
        ticks = 0

        def progress():
            nonlocal ticks
            ticks += 1
            return int(ticks > 10000 or time.monotonic() - start > 2)

        conn.set_progress_handler(progress, 1000)
        cursor = conn.execute(sql)
        rows = cursor.fetchmany(201)
        return {
            "mode": "sample",
            "dataset": "synthetic-store-v1",
            "sql": sql,
            "columns": [c[0] for c in cursor.description],
            "rows": rows[:200],
            "truncated": len(rows) > 200,
            "counts": counts,
            "max_rows": 200,
        }
    except sqlite3.Error as e:
        raise ValueError("SQL 执行失败：" + str(e)) from e
    finally:
        conn.close()


def dispatch(route, body):
    if route != "/api/query":
        raise KeyError(route)
    sql = body.get("sql")
    if sql is None:
        catalog = json.loads((WEB / "queries.json").read_text(encoding="utf-8"))
        matches = [q for q in catalog if q["question"] == body.get("question")]
        if not matches:
            raise ValueError("样例模式只支持目录中的固定问题；可直接提供 sql")
        sql = matches[0]["sql"]
    return query(sql)
