#!/usr/bin/env node
/**
 * 余洋个人学术主页 — 静态构建脚本
 *
 * 读取 content/ 与 templates/，生成 dist/ 下的静态页面：
 *   dist/index.html      中文版（默认入口）
 *   dist/en/index.html   英文版
 *   dist/styles.css、dist/main.js、dist/assets/...
 *
 * 用法：
 *   node scripts/build.mjs
 *
 * 说明：
 *   - 页面为纯静态 HTML，浏览器无需等待 JS 请求数据即可阅读全文；
 *   - 资源使用相对路径，部署在 GitHub Pages 项目路径或任意子目录均可直接访问；
 *   - 域名确定后，在下方 config.siteUrl 填入完整网址，构建时会输出 canonical 与 og:url。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, readdirSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");

const config = {
  // 域名确定后填写，例如 "https://yangyu-nuaa.github.io"；留 null 则不输出 canonical / og:url
  siteUrl: null,
};

/* ---------- 工具 ---------- */

const readJson = (rel) => {
  const p = join(ROOT, rel);
  if (!existsSync(p)) throw new Error(`缺少文件: ${rel}`);
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch (e) {
    throw new Error(`JSON 解析失败: ${rel} — ${e.message}`);
  }
};

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* ---------- 数据 ---------- */

const profile = readJson("content/profile.json");
const publications = readJson("content/publications.json");
const projects = readJson("content/projects.json");
const teaching = readJson("content/teaching.json");
const service = readJson("content/service.json");
const news = readJson("content/news.json");
const i18n = { zh: readJson("content/i18n/zh.json"), en: readJson("content/i18n/en.json") };

const OWN_NAME = profile.person.name_en; // 作者列表中加粗的本人姓名

// 头像：assets/portrait/ 下按优先级取第一个存在的文件，否则用占位图
const PORTRAIT_CANDIDATES = ["portrait.jpg", "portrait.jpeg", "portrait.png", "portrait.webp", "portrait.svg"];
const portraitDir = join(ROOT, "assets", "portrait");
const portraitFile =
  PORTRAIT_CANDIDATES.find((f) => existsSync(join(portraitDir, f))) || "portrait-placeholder.svg";

/* ---------- 片段渲染 ---------- */

const sectionHead = (num, id, title) => `
      <div class="sec-head">
        <span class="sec-num mono">${num}.</span>
        <h2>${esc(title)}</h2>
        <span class="sec-line"></span>
      </div>`;

const renderNav = (items) =>
  items
    .map(
      (it, i) =>
        `<li><a href="#${it.id}" class="nav-link${i === 0 ? " active" : ""}"><span class="nav-num mono">${String(i + 1).padStart(2, "0")}</span><span class="nav-line"></span><span class="nav-text">${esc(it.label)}</span></a></li>`
    )
    .join("\n            ");

const renderAbout = (t, lang) => {
  const bio = lang === "zh" ? profile.person.bio_html_zh || profile.person.bio_zh : profile.person.bio_html_en || profile.person.bio_en;
  const chips = lang === "zh" ? profile.person.chips_zh : profile.person.chips_en;
  const assetPrefix = lang === "en" ? "../" : "";
  const recognition = (service.recognition || [])
    .map((r) => {
      const name = lang === "en" ? r.name_en || r.name : r.name;
      const mark = r.icon
        ? `<span class="recognition-mark recognition-logo" aria-hidden="true"><img src="${assetPrefix}${esc(r.icon)}" alt="" width="24" height="24"></span>`
        : `<span class="recognition-mark mono" aria-hidden="true">${esc(r.mark)}</span>`;
      const inner = `${mark}<span class="recognition-copy"><strong>${esc(name)}</strong><span>${esc(langField(r, "role"))}</span></span>`;
      return r.url
        ? `<a class="recognition-item" href="${esc(r.url)}" target="_blank" rel="noopener">${inner}</a>`
        : `<div class="recognition-item">${inner}</div>`;
    })
    .join("\n            ");
  return `
      <section id="about" class="section reveal">
        ${sectionHead("01", "about", t.sections.about)}
        <div class="about-body">
          ${bio.map((p) => `<p>${p}</p>`).join("\n          ")}
          <ul class="chips" aria-label="${esc(t.about.chips_label)}">
            ${chips.map((c) => `<li>${esc(c)}</li>`).join("\n            ")}
          </ul>
          ${
            recognition
              ? `<div class="recognition">
            <h3 class="recognition-label mono">${esc(t.about.recognition_label)}</h3>
            <div class="recognition-list">
            ${recognition}
            </div>
          </div>`
              : ""
          }
        </div>
      </section>`;
};

