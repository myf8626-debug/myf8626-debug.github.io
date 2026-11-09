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
import { analyze } from "./core.js";
let dataset, result;
const names = {
  traceable: "可回溯",
  conflict: "来源冲突",
  missing: "缺少依据",
  mismatch: "引文不匹配",
  unsupported: "字段不支持",
};
$("#controls").innerHTML =
  `<h2>调研资料</h2><label class="field"><span>资料包</span><select id="scenario"><option value="sample">栖木科技 · AI 产品实习（模拟）</option><option value="clean">只看已核对来源</option></select></label><p class="small">样例包括岗位页、团队介绍和招聘转载页。字段由人工录入，核验过程不使用模型。</p><button id="run" class="primary" style="margin-top:20px">核对结论与证据</button><label class="field" style="margin-top:24px"><span>导入自己的资料包（JSON）</span><input id="upload" type="file" accept=".json,application/json"></label><button id="sample" class="text-button">下载样例格式</button><label class="field" style="margin-top:20px"><span>查看状态</span><select id="filter"><option value="all">全部结论</option><option value="traceable">可回溯</option><option value="conflict">来源冲突</option><option value="missing">缺少依据</option><option value="mismatch">引文不匹配</option><option value="unsupported">字段不支持</option></select></label>`;
$("#scope-note").textContent =
  "实现来源 ID、Unicode 字符位置、引文和人工结构化字段的校验，发现相同字段的冲突。可导入资料包、按状态筛选并导出结果。尚未联网调研，也未进行语义蕴含验证。";
function render() {
  const f = $("#filter").value;
  $("#result-title").textContent = result.company;
  $("#result-note").textContent =
    "逐条展开原文；“可回溯”只表示引用与人工字段匹配。";
  const c = result.counts;
  $("#output").innerHTML =
    metrics([
      [result.claims.length, "条待核对结论"],
      [c.traceable, "条可回溯"],
      [c.conflict, "条来源冲突"],
      [c.missing + c.mismatch + c.unsupported, "条依据异常"],
    ]) +
    result.claims
      .filter((x) => f === "all" || x.status === f)
      .map(
        (x) =>
          `<article class="item"><div class="item-top"><h3>${esc(x.text)}</h3><span class="badge ${x.status === "traceable" ? "match" : "conflict"}">${names[x.status]}</span></div><p class="small">字段：${esc(x.field)} · 待核对值：${esc(x.value)}</p><details ${x.status === "conflict" ? "open" : ""}><summary>查看 ${x.evidence.length} 条引用${x.conflicts.length ? "与来源冲突" : ""}</summary>${x.evidence.length ? x.evidence.map((r) => `<blockquote>${esc(r.quote)}</blockquote><p class="source">${esc(r.title)} · ${esc(r.date)} · 字符 [${r.start}, ${r.end}) · ${r.quote_match ? "原文位置匹配" : "原文位置不匹配"}</p>`).join("") : "<p>没有绑定来源，不能据此形成结论。</p>"}${x.conflicts.length ? "<p><strong>同一字段存在不同说法，保留冲突，不自动挑选结论。</strong></p>" + x.conflicts.map((r) => `<blockquote>${esc(r.text)}</blockquote><p class="source">${esc(r.title)} · 值：${esc(r.value)}</p>`).join("") : ""}</details></article>`,
      )
      .join("");
}
function run() {
  try {
    error("");
    let input = structuredClone(dataset);
    if ($("#scenario").value === "clean") {
      input.sources = input.sources.filter((s) => s.id !== "S3");
      input.claims = input.claims.filter(
        (c) =>
          c.evidence.length && c.evidence.every((r) => r.source_id !== "S3"),
      );
    }
    result = analyze(input);
    render();
  } catch (e) {
    error(e.message);
  }
}
$("#run").onclick = run;
$("#filter").onchange = () => result && render();
$("#scenario").onchange = run;
$("#upload").onchange = async (e) => {
  try {
    const next = await readJSON(e.target.files[0]);
    analyze(next);
    dataset = next;
    $("#scenario").value = "sample";
    run();
  } catch (e) {
    error(e.message);
  }
};
$("#sample").onclick = async () =>
  download(
    "job-evidence-sample.json",
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
