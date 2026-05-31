# Work Lifecycle Protocol

每个 `works/<work-id>/` 都是一个可独立推进的 KA。

## Required Agent Surface

- `ka.yaml` 的 `agent_surface.state`: 当前进度、下一步、阻塞项、事实源优先级。
- `ka.yaml` 的 `agent_surface.tasks`: 可领取任务索引。
- `ka.yaml` 的 `agent_surface.handoff`: 跨会话交接规则和记录。

## Required Creative Surface

完整 KA 应在 `ka.yaml.paths` 中声明这些路径；孵化项目可以先放空目录和 README：

- `fragments`: 创作灵感和松散素材。
- `plan`: 长期大纲、分幕、阶段目标。
- `chapter_groups`: 接下来一组章节的短期细纲。
- `drafts`: 章节草稿、定稿候选和接手说明。
- `progress`: 已完成正文摘要、当前落点和短期衔接提示。
- `canon`: 正式设定源。
- `lore`: 结构化资料库或资料索引。
- `interactive`: 互动试演、分支推演和角色反应实验。

## State Rules

状态目录只记录工作现场，不替代正式设定。设定事实、章节计划和正文必须沉淀到 `ka.yaml.paths` 指向的正式资产目录。

`agent_surface.state` 与 `paths.progress` 分工不同：

- `agent_surface.state` 记录协作现场：当前任务、下一步、阻塞项。
- `paths.progress` 记录叙事进度：哪些章节已写、最近发生了什么、下一章承接什么。
- 章节计划进入 `paths.chapter_groups` 或 `paths.plan`，不要写进状态文件替代。

## Handoff Rules

交接记录应写明本轮目标、已读事实源、已改文件、未完成事项和下一步建议。不要把长篇推理过程塞进交接，只保留下一位协作者需要恢复现场的内容。
