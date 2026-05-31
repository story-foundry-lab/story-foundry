---
protocol_version: story-foundry-agent-v1
default_work: works/song-of-blaze
skill_root: .agents/skills
workflow_root: .agents/workflows
protocol_root: .agents/protocols
checks:
  - python scripts/check-structure.py
  - python scripts/check-names.py --work song-of-blaze
  - npm test -- web/tests/indexer.test.mjs web/tests/runner.test.mjs
---

# Story Foundry Workflow

`WORKFLOW.md` 是本仓库的 agent 运行契约。它不启动 Symphony daemon，但借鉴其原则：工作策略放在仓库里，任务入口可恢复，完成标准可验证。

## Entry

1. 默认作品是 `works/song-of-blaze/`。用户明确指定其他作品时，以用户本轮指令为准。
2. 开始任务前读取：`AGENTS.md`、本文件、目标作品 `README.md`、`ka.yaml`、`ka.yaml` 中 `agent_surface.state` 指向的状态文件。
3. 写作协作规范唯一权威来源是 `.agents/skills/novel-fiction/SKILL.md`。
4. 按任务类型选读 `.agents/workflows/` 中的流程文件。
5. 改动通用基建、协议、workflow、检查脚本或 SOP 时，读取 `.agents/protocols/cross-repo-sync.md`，同步评估 `private-story-foundry`。

## Work Layers

长篇写作按层推进，不跳层写正文：

1. **创作灵感**：题材、卖点、参考读法和松散片段，默认在 `paths.fragments`。灵感只能孵化方向，不直接成为设定或正文事实。
2. **长期大纲**：全书结构、分幕、阶段目标和重大转折，默认在 `paths.plan`。大纲低频变化。
3. **章节组细纲**：接下来一组连续章节的短期执行计划，默认在 `paths.chapter_groups`。章节组由情节单元决定，不按固定章数硬切。
4. **单章草稿/定稿**：章节正文和接手说明，默认在 `paths.drafts`。已写正文是后续衔接的最高叙事事实之一。
5. **创作进度**：当前落点、最近章节摘要、短期衔接提示，默认在 `paths.progress`。进度只记录已经发生的事，不替代大纲和角色卡。
6. **结构化资料库**：角色、地点、势力、规则、物品等可索引事实卡，默认在 `paths.lore`。正式设定仍以 `paths.canon` 为准，资料库负责整理和导航。
7. **互动试演**：剧情分支、角色反应和场景推演，默认在 `paths.interactive`。试演内容不是正文事实，只有被整理进正文、设定或大纲后才生效。

## Work States

作品级状态记录在 `ka.yaml` 的 `agent_surface.state`。任务推进时只更新与本轮有关的状态，不把灵感、设定或正文事实写进状态文件替代正式来源。

可领取任务记录在 `agent_surface.tasks`。跨会话交接记录放在 `agent_surface.handoff`。

`paths.progress` 用来记录写作进度和最近正文事实；`agent_surface.state` 用来记录协作现场。两者不要混写：状态文件回答“现在工作现场是什么”，进度文件回答“故事已经写到哪里”。

## Fact Sources

设定判断必须回到 `ka.yaml.paths` 指向的正式资产。默认作品对应 `故事设定/`、`剧情大纲/`、`正文草稿/`、`写作资料/文风参考/`、`写作资料/灵感片段/`、`项目管理/创作进度/` 和用户本轮明确指令。`agent_surface.state` 和 `agent_surface.tasks` 只说明工作状态，不是设定权威。

跨作品共享角色、术语或系列级事实源放在 `shared/`。涉及天泽近卫这类系列共享角色时，先读 `shared/角色/天泽近卫.md`，再读当前作品内的世界适配、章节表现和关系变化。

## Context Boundary

每轮任务都要区分三类上下文：

- **本轮请求**：用户这次要做什么，优先级最高。
- **已确认作品事实**：正文、角色卡、正式设定、大纲、章节组细纲和进度文件，只回答背景是什么。
- **历史对话/交接**：只辅助恢复现场，不能自动延续上一轮未明确要求的工具动作或改稿意图。

当本轮请求与历史记录冲突时，以本轮请求为准；当正文与状态文件冲突时，以正文和正式设定为准，并指出状态文件需要同步。

## Public Hygiene

本仓库是 public 仓库。不得提交 token、`.env`、私有账号信息、第三方作品全文、抓取语料、批量原文节选、生成 zip、缓存文件或临时脚本。

## Definition of Done

任务完成前至少运行与改动相关的检查。结构或协议改动运行：

```powershell
python scripts/check-structure.py
python scripts/check-names.py --work song-of-blaze
rg -n 'ai[/\\]skills' -S .
```

如果改动涉及正文、设定、名称迁移或插画，按 `.agents/skills/novel-fiction/SKILL.md` 的自验规则追加对应检查。
