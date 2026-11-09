const topics = {
  competition: ["竞赛", "比赛", "创新学分"],
  scholarship: ["奖学金", "综测"],
  internship: ["实习", "实践周"],
  graduation: ["毕业", "学分要求"],
};
function date(s) {
  if (
    typeof s !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    Number.isNaN(Date.parse(s)) ||
    new Date(s).toISOString().slice(0, 10) !== s
  )
    throw Error("无效日期");
}
export function validate(d) {
  if (!d || !Array.isArray(d.clauses) || d.clauses.length > 100)
    throw Error("需要最多 100 项的 clauses 数组");
  const ids = new Set();
  for (const c of d.clauses) {
    if (
      !c ||
      [
        "id",
        "document",
        "section",
        "topic",
        "text",
        "value",
        "effective_from",
        "effective_to",
      ].some((k) => typeof c[k] !== "string" || !c[k])
    )
      throw Error("条款字段缺失");
    if (ids.has(c.id)) throw Error("条款 ID 重复");
    ids.add(c.id);
    if (!Object.hasOwn(topics, c.topic)) throw Error("未知条款主题");
    if ([...c.text].length > 5000) throw Error("条款正文过长");
    date(c.effective_from);
    date(c.effective_to);
    if (c.effective_from >= c.effective_to) throw Error("生效起止范围不正确");
    if (
      !Array.isArray(c.cohorts) ||
      !c.cohorts.length ||
      c.cohorts.some((y) => !Number.isInteger(y))
    )
      throw Error("cohorts 必须是入学年份数组");
  }
}
export function answer(d, query, cohort, as_of) {
  validate(d);
  if (typeof query !== "string" || !query.trim() || [...query].length > 500)
    throw Error("问题须为 1..500 字符");
  if (!Number.isInteger(cohort) || cohort < 2000 || cohort > 2100)
    throw Error("入学年份不正确");
  date(as_of);
  const ts = Object.entries(topics)
    .filter(([, words]) => words.some((w) => query.includes(w)))
    .map(([t]) => t);
  const base = { mode: "sample", query, cohort, as_of };
  if (ts.length !== 1)
    return {
      ...base,
      status: "abstain",
      answer: "请一次询问一个已支持主题：竞赛、奖学金、实习或毕业要求。",
      clauses: [],
      excluded: [],
    };
  const clauses = [],
    excluded = [];
  for (const c of d.clauses.filter((c) => c.topic === ts[0])) {
    const reasons = [];
    if (!c.cohorts.includes(cohort)) reasons.push("不适用该入学年级");
    if (as_of < c.effective_from) reasons.push("尚未生效");
    if (as_of >= c.effective_to) reasons.push("已失效");
    if (reasons.length) excluded.push({ ...c, reason: reasons.join("；") });
    else clauses.push(c);
  }
  const status = !clauses.length
    ? "abstain"
    : new Set(clauses.map((c) => c.value)).size > 1
      ? "conflict"
      : "answered";
  return {
    ...base,
    topic: ts[0],
    status,
    answer:
      status === "answered"
        ? clauses[0].text
        : status === "conflict"
          ? "适用范围内存在相互冲突的条款，需要核对原文件或咨询发布方。"
          : "当前资料中没有适用条款，无法给出结论。",
    clauses,
    excluded,
  };
}
