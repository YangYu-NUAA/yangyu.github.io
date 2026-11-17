/* ============================================================
   余洋个人主页 — ASCII 海洋背景（自主实现）
   全屏固定画布：缓慢漂移的字符海面 + 一只会游动的鲸鱼
   - 尊重 prefers-reduced-motion：只绘制一帧静态字符海，不播放动画
   - 页面不可见时暂停渲染
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("asciiOcean");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const FIELD_CHARS = ".....:--=+*%#@";
  const COL_W = 15;
  const ROW_H = 17;
  const FONT_PX = 13;
  const FONT = FONT_PX + 'px ui-monospace, "Cascadia Mono", "SF Mono", Consolas, "Liberation Mono", monospace';

  /* ---------- 鲸鱼造型（身体 + 两帧摆尾） ---------- */
  const WHALE_BODY = [
    '      .-"-.' ,
    '   .-"  ~~  "-.' ,
    "  /   .--.    \\",
    " |   / o  \\    |",
    " |   \\    /    |",
    "  \\   '--'    /",
    "   '-.____.-'",
  ];
  const WHALE_TAILS = [
    ["  __/      \\___"],
    ["   _/      \\__ "],
  ];
  const SPOUT_CHARS = [".", "'", '"', "`"];

  let W = 0;
  let H = 0;
  let cols = 0;
  let rows = 0;
  let field = [];
  let whaleX = 0;
  let whaleBaseY = 0;
  let lastTs = 0;
  let rafId = null;
  let tailTick = 0;
  let spoutUntil = 0;
  let nextSpoutAt = 1500;

  const buildField = () => {
    field = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          ch: FIELD_CHARS[(Math.random() * FIELD_CHARS.length) | 0],
          phase: Math.random() * Math.PI * 2,
          speed: 4 + Math.random() * 7, // px/s，向左漂移
        });
      }
      field.push(row);
    }
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(W * dpr));
    canvas.height = Math.max(1, Math.floor(H * dpr));
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / COL_W) + 2;
    rows = Math.ceil(H / ROW_H) + 2;
    buildField();
    if (whaleBaseY === 0) {
      whaleBaseY = H * 0.6;
      whaleX = W + 320;
    }
  };

  const drawField = (t) => {
    ctx.font = FONT;
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(0, 47, 91, 0.10)";
    const span = cols * COL_W;
    for (let r = 0; r < rows; r++) {
      const row = field[r];
      for (let c = 0; c < cols; c++) {
        const cell = row[c];
        let x = (c * COL_W - (t / 1000) * cell.speed) % span;
        if (x < 0) x += span;
        const y = r * ROW_H + Math.sin(t / 900 + cell.phase) * 2.5;
        ctx.fillText(cell.ch, x - COL_W, y);
      }
    }
  };

  const drawWhale = (t) => {
    const bob = Math.sin(t / 2100) * 46;
    const x = whaleX;
    const y = whaleBaseY + bob;
    ctx.font = FONT;
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(0, 47, 91, 0.5)";

    for (let i = 0; i < WHALE_BODY.length; i++) {
      ctx.fillText(WHALE_BODY[i], x, y + i * ROW_H);
    }
    const tail = WHALE_TAILS[tailTick % WHALE_TAILS.length];
    for (let i = 0; i < tail.length; i++) {
      ctx.fillText(tail[i], x, y + (WHALE_BODY.length + i) * ROW_H);
    }

    // 头顶水花：每数秒喷一小会儿
    if (t < spoutUntil) {
      const age = (spoutUntil - t) / 900; // 1 → 0
      ctx.fillStyle = "rgba(0, 124, 255, " + (0.55 * age).toFixed(3) + ")";
      for (let i = 0; i < SPOUT_CHARS.length; i++) {
        const rise = (1 - age) * 3 + i * 0.9;
        ctx.fillText(SPOUT_CHARS[i], x + (5 + i * 2) * COL_W * 0.62, y - rise * ROW_H);
      }
    }
  };

  const frame = (ts) => {
    rafId = requestAnimationFrame(frame);
    if (!lastTs) lastTs = ts;
    const dt = ts - lastTs;
    if (dt < 33) return; // 约 30fps
    lastTs = ts;
    const t = ts;

    ctx.clearRect(0, 0, W, H);
    drawField(t);

    whaleX -= (26 * dt) / 1000; // 向左游动
    if (whaleX < -320) whaleX = W + 320;
    tailTick = Math.floor(t / 420) % WHALE_TAILS.length;
    if (t > nextSpoutAt) {
      spoutUntil = t + 900;
      nextSpoutAt = t + 2600 + Math.random() * 2400;
    }
    drawWhale(t);
  };

  resize();
  window.addEventListener("resize", () => {
    resize();
    if (reducedMotion) drawStatic();
  });

  const drawStatic = () => {
    ctx.clearRect(0, 0, W, H);
    drawField(0);
    whaleX = W * 0.66;
    whaleBaseY = H * 0.58;
    drawWhale(0);
  };

  if (reducedMotion) {
    drawStatic();
  } else {
    rafId = requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", () => {
    if (reducedMotion) return;
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      lastTs = 0;
    } else if (!rafId) {
      rafId = requestAnimationFrame(frame);
    }
  });
})();
