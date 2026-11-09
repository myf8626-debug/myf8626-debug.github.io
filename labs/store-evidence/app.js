import { resolveNavigation } from "./common.js";
resolveNavigation();
import {
  $,
  esc,
  error,
  download,
  metrics,
  loadJSON,
  table,
  bindExport,
} from "./common.js";
let catalog, seed, result, selected;
$("#controls").innerHTML =
  `<h2>选择业务问题</h2><label class="field"><span>固定问题目录（非 AI 生成）</span><select id="question"></select></label><p id="definition" class="small"></p><button class="primary" id="run" style="margin-top:20px">执行 SQL 查询</button><p class="help">浏览器中运行 SQLite。仅查询，最多返回 200 行；超过 5 秒终止。</p><details><summary>查看数据结构</summary><p class="small">stores：门店、城市<br>products：商品、类别、单价<br>orders：原始订单<br>refunds：退款明细<br>clean_orders：规则清洗后的视图</p></details><button id="data" class="text-button">下载模拟数据与建表 SQL</button><button id="csv" class="text-button">导出当前结果 CSV</button>`;
$("#scope-note").textContent =
  "真实执行 SQLite：订单去重、缺失与关联检查、四表关联、退款预聚合、LAG 环比、类别占比、探索性统计偏离检查。仅使用 20 行人工构造订单，不代表业务成效。自然语言转 SQL 模型尚未接入。";
$("#output").innerHTML =
  '<label class="field"><span>可编辑 SQL</span><textarea id="sql" class="sql" spellcheck="false"></textarea></label><div id="result"></div>';
function choose() {
  selected = catalog.find((q) => q.id === $("#question").value);
  $("#definition").textContent = selected.description;
  $("#sql").value = selected.sql;
}
function execute(sql) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("sql-worker.js");
    const timer = setTimeout(() => {
      worker.terminate();
      reject(Error("查询超过 5 秒，已终止；请缩小查询范围。"));
    }, 5000);
    function end() {
      clearTimeout(timer);
      worker.terminate();
    }
    worker.onmessage = (e) => {
      end();
      e.data.ok ? resolve(e.data.result) : reject(Error(e.data.error));
    };
    worker.onerror = () => {
      end();
      reject(Error("SQLite 加载失败，请刷新重试。"));
    };
    worker.postMessage({ seed, sql });
  });
}
function chart(r) {
  if (
    !selected?.chart ||
    r.sql !== selected.sql.trim().replace(/;$/, "").trim()
  )
    return "";
  const index = r.columns.indexOf(selected.chart);
  if (index < 0 || !r.rows.length) return "";
  const max = Math.max(
    ...r.rows.map((row) => Math.abs(Number(row[index]) || 0)),
    1,
  );
  return (
    `<p class="small" style="margin-top:20px">${esc(selected.chart)}</p><div class="bars">` +
    r.rows
      .map(
        (row) =>
          `<div class="bar-row"><span>${esc(row[0])}${r.columns.includes("月份") ? " / " + esc(row[1]) : ""}</span><div class="bar-track"><div class="bar-fill" style="width:${(Math.abs(Number(row[index]) || 0) / max) * 100}%"></div></div><span class="bar-value">${esc(row[index])}</span></div>`,
      )
      .join("") +
    "</div>"
  );
}
async function run() {
  const b = $("#run");
  b.disabled = true;
  b.textContent = "正在执行…";
  try {
    error("");
    result = await execute($("#sql").value);
    $("#result-title").textContent = "SQL 与计算结果";
    $("#result-note").textContent =
      "结果来自当前 SQL 的实际执行；可以修改后重新运行。";
    $("#result").innerHTML =
      metrics([
        [result.counts.raw, "行原始订单"],
        [result.counts.clean, "行有效订单"],
        [result.counts.excluded, "行隔离记录"],
        [result.rows.length, "行查询结果"],
      ]) +
      chart(result) +
      (result.rows.length
        ? table(result)
        : '<p class="empty">当前查询没有匹配记录。没有统计信号，不等于不存在业务问题。</p>') +
      (result.truncated
        ? '<p class="small">结果已截断，仅显示前 200 行。</p>'
        : "");
  } catch (e) {
    error(e.message);
  } finally {
    b.disabled = false;
    b.textContent = "执行 SQL 查询";
  }
}
$("#run").onclick = run;
$("#question").onchange = () => {
  choose();
  run();
};
$("#data").onclick = () => download("synthetic-store.sql", seed, "text/plain");
$("#csv").onclick = () => {
  if (!result) return;
  const cell = (v) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  download(
    "query-result.csv",
    "\ufeff" +
      [result.columns, ...result.rows]
        .map((row) => row.map(cell).join(","))
        .join("\r\n"),
    "text/csv;charset=utf-8",
  );
};
bindExport(() => result);
try {
  catalog = await loadJSON("queries.json");
  const r = await fetch("seed.sql");
  if (!r.ok) throw Error("数据加载失败");
  seed = await r.text();
  $("#question").innerHTML = catalog
    .map((q) => `<option value="${esc(q.id)}">${esc(q.question)}</option>`)
    .join("");
  choose();
  await run();
} catch (e) {
  error(e.message);
}
