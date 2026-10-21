/* Judo / Studio — playground widgets. Each block is self-contained and
   only initialises when its root element is present on the page. */

/* =========================================================
   01 — Palette Forge
   ========================================================= */
function initPalette() {
  const root = $("#w-palette");
  if (!root) return;
  const grid = $(".swatches", root);
  const btn = $("[data-remix]", root);
  const schemes = ["analogous", "complementary", "triadic", "split"];
  const clamp = (n) => Math.max(0, Math.min(1, n));

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const to = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
    return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
  }

  function build() {
    const h = Math.random() * 360;
    const s = 45 + Math.random() * 40;
    const scheme = schemes[Math.floor(Math.random() * schemes.length)];
    let offsets;
    if (scheme === "analogous") offsets = [-40, -20, 0, 20, 40];
    else if (scheme === "complementary") offsets = [0, 20, 180, 200, 340];
    else if (scheme === "triadic") offsets = [0, 120, 240, 60, 180];
    else offsets = [0, 30, 180, 210, 300];
    const colors = offsets.map((o, i) => {
      const l = 26 + i * 12 + Math.random() * 8;
      return hslToHex((h + o + 360) % 360, s, Math.min(88, l));
    });
    grid.innerHTML = colors
      .map((c) => `<button class="swatch" style="background:${c}" data-hex="${c}"><code>${c}</code></button>`)
      .join("");
    $$(".swatch", grid).forEach((sw) =>
      sw.addEventListener("click", () => copyText(sw.dataset.hex, `${sw.dataset.hex} copied`))
    );
    root.dataset.colors = colors.join(",");
  }

  btn.addEventListener("click", build);
  $("[data-copy-all]", root).addEventListener("click", () =>
    copyText(root.dataset.colors.replace(/,/g, ", "), "Palette copied")
  );
  build();
}

/* =========================================================
   02 — Focus timer
   ========================================================= */
function initTimer() {
  const root = $("#w-timer");
  if (!root) return;
  const MODES = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
  const CIRC = 2 * Math.PI * 76;
  const timeEl = $(".ring-time", root);
  const prog = $(".prog", root);
  const startBtn = $("[data-start]", root);
  let mode = "focus", remaining = MODES.focus, running = false, last = 0, raf = null;

  prog.style.strokeDasharray = CIRC;

  function paint() {
    const m = String(Math.floor(remaining / 60)).padStart(2, "0");
    const s = String(Math.floor(remaining % 60)).padStart(2, "0");
    timeEl.textContent = `${m}:${s}`;
    prog.style.strokeDashoffset = CIRC * (1 - remaining / MODES[mode]);
  }

  function tick(now) {
    if (!running) return;
    if (!last) last = now;
    remaining -= (now - last) / 1000;
    last = now;
    if (remaining <= 0) {
      remaining = 0; paint(); stop(); ding(); toast("Session complete");
      return;
    }
    paint();
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true; last = 0;
    startBtn.textContent = "Pause";
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    startBtn.textContent = "Start";
  }
  function reset(m, silent) {
    stop();
    if (m) mode = m;
    remaining = MODES[mode];
    $$("[data-mode]", root).forEach((b) => b.classList.toggle("mini-btn--solid", b.dataset.mode === mode));
    paint();
    if (!silent) last = 0;
  }
  function ding() {
    try {
      // Reuse one context: browsers cap the number of live ones, and this runs
      // from a timer callback, so the context may have been suspended.
      const ctx = (ding.ctx ||= new (window.AudioContext || window.webkitAudioContext)());
      if (ctx.state === "suspended") ctx.resume();
      [0, 0.18, 0.36].forEach((t) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 660; o.type = "sine";
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.16);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2);
      });
    } catch { /* audio optional */ }
  }

  startBtn.addEventListener("click", () => (running ? stop() : start()));
  $("[data-reset]", root).addEventListener("click", () => reset(null));
  $$("[data-mode]", root).forEach((b) =>
    b.addEventListener("click", () => reset(b.dataset.mode))
  );
  reset("focus", true);
}

/* =========================================================
   03 — Gradient mixer
   ========================================================= */
function initGradient() {
  const root = $("#w-gradient");
  if (!root) return;
  const c1 = $("[data-c1]", root), c2 = $("[data-c2]", root), ang = $("[data-angle]", root);
  const angleOut = $("[data-angle-out]", root);
  const preview = $(".preview", root), out = $(".code-out", root);

  function css() {
    return `background: linear-gradient(${ang.value}deg, ${c1.value} 0%, ${c2.value} 100%);`;
  }
  function paint() {
    angleOut.textContent = `${ang.value}°`;
    preview.style.background = `linear-gradient(${ang.value}deg, ${c1.value}, ${c2.value})`;
    out.textContent = css();
  }
  [c1, c2, ang].forEach((el) => el.addEventListener("input", paint));
  $("[data-copy]", root).addEventListener("click", () => copyText(css(), "CSS copied"));
  $("[data-swap]", root).addEventListener("click", () => {
    const t = c1.value; c1.value = c2.value; c2.value = t; paint();
  });
  paint();
}

