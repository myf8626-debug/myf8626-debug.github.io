# 苗怡飞的个人作品集

基于 [Vighnesh-Gaddam/Portfolio](https://github.com/Vighnesh-Gaddam/Portfolio) 的 MIT 模板制作的静态适配版，融合个人简历、实习和六项作品，部署于 GitHub Pages。个人介绍居中，项目分列两侧；支持详情弹窗、深浅主题与手机布局。

- `index.html` / `bento.css` / `bento.js`：卡片主页、主题切换和原生 dialog 详情。首页默认深色。
- `work.html` / `style.css` / `theme.css` / `site.js`：完整项目复盘、实习与教育信息，保留筛选、深链接及打印样式。禁用 JavaScript 时，主页卡片会跳转到此页。
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

当前三个新实验已完成可复现样例与接口，共 55 项确定性回归检查通过，另完成浏览器与后端结果一致性检查。
这不是模型效果评测：没有接入真实模型、联网检索或上游 SDK；数据全部为人工构造样例。
GPT Researcher、LightRAG、Vanna 是应用方向参考，当前项目不是其完整 fork；sql.js 为实际使用的第三方库，随包保留许可证。

现有项目边界不变：论文 skill 尚未在真实论文上验证，Resume Protocol 的真实模型端到端尚未验证；实习不发布缺少记录的性能数字。
