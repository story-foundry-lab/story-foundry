# Repository Protocol

本仓库按 agent-first 方式维护：入口、状态、任务、交接和检查都必须能被下一次 agent 会话恢复。本文件合并了仓库边界、作品生命周期、Fiction KA 和 public hygiene 四类约定。

## Entry Order

1. `AGENTS.md`
2. `WORKFLOW.md`
3. `works/<work-id>/README.md`
4. `works/<work-id>/ka.yaml`
5. `ka.yaml` 中 `agent_surface.state` 指向的状态文件
6. `.agents/skills/novel-fiction/SKILL.md`

## Boundaries

- `.agents/`: agent 操作规程，不放作品正文或设定。
- `ai/`: prompts、schemas、evals 等可复用 AI 资产。
- `works/`: 作品 KA 本体。
- `shared/`: 跨作品共享角色和系列级事实源。
- `scripts/`: 可运行检查工具。
- `references/`: 可公开参考资料和索引。

## Work Lifecycle

每个 `works/<work-id>/` 是一个可独立推进的 KA。

`ka.yaml.agent_surface` 必须声明协作面：

- `state`: 当前进度、下一步、阻塞项。
- `tasks`: 可领取任务索引。
- `handoff`: 跨会话交接规则和记录。

完整 KA 应在 `ka.yaml.paths` 中声明创作面（孵化项目可先放空目录和 README）：

- `fragments`: 创作灵感和松散素材，不直接成为事实源。
- `plan`: 长期大纲、分幕、阶段目标。
- `chapter_groups`: 接下来一组章节的短期细纲。
- `drafts`: 章节草稿、定稿候选和接手说明。
- `progress`: 已完成正文摘要、当前落点和短期衔接提示。
- `canon`: 正式设定源。
- `lore`: 结构化资料库或资料索引。
- `interactive`: 互动试演、分支推演和角色反应实验。

### State 与 Handoff 规则

- `agent_surface.state` 记录协作现场：当前任务、下一步、阻塞项。
- `paths.progress` 记录叙事进度：哪些章节已写、最近发生了什么、下一章承接什么。
- 章节计划进入 `paths.chapter_groups` 或 `paths.plan`，不要写进状态文件替代。
- 交接记录写明本轮目标、已读事实源、已改文件、未完成事项和下一步建议，不塞长篇推理过程。

## 创作分层与事实源优先级

长篇按层推进，不跳层写正文：

1. 创作灵感（`fragments`）：松散素材，只能孵化方向。
2. 长期大纲（`plan`）：全书结构、分幕、阶段目标，低频变化。
3. 章节组细纲（`chapter_groups`）：接下来一组章节的短期执行方案，高频迭代。
4. 正文草稿/定稿（`drafts`）：承载实际叙事。
5. 创作进度（`progress`）：已发生事件、最近章节摘要、下一章承接提示。
6. 结构化资料库（`lore`）：角色、地点、势力、规则、物品等事实卡或索引。
7. 互动试演（`interactive`）：分支推演和角色反应实验，默认不进入正史。

设定优先级（高到低）：用户本轮明确指令 > 角色卡 > 聚落/专项设定 > 已定稿正文 > 当前章节组细纲 > 分幕大纲 > 总纲 > 创作进度 > 灵感片段。

`agent_surface.state` / `tasks` / `handoff` 只记录协作现场，不参与设定优先级。章节组细纲和创作进度也不能覆盖正式设定，它们只负责把已确认设定和已写正文转成短期执行上下文。冲突时先指出冲突，再给保守修法。

## Public Hygiene

本仓库 public 可见。不得提交：

- token、`.env`、私钥、私有账号信息。
- 第三方作品全文、批量原文节选、抓取语料。
- 生成 zip、缓存文件、临时脚本、旧包管理模板。
- 未经整理的 raw/原文目录。

同人项目必须清楚标注来源类型，公开发布前单独做版权和引用检查，只提交自己的原创草稿、设定整理和创作笔记。
