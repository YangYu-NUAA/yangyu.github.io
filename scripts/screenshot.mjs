#!/usr/bin/env node
/**
 * 本地验收截图工具（开发辅助，不参与网站运行）
 * 通过 Chrome DevTools Protocol 对静态页面截图：
 *   - 整页截图（captureBeyondViewport）
 *   - 各滚动位置的视口截图
 *
 * 用法：
 *   node scripts/screenshot.mjs <url> <宽度px> <视口高度px> <输出前缀>
 * 示例：
 *   node scripts/screenshot.mjs "file:///D:/日常工作/yu-yang-homepage/dist/index.html" 1440 900 shot-zh-1440
 */
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];

const [url, widthArg, heightArg, outPrefix] = process.argv.slice(2);
if (!url || !widthArg || !heightArg || !outPrefix) {
  console.error("用法: node scripts/screenshot.mjs <url> <width> <viewportHeight> <outPrefix>");
  process.exit(1);
}
const width = parseInt(widthArg, 10);
const viewportHeight = parseInt(heightArg, 10);

const chromePath = CHROME_CANDIDATES.find((p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
});
if (!chromePath) {
  console.error("未找到 Chrome/Edge，请修改 CHROME_CANDIDATES。");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), "shot-"));
  const port = 9222 + Math.floor(Math.random() * 500);
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${port}`,
    "about:blank",
  ]);

  const cleanup = () => {
    try { chrome.kill(); } catch {}
  };
  process.on("exit", cleanup);

  // 等待 DevTools 端口就绪
  let version = null;
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      version = await res.json();
      break;
    } catch {
      await sleep(200);
    }
  }
  if (!version) {
    console.error("Chrome DevTools 未就绪");
    process.exit(1);
  }

  // 新建页面目标
  const created = await fetch(`http://127.0.0.1:${port}/json/new?url:${encodeURIComponent("about:blank")}`, { method: "PUT" });
  const target = await created.json();

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let msgId = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++msgId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: viewportHeight,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const loaded = new Promise((resolve) => {
    const onMessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.method === "Page.loadEventFired") {
        ws.removeEventListener("message", onMessage);
        resolve();
      }
    };
    ws.addEventListener("message", onMessage);
  });

  await send("Page.navigate", { url });
  await loaded;
  await sleep(400); // 等待字体与布局稳定

  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true });
    return r.result.value;
  };

  const fullHeight = await evaluate("Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)");

  // 1) 整页截图
  const full = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  writeFileSync(`${outPrefix}-full.png`, Buffer.from(full.data, "base64"));
  console.log(`${outPrefix}-full.png  (${width}x${fullHeight})`);

  // 2) 各滚动位置视口截图
  const step = viewportHeight - 120;
  for (let y = 0; y < fullHeight - viewportHeight + 100; y += step) {
    await evaluate(`window.scrollTo(0, ${y})`);
    await sleep(250);
    const shot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${outPrefix}-y${y}.png`, Buffer.from(shot.data, "base64"));
    console.log(`${outPrefix}-y${y}.png`);
  }

  ws.close();
  cleanup();
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
