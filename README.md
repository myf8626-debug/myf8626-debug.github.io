# 苗怡飞的个人作品集

基于 [Vighnesh-Gaddam/Portfolio](https://github.com/Vighnesh-Gaddam/Portfolio) 的 MIT 模板制作的静态适配版，展示个人介绍、教育信息和三项主要作品，部署于 GitHub Pages。个人介绍居中，项目分列两侧；支持详情弹窗、深浅主题与手机布局。

- `index.html` / `bento.css` / `bento.js`：卡片主页、主题切换和原生 dialog 详情。首页默认深色。
- `palette.css`：蓝灰背景、多色项目卡片及对应的浅色主题；头像与截图保留原始颜色。
- `work.html` / `style.css` / `theme.css` / `site.js`：主要项目复盘与教育信息，保留深链接及打印样式。禁用 JavaScript 时，主页卡片会跳转到此页。
- `vendor/vighnesh-portfolio/theme-tokens.css`：沿用的模板颜色变量。
- `licenses/vighnesh-portfolio-MIT.txt`：原作者 MIT 许可及版权声明。
- `assets/`：本人提供的简历原件、证件照与实际样例截图。
- `DESIGN_SOURCES.md`：上游模板版本、适配说明与内容来源。
- `case-studies-public.md`：已有项目的职责与验证边界。
- `labs/`：岗位调研证据台、政策溯源问答、门店数据分析台。
- `labs/source/`：三个项目可直接阅读的后端代码、测试及说明。
- 各应用的 `source.zip`：包含前后端、样例、测试和许可证的完整可运行源码。

本地预览：`python -m http.server 8310 --bind 127.0.0.1`，打开 http://127.0.0.1:8310/ 。
独立源码解压后运行 `python server.py`；运行 `python evaluate.py` 复现检查。

## 2026-11-11 更新

主页与详情同步最新成果，证据集中在 verification.html：
- Resume Protocol：一个真实模型、合成材料的完整导出流程；仅发布经过筛选的运行摘要和虚构材料截图，不上传团队源文件、账户数据或原始会话日志。
- 论文工具：14 项合成 ZIP/XML 回归，提供本地验证版源码下载；尚无真实论文验证，不声称开源远端已同步本地修复。
- 门店分析台：46 项回归、7 组 Python/WASM 一致性检查；真实模型首次 5/6，修正列约束后同题复测 6/6。线上 GitHub Pages 只运行固定查询，不提供模型后端。
- 其他两个实验保持人工构造样例和原有能力边界；实验项目退出主要作品列表，旧源码与验证记录保留。

源码归属和参考项目见各项目 THIRD_PARTY.md。截图保留原始运行含义，不把合成测试当生产成果。

## 技术核对与项目排序

主项目顺序为 Resume Protocol、云栈、draft-thesis-docx。候选人检索为关键词匹配和类型提示，未接入向量检索；云栈依据本地代码纠正为 Vue 3 / TypeScript / Element Plus，分片上传不写作 RAG 文档切分。本次云栈类型检查因工具链错误未完成。核对摘要位于 evidence/technology-review.json。单页投递简历在本地另行交付，不恢复网站求职入口。
