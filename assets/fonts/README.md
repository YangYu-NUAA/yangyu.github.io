# 本地字体

页面运行时只读取本目录字体，不请求外部字体 CDN。

| 字体 | 用途 | 来源 |
| --- | --- | --- |
| Sentient 400 / 500 / 700（含斜体） | 英文衬线标题、姓名、栏目标题 | [Fontshare — Sentient](https://www.fontshare.com/fonts/sentient) |
| Inter Variable（Latin） | 正文与界面文字 | [@fontsource-variable/inter](https://www.npmjs.com/package/@fontsource-variable/inter)，SIL Open Font License |
| Geist Mono Variable（Latin） | 编号、年份、刊物信息与链接 | [@fontsource-variable/geist-mono](https://www.npmjs.com/package/@fontsource-variable/geist-mono)，SIL Open Font License |

中文姓名、标题与小标题使用系统黑体/雅黑类字体回退，中文不使用楷体或斜体；英文保留 Sentient 衬线风格。无需下载大型中文字体文件，以控制页面体积。