const renderNews = (t, num, lang) => {
  if (!news.items || news.items.length === 0) return "";
  return `
      <section id="news" class="section reveal">
        ${sectionHead(String(num).padStart(2, "0"), "news", t.sections.news)}
        <ul class="xp-list">
          ${news.items
            .map(
              (n) => `<li class="xp-item">
            <p class="xp-period mono">${esc(n.date)}</p>
            <div class="xp-body"><p class="xp-role">${esc(lang === "zh" ? n.zh : n.en)}</p></div>
          </li>`
            )
            .join("\n          ")}
        </ul>
      </section>`;
};

const renderResearch = (t, num) => `
      <section id="research" class="section reveal">
        ${sectionHead(String(num).padStart(2, "0"), "research", t.sections.research)}
        <div class="research-grid">
          ${profile.research
            .map(
              (r, i) => `<article class="research-card">
            <span class="research-index mono">${String(i + 1).padStart(2, "0")}</span>
            <h3>${esc(currentLang === "zh" ? r.zh : r.en)}</h3>
            <p>${esc(langField(r, "description"))}</p>
          </article>`
            )
            .join("\n          ")}
        </div>
      </section>`;

// 依据当前语言取字段（xx_zh / xx_en）
let currentLang = "zh";
const langField = (obj, base) => {
  const v = obj[`${base}_${currentLang}`];
  return v ?? obj[`${base}_zh`] ?? "";
};

const renderPubItem = (p, t) => {
  const coFirstAuthors = p.equal_contribution_authors || [];
  const authors = p.authors
    .map((a) => {
      const name = a === OWN_NAME ? `<strong>${esc(a)}</strong>` : esc(a);
      // 仅对数据中明确标记的共同第一作者添加上标星号（当前为 GPT2-ICC 三位共一）
      return coFirstAuthors.includes(a)
        ? `${name}<sup class="author-star" title="${currentLang === "zh" ? "共同第一作者" : "Co-first author"}">*</sup>`
        : name;
    })
    .join(", ");
  const title = p.url
    ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a>`
    : `<span>${esc(p.title)}</span>`;
  const venue = langField(p, "venue");
  const status = p.status_zh || p.status_en ? esc(currentLang === "zh" ? p.status_zh : p.status_en) : "";
  const links = [
    p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(t.publications.paper_link)}</a>` : "",
    p.code_url ? `<a href="${esc(p.code_url)}" target="_blank" rel="noopener">${esc(t.publications.code_link)}</a>` : "",
    p.pdf_url ? `<a href="${esc(p.pdf_url)}" target="_blank" rel="noopener">PDF</a>` : "",
    p.bibtex ? `<a href="${esc(p.bibtex)}" target="_blank" rel="noopener">${esc(t.publications.bibtex_link)}</a>` : "",
  ].filter(Boolean);
  return `<li class="pub-item">
            <p class="pub-title">${title}</p>
            <p class="pub-authors">${authors}</p>
            <p class="pub-meta"><span>${esc(venue)}</span>${p.volume_pages ? `<span>· ${esc(p.volume_pages)}</span>` : ""}${status ? `<span class="pub-status">${status}</span>` : ""}</p>
            ${langField(p, "summary") ? `<p class="pub-summary">${esc(langField(p, "summary"))}</p>` : ""}
            ${links.length ? `<p class="pub-links">${links.join("\n              ")}</p>` : ""}
          </li>`;
};

