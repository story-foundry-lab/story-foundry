# Work Lifecycle Protocol

每个 `works/<work-id>/` 都是一个可独立推进的 KA。

## Required Agent Surface

- `state/README.md`: 当前进度、下一步、阻塞项、事实源优先级。
- `tasks/README.md`: 可领取任务索引。
- `handoff/README.md`: 跨会话交接规则和记录。

## State Rules

`state/` 只记录工作现场，不替代正式设定。设定事实必须沉淀到 `canon/`，章节计划必须沉淀到 `plan/`，正文必须沉淀到 `drafts/`。

## Handoff Rules

交接记录应写明本轮目标、已读事实源、已改文件、未完成事项和下一步建议。不要把长篇推理过程塞进交接，只保留下一位协作者需要恢复现场的内容。
