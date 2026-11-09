export const $ = (s) => document.querySelector(s);
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function error(message) {
  $("#error").textContent = message;
}
export function download(name, text, type = "application/json") {
  const u = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export function metrics(items) {
  return (
    '<div class="summary">' +
    items
      .map(
        ([n, label]) =>
          `<div class="metric"><strong>${esc(n)}</strong><span>${esc(label)}</span></div>`,
      )
      .join("") +
    "</div>"
  );
}
export async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw Error("无法读取样例文件");
  return r.json();
}
export async function readJSON(file) {
  if (!file) throw Error("请选择 JSON 文件");
  if (file.size > 200000) throw Error("文件不能超过 200 KB");
  return JSON.parse(await file.text());
}
export function table(result) {
  return (
    '<div class="table-wrap"><table><thead><tr>' +
    result.columns.map((x) => `<th>${esc(x)}</th>`).join("") +
    "</tr></thead><tbody>" +
    result.rows
      .map(
        (row) =>
          "<tr>" + row.map((v) => `<td>${esc(v)}</td>`).join("") + "</tr>",
      )
      .join("") +
    "</tbody></table></div>"
  );
}
export function bindExport(get) {
  $("#export").addEventListener("click", () => {
    const result = get();
    if (result)
      download("evidence-report.json", JSON.stringify(result, null, 2));
  });
}

export function resolveNavigation() {
  if (!location.pathname.includes("/labs/"))
    document.querySelectorAll(".navlinks a").forEach((a) => {
      if (a.getAttribute("aria-current") === "page") a.href = "./";
      else
        a.href =
          "https://myf8626-debug.github.io/labs/" +
          a.getAttribute("href").split("/")[1] +
          "/";
    });
}
