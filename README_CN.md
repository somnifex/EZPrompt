<div align="center">

# EZPrompt

`<strong>`通用 AI 聊天提示词管理器（Userscript）`</strong><br/>`
在多个 AI 聊天平台之间统一管理、搜索、插入可复用提示词模板。

[English](README.md) · [简体中文](README_CN.md)

<br/>

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Userscript](https://img.shields.io/badge/Platform-Tampermonkey-green)
![Status](https://img.shields.io/badge/状态-活跃-success)
![WebDAV](https://img.shields.io/badge/同步-WebDAV-orange)

</div>

---

## 目录

1. 项目简介
2. 功能特性
3. 支持站点
4. 安装
5. 使用指南
6. 模板变量
7. WebDAV 同步
8. 快捷键
9. 架构概览
10. 开发
11. 规划 (Roadmap)
12. 贡献指南
13. 常见问题
14. 隐私与安全
15. 许可证

## 1. 项目简介

EZPrompt 是一个轻量用户脚本，帮助你构建个人提示词库，并在 ChatGPT、Claude、Gemini、DeepSeek、通义千问等聊天输入框中快速插入。强调：本地优先、私有数据、可扩展站点适配器与模板变量。

## 2. 功能特性

### 效率

- 集中式提示词库（分类 + 搜索）
- 快速呼出面板（`Ctrl+Shift+P`）
- 插入模式：光标 / 覆盖 / 前缀 / 后缀
- 使用统计 + 轻量推荐（最近 & 高频）

### 数据与同步

- 纯本地存储（默认）
- 可选 WebDAV 跨设备同步
- 导入 / 导出（JSON；CSV 计划支持）
- 数据完全可迁移

### 创作增强

- 模板变量 `{name}` / `{task|默认值}`
- 插入前动态变量填充对话框
- 简洁的新增 / 编辑流程

### 用户体验

- 中英文双语
- 浅色 / 深色 / 跟随系统
- 键盘友好（上下 / Enter / Esc）
- 推荐提示词分组区域

### 可扩展性

- 站点检测 + 输入框策略 (value / contentEditable)
- 支持自定义站点（正则匹配 + 选择器）

### 性能

- 生产构建体积大幅压缩（示例：380 KB → ~1.9 KB）
- 懒加载 + 最小 DOM 占用
- 观察者合理使用，避免内存泄漏

## 3. 支持站点

| 平台            | 域名                                |
| --------------- | ----------------------------------- |
| ChatGPT         | chat.openai.com, chatgpt.com        |
| Claude          | claude.ai                           |
| Gemini          | gemini.google.com                   |
| DeepSeek        | chat.deepseek.com                   |
| 通义千问 / Qwen | tongyi.aliyun.com, qwen.alibaba.com |

自定义站点：后续将提供 UI；目前可通过代码层添加。

## 4. 安装

1. 安装浏览器扩展 Tampermonkey：https://www.tampermonkey.net/
2. 打开脚本：https://github.com/somnifex/EZPrompt/raw/main/ezprompt.min.user.js （或下载后手动导入）
3. 在 Tampermonkey 中确认安装
4. 打开任一支持站点，点击页面上的提示词按钮或使用快捷键

开发调试可使用未压缩版本：`ezprompt.user.js`。

## 5. 使用指南

核心操作：

- 打开面板：按钮 / `Ctrl+Shift+P`
- 搜索：输入即过滤
- 插入：Enter 或点击列表项
- 关闭：`Escape`
- 编辑 / 新增：面板底部按钮
- 切换插入模式：底部选择框

插入模式说明：

- cursor（默认）：在当前光标位置插入
- replace：覆盖整个输入框
- prefix：内容追加到原文本前
- suffix：内容追加到原文本后

## 6. 模板变量

语法：`{变量}` 或 `{变量|默认值}`。
含变量的提示词在插入时会弹窗请求填写，默认值自动填充。

示例：

```
你好 {姓名}，请帮我完成 {任务|总结本文要点}。
```

## 7. WebDAV 同步

1. 打开设置 (`Ctrl+Shift+S`)
2. 填写 WebDAV 地址、账号、密码
3. 可选：启用自动同步（定时 / 变更后触发）
4. 使用导出 / 导入进行手动备份

说明：

- 未配置 WebDAV 时所有数据仅存于本地浏览器
- 冲突当前采取“后写覆盖”（后续考虑更细粒度合并）

## 8. 快捷键

| 动作         | 默认           |
| ------------ | -------------- |
| 打开提示面板 | Ctrl+Shift+P   |
| 打开设置     | Ctrl+Shift+S   |
| 关闭面板     | Escape         |
| 插入选中     | Enter          |
| 上下导航     | 方向键 ↑ / ↓ |

快捷键后续计划在 UI 中可配置；当前定义在存储设置对象里。

## 9. 架构概览

```
src/
	core/siteAdapter.ts    # 站点与输入框探测
	storage/local.ts       # 本地存储 + 站点预设 + CRUD
	ui/promptPanel.ts      # 面板 UI + 搜索 + 插入逻辑 + 热键
build-production.js      # 构建与压缩脚本
ezprompt.user.js         # 开发版脚本
ezprompt.min.user.js     # 生产版脚本
```

核心概念：

- Site Adapter：提供选择器 + 输入策略
- Storage Snapshot：存储 prompts / categories / settings / sites
- Insert Mode：不同插入行为实现
- Variable Resolver：插入时动态解析变量

## 10. 开发

依赖：Node.js (建议 >=18)。当前无运行时第三方依赖。

构建生产脚本：

```
node build-production.js
```

构建过程：设置生产标记、移除调试日志、压缩内联 CSS/JS、更新元数据、生成 `build-report.json`。

测试：暂无正式测试框架，欢迎贡献（建议从 storage 与变量解析开始）。

代码风格：可提议加入 ESLint / Prettier。

## 11. 规划 (Roadmap)

- [ ] 自定义站点管理 UI
- [ ] CSV 导入 / 导出
- [ ] 更强的模糊搜索与标签过滤
- [ ] 多变量统一填写弹窗
- [ ] WebDAV 差异同步与冲突界面
- [ ] 自动化测试（单元 / 集成）
- [ ] 可视化设置面板
- [ ] 发布到 GreasyFork / OpenUserJS

## 12. 贡献指南

欢迎任何形式的贡献！流程：

1. Fork 仓库
2. 建立分支：`feat/你的功能` 或 `fix/问题描述`
3. 提交修改（如涉及行为建议附测试）
4. 运行构建，验证压缩脚本可生成
5. 发起 Pull Request（说明动机与变更点）

详见：`CONTRIBUTING.md`（若不存在，可提交新增）。

## 13. 常见问题 FAQ

**问：数据会上传到服务器吗？**
答：不会。除非你主动配置 WebDAV，同步才会发生。

**问：能否支持未列出的站点？**
答：可以，后续会有 UI；当前可改代码添加自定义适配。

**问：脚本大小压缩比例可靠吗？**
答：为示例数据，实际结果以构建报告为准。

**问：是否会出浏览器扩展版？**
答：可能在核心功能稳定后评估。

## 14. 隐私与安全

- 默认本地优先，无统计埋点
- WebDAV 凭据仅保存在你的脚本管理器中
- 代码完全开源，可自行审计 `ezprompt.user.js`
- 不进行远程动态代码加载

安全漏洞：请通过 Issue 标记 `security`，或私信维护者（推荐先私下披露）。

## 15. 许可证

本项目使用 MIT 许可证。

---

与 OpenAI、Anthropic、Google、阿里、DeepSeek 等公司无官方关联。所有商标归其各自所有者。

祝你提示词管理更高效！
