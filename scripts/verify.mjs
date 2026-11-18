#!/usr/bin/env node
/* 构建产物内容核对 */
import { readFileSync } from "node:fs";

const zh = readFileSync("dist/index.html", "utf8");
const en = readFileSync("dist/en/index.html", "utf8");
const withoutCoFirstMarks = (html) => html.replace(/<sup class="author-star"[^>]*>\*<\/sup>/g, "");

const checks = [
  ["头像为 portrait.jpg", /src="assets\/portrait\/portrait\.jpg"/.test(zh) && /src="\.\.\/assets\/portrait\/portrait\.jpg"/.test(en)],
  ["ASCII 海洋画布", zh.includes('id="asciiOcean"') && en.includes('id="asciiOcean"')],
  ["鼠标光斑层", zh.includes('class="spotlight"') && en.includes('class="spotlight"')],
  ["ascii-ocean.js 引用", zh.includes("ascii-ocean.js") && en.includes("ascii-ocean.js")],
  ["主持项目卡片 x2", (zh.match(/<article class="proj-card">/g) || []).length === 2 && (en.match(/<article class="proj-card">/g) || []).length === 2],
  ["除明确标记的共一星号外无作者身份标注", !/第一作者|共同第一作者|合作作者|First author|Co-first|Co-author|corresponding/.test(withoutCoFirstMarks(zh)) && !/第一作者|First author|Co-first|Co-author|corresponding/.test(withoutCoFirstMarks(en))],
  ["GPT2-ICC三位共同第一作者上标星号", (zh.match(/<sup class="author-star"/g) || []).length === 3 && (en.match(/<sup class="author-star"/g) || []).length === 3 && /Zihan Zhou<sup class="author-star"/.test(zh) && /<strong>Yang Yu<\/strong><sup class="author-star"/.test(zh) && /Chengji Yang<sup class="author-star"/.test(zh)],
  ["无项目编号", !/2026yjrc009|HX20260706|2018YFC1508100|62176121|SKLATM202104/.test(zh) && !/2026yjrc009|HX20260706|2018YFC1508100|62176121|SKLATM202104/.test(en)],
  ["Datawhale 正式成员", zh.includes("Datawhale 开源社区正式成员") && en.includes("Official member, Datawhale")],
  ["主持/参与身份保留", zh.includes("主持") && zh.includes("参与")],
  ["无残留模板 token", !/\{\{/.test(zh) && !/\{\{/.test(en)],
  ["无内部备注", !/待补|待核|勿|内部|核对/.test(zh) && !/待补|待核|勿|内部|核对/.test(en)],
  ["论文按年份分组", zh.includes('<li class="pub-year" aria-label="2026"><h3>2026</h3>') && zh.includes('<li class="pub-year" aria-label="2025"><h3>2025</h3>') && zh.includes('<li class="pub-year" aria-label="2024"><h3>2024</h3>')],
  ["居民用电论文仅一条且位于2025组末尾", (zh.match(/Probabilistic Forecasting of Residential Electricity Consumption/g) || []).length === 1 && zh.indexOf("Probabilistic Forecasting of Residential Electricity Consumption") > zh.indexOf("LLM-Based Automatic Construction Method") && zh.indexOf("Probabilistic Forecasting of Residential Electricity Consumption") < zh.indexOf("Robformer: A robust decomposition transformer")],
  ["本地字体已引用", zh.includes("assets/fonts/sentient-700.woff2") && en.includes("../assets/fonts/sentient-700.woff2")],
  ["四个研究方向标题完整", ["时间序列分析与预测", "时序基础模型与多模态学习", "时序多智能体与协同分析", "人工智能辅助药物设计"].every((name) => zh.includes(`<h3>${name}</h3>`)) && ["Time Series Analysis and Forecasting", "Time Series Foundation Models and Multimodal Learning", "Multi-Agent Systems for Time Series Analysis", "AI-Assisted Drug Discovery"].every((name) => en.includes(`<h3>${name}</h3>`))],
  ["无外部字体或统计脚本", !/fontshare|jsdelivr|googleapis|busuanzi/.test(zh) && !/fontshare|jsdelivr|googleapis|busuanzi/.test(en)],
  ["特聘副教授中英文一致", zh.includes("特聘副教授 · 硕士生导师") && en.includes("Specially Appointed Associate Professor")],
  ["时序多智能体在研究方向中前移", zh.indexOf('<h3>时间序列分析与预测</h3>') < zh.indexOf('<h3>时序多智能体与协同分析</h3>') && zh.indexOf('<h3>时序多智能体与协同分析</h3>') < zh.indexOf('<h3>时序基础模型与多模态学习</h3>')],
  ["两段算法实习及准确单位名", zh.includes("中国太平洋保险（集团）股份有限公司") && zh.includes("英特尔智能边缘计算联合研究院（南京英麒智能科技有限公司）") && en.includes("Intel Intelligent Edge Computing Joint Research Institute (Nanjing Yingqi Intelligent Technology Co., Ltd.)")],
  ["参与项目完整显示11项", (zh.match(/<li class="proj-item">/g) || []).length === 11 && (en.match(/<li class="proj-item">/g) || []).length === 11],
  ["阳怀宇课题组合作研究", zh.includes("华东师范大学生命科学学院阳怀宇课题组") && en.includes("Huaiyu Yang's research group at the School of Life Sciences, East China Normal University")],
  ["鲸英助教团与长期教学", zh.includes("鲸英助教团") && zh.includes("长期参与开源课程的教学工作") && en.includes("Jingying Teaching Assistant Team")],
  ["审稿期刊全称与缩写已补全", ["Knowledge-Based Systems", "Engineering Applications of Artificial Intelligence (EAAI)", "IEEE Transactions on Automatic Control (TAC)", "IEEE Transactions on Neural Networks and Learning Systems (TNNLS)", "IEEE Transactions on Emerging Topics in Computational Intelligence (TETCI)", "npj Digital Medicine", "Journal of Hydrology: Regional Studies (JHRS)", "Water Resources Management (WRM)", "Scientific Reports"].every((name) => zh.includes(name) && en.includes(name))],
  ["组织图标本地化", zh.includes('src="assets/logos/datawhale.png"') && zh.includes('src="assets/logos/ccf.png"') && en.includes('src="../assets/logos/datawhale.png"')],
  ["CSS鱼群无需JS即可显示", (zh.match(/class="fish fish-/g) || []).length === 3 && (en.match(/class="fish fish-/g) || []).length === 3],
  ["指定小字与页脚提示已删除", !zh.includes("DiffAT 与 Robformer 的公开实现见论文条目中的代码链接") && !/静态页面，无跟踪脚本|Static page, no tracking scripts/.test(zh) && !/Static page, no tracking scripts/.test(en)],
  ["英文办公室地址不直接夹带中文", !en.includes("计算机科学与工程学院B501") && !en.includes("安徽省淮南市")],
  ["招生表述强调前沿研究与工程实现", zh.includes("对前沿 AI 研究及工程实现感兴趣") && zh.includes("动手实现前沿理论或技术")],
  ["科研合作使用能源预测", zh.includes("水资源管理、能源预测、工业设备故障知识图谱") && !zh.includes("居民用电与能源预测")],
];

let fail = 0;
for (const [name, ok] of checks) {
  console.log((ok ? "PASS" : "FAIL") + "  " + name);
  if (!ok) fail++;
}
process.exit(fail ? 1 : 0);
