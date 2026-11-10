# 来源与贡献边界

应用方向参考：https://github.com/vanna-ai/vanna

本项目不是上游仓库的完整 fork，未复制其算法代码，也未声称实现其模型能力。
当前代码使用 AI 辅助开发，新增的是样例数据、核验逻辑、浏览器界面、Python API 与验证用例。
未集成 Vanna SDK，未实现联网检索。另以官方 DeepSeek API 实现本地 Text-to-SQL，并完成合成数据小样本调用；不计入上游框架能力。

实际使用：sql.js 1.13.0（MIT），浏览器内执行 SQLite。随包保存原始 JS、WASM 和许可证，未修改。来源 https://github.com/sql-js/sql.js 。SQLite 的许可见该项目说明。
