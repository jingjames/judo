/* Judo / Studio — shared behaviour + generative artwork */

/* ---------- tiny utils ---------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let toastTimer;
function toast(message) {
  let el = $(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1900);
}

async function copyText(text, label = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  toast(label);
}

/* ---------- navigation ---------- */
function initNav() {
  const toggle = $(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }
  $$(".nav a").forEach((a) =>
    a.addEventListener("click", () => document.body.classList.remove("nav-open"))
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.body.classList.remove("nav-open");
  });
}

/* ---------- scroll reveal ---------- */
function initReveal() {
  const items = $$(".reveal");
  if (!items.length) return;
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const siblings = [...entry.target.parentElement.children].indexOf(entry.target);
        entry.target.style.transitionDelay = `${Math.min(siblings, 6) * 70}ms`;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  items.forEach((el) => io.observe(el));
}

/* ---------- seamless ticker ---------- */
function initTicker() {
  $$(".ticker-track").forEach((track) => {
    track.innerHTML += track.innerHTML;
  });
}

/* =========================================================
   Generative artwork — deterministic SVG per project
   ========================================================= */
const ART = {
  grid(rnd, [bg, a, b, c]) {
    const n = 5, cols = 5, rows = 5, s = 400 / cols;
    let out = `<rect width="400" height="300" fill="${bg}"/>`;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < n; x++) {
        if (rnd() > 0.62) continue;
        const col = [a, b, c][Math.floor(rnd() * 3)];
        const r = rnd();
        const px = x * s + s * 0.16, py = y * (300 / rows) + 8;
        const w = s * 0.68, h = (300 / rows) - 16;
        if (r < 0.34) out += `<circle cx="${px + w / 2}" cy="${py + h / 2}" r="${Math.min(w, h) / 2}" fill="${col}"/>`;
        else if (r < 0.68) out += `<rect x="${px}" y="${py}" width="${w}" height="${h}" rx="3" fill="${col}"/>`;
        else out += `<rect x="${px}" y="${py}" width="${w}" height="${h * (0.4 + rnd() * 0.6)}" rx="3" fill="${col}"/>`;
      }
    }
    return out;
  },
  orbit(rnd, [bg, a, b, c]) {
    let out = `<rect width="400" height="300" fill="${bg}"/><g fill="none" stroke="${a}" stroke-width="1.4">`;
    for (let i = 1; i <= 6; i++) out += `<circle cx="200" cy="150" r="${i * 24}" opacity="${0.9 - i * 0.1}"/>`;
    out += `</g>`;
    for (let i = 0; i < 26; i++) {
      const r = 24 + rnd() * 144, ang = rnd() * Math.PI * 2;
      out += `<circle cx="${200 + Math.cos(ang) * r}" cy="${150 + Math.sin(ang) * r}" r="${2 + rnd() * 6}" fill="${rnd() > 0.5 ? b : c}"/>`;
    }
    out += `<circle cx="200" cy="150" r="17" fill="${b}"/>`;
    return out;
  },
  bars(rnd, [bg, a, b, c]) {
    const cols = 16, w = 400 / cols;
    let out = `<rect width="400" height="300" fill="${bg}"/>`;
    for (let i = 0; i < cols; i++) {
      const h = 40 + rnd() * 230;
      const col = rnd() > 0.72 ? c : (rnd() > 0.4 ? a : b);
      out += `<rect x="${i * w + w * 0.2}" y="${300 - h}" width="${w * 0.6}" height="${h}" rx="${w * 0.3}" fill="${col}"/>`;
    }
    return out;
  },
  wave(rnd, [bg, a, b, c]) {
    let out = `<rect width="400" height="300" fill="${bg}"/>`;
    const cols = [a, b, c];
    for (let k = 0; k < 7; k++) {
      const amp = 26 + rnd() * 46, yc = 40 + k * 38, ph = rnd() * Math.PI * 2;
      let d = `M -20 ${yc}`;
      for (let x = -20; x <= 420; x += 16) d += ` L ${x} ${yc + Math.sin(x / 46 + ph) * amp}`;
      out += `<path d="${d}" fill="none" stroke="${cols[k % 3]}" stroke-width="${1.2 + rnd() * 2.4}" opacity="0.85"/>`;
    }
    return out;
  },
  mesh(rnd, [bg, a, b, c]) {
    const cols = 7, rows = 6, cw = 400 / cols, ch = 300 / rows;
    const pts = [];
    for (let y = 0; y <= rows; y++) {
      pts[y] = [];
      for (let x = 0; x <= cols; x++)
        pts[y][x] = [x * cw + (rnd() - 0.5) * cw * 0.5, y * ch + (rnd() - 0.5) * ch * 0.5];
    }
    let out = `<rect width="400" height="300" fill="${bg}"/><g stroke="none">`;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const p1 = pts[y][x], p2 = pts[y][x + 1], p3 = pts[y + 1][x + 1], p4 = pts[y + 1][x];
        const col = [a, b, c][Math.floor(rnd() * 3)];
        out += `<polygon points="${p1} ${p2} ${p3}" fill="${col}" opacity="${0.55 + rnd() * 0.45}"/>`;
        out += `<polygon points="${p1} ${p3} ${p4}" fill="${col}" opacity="${0.4 + rnd() * 0.5}"/>`;
      }
    return out + `</g>`;
  },
  stack(rnd, [bg, a, b, c]) {
    let out = `<rect width="400" height="300" fill="${bg}"/><g>`;
    for (let i = 0; i < 11; i++) {
      const w = 120 + rnd() * 220, h = 26 + rnd() * 34;
      out += `<rect x="${40 + rnd() * 120}" y="${20 + i * 24}" width="${w}" height="${h}" rx="${h / 2}" fill="${[a, b, c][Math.floor(rnd() * 3)]}" opacity="${0.5 + rnd() * 0.5}"/>`;
    }
    out += `<circle cx="300" cy="220" r="60" fill="${bg}" opacity="0.9"/><circle cx="300" cy="220" r="42" fill="none" stroke="${a}" stroke-width="2"/>`;
    return out + `</g>`;
  },
  burst(rnd, [bg, a, b, c]) {
    let out = `<rect width="400" height="300" fill="${bg}"/><g stroke-linecap="round">`;
    const n = 44;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + rnd() * 0.1;
      const inner = 34 + rnd() * 34, outer = inner + 34 + rnd() * 96;
      out += `<line x1="${200 + Math.cos(ang) * inner}" y1="${150 + Math.sin(ang) * inner}" x2="${200 + Math.cos(ang) * outer}" y2="${150 + Math.sin(ang) * outer}" stroke="${[a, b, c][i % 3]}" stroke-width="${2 + rnd() * 5}"/>`;
    }
    return out + `</g><circle cx="200" cy="150" r="22" fill="${bg}" stroke="${a}" stroke-width="2"/>`;
  },
  type(rnd, [bg, a, b, c], letter = "J") {
    let out = `<rect width="400" height="300" fill="${bg}"/>`;
    out += `<text x="30" y="255" font-family="Fraunces, Georgia, serif" font-size="290" font-weight="600" fill="${a}" letter-spacing="-14">${letter}</text>`;
    out += `<rect x="252" y="34" width="120" height="120" rx="60" fill="${b}" opacity="0.92"/>`;
    out += `<circle cx="312" cy="94" r="34" fill="${bg}"/>`;
    for (let i = 0; i < 5; i++) out += `<rect x="252" y="${176 + i * 22}" width="${20 + rnd() * 96}" height="8" rx="4" fill="${i % 2 ? c : a}"/>`;
    return out;
  },
};

function renderArt() {
  $$("[data-art]").forEach((node) => {
    const type = node.dataset.art || "grid";
    const seed = parseInt(node.dataset.seed || "7", 10);
    const palette = (node.dataset.palette || "#e9e4d8,#14130e,#e4572e,#1f5c4c").split(",");
    const fn = ART[type] || ART.grid;
    const rnd = mulberry32(seed * 2654435761);
    node.innerHTML =
      `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Generative artwork">` +
      fn(rnd, palette, node.dataset.letter) +
      `</svg>`;
  });
}

/* ---------- placeholder links ---------- */
function initPlaceholderLinks() {
  $$("a[data-placeholder]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      toast("Placeholder link — swap in your project URL");
    })
  );
}

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initPlaceholderLinks();
  initTicker();
  renderArt();
  initReveal();
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
});