const renderPublications = (t, num) => {
  // 已发表：年份倒序，同一年内按 order 升序（居民用电论文 ad-tft 位于 2025 组末尾）
  const pubs = publications.publications
    .slice()
    .sort((a, b) => b.year - a.year || (a.order ?? 999) - (b.order ?? 999));
  let previousYear = null;
  const items = pubs
    .map((p) => {
      const yearHead = p.year !== previousYear
        ? `<li class="pub-year" aria-label="${p.year}"><h3>${p.year}</h3><span></span></li>`
        : "";
      previousYear = p.year;
      return `${yearHead}${renderPubItem(p, t)}`;
    })
    .join("\n          ");

  // 在审工作：按投稿目标期刊排序（order 升序），仅标题、作者、目标期刊与状态
  const underReview = (publications.under_review || [])
    .slice()
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  const underReviewBlock = underReview.length
    ? `<li class="pub-group" aria-label="${esc(t.publications.under_review_title)}"><h3>${esc(t.publications.under_review_title)}</h3><span>${esc(currentLang === "zh" ? publications.under_review_note_zh : publications.under_review_note_en)}</span></li>
        ${underReview.map((p) => renderPubItem(p, t)).join("\n          ")}`
    : "";

  return `
      <section id="publications" class="section reveal">
        ${sectionHead(String(num).padStart(2, "0"), "publications", t.sections.publications)}
        <p class="sec-note">${esc(t.publications.selected_note)}</p>
        <ul class="pub-list">
          ${items}
          ${underReviewBlock}
        </ul>
      </section>`;
};

const projItem = (p, numberLabel) => `
          <li class="proj-item">
            <p class="proj-title">${esc(langField(p, "title"))}</p>
            <p class="proj-meta"><span>${esc(langField(p, "category"))}</span> · <span class="proj-role">${esc(langField(p, "role"))}</span></p>
          </li>`;

const renderProjects = (t, num) => {
  const vertical = (projects.participating || []).filter((p) => p.kind !== "applied");
  const applied = (projects.participating || []).filter((p) => p.kind === "applied");
  const renderGroup = (items, title) => items.length
    ? `<h3 class="sub-title">${esc(title)}</h3>
        <ul class="proj-list">
          ${items.map((p) => projItem(p, t.projects.number_label)).join("\n          ")}
        </ul>`
    : "";
  return `
      <section id="projects" class="section reveal">
        ${sectionHead(String(num).padStart(2, "0"), "projects", t.sections.projects)}
        <h3 class="sub-title">${esc(t.projects.funded_title)}</h3>
        <ul class="proj-grid">
          ${projects.funded
            .map(
              (p) => `<li>
            <article class="proj-card">
              <div class="proj-top"><span class="proj-folder mono">&gt;_</span><span class="proj-arrow" aria-hidden="true">↗</span></div>
              <h3>${esc(langField(p, "title"))}</h3>
              <div class="proj-card-meta"><span>${esc(langField(p, "category"))}</span><span class="proj-role">${esc(langField(p, "role"))}</span></div>
            </article>
          </li>`
            )
            .join("\n          ")}
        </ul>
        ${renderGroup(vertical, t.projects.participating_vertical_title || t.projects.participating_title)}
        ${renderGroup(applied, t.projects.participating_applied_title || t.projects.participating_title)}
        ${
          projects.software && projects.software.length
            ? `<h3 class="sub-title">${esc(t.projects.software_title)}</h3>
        <ul class="sw-list">
          ${projects.software
            .map(
              (s) =>
                `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> — ${esc(langField(s, "description"))}</li>`
            )
            .join("\n          ")}
        </ul>`
            : ""
        }
      </section>`;
};

const periodText = (e, t) => {
  const custom = currentLang === "zh" ? e.period_zh : e.period_en;
  if (custom) return custom;
  if (e.start && e.end) return `${e.start} — ${e.end}`;
  if (e.start && (e.current || !e.end)) return `${e.start} — ${t.experience.present}`;
  return t.experience.current;
};