/* =========================================================
   04 — Shadow studio
   ========================================================= */
function initShadow() {
  const root = $("#w-shadow");
  if (!root) return;
  const keys = ["x", "y", "blur", "spread"];
  const inputs = Object.fromEntries(keys.map((k) => [k, $(`[data-${k}]`, root)]));
  const color = $("[data-color]", root), alpha = $("[data-alpha]", root);
  const preview = $(".preview", root), out = $(".code-out", root);

  function rgba() {
    const h = color.value;
    const a = (alpha.value / 100).toFixed(2);
    const n = parseInt(h.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  function value() {
    return `${inputs.x.value}px ${inputs.y.value}px ${inputs.blur.value}px ${inputs.spread.value}px ${rgba()}`;
  }
  function paint() {
    keys.forEach((k) => ($(`[data-${k}-out]`, root).textContent = inputs[k].value));
    $("[data-alpha-out]", root).textContent = `${alpha.value}%`;
    preview.style.boxShadow = value();
    out.textContent = `box-shadow: ${value()};`;
  }
  [...keys.map((k) => inputs[k]), color, alpha].forEach((el) => el.addEventListener("input", paint));
  $("[data-copy]", root).addEventListener("click", () => copyText(out.textContent, "box-shadow copied"));
  paint();
}

/* =========================================================
   05 — Contrast checker
   ========================================================= */
function initContrast() {
  const root = $("#w-contrast");
  if (!root) return;
  const fg = $("[data-fg]", root), bg = $("[data-bg]", root);
  const sample = $(".preview", root), ratioEl = $("[data-ratio]", root);
  const badges = $("[data-badges]", root);

  function lum(hex) {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  function ratio(a, b) {
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  }
  function badge(label, pass) {
    return `<span class="badge ${pass ? "pass" : "fail"}">${label} ${pass ? "pass" : "fail"}</span>`;
  }
  function paint() {
    sample.style.background = bg.value;
    sample.style.color = fg.value;
    const r = ratio(fg.value, bg.value);
    ratioEl.textContent = `${r.toFixed(2)}:1`;
    badges.innerHTML =
      badge("AA text", r >= 4.5) +
      badge("AA large", r >= 3) +
      badge("AAA text", r >= 7) +
      badge("AAA large", r >= 4.5);
  }
  [fg, bg].forEach((el) => el.addEventListener("input", paint));
  $("[data-swap]", root).addEventListener("click", () => {
    const t = fg.value; fg.value = bg.value; bg.value = t; paint();
  });
  paint();
}

/* =========================================================
   06 — Text toolkit
   ========================================================= */
function initText() {
  const root = $("#w-text");
  if (!root) return;
  const area = $("textarea", root);
  const copyBtn = $("[data-copy]", root);

  const titleCase = (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
  const sentenceCase = (s) =>
    s.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase());
  const transforms = {
    upper: (s) => s.toUpperCase(),
    lower: (s) => s.toLowerCase(),
    title: titleCase,
    sentence: sentenceCase,
    trim: (s) => s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim(),
  };

  function stats() {
    const v = area.value;
    const words = (v.trim().match(/[\p{L}\p{N}'-]+/gu) || []).length;
    const sentences = (v.match(/[^.!?。！？]+[.!?。！？]?/g) || []).filter((s) => s.trim()).length;
    const mins = Math.max(1, Math.ceil(words / 200));
    $("#s-chars", root).textContent = v.length;
    $("#s-words", root).textContent = words;
    $("#s-sents", root).textContent = sentences;
    $("#s-read", root).textContent = words ? `${mins}m` : "0m";
  }
  area.addEventListener("input", stats);
  $$("[data-transform]", root).forEach((b) =>
    b.addEventListener("click", () => {
      area.value = transforms[b.dataset.transform](area.value);
      stats();
      toast(`${b.textContent} applied`);
    })
  );
  copyBtn.addEventListener("click", () => copyText(area.value, "Text copied"));
  stats();
}

document.addEventListener("DOMContentLoaded", () => {
  initPalette();
  initTimer();
  initGradient();
  initShadow();
  initContrast();
  initText();
});
