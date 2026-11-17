# 职业照片存放目录

将本人选定的职业照片文件放入本目录，支持 `portrait.jpg` / `portrait.jpeg` / `portrait.png` / `portrait.webp` / `portrait.svg`（按此优先级取第一个存在的文件）。

未放置照片时，构建脚本使用同目录下的 `portrait-placeholder.svg` 占位图。

放入照片后重新运行 `node scripts/build.mjs` 即可生效。照片建议为正方形构图、宽度不小于 400px。