const renderExperience = (t, num) => {
  const labelSep = currentLang === "zh" ? "：" : ": ";
  const renderXpItem = (e) => `<li class="xp-item">
            <p class="xp-period mono">${esc(periodText(e, t))}</p>
            <div class="xp-body">
              <h3>${esc(langField(e, "institution"))}${e.org_zh || e.org_en ? ` <span class="xp-org">· ${esc(langField(e, "org"))}</span>` : ""}</h3>
              <ul class="xp-points">
                <li>${esc(langField(e, "role"))}</li>
                ${e.advisor_zh ? `<li>${esc(t.experience.advisor_label)}${labelSep}${esc(e.advisor_zh)}</li>` : ""}
              </ul>
            </div>
          </li>`;
  const xpItems = profile.experience.filter((e) => e.kind !== "internship").map(renderXpItem).join("\n          ");
  const internshipItems = profile.experience.filter((e) => e.kind === "internship").map(renderXpItem).join("\n          ");
  const eduItems = profile.education
    .map(
      (ed) => `<li class="xp-item">
            <p class="xp-period mono">${esc(ed.start)} — ${esc(ed.end)}</p>
            <div class="xp-body">
              <h3>${esc(langField(ed, "institution"))}</h3>
              <ul class="xp-points">
                <li>${esc(langField(ed, "degree"))}</li>
                ${
                  (ed.advisors_zh || []).length
                    ? `<li>${esc(t.experience.advisor_label)}${labelSep}${esc((currentLang === "zh" ? ed.advisors_zh : ed.advisors_en).join(currentLang === "zh" ? "、" : ", "))}</li>`
                    : ""
                }
              </ul>
            </div>
          </li>`
    )
    .join("\n          ");
  return `
      <section id="experience" class="section reveal">
        ${sectionHead(String(num).padStart(2, "0"), "experience", t.sections.experience)}
        <h3 class="sub-title">${esc(t.experience.work_title)}</h3>
        <ol class="xp-list">
          ${xpItems}
        </ol>
        ${
          internshipItems
            ? `<h3 class="sub-title experience-sub">${esc(t.experience.internship_title)}</h3>
        <ol class="xp-list">
          ${internshipItems}
        </ol>`
            : ""
        }
        <h3 class="sub-title experience-sub">${esc(t.experience.education_title)}</h3>
        <ol class="xp-list">
          ${eduItems}
        </ol>
      </section>`;
};

const renderTeaching = (t, num) => {
  const li = (s) => `<li>${s}</li>`;
  const pick = (a, b) => (currentLang === "zh" ? a : b);
  const sep = currentLang === "zh" ? "、" : ", ";
  const labelSep = currentLang === "zh" ? "：" : ": ";

  const items = [];
  (pick(service.memberships_zh, service.memberships_en) || []).forEach((m) => items.push(li(esc(m))));
  (service.committee || []).forEach((c) => {
    items.push(li(`${esc(langField(c, "organization"))} · ${esc(langField(c, "role"))}`));
  });
  (service.workshops || []).forEach((w) => {
    const topic = langField(w, "topic");
    const topicText = topic ? labelSep + esc(topic) : "";
    items.push(li(`${esc(w.conference)} · ${esc(langField(w, "role"))}${topicText}`));
  });
  const journals = pick(service.journal_reviewer_zh, service.journal_reviewer_en) || [];
  const conferences = pick(service.conference_reviewer_zh, service.conference_reviewer_en) || [];
  const serviceItems = items.join("\n            ");

  const reform = teaching.reform_project;
  const oss = (teaching.open_source || [])
    .map((o) => {
      const name = o.name_zh ? langField(o, "name") : o.name;
      const link = o.url
        ? (currentLang === "zh" ? `（<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.url)}</a>）` : ` (<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.url)}</a>)`)
        : "";
      return li(`${esc(langField(o, "org"))}${labelSep}${esc(name)} — ${esc(langField(o, "role"))}${link}`);
    })
    .join("\n            ");

  return `
      <section id="teaching" class="section reveal">
        ${sectionHead(String(num).padStart(2, "0"), "teaching", t.sections.teaching)}
        <div class="teaching-stack">
          <div class="teaching-block">
            <h3 class="sub-title">${esc(t.teaching.title)}</h3>
            <p class="section-copy">${esc(langField(teaching, "summary"))}</p>
            ${
              reform
                ? `<h4 class="minor-title">${esc(t.teaching.reform_title)}</h4>
            <ul class="plain-list">
              ${li(`${esc(langField(reform, "title"))}（${esc(langField(reform, "category"))}，${esc(langField(reform, "role"))}${reform.number ? `，${esc(t.projects.number_label)} ${esc(reform.number)}` : ""}）`)}
            </ul>`
                : ""
            }
            ${
              oss
                ? `<h4 class="minor-title">${esc(t.teaching.open_source_title)}</h4>
            <ul class="plain-list">
              ${oss}
            </ul>`
                : ""
            }
          </div>
          ${
            serviceItems
              ? `<div class="service-block">
            <h3 class="sub-title">${esc(t.teaching.service_title)}</h3>
            <ul class="plain-list">
                ${serviceItems}
            </ul>
            ${
              journals.length || conferences.length
                ? `<div class="review-copy">
              <p><strong>${esc(t.teaching.reviewer_journal)}${labelSep}</strong>${esc(journals.join(sep))}${currentLang === "zh" ? "等。" : ", etc."}</p>
              <p><strong>${esc(t.teaching.reviewer_conference)}${labelSep}</strong>${esc(conferences.join(sep))}${currentLang === "zh" ? "等。" : ", etc."}</p>
            </div>`
                : ""
            }
          </div>`
              : ""
          }
        </div>
      </section>`;
};

