/* sql.js executes in an isolated worker; the caller terminates slow queries. */
importScripts("vendor/sql-wasm.js");
const ready = initSqlJs({ locateFile: (file) => "vendor/" + file });
self.onmessage = async ({ data }) => {
  let db;
  try {
    const { seed, sql } = data;
    let query = String(sql).trim().replace(/;$/, "").trim();
    if (
      !query ||
      query.length > 10000 ||
      query.includes(";") ||
      !/^(SELECT|WITH)\b/i.test(query)
    )
      throw Error("仅支持单条 SELECT / WITH 查询");
    if (
      /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|DETACH|PRAGMA|REPLACE|VACUUM|REINDEX|LOAD_EXTENSION)\b/i.test(
        query,
      )
    )
      throw Error("查询包含不支持的操作");
    const SQL = await ready;
    db = new SQL.Database();
    db.run(seed);
    const counts = db.exec(
      "SELECT (SELECT COUNT(*) FROM orders),(SELECT COUNT(*) FROM clean_orders),(SELECT COUNT(*) FROM flagged_orders WHERE issue IS NOT NULL)",
    )[0].values[0];
    db.run("PRAGMA query_only=ON");
    const stmt = db.prepare(query),
      rows = [];
    let columns = [];
    try {
      columns = stmt.getColumnNames();
      while (rows.length < 201 && stmt.step()) rows.push(stmt.get());
    } finally {
      stmt.free();
    }
    postMessage({
      ok: true,
      result: {
        mode: "sample",
        dataset: "synthetic-store-v1",
        sql: query,
        columns,
        rows: rows.slice(0, 200),
        truncated: rows.length > 200,
        counts: { raw: counts[0], clean: counts[1], excluded: counts[2] },
        max_rows: 200,
      },
    });
  } catch (e) {
    postMessage({ ok: false, error: e.message });
  } finally {
    if (db) db.close();
  }
};
