# 苗怡飞 · 个人作品集

线上：https://myf8626-debug.github.io/

静态 HTML / CSS / JavaScript，GitHub Pages 托管，无构建依赖。

本地预览：`python -m http.server 3221 --bind 127.0.0.1`，打开 http://127.0.0.1:3221/ 。

- index.html / overview.css：紧凑的黑白卡片首页，个人介绍居中，重点项目两侧排列，点击卡片进入详情。
- portfolio.css / cards.css / portfolio.js：详情页、更新日志样式与图片放大。
- resume-protocol.html / anythingllm.html：重点项目、个人贡献与验证边界。
- poetry.html / greenmate.html：诗词语音模块与鸿蒙原生界面。
- internship.html：潮向信息科技数据中台实习与 AI 辅助审查流程。
- hackathon.html：活动组织、社群身份、现场照片与活动指南。
- work.html / verification.html：既有完整复盘和验证记录。
- assets/：真实运行截图与用户提供照片。
- evidence/：可公开的验证数据。

来源、图片性质和旧模板许可见 DESIGN_SOURCES.md。GitHub Pages 只展示静态作品，不提供模型调用或应用后台。

## 更新日志

修改 `updates.json`（按日期倒序），然后运行 `python scripts/render-updates.py`。首页导航和页脚的“更新日志”入口在新标签页打开 `updates.html`；日志页默认显示最新 3 条，其余使用原生折叠区；无 JavaScript 也可阅读。页面日期显示到月份，源数据保留实际日期用于排序。日期来自项目记录、验收报告或公开发布记录，避免把发布时间当作全部功能的开发时间。每条记录写清验证范围并附可公开的依据。
