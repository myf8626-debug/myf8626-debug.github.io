(() => {
  const projects = [...document.querySelectorAll(".project")];
  const filters = [...document.querySelectorAll("[data-filter]")];
  const count = document.getElementById("project-count");
  const group = document.querySelector(".filters");
  function filter(kind) {
    projects.forEach((project) => {
      project.hidden = kind !== "all" && project.dataset.kind !== kind;
    });
    filters.forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.filter === kind),
      ),
    );
    if (count) count.textContent =
      projects.filter((project) => !project.hidden).length + " 项作品";
  }
  if (group) group.hidden = false;
  filters.forEach((button) =>
    button.addEventListener("click", () => filter(button.dataset.filter)),
  );
  function revealHash() {
    let id;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch {
      return;
    }
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    const project = target.closest(".project");
    if (project?.hidden) filter("all");
    const detail = target.closest("details");
    if (detail) detail.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
  }
  addEventListener("hashchange", revealHash);
  document.addEventListener("click", (event) => {
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor && anchor.getAttribute("href") === location.hash) revealHash();
  });
  revealHash();
  const links = [...document.querySelectorAll("nav a")];
  const sections = links
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            links.forEach((link) => {
              if (link.hash === "#" + entry.target.id)
                link.setAttribute("aria-current", "location");
              else link.removeAttribute("aria-current");
            });
          }
      },
      { rootMargin: "-15% 0px -65% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
  }
  let printState;
  addEventListener("beforeprint", () => {
    printState = {
      kind:
        filters.find((b) => b.getAttribute("aria-pressed") === "true")?.dataset
          .filter || "all",
      open: [...document.querySelectorAll("details")].map((d) => d.open),
    };
    filter("all");
    document.querySelectorAll("details").forEach((d) => {
      d.open = true;
    });
  });
  addEventListener("afterprint", () => {
    if (!printState) return;
    filter(printState.kind);
    document.querySelectorAll("details").forEach((d, i) => {
      d.open = printState.open[i];
    });
    printState = null;
  });
})();
