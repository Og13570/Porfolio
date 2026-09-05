const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------------
// Hero glitch burst — plays once shortly after load, and again on hover
// (handled by :hover in CSS). This function just triggers the load burst.
// ---------------------------------------------------------------------
(function initGlitchBurst() {
  const glitchEl = document.querySelector(".hero-name.glitch");
  if (!glitchEl || reduceMotion) return;

  setTimeout(() => {
    glitchEl.classList.add("glitch-run");
    setTimeout(() => glitchEl.classList.remove("glitch-run"), 700);
  }, 300);
})();

// ---------------------------------------------------------------------
// Scramble-text hover effect for nav links, project titles, etc.
// Cycles through random characters before settling back on the real text.
// ---------------------------------------------------------------------
(function initScrambleText() {
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/\\<>";
  const targets = document.querySelectorAll("[data-scramble]");
  if (!targets.length || reduceMotion) return;

  targets.forEach((el) => {
    const original = el.textContent;
    let frame = null;
    let frameCount = 0;
    const totalFrames = 14;

    function animate() {
      let output = "";
      for (let i = 0; i < original.length; i++) {
        const char = original[i];
        if (char === " ") {
          output += " ";
          continue;
        }
        const revealPoint = (i / original.length) * totalFrames;
        if (frameCount >= revealPoint + totalFrames * 0.35) {
          output += char;
        } else {
          output += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }
      el.textContent = output;
      frameCount++;
      if (frameCount <= totalFrames) {
        frame = requestAnimationFrame(animate);
      } else {
        el.textContent = original;
      }
    }

    el.addEventListener("mouseenter", () => {
      if (frame) cancelAnimationFrame(frame);
      frameCount = 0;
      animate();
    });

    el.addEventListener("mouseleave", () => {
      if (frame) cancelAnimationFrame(frame);
      el.textContent = original;
    });
  });
})();

// ---------------------------------------------------------------------
// Shared particle-field renderer used by both the ambient background
// canvas and the dedicated, interactive "Field study" section.
// ---------------------------------------------------------------------
function createParticleField(canvas, options) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const {
    bgColor,
    dotColor,
    lineColorRgb,
    pointerRadius = 0,      // 0 disables pointer interaction
    linkDistance = 110,
    density = 9000,         // lower = more particles
    interactive = false,
    fixedToViewport = false,
  } = options;

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let particles = [];
  let pointer = { x: null, y: null, active: false };
  let rafId = null;

  function resize() {
    if (fixedToViewport) {
      width = window.innerWidth;
      height = window.innerHeight;
    } else {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    }
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedParticles();
  }

  function seedParticles() {
    const count = Math.max(30, Math.round((width * height) / density));
    particles = new Array(count).fill(0).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      r: Math.random() * 1.3 + 0.6,
    }));
  }

  function step() {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    for (const p of particles) {
      if (interactive && pointer.active && pointerRadius > 0) {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < pointerRadius && dist > 0.001) {
          const pull = (1 - dist / pointerRadius) * 0.03;
          p.vx += (dx / dist) * pull;
          p.vy += (dy / dist) * pull;
        }
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.985;
      p.vy *= 0.985;

      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < linkDistance) {
          const alpha = (1 - dist / linkDistance) * 0.5;
          ctx.strokeStyle = `rgba(${lineColorRgb}, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    if (interactive && pointer.active) {
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${lineColorRgb}, 0.9)`;
      ctx.fill();
    }

    if (!reduceMotion) {
      rafId = requestAnimationFrame(step);
    }
  }

  if (interactive) {
    function setPointerFromEvent(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      pointer.x = clientX - rect.left;
      pointer.y = clientY - rect.top;
      pointer.active = true;
      if (reduceMotion) step();
    }
    function clearPointer() {
      pointer.active = false;
      if (reduceMotion) step();
    }
    canvas.addEventListener("mousemove", setPointerFromEvent);
    canvas.addEventListener("mouseleave", clearPointer);
    canvas.addEventListener("touchmove", (e) => {
      setPointerFromEvent(e);
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener("touchend", clearPointer);
  }

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
}

// Ambient full-page background field — sparse, slow, non-interactive.
createParticleField(document.getElementById("ambient-canvas"), {
  bgColor: "#05070A",
  dotColor: "rgba(126, 147, 163, 0.55)",
  lineColorRgb: "79, 232, 255",
  density: 22000,
  linkDistance: 130,
  interactive: false,
  fixedToViewport: true,
});

// Field study — dense, interactive, the featured showpiece.
createParticleField(document.getElementById("field-canvas"), {
  bgColor: "#0D1319",
  dotColor: "rgba(234, 243, 250, 0.85)",
  lineColorRgb: "79, 232, 255",
  density: 9000,
  linkDistance: 110,
  pointerRadius: 160,
  interactive: true,
  fixedToViewport: false,
});