const renderContact = (t, num) => {
  const p = profile.person;
  const contactItems = [
    `<span class="contact-label">${esc(t.contact.email_label)}</span><span class="contact-value"><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></span>`,
    (p.office_zh || p.office_en) ? `<span class="contact-label">${esc(t.contact.office_label)}</span><span class="contact-value">${esc(currentLang === "en" ? p.office_en || p.office_zh : p.office_zh)}</span>` : "",
    (p.address_zh || p.address_en) ? `<span class="contact-label">${esc(t.contact.address_label)}</span><span class="contact-value">${esc(currentLang === "en" ? p.address_en || p.address_zh : p.address_zh)}${p.postcode_zh ? `（${esc(p.postcode_zh)}）` : ""}</span>` : "",
    p.links.github ? `<span class="contact-label">${esc(t.contact.github_label)}</span><span class="contact-value"><a href="${esc(p.links.github)}" target="_blank" rel="noopener">${esc(p.links.github)}</a></span>` : "",
    p.college_url ? `<span class="contact-label">${esc(t.contact.college_label)}</span><span class="contact-value"><a href="${esc(p.college_url)}" target="_blank" rel="noopener">${esc(p.college_url)}</a></span>` : "",
  ].filter(Boolean);
  return `
      <section id="contact" class="section reveal">
        ${sectionHead(String(num).padStart(2, "0"), "contact", t.sections.contact)}
        <div class="contact-layout">
          <aside class="contact-panel contact-panel-wide">
            <h3 class="sub-title">${esc(t.contact.info_title)}</h3>
            <ul class="contact-list">
              ${contactItems.map((c) => `<li>${c}</li>`).join("\n              ")}
            </ul>
          </aside>
          <div class="contact-intro">
            <h3 class="sub-title">${esc(t.contact.recruitment_title)}</h3>
            <p class="section-copy">${esc(currentLang === "zh" ? p.recruitment_zh : p.recruitment_en)}</p>
            <h3 class="sub-title">${esc(t.contact.collaboration_title)}</h3>
            <p class="section-copy">${esc(currentLang === "zh" ? p.collaboration_zh : p.collaboration_en)}</p>
          </div>
        </div>
      </section>`;
};

const SOCIAL_ICONS = {
  github:
    '<svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>',
  email:
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
};

const renderSocial = (t) => {
  const p = profile.person;
  const items = [];
  if (p.links.github) items.push(`<li><a href="${esc(p.links.github)}" target="_blank" rel="noopener" aria-label="GitHub" title="GitHub">${SOCIAL_ICONS.github}</a></li>`);
  if (p.email) items.push(`<li><a href="mailto:${esc(p.email)}" aria-label="${esc(t.contact.email_label)}" title="${esc(p.email)}">${SOCIAL_ICONS.email}</a></li>`);
  if (p.college_url) items.push(`<li><a href="${esc(p.college_url)}" target="_blank" rel="noopener" aria-label="${esc(t.contact.college_label)}" title="${esc(t.contact.college_label)}">${SOCIAL_ICONS.link}</a></li>`);
  return items.join("\n          ");
};

/* ---------- 页面组装 ---------- */

