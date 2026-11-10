# 模板与内容来源

当前首页基于 [Vighnesh-Gaddam/Portfolio](https://github.com/Vighnesh-Gaddam/Portfolio) 适配，采用 MIT 许可。

- 上游版本：`afb00e6cf119897740cc700a9758165ed2704878`。
- 原作者：Vighnesh Gaddam。原许可完整保存在 `licenses/vighnesh-portfolio-MIT.txt`。
- `vendor/vighnesh-portfolio/theme-tokens.css` 提取自该版本的 `src/app/globals.css`，沿用深浅色主题变量。
- `bento.css` 的卡片表面、28–32px 圆角、箭头提示、悬停反馈与进入动效，适配自 `src/components/BentoCard.tsx`。
- 布局与详情、联系入口分别依据 `src/app/page.tsx`、`DetailView.tsx`、`ConnectionHub.tsx` 调整。

## 本站适配

保留模板的黑色卡片、大小错落布局与点击展开方式，按本人要求将个人资料置于中央、左右放置项目，底部加入实习、教育和联系卡片。

原模板使用 Next.js / React / Framer Motion。本站为兼容现有 GitHub Pages 静态站点，将所需界面适配为 HTML/CSS/JavaScript；弹窗改为原生 `dialog`，支持 Escape、焦点恢复、浏览器前进后退及深链接，未声称继续运行原 React 组件。无构建步骤、无新增运行时依赖、无外部字体请求。

未复制作者的个人介绍、工作履历、照片、项目、博客、评价或 GitHub 活动数据。本站保留本人真实职责和验证边界，不添加没有数据来源的统计卡。

`work.html` 保留上一版的完整复盘和筛选页面，也是禁用 JavaScript 时的卡片跳转目标；相关排版曾参考 [RyanFitzgerald/devportfolio](https://github.com/RyanFitzgerald/devportfolio)。

## 个人内容与素材

- 简历 PDF 与证件照来自本人提供的《苗怡飞-简历-2026.pdf》。下载文件为原件；首页黑白照片仅由 CSS 显示效果实现，未改写原图片。
- 三个交互样例缩略图来自实际网页运行截图；其数据为人工构造，真实模型尚未接入。
- 完整项目页的 Resume Protocol、论文工具和云栈预览为明确标注的机制或模块示意。
- 团队项目只说明本人职责；论文工具尚未在真实论文上验证，Resume Protocol 的真实模型端到端尚未验证。实习不发布缺少核对记录的效率百分比。
