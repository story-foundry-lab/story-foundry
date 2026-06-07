---
protocol_version: story-foundry-agent-v1
default_work: works/song-of-blaze
skill_root: .agents/skills
workflow_root: .agents/workflows
protocol_root: .agents/protocols
checks:
  - python scripts/check-structure.py
  - python scripts/check-names.py --work song-of-blaze
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

长篇写作按层推进，不跳层写正文：创作灵感 -> 长期大纲 -> 章节组细纲 -> 单章草稿/定稿 -> 创作进度 -> 结构化资料库 -> 互动试演。各层定义、对应 `ka.yaml.paths` 和事实源优先级以 `.agents/protocols/repository.md` 为准。

互动试演和资料库索引只辅助写作，不自动成为正文或设定事实。

## Work States 与 Fact Sources

作品级状态记录在 `ka.yaml.agent_surface`：`state` 记录协作现场（当前任务、下一步、阻塞项），`tasks` 记可领取任务，`handoff` 记跨会话交接。状态/任务/交接只说明工作现场，不是设定权威。

设定判断必须回到 `ka.yaml.paths` 指向的正式资产和用户本轮明确指令。`paths.progress` 回答“故事写到哪里”，`agent_surface.state` 回答“工作现场是什么”，两者不要混写。

跨作品共享角色、术语或系列级事实源放在 `shared/`。涉及天泽近卫这类系列共享角色时，先读 `shared/角色/天泽近卫.md`，再读当前作品内的世界适配、章节表现和关系变化。

状态分工、创作分层定义和事实源优先级详见 `.agents/protocols/repository.md`。

## Context Boundary

每轮任务都要区分三类上下文：

- **本轮请求**：用户这次要做什么，优先级最高。
- **已确认作品事实**：正文、角色卡、正式设定、大纲、章节组细纲和进度文件，只回答背景是什么。
- **历史对话/交接**：只辅助恢复现场，不能自动延续上一轮未明确要求的工具动作或改稿意图。

当本轮请求与历史记录冲突时，以本轮请求为准；当正文与状态文件冲突时，以正文和正式设定为准，并指出状态文件需要同步。

## Definition of Done

任务完成前至少运行与改动相关的检查。结构或协议改动运行：

```powershell
python scripts/check-structure.py
python scripts/check-names.py --work song-of-blaze
rg -n 'ai[/\\]skills' -S .
```

如果改动涉及正文、设定、名称迁移或插画，按 `.agents/skills/novel-fiction/SKILL.md` 的自验规则追加对应检查。Public hygiene 约束见 `.agents/protocols/repository.md`。
