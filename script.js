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

// ---------------------------------------------------------------------
// Field study — a small generative, cursor-reactive particle field.
// Plain canvas, no dependencies. Particles drift on their own and ease
// toward the pointer when it's nearby; nearby particles are connected
// with faint lines, like a constellation forming and dissolving.
// ---------------------------------------------------------------------
(function initFieldStudy() {
  const canvas = document.getElementById("field-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const INK_BG = "#16150F";
  const DOT_COLOR = "rgba(231, 228, 220, 0.85)";   // paper-tinted dot
  const LINE_COLOR = "42, 62, 255";                 // accent (cobalt) as rgb triplet
  const POINTER_RADIUS = 160;
  const LINK_DISTANCE = 110;

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let particles = [];
  let pointer = { x: null, y: null, active: false };
  let rafId = null;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedParticles();
  }

  function seedParticles() {
    const count = Math.max(40, Math.round((width * height) / 9000));
    particles = new Array(count).fill(0).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.4 + 0.8,
    }));
  }

  function step() {
    ctx.fillStyle = INK_BG;
    ctx.fillRect(0, 0, width, height);

    // update + draw particles
    for (const p of particles) {
      // gentle pull toward pointer if within range
      if (pointer.active) {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < POINTER_RADIUS && dist > 0.001) {
          const pull = (1 - dist / POINTER_RADIUS) * 0.03;
          p.vx += (dx / dist) * pull;
          p.vy += (dy / dist) * pull;
        }
      }

      p.x += p.vx;
      p.y += p.vy;

      // gentle drag so speed doesn't accumulate forever
      p.vx *= 0.985;
      p.vy *= 0.985;

      // wrap around edges
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = DOT_COLOR;
      ctx.fill();
    }

    // connecting lines between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < LINK_DISTANCE) {
          const alpha = (1 - dist / LINK_DISTANCE) * 0.5;
          ctx.strokeStyle = `rgba(${LINE_COLOR}, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // draw a soft marker at the pointer itself
    if (pointer.active) {
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(199, 205, 255, 0.9)";
      ctx.fill();
    }

    if (!reduceMotion) {
      rafId = requestAnimationFrame(step);
    }
  }

  function setPointerFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    pointer.x = clientX - rect.left;
    pointer.y = clientY - rect.top;
    pointer.active = true;
    if (reduceMotion) step(); // redraw a single frame on interaction
  }

  function clearPointer() {
    pointer.active = false;
    if (reduceMotion) step();
  }

  canvas.addEventListener("mousemove", setPointerFromEvent);
  canvas.addEventListener("mouseleave", clearPointer);
  canvas.addEventListener("touchmove", (e) => {
    setPointerFromEvent(e);
    e.preventDefault(); // avoid page scroll while dragging inside the canvas
  }, { passive: false });
  canvas.addEventListener("touchend", clearPointer);

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (rafId) cancelAnimationFrame(rafId);
      resize();
      step();
    }, 150);
  });

  resize();
  step();
})();
