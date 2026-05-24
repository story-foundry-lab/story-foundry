# Repository Protocol

本仓库按 agent-first 方式维护：入口、状态、任务、交接和检查都必须能被下一次 agent 会话恢复。

## Entry Order

1. `AGENTS.md`
2. `WORKFLOW.md`
3. `works/<work-id>/README.md`
4. `works/<work-id>/ka.yaml`
5. `ka.yaml` 中 `agent_surface.state` 指向的状态文件
6. `.agents/skills/novel-fiction/SKILL.md`

## Boundaries

- `.agents/`: agent 操作规程。
- `ai/`: prompts、schemas、evals 等可复用 AI 资产。
- `works/`: 作品 KA 本体。
- `scripts/`: 可运行检查工具。
- `references/`: 可公开参考资料和索引。
