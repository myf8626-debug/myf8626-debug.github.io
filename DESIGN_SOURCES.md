# 设计与素材来源

2026-11-12 首页按用户要求改为黑白描边卡片：中间个人卡，左右重点项目，后续作品、现场实践也使用独立卡片。首页仅保留简短贡献与缩略图，完整图文进入详情页；黑客松独立为 hackathon.html。采用白底、黑色边框、圆角和轻微错位阴影，保留真实彩色截图。参考 [Kamiyd](https://kamiyd.com/) 简短自述、项目优先的信息组织；没有复制其代码、个人经历或项目素材。使用 frontend-design / ui-ux-pro-max 技能校验排版与响应式，原生 HTML/CSS/JavaScript，无新增运行时依赖。

首页重点展示 Resume Protocol 与 AnythingLLM，再展示诗词语音模块、GreenMate 的前端风格和黑客松现场。每项注明个人贡献、上游与验证环境。

## 图片

- 彩色头像来自本人提供的简历，保持原色。
- Resume Protocol、AnythingLLM 来自本地项目实际运行；截图中的合成样本与真实模型实验分开说明。
- 诗词图来自团队诗词平台的历史运行验收。国风场景来自原项目，个人贡献集中于小书童语音和角色交互；独立仓库不包含原平台的场景资源。
- GreenMate 图片来自 DevEco 原生 Previewer，含演示数据；不是设备性能或真实减排成果证明。
- 黑客松三张照片由用户提供。活动名、日期依据照片及公开活动指南；角色“组织者之一”由本人提供，不扩大个人职责或虚构统计。

## 保留的旧页面与许可

旧 bento.css / bento.js / vendor 适配自 MIT 许可的 [Vighnesh-Gaddam/Portfolio](https://github.com/Vighnesh-Gaddam/Portfolio)，上游版本 afb00e6cf119897740cc700a9758165ed2704878。许可保留在 licenses/vighnesh-portfolio-MIT.txt。新首页使用 overview.css，不加载旧模板或图片灯箱；portfolio.css / cards.css / portfolio.js 继续供详情页和更新日志使用。

work.html 的完整复盘页保留；排版曾参考 [RyanFitzgerald/devportfolio](https://github.com/RyanFitzgerald/devportfolio)。项目的最新验证状态应以对应详情和验证报告为准。
