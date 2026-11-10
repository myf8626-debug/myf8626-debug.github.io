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
let catalog, seed, result, selected, modelRecord;
$("#controls").innerHTML =
  `<h2>选择业务问题</h2><label class="field"><span>固定问题目录（非 AI 生成）</span><select id="question"></select></label><p id="definition" class="small"></p><button class="primary" id="run" style="margin-top:20px">执行 SQL 查询</button><p class="help">浏览器中运行 SQLite。仅查询，最多返回 200 行；超过 5 秒终止。</p><details><summary>查看数据结构</summary><p class="small">stores：门店、城市<br>products：商品、类别、单价<br>orders：原始订单<br>refunds：退款明细<br>clean_orders：规则清洗后的视图</p></details><button id="data" class="text-button">下载模拟数据与建表 SQL</button><button id="csv" class="text-button">导出当前结果 CSV</button>`;
$("#scope-note").textContent =
  "真实执行 SQLite：订单去重、缺失与关联检查、四表关联、退款预聚合、LAG 环比、类别占比、探索性统计偏离检查。仅使用 20 行人工构造订单，不代表业务成效。本机服务可选接入真实模型生成 SQL；模型输出仍经过只读执行边界。线上静态页面只提供固定样例。";
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
    result = null; modelRecord = null;
    $("#result").textContent = "正在查询…";
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
bindExport(() => modelRecord || result);
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

// Model credentials remain on the local server; never enter them in this page.
if (["127.0.0.1", "localhost"].includes(location.hostname)) {
  $("#controls").insertAdjacentHTML("beforeend", `<hr><h2>本地模型查询</h2><label class="field"><span>业务问题</span><textarea id="model-question" maxlength="2000" placeholder="有效订单扣除退款后的净额是多少？"></textarea></label><button class="primary" id="model-run" disabled>检查本地服务…</button><p id="model-state" class="help" role="status">仅发送问题和模拟表结构，密钥在服务端配置。</p>`);
  const button = $("#model-run");
  try {
    const response = await fetch("/api/health");
    const health = await response.json();
    button.disabled = !health.model_configured;
    button.textContent = "生成并执行 SQL";
    $("#model-state").textContent = health.model_configured ? "模型已配置；点击才调用。解释由模型生成，结果由 SQLite 计算。" : "尚未配置模型环境变量；固定样例可照常使用。";
  } catch { button.textContent = "本地模型服务未启动"; }
  button.onclick = async () => {
    const question = $("#model-question").value.trim();
    if (!question) { error("请先填写业务问题。"); return; }
    button.disabled = true; $("#run").disabled = true; $("#question").disabled = true;
    result = null; modelRecord = null; error("");
    $("#result").textContent = "正在生成 SQL 并检查执行边界…";
    $("#sql").value = "";
    try {
      const response = await fetch("/api/model", {method:"POST", headers:{"Content-Type":"application/json"},body:JSON.stringify({question}),signal:AbortSignal.timeout(55000)});
      const output = await response.json();
      if (!response.ok) throw Error(output.error || "模型请求失败");
      modelRecord = output;
      $("#result-title").textContent = output.refused ? "当前问题无法回答" : "模型 SQL 与计算结果";
      $("#result-note").textContent = "模型说明（需核对）：" + output.draft.explanation;
      $("#sql").value = output.draft.sql || "";
      result = output.result || null;
      $("#result").innerHTML = output.refused ? '<p class="empty">未执行查询。请查看上方说明或调整问题。</p>' : table(result) + (result.truncated ? '<p>仅显示前 200 行。</p>' : '');
    } catch (e) {
      $("#result").textContent = "本次请求失败，未展示旧结果或样例替代答案。";
      error(e.message);
    } finally {
      button.disabled = false; $("#run").disabled = false; $("#question").disabled = false;
    }
  };
}
