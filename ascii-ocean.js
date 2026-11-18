/* ============================================================
   余洋个人主页 — 高精度 ASCII 鱼群背景（自主实现）
   参考字符海洋的常见渲染思路：鱼体脊柱 + 轮廓多次采样 + 字符明暗。
   背景动效按本人要求默认播放；页面滚动过渡仍在 main.js 中遵循减少动态效果。
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("asciiOcean");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const TAU = Math.PI * 2;
  const NODES = 18;
  const CELL_W = 10;
  const CELL_H = 12;
  const RAMP = ".':;t%SX8#@";
  const EDGE = ".'`";
  const FIN = "%;tS:";
  const ACCENTS = ["#007cff", "#00a1ff", "#2669b2", "#33a8b5"];
  const SUB = [0.25, 0.28, 0.75, 0.28, 0.25, 0.74, 0.75, 0.74];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const angleDiff = (a, b) => {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  };
  const hash = (x, y, z) => {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const inTriangle = (x, y, x1, y1, x2, y2, x3, y3) => {
    const d = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
    if (Math.abs(d) < 1e-6) return false;
    const a = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / d;
    const b = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / d;
    const c = 1 - a - b;
    return a >= 0 && b >= 0 && c >= 0;
  };

  let W = 0;
  let H = 0;
  let cols = 0;
  let rows = 0;
  let dots = [];
  let currents = [];
  let fishes = [];
  let school = [];
  let rafId = null;
  let lastTs = 0;
  let elapsed = 0;
  const pointer = { x: 0, y: 0, active: false };

  let hitFlag = 0;
  let hitShade = 0;
  let hitS = 0;
  let hitV = 0;
  let hitDist = 0;

  function halfWidth(s) {
    if (s < 0.16) return 0.095 * Math.sin((s / 0.16) * Math.PI * 0.5);
    if (s < 0.42) return 0.095 + 0.014 * Math.sin(((s - 0.16) / 0.26) * Math.PI);
    if (s < 0.78) return 0.019 + 0.076 * Math.pow(1 - (s - 0.42) / 0.36, 1.15);
    const k = (s - 0.78) / 0.22;
    return Math.max(0.003, 0.019 * (1 - k));
  }

  function createFish(id, scale, px, py, heading, orbitDir) {
    const base = clamp(Math.min(W, H) * 0.48, 190, 430);
    const length = base * scale;
    const nodes = new Float32Array(NODES * 2);
    const seg = length / (NODES - 1);
    const x = W * px;
    const y = H * py;
    for (let n = 0; n < NODES; n++) {
      nodes[n * 2] = x - Math.cos(heading) * seg * n;
      nodes[n * 2 + 1] = y - Math.sin(heading) * seg * n;
    }
    return {
      id,
      length,
      nodes,
      spine: new Float32Array(NODES * 2),
      arc: new Float32Array(NODES),
      arcTotal: length,
      heading,
      speed: 26 + length * 0.035,
      phase: rand(0, TAU),
      orbitDir,
      turn: 0,
      depth: scale,
      cells: [],
    };
  }

  function makeScene() {
    dots = new Array(cols * rows);
    for (let i = 0; i < dots.length; i++) {
      const r = Math.random();
      dots[i] = {
        kind: r < 0.48 ? 0 : r < 0.78 ? 1 : r < 0.94 ? 2 : 3,
        phase: Math.random() * TAU,
        freq: rand(0.25, 0.75),
      };
    }
    currents = [0.2, 0.42, 0.66, 0.86].map((v, i) => ({
      base: v * H,
      amp: rand(24, 62),
      freq: rand(0.002, 0.0045),
      phase: rand(0, TAU),
      speed: rand(0.0001, 0.00022),
      alpha: i === 1 ? 0.14 : 0.085,
    }));
    fishes = [
      createFish(1, 1, 0.67, 0.53, 2.95, 1),
      createFish(2, 0.74, 0.7, 0.28, 2.2, -1),
      createFish(3, 0.56, 0.38, 0.76, 3.55, 1),
    ].sort((a, b) => a.length - b.length);
    school = [];
    for (let g = 0; g < 4; g++) {
      const cx = rand(W * 0.12, W * 0.88);
      const cy = rand(H * 0.16, H * 0.84);
      const heading = rand(0, TAU);
      for (let k = 0; k < 12; k++) {
        school.push({
          group: g,
          x: cx + rand(-45, 45),
          y: cy + rand(-28, 28),
          vx: Math.cos(heading) * rand(20, 34),
          vy: Math.sin(heading) * rand(20, 34),
          phase: rand(0, TAU),
          depth: rand(0.5, 1),
        });
      }
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(W * dpr));
    canvas.height = Math.max(1, Math.floor(H * dpr));
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / CELL_W) + 2;
    rows = Math.ceil(H / CELL_H) + 2;
    makeScene();
    draw(performance.now(), 0);
  }

  function stepFish(f, dt, t) {
    const n = f.nodes;
    const hx = n[0];
    const hy = n[1];
    const rx = (hx - W * 0.5) / (W * 0.42);
    const ry = (hy - H * 0.5) / (H * 0.38);
    const r = Math.hypot(rx, ry) || 1;
    const radial = clamp(1 - r, -1, 1);
    let dx = (-ry / r) * f.orbitDir + (rx / r) * radial * 1.15;
    let dy = (rx / r) * f.orbitDir + (ry / r) * radial * 1.15;
    const outside = Math.max(-hx, hx - W, -hy, hy - H);
    if (outside > -f.length * 0.2) {
      const toCenter = Math.atan2(H * 0.5 - hy, W * 0.5 - hx);
      dx += Math.cos(toCenter) * 2.2;
      dy += Math.sin(toCenter) * 2.2;
    }
    const wander = Math.sin(t * 0.32 + f.phase * 0.7) * 0.22;
    const desired = Math.atan2(dy, dx) + wander;
    const turned = clamp(angleDiff(f.heading, desired), -dt * 0.72, dt * 0.72);
    f.heading += turned;
    f.turn += (turned / Math.max(dt, 0.001) - f.turn) * Math.min(1, dt * 3);
    const targetSpeed = 26 + f.length * 0.035;
    f.speed += (targetSpeed - f.speed) * Math.min(1, dt * 1.4);
    f.phase += dt * (2.1 + f.speed / 28);
    n[0] += Math.cos(f.heading) * f.speed * dt;
    n[1] += Math.sin(f.heading) * f.speed * dt;
    const seg = f.length / (NODES - 1);
    let previous = f.heading + Math.PI;
    for (let k = 1; k < NODES; k++) {
      const px = n[(k - 1) * 2];
      const py = n[(k - 1) * 2 + 1];
      let angle = Math.atan2(n[k * 2 + 1] - py, n[k * 2] - px);
      angle = previous + clamp(angleDiff(previous, angle), -0.15, 0.15);
      n[k * 2] = px + Math.cos(angle) * seg;
      n[k * 2 + 1] = py + Math.sin(angle) * seg;
      previous = angle;
    }
  }

  function stepSchool(dt, t) {
    const centers = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, n: 0 }));
    for (const f of school) {
      const c = centers[f.group];
      c.x += f.x;
      c.y += f.y;
      c.n++;
    }
    centers.forEach((c) => { c.x /= c.n; c.y /= c.n; });
    for (const f of school) {
      const c = centers[f.group];
      let ax = (c.x - f.x) * 0.12 + Math.sin(f.y * 0.004 + t * 0.23 + f.phase) * 10;
      let ay = (c.y - f.y) * 0.12 + Math.cos(f.x * 0.003 - t * 0.18 + f.phase) * 8;
      if (pointer.active) {
        const dx = f.x - pointer.x;
        const dy = f.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < 120 && d > 0.1) {
          const k = (1 - d / 120) * 180;
          ax += (dx / d) * k;
          ay += (dy / d) * k;
        }
      }
      if (f.x < 25) ax += 45;
      if (f.x > W - 25) ax -= 45;
      if (f.y < 25) ay += 45;
      if (f.y > H - 25) ay -= 45;
      f.vx += ax * dt;
      f.vy += ay * dt;
      const speed = Math.hypot(f.vx, f.vy) || 1;
      const target = 28 * f.depth;
      f.vx = (f.vx / speed) * (speed + (target - speed) * dt * 1.8);
      f.vy = (f.vy / speed) * (speed + (target - speed) * dt * 1.8);
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.x < -50) f.x = W + 50;
      if (f.x > W + 50) f.x = -50;
      if (f.y < -50) f.y = H + 50;
      if (f.y > H + 50) f.y = -50;
    }
  }

  function sampleFish(px, py, f) {
    const N = NODES;
    const spine = f.spine;
    let best = Infinity;
    let bestS = 0;
    let bestSign = 1;
    let bestNx = 0;
    let bestNy = 0;
    for (let k = 0; k < N - 1; k++) {
      const ax = spine[k * 2];
      const ay = spine[k * 2 + 1];
      const sx = spine[(k + 1) * 2] - ax;
      const sy = spine[(k + 1) * 2 + 1] - ay;
      const len2 = sx * sx + sy * sy || 1;
      const u = clamp(((px - ax) * sx + (py - ay) * sy) / len2, 0, 1);
      const qx = ax + sx * u;
      const qy = ay + sy * u;
      const d2 = (px - qx) ** 2 + (py - qy) ** 2;
      if (d2 < best) {
        const len = Math.sqrt(len2);
        best = d2;
        bestS = (f.arc[k] + u * len) / f.arcTotal;
        bestSign = sx * (py - ay) - sy * (px - ax) >= 0 ? 1 : -1;
        bestNx = (-sy / len) * bestSign;
        bestNy = (sx / len) * bestSign;
      }
    }
    const a = Math.sqrt(best);
    const s = bestS;
    const u = s * f.length;
    const w = halfWidth(s) * f.length;
    hitDist = a;
    hitS = s;
    hitV = a * bestSign;
    hitFlag = 1;
    if (a <= w) {
      const across = a / (w || 1);
      const facing = (bestNx * -0.6 + bestNy * -0.8) * across;
      hitShade = clamp(0.58 - across * across * 0.4 + facing * 0.24, 0, 1);
      if (s > 0.105 && s < 0.145 && across > 0.5 && bestSign > 0) {
        hitFlag = 5;
        hitShade = 0;
      } else if (s > 0.2 && s < 0.29 && across > 0.55) {
        if (Math.floor(((s - 0.2) / 0.09) * 5) % 2 === 0) hitShade *= 0.42;
      }
      return true;
    }
    // 背鳍、胸鳍和尾鳍，均以鱼体局部坐标判断。
    if (bestSign > 0 && inTriangle(u, a, f.length * 0.3, 0, f.length * 0.46, 0, f.length * 0.55, f.length * 0.14)) {
      hitFlag = 3;
      hitShade = 0.42;
      return true;
    }
    if (bestSign < 0 && inTriangle(u, a, f.length * 0.43, 0, f.length * 0.57, 0, f.length * 0.68, f.length * 0.12)) {
      hitFlag = 3;
      hitShade = 0.36;
      return true;
    }
    if (inTriangle(u, a, f.length * 0.8, 0, f.length * 0.94, 0, f.length * 1.02, f.length * 0.12)) {
      hitFlag = 3;
      hitShade = 0.38;
      return true;
    }
    return false;
  }

  function rasterizeAndDrawFish(f, t) {
    const n = f.nodes;
    const spine = f.spine;
    for (let k = 0; k < NODES; k++) {
      const s = k / (NODES - 1);
      const a = Math.max(0, k - 1);
      const b = Math.min(NODES - 1, k + 1);
      let tx = n[a * 2] - n[b * 2];
      let ty = n[a * 2 + 1] - n[b * 2 + 1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const amp = f.length * 0.048 * (0.1 + 0.9 * Math.pow(s, 1.8));
      const off = amp * Math.sin(f.phase - s * 5.4);
      spine[k * 2] = n[k * 2] - ty * off;
      spine[k * 2 + 1] = n[k * 2 + 1] + tx * off;
    }
    f.arc[0] = 0;
    for (let k = 1; k < NODES; k++) {
      f.arc[k] = f.arc[k - 1] + Math.hypot(spine[k * 2] - spine[(k - 1) * 2], spine[k * 2 + 1] - spine[(k - 1) * 2 + 1]);
    }
    f.arcTotal = f.arc[NODES - 1] || f.length;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let k = 0; k < NODES; k++) {
      minX = Math.min(minX, spine[k * 2]);
      maxX = Math.max(maxX, spine[k * 2]);
      minY = Math.min(minY, spine[k * 2 + 1]);
      maxY = Math.max(maxY, spine[k * 2 + 1]);
    }
    const reach = f.length * 0.2;
    const c0 = Math.max(0, Math.floor((minX - reach) / CELL_W));
    const c1 = Math.min(cols - 1, Math.floor((maxX + reach) / CELL_W));
    const r0 = Math.max(0, Math.floor((minY - reach) / CELL_H));
    const r1 = Math.min(rows - 1, Math.floor((maxY + reach) / CELL_H));
    f.cells.length = 0;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const x = c * CELL_W;
        const y = r * CELL_H;
        const center = sampleFish(x + CELL_W / 2, y + CELL_H / 2, f);
        if (!center && hitDist > reach + 15) continue;
        const centerFlag = hitFlag;
        const centerShade = hitShade;
        const s = hitS;
        const v = hitV;
        let hits = center ? 1 : 0;
        for (let k = 0; k < SUB.length; k += 2) {
          if (sampleFish(x + SUB[k] * CELL_W, y + SUB[k + 1] * CELL_H, f)) hits++;
        }
        if (!hits) continue;
        const coverage = hits / 5;
        const solid = center && coverage >= 0.6;
        f.cells.push({
          i: r * cols + c,
          flag: solid ? centerFlag : 2,
          shade: solid ? centerShade : coverage,
          key: Math.floor(hash(Math.round(s * 52), Math.round(v / CELL_W), f.id) * 4294967295) >>> 0,
        });
      }
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.round(CELL_H * 0.88)}px "Geist Mono Variable", ui-monospace, Consolas, monospace`;
    for (const cell of f.cells) {
      const col = cell.i % cols;
      const row = (cell.i / cols) | 0;
      const x = col * CELL_W;
      const y = row * CELL_H;
      const key = cell.key;
      const roll = hash(key, Math.floor(t * 2.5 + (key % 997) / 97), 7);
      if (cell.flag === 2) {
        ctx.fillStyle = roll < 0.025 ? ACCENTS[key % ACCENTS.length] : `rgba(0,47,91,${0.08 + cell.shade * 0.18})`;
        ctx.fillText(EDGE[(key >>> 8) % EDGE.length], x + CELL_W / 2, y + CELL_H / 2 + 0.5);
        continue;
      }
      const dim = 0.68 + 0.32 * f.depth;
      const alpha = (0.1 + cell.shade * 0.23) * dim;
      ctx.fillStyle = `rgba(0,47,91,${alpha})`;
      ctx.fillRect(x + 0.7, y + 0.7, CELL_W - 1.4, CELL_H - 1.4);
      let glyph;
      if (cell.flag === 5) glyph = "o";
      else if (cell.flag === 3) glyph = FIN[(key >>> 8) % FIN.length];
      else {
        const jitter = ((key >>> 4) % 3) - 1;
        glyph = RAMP[clamp(Math.floor((1 - cell.shade) * (RAMP.length - 0.01)) + jitter, 0, RAMP.length - 1)];
      }
      if (cell.flag === 5) ctx.fillStyle = "rgba(227,229,233,0.95)";
      else if (roll < 0.035) ctx.fillStyle = ACCENTS[key % ACCENTS.length];
      else if (roll < 0.055) ctx.fillStyle = "rgba(255,255,255,0.82)";
      else ctx.fillStyle = cell.shade > 0.54 ? "rgba(227,229,233,0.78)" : "rgba(0,47,91,0.46)";
      ctx.fillText(glyph, x + CELL_W / 2, y + CELL_H / 2 + 0.5);
    }
  }

  function drawDots(t) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const d = dots[i];
        if (!d || !d.kind) continue;
        const twinkle = 0.5 + 0.5 * Math.sin(t * 0.001 * d.freq + d.phase);
        const caustic = 0.8 + 0.2 * Math.sin(c * 0.11 + t * 0.00035) * Math.sin(r * 0.17 - t * 0.00027);
        const alpha = (0.025 + twinkle * 0.085) * caustic;
        ctx.fillStyle = d.kind === 3 ? `rgba(0,124,255,${alpha})` : `rgba(0,47,91,${alpha})`;
        const size = d.kind === 3 ? 2 : 1.4;
        ctx.fillRect(c * CELL_W + CELL_W * 0.66 - size / 2, r * CELL_H + CELL_H * 0.62 - size / 2, size, size);
      }
    }
  }

  function drawCurrents(t) {
    ctx.lineWidth = 0.8;
    for (const s of currents) {
      ctx.beginPath();
      for (let x = -60; x <= W + 60; x += 18) {
        const y = s.base + Math.sin(x * s.freq + t * s.speed + s.phase) * s.amp + Math.sin(x * s.freq * 0.43 - t * s.speed * 0.7) * s.amp * 0.35;
        if (x === -60) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, "rgba(0,124,255,0)");
      g.addColorStop(0.25, `rgba(0,124,255,${s.alpha * 0.6})`);
      g.addColorStop(0.6, `rgba(0,124,255,${s.alpha})`);
      g.addColorStop(1, "rgba(0,161,255,0)");
      ctx.strokeStyle = g;
      ctx.stroke();
    }
  }

  function drawSchool() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `11px "Geist Mono Variable", ui-monospace, Consolas, monospace`;
    for (const f of school) {
      ctx.fillStyle = `rgba(0,124,255,${0.18 + f.depth * 0.28})`;
      ctx.fillText(Math.abs(f.vx) > Math.abs(f.vy) ? "-" : "·", f.x, f.y);
    }
  }

  function draw(t, dt) {
    ctx.clearRect(0, 0, W, H);
    drawDots(t);
    drawCurrents(t);
    for (const f of fishes) {
      if (dt) stepFish(f, dt, t / 1000);
      rasterizeAndDrawFish(f, t / 1000);
    }
    if (dt) stepSchool(dt, t / 1000);
    drawSchool();
  }

  function frame(ts) {
    rafId = requestAnimationFrame(frame);
    if (!lastTs) lastTs = ts;
    const diff = ts - lastTs;
    if (diff < 33) return;
    lastTs = ts;
    const dt = Math.min(diff / 1000, 0.055);
    elapsed += dt;
    draw(ts, dt);
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = event.pointerType !== "touch";
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { pointer.active = false; });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      lastTs = 0;
    } else if (!rafId) {
      rafId = requestAnimationFrame(frame);
    }
  });

  // 初始化成功后隐藏 CSS 备用鱼群；JS 不可用时备用鱼群仍可显示。
  document.documentElement.classList.add("canvas-fish-active");
  rafId = requestAnimationFrame(frame);
})();
