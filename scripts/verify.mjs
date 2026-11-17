#!/usr/bin/env node
/* 构建产物内容核对 */
import { readFileSync } from "node:fs";

const zh = readFileSync("dist/index.html", "utf8");
const en = readFileSync("dist/en/index.html", "utf8");

const checks = [
  ["头像为 portrait.jpg", /src="assets\/portrait\/portrait\.jpg"/.test(zh) && /src="\.\.\/assets\/portrait\/portrait\.jpg"/.test(en)],
  ["ASCII 海洋画布", zh.includes('id="asciiOcean"') && en.includes('id="asciiOcean"')],
  ["鼠标光斑层", zh.includes('class="spotlight"') && en.includes('class="spotlight"')],
  ["ascii-ocean.js 引用", zh.includes("ascii-ocean.js") && en.includes("ascii-ocean.js")],
  ["主持项目卡片 x2", (zh.match(/proj-card/g) || []).length === 2 && (en.match(/proj-card/g) || []).length === 2],
  ["无作者身份标注", !/第一作者|共同第一作者|合作作者|First author|Co-first|Co-author|corresponding/.test(zh) && !/第一作者|First author|Co-first|Co-author|corresponding/.test(en)],
  ["无项目编号", !/2026yjrc009|HX20260706|2018YFC1508100|62176121|SKLATM202104/.test(zh) && !/2026yjrc009|HX20260706|2018YFC1508100|62176121|SKLATM202104/.test(en)],
  ["Datawhale 正式成员", zh.includes("Datawhale 开源社区正式成员") && en.includes("Official member, Datawhale")],
  ["主持/参与身份保留", zh.includes("主持") && zh.includes("参与")],
  ["无残留模板 token", !/\{\{/.test(zh) && !/\{\{/.test(en)],
  ["无内部备注", !/待补|待核|勿|内部|核对/.test(zh) && !/待补|待核|勿|内部|核对/.test(en)],
];

let fail = 0;
for (const [name, ok] of checks) {
  console.log((ok ? "PASS" : "FAIL") + "  " + name);
  if (!ok) fail++;
}
process.exit(fail ? 1 : 0);
