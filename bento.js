/* Interaction adapter for the MIT Vighnesh Portfolio template; native dialog, no runtime dependencies. */
(() => {
  const root = document.documentElement;
  const toggle = document.querySelector(".theme-toggle");
  const meta = document.querySelector('meta[name="theme-color"]');
  function syncTheme() {
    const dark = root.classList.contains("dark");
    toggle.setAttribute(
      "aria-label",
      dark ? "切换为浅色主题" : "切换为深色主题",
    );
    meta.content = dark ? "#171e31" : "#eef1f9";
  }
  toggle.hidden = false;
  toggle.addEventListener("click", () => {
    root.classList.toggle("dark");
    try {
      localStorage.setItem(
        "portfolio-theme",
        root.classList.contains("dark") ? "dark" : "light",
      );
    } catch {}
    syncTheme();
  });
  syncTheme();
  const dialog = document.getElementById("detail-dialog");
  if (!dialog.showModal) return;
  const content = document.getElementById("dialog-content");
  const title = document.getElementById("dialog-title");
  const titles = {
    "case-resume": "Resume Protocol",
    "case-thesis": "论文模板保护工具",
    "case-cloud": "云栈 · 智能云盘",
    resume: "教育、能力与获奖",
    contact: "关于与联系",
  };
  const aliases = {};
  let previousFocus = null;
  let currentKey = null;
  function renderRoute() {
    let key;
    try {
      key = decodeURIComponent(location.hash.slice(1));
    } catch {
      return;
    }
    key = aliases[key] || key;
    const template =
      Object.hasOwn(titles, key) && document.getElementById("detail-" + key);
    if (!template) {
      if (dialog.open) dialog.close();
      return;
    }
    if (dialog.open && currentKey === key) return;
    if (!dialog.open) previousFocus = document.activeElement;
    const fragment = template.content.cloneNode(true);
    fragment.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    fragment.querySelectorAll("details").forEach((el) => {
      el.open = true;
    });
    title.textContent = titles[key];
    content.replaceChildren(fragment);
    currentKey = key;
    root.classList.add("modal-open");
    if (!dialog.open) dialog.showModal();
    content.scrollTop = 0;
    dialog.querySelector(".close-dialog").focus();
  }
  function closeRoute() {
    if (history.state?.portfolioModal) history.back();
    else {
      history.replaceState(
        history.state,
        "",
        location.pathname + location.search,
      );
      renderRoute();
    }
  }
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-modal]");
    if (
      !link ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    if (!Object.hasOwn(titles, link.dataset.modal)) return;
    event.preventDefault();
    history.pushState({ portfolioModal: true }, "", "#" + link.dataset.modal);
    renderRoute();
  });
  dialog.querySelector(".close-dialog").addEventListener("click", closeRoute);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeRoute();
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      closeRoute();
  });
  dialog.addEventListener("close", () => {
    root.classList.remove("modal-open");
    currentKey = null;
    if (previousFocus?.isConnected)
      previousFocus.focus({ preventScroll: true });
  });
  addEventListener("popstate", renderRoute);
  addEventListener("hashchange", renderRoute);
  renderRoute();
})();
