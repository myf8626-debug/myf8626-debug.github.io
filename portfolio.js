(() => {
  const modal = document.querySelector("#image-viewer");
  if (!modal || !modal.showModal) return;
  let previous;
  document.querySelectorAll("[data-image]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      previous = a;
      const img = a.querySelector("img");
      modal.querySelector("img").src = a.href;
      modal.querySelector("img").alt = img.alt;
      modal.querySelector("p").textContent = img.alt;
      modal.showModal();
    }),
  );
  modal.querySelector("button").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      const r = modal.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        modal.close();
    }
  });
  modal.addEventListener("close", () => previous?.focus());
})();
