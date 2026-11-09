# 苗怡飞的个人作品集

HTML/CSS 主页与三个可交互的样例应用，部署于 GitHub Pages。

- `index.html` / `style.css`：个人主页与打印样式。
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
