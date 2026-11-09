import { resolveNavigation } from "./common.js";
resolveNavigation();
import {
  $,
  esc,
  error,
  download,
  metrics,
  loadJSON,
  readJSON,
  bindExport,
} from "./common.js";
import { answer, validate } from "./core.js";
let dataset, result;
$("#controls").innerHTML =
  `<h2>确认适用范围</h2><label class="field"><span>问题</span><textarea id="query">竞赛获奖可以认定多少创新学分？</textarea></label><label class="field"><span>入学年级</span><select id="cohort"><option>2024</option><option>2025</option><option>2026</option><option>2023</option></select></label><label class="field"><span>查询日期</span><input id="date" type="date" value="2026-11-09"></label><button class="primary" id="run">检索适用条款</button><p class="help">仅支持竞赛、奖学金、实习、毕业四个主题的关键词检索。</p><div style="margin-top:16px"><button class="text-button" data-question="奖学金申请需要什么条件？">试试：奖学金条件</button><br><button class="text-button" data-question="实习需要完成几周？">试试：冲突条款</button><br><button class="text-button" data-question="宿舍可以养宠物吗？">试试：没有依据</button></div><label class="field" style="margin-top:20px"><span>导入结构化条款（JSON）</span><input id="upload" type="file" accept=".json,application/json"></label><button id="sample" class="text-button">下载样例格式</button>`;
$("#scope-note").textContent =
  "支持四类主题的关键词检索、年级与有效期过滤、冲突检查、无依据拒答及条款导出。所有文件和条款均为模拟材料，不代表任何学校规定。尚未实现 PDF 解析、向量检索或知识图谱推理。";
function citation(c) {
  return `<blockquote>${esc(c.text)}</blockquote><p class="source">${esc(c.document)} · ${esc(c.section)} · ${esc(c.id)}</p><p class="source">适用：${c.cohorts.map(esc).join(" / ")} 级 · 有效期 [${esc(c.effective_from)}, ${esc(c.effective_to)})</p>`;
}
function run() {
  try {
    error("");
    result = answer(
      dataset,
      $("#query").value,
      Number($("#cohort").value),
      $("#date").value,
    );
    const states = {
      answered: "找到适用条款",
      conflict: "条款存在冲突",
      abstain: "没有足够依据",
    };
    $("#result-title").textContent = states[result.status];
    $("#result-note").textContent =
      `${result.cohort} 级 · 截至 ${result.as_of} · 人工结构化样例库`;
    $("#output").innerHTML =
      metrics([
        [dataset.clauses.length, "条样例条款"],
        [result.clauses.length, "条适用依据"],
        [result.excluded.length, "条因范围排除"],
      ]) +
      `<article class="item"><span class="badge ${result.status === "answered" ? "match" : "conflict"}">${states[result.status]}</span><h3 style="margin-top:16px">${esc(result.answer)}</h3><div class="graph" aria-label="依据路径"><span class="node">${result.cohort} 级 / ${esc(result.as_of)}</span><span class="connector"></span><span class="node">范围与日期过滤</span><span class="connector"></span><span class="node">${result.clauses.length} 条依据</span></div></article>` +
      result.clauses
        .map(
          (c) =>
            `<article class="item"><h3>${esc(c.document)}</h3>${citation(c)}</article>`,
        )
        .join("") +
      (result.excluded.length
        ? `<details><summary>为什么排除了其他 ${result.excluded.length} 条？</summary>${result.excluded.map((c) => `<article class="item"><span class="badge">${esc(c.reason)}</span>${citation(c)}</article>`).join("")}</details>`
        : "");
  } catch (e) {
    error(e.message);
  }
}
$("#run").onclick = run;
document.querySelectorAll("[data-question]").forEach(
  (b) =>
    (b.onclick = () => {
      $("#query").value = b.dataset.question;
      run();
    }),
);
$("#upload").onchange = async (e) => {
  try {
    const next = await readJSON(e.target.files[0]);
    validate(next);
    dataset = next;
    run();
  } catch (e) {
    error(e.message);
  }
};
$("#sample").onclick = async () =>
  download(
    "policy-evidence-sample.json",
    JSON.stringify(await loadJSON("sample.json"), null, 2),
  );
bindExport(() => result);
try {
  dataset = await loadJSON("sample.json");
  run();
} catch (e) {
  error(e.message);
  $("#output").textContent = "样例加载失败，请刷新重试。";
}
