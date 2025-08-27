<div align="center">

# EZPrompt

<strong>Universal AI Chat Prompt Manager (Userscript)</strong>
<br/>
Manage, search, and insert reusable prompt templates seamlessly across multiple AI chat platforms.

[English](README.md) · [简体中文](README_CN.md)

<br/>

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Userscript](https://img.shields.io/badge/Platform-Tampermonkey-green)
![Status](https://img.shields.io/badge/Status-Active-success)
![WebDAV](https://img.shields.io/badge/Sync-WebDAV-orange)

</div>

---

## Table of Contents

1. Overview
2. Features
3. Supported Sites
4. Installation
5. Usage Guide
6. Template Variables
7. WebDAV Sync
8. Keyboard Shortcuts
9. Architecture
10. Development
11. Roadmap
12. Contributing
13. FAQ
14. Privacy & Security
15. License

## 1. Overview

EZPrompt is a lightweight userscript that lets you build a personal prompt library and insert prompts instantly into AI chat inputs (ChatGPT, Claude, Gemini, DeepSeek, Qwen, etc.). It focuses on speed, privacy (local-first), and extensibility (custom site adapters & template variables).

## 2. Features

### Productivity

- Centralized prompt library with categories & search
- Quick panel (`Ctrl+Shift+P`) with fuzzy filtering
- Insert modes: cursor / replace / prefix / suffix
- Usage statistics + lightweight recommendations section

### Data & Sync

- Local persistent storage (no external server required)
- WebDAV synchronization (opt‑in) for multi-device usage
- Import / Export (JSON; CSV planned)
- Full data portability

### Authoring

- Template variables with optional defaults: `{name}` or `{task|write a summary}`
- Inline variable resolution dialog before insertion
- Simple editing flow (prompt metadata + tags)

### UX / UI

- Multi-language (English / 简体中文)
- Light / Dark / Auto theme (via system preference)
- Clean overlay panel, keyboard-friendly navigation
- Recommendations: recent & frequent prompts

### Extensibility

- Pluggable site detection & input strategies
- Custom site registration (RegExp match + selectors)
- ContentEditable & textarea insertion strategies

### Performance

- Production build shrinks raw script size by ~99% (example: 380 KB → ~1.9 KB minified reference)
- Lazy loading + minimal DOM footprint
- Cleans up observers to avoid leaks (where applicable)

## 3. Supported Sites

Built-in adapters match common AI chat platforms:

| Platform        | Domains                             |
| --------------- | ----------------------------------- |
| ChatGPT         | chat.openai.com, chatgpt.com        |
| Claude          | claude.ai                           |
| Gemini          | gemini.google.com                   |
| DeepSeek        | chat.deepseek.com                   |
| Qwen / 通义千问 | tongyi.aliyun.com, qwen.alibaba.com |

You can add custom sites via pattern + selector configuration (future UI planned; currently via storage API in code).

## 4. Installation

1. Install the Tampermonkey extension: https://www.tampermonkey.net/
2. Open the minified userscript: https://github.com/somnifex/EZPrompt/raw/main/ezprompt.min.user.js (or download and drag into Tampermonkey)
3. Confirm installation in Tampermonkey dashboard
4. Navigate to a supported AI chat site and click the Prompts button (or press the hotkey)

To use the development (readable) version, load `ezprompt.user.js` instead.

## 5. Usage Guide

Basic actions:

- Open Panel: button injected on page OR `Ctrl+Shift+P`
- Search: start typing to filter
- Insert: press Enter or click a prompt
- Close: `Escape`
- Edit / Add: use footer buttons in the panel
- Change insertion mode: selector at panel bottom

Insertion modes:

- cursor: insert at current caret position (default)
- replace: replace entire field content
- prefix: add before existing content
- suffix: append after existing content

## 6. Template Variables

Syntax: `{variable}` or `{variable|default value}` within prompt content.
When inserting a prompt containing variables you will be prompted to fill values (defaults pre-filled where supplied).

Example:

```
Hello {name}, please help me with {task|summarizing the article}.
```

## 7. WebDAV Sync

1. Open settings (`Ctrl+Shift+S`)
2. Enter WebDAV endpoint, username, password
3. Enable auto-sync (optional) – runs periodically / on changes
4. Use Export / Import for manual backup

Notes:

- All data stays local unless WebDAV is explicitly configured
- Conflicts are resolved last-write-wins (advanced merge strategy TBD)

## 8. Keyboard Shortcuts

| Action                 | Default         |
| ---------------------- | --------------- |
| Open panel             | Ctrl+Shift+P    |
| Open settings          | Ctrl+Shift+S    |
| Close panel            | Escape          |
| Insert selected prompt | Enter           |
| Navigate               | Arrow Up / Down |

Shortcuts are configurable in settings (planned UI). For now defined in storage settings object.

## 9. Architecture (High Level)

```
src/
	core/
		siteAdapter.ts        # Detects active site & collects input elements
	storage/
		local.ts              # Local storage layer, site presets, CRUD for prompts
	ui/
		promptPanel.ts        # Overlay panel: search, list, insert logic, hotkeys
build-production.js       # Custom build & minification pipeline
ezprompt.user.js          # Readable development userscript
ezprompt.min.user.js      # Generated production script
```

Key concepts:

- Site Adapter: provides selectors + strategy (value vs contentEditable)
- Storage Snapshot: prompts, categories, settings, site configs
- Insert Modes: applied when inserting resolved prompt text
- Variable Resolver: prompts for values just-in-time

## 10. Development

Prerequisites: Node.js (>=18 recommended).

Install dependencies: (none currently – zero external runtime deps). Future tooling may introduce dev dependencies.

Build production script:

```
node build-production.js
```

This runs a custom pipeline: sets production flags, strips debug calls, minifies embedded CSS & JS, updates metadata, and writes a build report (`build-report.json`).

Testing: (No formal test harness committed yet; contributions welcome. Suggest adding unit tests around storage & template expansion.)

Code Style: Lightweight; feel free to propose ESLint/Prettier integration.

## 11. Roadmap

- [ ] UI for managing custom site adapters
- [ ] CSV import/export tooling
- [ ] Rich tag filtering & fuzzy search improvements
- [ ] Better variable dialog (multi-field form)
- [ ] WebDAV differential sync & conflict UI
- [ ] Automated test suite (storage + insertion)
- [ ] Settings panel (graphic) replacing prompt-based edits
- [ ] Publish to GreasyFork / OpenUserJS

## 12. Contributing

Contributions are very welcome! Quick process:

1. Fork the repo
2. Create a feature branch: `feat/your-feature`
3. Make changes (add tests if applicable)
4. Run build to ensure minified script updates
5. Open a Pull Request describing motivation & changes

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for style & commit guidelines.

## 13. FAQ

**Q: Does EZPrompt send my data anywhere?**
A: No. All prompt data stays in your browser unless you configure WebDAV sync.

**Q: Can I use it on another AI site not listed?**
A: Yes, by adding a custom site adapter (UI coming; can patch storage directly for now).

**Q: Script size claims?**
A: Size reduction number is approximate; run the build script to generate an updated report.

**Q: Any plans for browser extension?**
A: Potentially after stabilizing core APIs.

## 14. Privacy & Security

- Local-first: no trackers, no analytics
- Optional WebDAV: credentials stored locally by the userscript manager (review before enabling)
- Open code: review `ezprompt.user.js` to audit behavior
- No dynamic remote code loading

Security Disclosure: If you find a vulnerability, please open an issue labelled `security` or (preferably) email the maintainer privately first.

## 15. License

This project is licensed under the MIT License.

---



Not affiliated with OpenAI, Anthropic, Google, Alibaba, DeepSeek, or any AI provider. All trademarks belong to their respective owners.

Enjoy faster prompt workflows!
