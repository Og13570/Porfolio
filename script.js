// Cursor-follow project preview on the work list.
// Replace the CSS gradient swatches in styles.css with real project images
// (e.g. background-image: url('assets/project-1.jpg')) when ready.

const preview = document.querySelector(".cursor-preview");
const rows = document.querySelectorAll(".work-row");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (preview && rows.length && !prefersReducedMotion && window.matchMedia("(hover: hover)").matches) {
  rows.forEach((row) => {
    row.addEventListener("mouseenter", () => {
      preview.dataset.swatch = row.dataset.swatch;
      preview.classList.add("visible");
    });
    row.addEventListener("mouseleave", () => {
      preview.classList.remove("visible");
    });
  });

  window.addEventListener("mousemove", (e) => {
    preview.style.left = `${e.clientX}px`;
    preview.style.top = `${e.clientY}px`;
  });
}
