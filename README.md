# 余洋 · 个人学术主页

安徽理工大学计算机科学与工程学院特聘副教授余洋的个人学术主页。纯静态网站（原生 HTML/CSS/JS，无框架、无后端、无第三方脚本），布局参考 [KMnO4-zx 个人主页](https://kmno4-zx.github.io/KMnO4-zx/)：桌面端为固定侧栏 + 滚动正文，支持中英文切换。

## 目录结构

```text
yu-yang-homepage/
├── content/                  # 全部页面内容（改内容只动这里）
│   ├── profile.json          #   身份信息、简介、研究方向、教育经历、工作经历、招生文案
│   ├── publications.json     #   论文列表
│   ├── projects.json         #   科研项目（主持/参与）与研究软件
│   ├── teaching.json         #   教学、教改项目、开源教育贡献
│   ├── service.json          #   学术服务（会员、委员、Workshop、审稿）
│   ├── news.json             #   最新动态（为空时页面自动省略该栏目）
│   └── i18n/zh.json          #   中文界面文案（栏目名、链接文字等）
│       i18n/en.json          #   英文界面文案
├── templates/
│   └── home.html             # 页面骨架（含 {{token}} 占位符）
├── assets/
│   ├── portrait/             # 职业照片（portrait.jpg，已置入本人照片）
│   ├── fonts/                # 本地字体（Sentient / Inter / Geist Mono）
│   ├── logos/                # Datawhale 与 CCF 官方组织图标
│   ├── figures/              # 方法图、项目界面图（备用）
│   └── photos/               # 学术活动照片（备用）
├── scripts/
│   ├── build.mjs             # 构建脚本：content/ + templates/ → dist/
│   ├── verify.mjs            # 构建产物核对（内容边界、结构完整性）
│   └── screenshot.mjs        # 本地验收截图工具（需要本机 Chrome）
├── ascii-ocean.js            # 动态海流、微粒与鼠标视差背景（自主实现）
├── styles.css                # 全站样式
├── main.js                   # 交互（滚动显现、目录高亮、平滑滚动、鼠标光斑；无统计无外部请求）
├── .github/workflows/deploy.yml  # 自动构建与部署配置（默认仅手动触发）
├── dist/                     # 构建产物（部署这个目录）
│   ├── index.html            #   中文版
│   └── en/index.html         #   英文版
└── screenshots/              # 本地验收截图（360/768/1440px，中英文）
```

## 本地预览

需要 Node.js（18 及以上）：

```bash
node scripts/build.mjs      # 构建，输出到 dist/
node scripts/verify.mjs     # 可选：核对构建产物（内容边界与结构）
```

然后用浏览器直接打开 `dist/index.html`（中文版）或 `dist/en/index.html`（英文版）即可，无需服务器。资源全部使用相对路径，复制到任何目录或子路径都能正常访问。构建采用覆盖写入，不会改动 `content/` 等源文件；如见 `dist/` 内容异常，可手动删除 `dist/` 后重新构建。

视觉说明：页面背景为自主实现的高精度 ASCII 鱼群引擎（`ascii-ocean.js`），采用鱼体脊柱、字符网格、轮廓多次采样与明暗字符，并包含小鱼群和海流。背景按本人要求默认播放，本地 Chrome 直接打开 `dist/index.html` 也会运动，不需要先运行 GitHub Build；JavaScript 不可用时才显示 CSS 备用鱼群。页面滚动显现等界面过渡仍遵循系统的「减少动态效果」设置。Sentient、Inter 与 Geist Mono 字体均已下载到 `assets/fonts/`，Datawhale 与 CCF 图标位于 `assets/logos/`，运行时不请求外部字体或图标 CDN。中文姓名与标题采用现代黑体/雅黑类字体，中文职称和小标题不使用楷体或斜体；英文保留 Sentient 衬线风格。研究方向采用 2×2 卡片，论文按年份分组；教学与学术服务上下排列，审稿接在学术服务条目之后；联系方式使用通栏信息卡，招生与科研合作采用全宽正文，避免长英文形成窄长栏，窄屏自动改为单栏。背景透明度适度降低，以减少对正文的干扰。

## 如何更新内容（不需要改页面代码）

所有内容都在 `content/` 下的 JSON 文件中，修改后重新运行 `node scripts/build.mjs` 即可。每个 JSON 文件头部都有 `note` 字段说明维护规则。

### 增加一篇论文

编辑 `content/publications.json`，在 `publications` 数组里复制一条记录修改：

```json
{
  "id": "唯一英文短 id",
  "order": 1,
  "title": "论文题名（保持原文）",
  "authors": ["Yang Yu", "合作者……"],
  "author_role_zh": "第一作者",
  "author_role_en": "First author",
  "venue_zh": "期刊或会议名",
  "venue_en": "Venue name",
  "volume_pages": "卷期页码，没有可留 null",
  "year": 2026,
  "status": "published",
  "url": "论文链接，没有填 null",
  "code_url": "代码链接，没有填 null",
  "pdf_url": null,
  "bibtex": null,
  "summary_zh": "一句话简述（可留空字符串）",
  "summary_en": "One-line summary"
}
```

规则：

- 列表先按 `year` 倒序分组，再按同一年内的 `order` 升序排列；`order` 越小越靠前。居民用电论文 `ad-tft` 设为 2025 年组的最后一篇，位于 2024 年论文之前；
- 作者列表中的 `Yang Yu` 会自动加粗，不要手动加星号；
- 页面默认**不展示**第一作者/共同第一作者等身份标注，`author_role_zh` / `author_role_en` 仅保留在数据中备查；按本人后续明确要求，若条目包含 `equal_contribution_authors`，对应作者姓名右上角显示 `*`，当前仅用于 GPT2-ICC 的 Zihan Zhou、Yang Yu、Chengji Yang 三位共同第一作者；
- `url` / `code_url` / `pdf_url` / `bibtex` 为 `null` 时，页面不渲染对应入口（不会出现无效的「论文」「代码」按钮）；
- 在投论文经本人确认公开后再加入；预印本可将 `status` 设为 `preprint`，与已发表分开管理。

### 增加科研项目

编辑 `content/projects.json`：`funded` 为主持项目（页面以卡片展示），`participating` 为参与项目，`software` 为研究软件。参与项目通过 `kind: "vertical"` 与 `kind: "applied"` 分为纵向、横向及工程应用两组，当前完整展示 11 项。字段含义与论文类似（`title_zh` / `title_en` / `category_zh` / `category_en` / `role_zh` / `role_en`）。按本人要求，页面不展示项目编号，数据中也不再保留编号字段。

### 增加最新动态

编辑 `content/news.json`：

```json
{ "date": "2026-12", "zh": "中文内容", "en": "English text" }
```

`items` 为空数组时页面自动省略「最新动态」栏目，不留空栏。

### 修改教学、学术服务

分别编辑 `content/teaching.json` 与 `content/service.json`。

### 修改研究方向、简介、招生文案

编辑 `content/profile.json`：`research` 数组为四个研究方向；`person.bio_html_zh` / `person.bio_html_en` 为带重点加粗的首页简介（纯文本备份为 `bio_zh` / `bio_en`，数组每个元素一段）；`person.recruitment_zh` / `person.recruitment_en` 为招生说明；`person.tagline_zh` / `person.tagline_en` 为侧栏一句话介绍。

### 修改界面文字（栏目名、按钮文字等）

编辑 `content/i18n/zh.json` 与 `content/i18n/en.json`，两侧保持同一批键。

### 更换职业照片

当前使用本人提供的 `assets/portrait/portrait.jpg`（已按竖版原图无缝补边为正方形，头像按完整头肩构图显示）。如需更换：替换该文件后重新构建即可，建议竖版构图、白色或纯色底。未放置照片时显示同目录下的占位图。

## 部署（GitHub Pages）

仓库已附带 `.github/workflows/deploy.yml`，默认只在手动触发时构建部署（**未经本人确认不会自动发布**）。确认部署的步骤：

1. 将本项目推送到 GitHub 仓库；
2. 仓库页面进入 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**；
3. 进入 **Actions** 标签页，手动运行 *Build and Deploy* 工作流；
4. 若希望以后每次推送自动更新页面，编辑 `.github/workflows/deploy.yml`，取消 `push:` 两行的注释。

说明：

- 部署产物只有 `dist/` 目录，`content/`、`templates/`、`scripts/` 等源文件不会公开到页面上；
- 所有资源使用相对路径，使用项目路径（如 `https://用户名.github.io/仓库名/`）或自定义域名均可直接访问和刷新；
- 域名确定后，编辑 `scripts/build.mjs` 顶部的 `config.siteUrl` 填入完整网址，重新构建即可输出 `canonical` 与 `og:url`（未确定时不输出，不伪造）；
- 不要把本地核对清单、申请书、合同、匿名稿件、证件信息或整个资料文件夹放进本仓库。

## 预览与撤回

- 预览：本地改完 JSON → `node scripts/build.mjs` → 浏览器打开 `dist/index.html`；
- 想截图核对多宽度布局：`node scripts/screenshot.mjs "file:///<dist 绝对路径>/index.html" 1440 900 输出前缀`（需要本机装有 Chrome）；
- 撤回错误修改：内容文件都在 Git 版本控制内，`git log` 找到改动前的提交，`git checkout <提交号> -- content/` 后重新构建即可；未提交时直接改回 JSON 再构建。

## 验收记录（2026-11-18）

已在 360px / 768px / 1440px 三种宽度下对中英文版本做了本地渲染验收，截图见 `screenshots/`：

| 检查项 | 结果 |
| --- | --- |
| 360 / 768 / 1440px 无横向溢出 | 通过 |
| 长英文论文题名换行不溢出 | 通过 |
| 中英文切换（链接跳转，无需 JS） | 通过 |
| 导航目录在各宽度可用（移动端自动换行显示） | 通过 |
| 关闭 JavaScript 时正文完整可读 | 通过（显现动画由 JS 开启，无 JS 不隐藏内容） |
| 无第三方脚本、无统计、无虚构访问量 | 通过 |
| 空字段（Scholar、ORCID、无链接论文）不渲染入口 | 通过 |
| 头像为本人照片，头肩构图不变形 | 通过 |
| 动态海流与光斑遵循 prefers-reduced-motion | 通过 |
| 高精度 ASCII 鱼群在本地 Chrome 默认设置下持续运动（双时间点像素验证） | 通过 |
| JavaScript 不可用时 CSS 备用鱼群仍可显示 | 通过 |
| 参与项目 11 项完整显示，纵向与横向分组 | 通过 |
| GPT2-ICC 三位共同第一作者上标星号，其他论文不误标 | 通过 |
| 联系方式通栏卡片与全宽正文，英文页无窄长栏 | 通过 |
| 本地字体加载，无外部字体 CDN 请求 | 通过 |
| 中文黑体排版，无楷体与中文斜体 | 通过 |
| 居民用电论文位于 2025 组末尾、2024 年论文之前 | 通过 |

后续如内容增多，可再拆分「全部论文」页、项目详情页、课程页与公开 CV。

## 内容边界（发布前请再次确认）

- 不展示 Scholar、ORCID、在投论文、专利申请细节与未核对奖项；
- 不显示论文分区、影响因子、审稿人名单徽标；
- 项目日期不根据编号推断；主持/参与身份按 `content/` 中字段如实呈现；
- 企业英文名未提供时采用拼音式英文译名，中文仅放在括号内；研究院与公司采用核对后的中英文名称。
