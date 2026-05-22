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
2. 开始任务前读取：`AGENTS.md`、本文件、目标作品 `README.md`、`ka.yaml`、`state/README.md`。
3. 写作协作规范唯一权威来源是 `.agents/skills/novel-fiction/SKILL.md`。
4. 按任务类型选读 `.agents/workflows/` 中的流程文件。

## Work States

作品级状态记录在 `works/<work-id>/state/README.md`。任务推进时只更新与本轮有关的状态，不把灵感、设定或正文事实写进状态文件替代正式来源。

可领取任务记录在 `works/<work-id>/tasks/README.md`。跨会话交接记录放在 `works/<work-id>/handoff/README.md`。

## Fact Sources

设定判断必须回到正式资产：`canon/`、`plan/`、`drafts/`、`style/`、`fragments/` 和用户本轮明确指令。`state/` 和 `tasks/` 只说明工作状态，不是设定权威。

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
