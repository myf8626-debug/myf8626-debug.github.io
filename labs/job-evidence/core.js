export function validate(d) {
  if (!d || !Array.isArray(d.sources) || !Array.isArray(d.claims))
    throw Error("需要 sources 和 claims 数组");
  if (d.sources.length > 40 || d.claims.length > 80)
    throw Error("最多 40 个来源、80 条结论");
  const ids = new Set();
  for (const s of d.sources) {
    if (
      !s ||
      ["id", "title", "text", "date"].some(
        (k) => typeof s[k] !== "string" || !s[k],
      )
    )
      throw Error("来源字段缺失");
    if (ids.has(s.id)) throw Error("来源 ID 重复");
    ids.add(s.id);
    if ([...s.text].length > 10000) throw Error("单个来源超过 10000 字符");
    if (
      !s.facts ||
      Array.isArray(s.facts) ||
      typeof s.facts !== "object" ||
      Object.values(s.facts).some((v) => typeof v !== "string")
    )
      throw Error("facts 必须是字符串映射");
  }
  ids.clear();
  for (const c of d.claims) {
    if (
      !c ||
      ["id", "text", "field", "value"].some(
        (k) => typeof c[k] !== "string" || !c[k],
      )
    )
      throw Error("结论字段缺失");
    if (ids.has(c.id)) throw Error("结论 ID 重复");
    ids.add(c.id);
    if (!Array.isArray(c.evidence) || c.evidence.length > 20)
      throw Error("evidence 必须是最多 20 项的数组");
    for (const r of c.evidence)
      if (
        !r ||
        typeof r.source_id !== "string" ||
        typeof r.quote !== "string" ||
        !Number.isInteger(r.start) ||
        !Number.isInteger(r.end)
      )
        throw Error("引文格式不正确");
  }
}
export function analyze(d) {
  validate(d);
  const sources = new Map(d.sources.map((s) => [s.id, s]));
  const claims = d.claims.map((c) => {
    const evidence = c.evidence.map((r) => {
      const s = sources.get(r.source_id),
        text = s ? [...s.text] : [];
      const quote_match = !!(
        s &&
        r.quote &&
        r.start >= 0 &&
        r.start < r.end &&
        r.end <= text.length &&
        text.slice(r.start, r.end).join("") === r.quote
      );
      return {
        ...r,
        title: s?.title || "来源不存在",
        date: s?.date || "",
        quote_match,
        field_match: !!(
          quote_match &&
          s.facts[c.field] === c.value &&
          r.quote.includes(c.value)
        ),
      };
    });
    const relevant = d.sources.filter((s) => Object.hasOwn(s.facts, c.field));
    const conflicts =
      new Set(relevant.map((s) => s.facts[c.field])).size > 1
        ? relevant.map((s) => ({
            source_id: s.id,
            title: s.title,
            value: s.facts[c.field],
            text: s.text,
          }))
        : [];
    const status =
      !evidence.length || evidence.some((r) => !sources.has(r.source_id))
        ? "missing"
        : evidence.some((r) => !r.quote_match)
          ? "mismatch"
          : evidence.some((r) => !r.field_match)
            ? "unsupported"
            : conflicts.length
              ? "conflict"
              : "traceable";
    return { ...c, status, evidence, conflicts };
  });
  const counts = Object.fromEntries(
    ["traceable", "conflict", "missing", "mismatch", "unsupported"].map((s) => [
      s,
      claims.filter((c) => c.status === s).length,
    ]),
  );
  return {
    mode: "sample",
    method: "exact_quote_and_manual_field_match",
    company: d.company || "自定义资料",
    claims,
    counts,
    source_count: sources.size,
    limitation:
      "引文匹配不等于事实真实性或语义蕴含已验证；facts 为人工结构化字段。",
  };
}
