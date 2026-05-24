# Work Lifecycle Protocol

每个 `works/<work-id>/` 都是一个可独立推进的 KA。

## Required Agent Surface

- `ka.yaml` 的 `agent_surface.state`: 当前进度、下一步、阻塞项、事实源优先级。
- `ka.yaml` 的 `agent_surface.tasks`: 可领取任务索引。
- `ka.yaml` 的 `agent_surface.handoff`: 跨会话交接规则和记录。

## State Rules

状态目录只记录工作现场，不替代正式设定。设定事实、章节计划和正文必须沉淀到 `ka.yaml.paths` 指向的正式资产目录。

## Handoff Rules

交接记录应写明本轮目标、已读事实源、已改文件、未完成事项和下一步建议。不要把长篇推理过程塞进交接，只保留下一位协作者需要恢复现场的内容。