const buildPage = (lang) => {
  currentLang = lang;
  const t = i18n[lang];
  const p = profile.person;
  const prefix = lang === "en" ? "../" : "";

  // 栏目顺序：关于、（最新动态，可选）、研究方向、论文、项目、经历、教学与服务、招生与联系
  const sectionDefs = [
    { id: "about", label: t.nav.about },
    ...(news.items && news.items.length ? [{ id: "news", label: t.nav.news }] : []),
    { id: "research", label: t.nav.research },
    { id: "publications", label: t.nav.publications },
    { id: "projects", label: t.nav.projects },
    { id: "experience", label: t.nav.experience },
    { id: "teaching", label: t.nav.teaching },
    { id: "contact", label: t.nav.contact },
  ];

  const blocks = [];
  let n = 1;
  blocks.push(renderAbout(t, lang));
  if (news.items && news.items.length) {
    n = 2;
    blocks.push(renderNews(t, n, lang));
  }
  n += 1;
  blocks.push(renderResearch(t, n));
  n += 1;
  blocks.push(renderPublications(t, n));
  n += 1;
  blocks.push(renderProjects(t, n));
  n += 1;
  blocks.push(renderExperience(t, n));
  n += 1;
  blocks.push(renderTeaching(t, n));
  n += 1;
  blocks.push(renderContact(t, n));

  const nameMain = lang === "zh" ? p.name_zh : p.name_en;
  const nameSub = lang === "zh" ? p.name_en : `(${p.name_zh})`;

  const metaTags = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(t.doc_title)}">`,
    `<meta property="og:description" content="${esc(t.meta_description)}">`,
    config.siteUrl ? `<link rel="canonical" href="${esc(config.siteUrl + (lang === "en" ? "/en/" : "/"))}">` : "",
    config.siteUrl ? `<meta property="og:url" content="${esc(config.siteUrl + (lang === "en" ? "/en/" : "/"))}">` : "",
    `<meta name="twitter:card" content="summary">`,
  ]
    .filter(Boolean)
    .join("\n  ");

  const tokens = {
    html_lang: lang === "zh" ? "zh-CN" : "en",
    doc_title: t.doc_title,
    meta_description: t.meta_description,
    meta_tags: metaTags,
    prefix,
    eyebrow: t.eyebrow,
    lang_other_href: t.lang_other_href,
    lang_other_hreflang: t.lang_other_hreflang,
    lang_other_title: t.lang_other_title,
    lang_self_label: t.lang_self_label,
    lang_other_label: t.lang_other_label,
    portrait_src: `${prefix}assets/portrait/${portraitFile}`,
    portrait_alt: t.portrait_alt,
    name_main: nameMain,
    name_sub: nameSub,
    role_line: t.role_line,
    tagline: t.tagline,
    email: p.email,
    nav_aria: t.nav_aria,
    nav_items: renderNav(sectionDefs),
    social_aria: t.social_aria,
    social_links: renderSocial(t),
    news_block: news.items && news.items.length ? blocks[1] : "",
    about_block: blocks[0],
    research_block: blocks[news.items && news.items.length ? 2 : 1],
    publications_block: blocks[news.items && news.items.length ? 3 : 2],
    projects_block: blocks[news.items && news.items.length ? 4 : 3],
    experience_block: blocks[news.items && news.items.length ? 5 : 4],
    teaching_block: blocks[news.items && news.items.length ? 6 : 5],
    contact_block: blocks[news.items && news.items.length ? 7 : 6],
    footer_text: t.footer,
  };

  let html = readFileSync(join(ROOT, "templates", "home.html"), "utf8");
  const missing = [];
  html = html.replace(/\{\{(\w+)\}\}/g, (m, key) => {
    if (!(key in tokens)) {
      missing.push(key);
      return m;
    }
    return tokens[key];
  });
  if (missing.length) throw new Error(`模板中存在未提供的 token: ${missing.join(", ")}`);

  const outDir = lang === "en" ? join(DIST, "en") : DIST;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html, "utf8");
  return join(outDir, "index.html");
};

/* ---------- 主流程 ---------- */

// dist 不存在时创建；已存在则直接覆盖写入（不删除目录，避免触发访问限制）
if (!existsSync(DIST)) mkdirSync(DIST, { recursive: true });

// 将 dist 内已有文件改为可写，便于覆盖（例如只读的图片副本）
const makeWritable = (dir) => {
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else {
        try {
          chmodSync(p, 0o666);
        } catch {
          /* 忽略 */
        }
      }
    }
  };
  walk(dir);
};
makeWritable(DIST);

const zhOut = buildPage("zh");
const enOut = buildPage("en");

// 复制静态资源
cpSync(join(ROOT, "styles.css"), join(DIST, "styles.css"));
cpSync(join(ROOT, "main.js"), join(DIST, "main.js"));
cpSync(join(ROOT, "ascii-ocean.js"), join(DIST, "ascii-ocean.js"));
cpSync(join(ROOT, "assets"), join(DIST, "assets"), { recursive: true });

console.log("构建完成：");
console.log("  " + zhOut);
console.log("  " + enOut);
console.log("  头像：" + portraitFile + (portraitFile === "portrait-placeholder.svg" ? "（占位图，放入 assets/portrait/portrait.* 后重新构建）" : ""));
if (!config.siteUrl) console.log("  提示：域名确定后在 scripts/build.mjs 的 config.siteUrl 填入网址，即可输出 canonical 与 og:url。");
