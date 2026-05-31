# Fiction Editing Workflow

适用于正文润色、重写、续写和局部改稿。写作协作规范以 `.agents/skills/novel-fiction/SKILL.md` 为准。

## Steps

1. 确认目标作品，默认 `works/song-of-blaze/`。
2. 读取作品 `README.md`、`ka.yaml`、`agent_surface.state` 指向的状态文件。
3. 按任务读取 `ka.yaml.paths` 指向的创作进度、章节组细纲、正文、大纲、设定、资料库索引和文风资料。
4. 续写或补场景时，先确认当前章节组细纲是否存在且仍贴合最近正文；缺失或明显过期时，先走 `chapter-group-planning.md`。
5. 用户要求直接改时，最小范围编辑；用户要求先看时，只给审读和方案。
6. 正文进入定稿候选后，按需要同步 `paths.progress`；角色或设定变化只在确认成立后同步到正式设定或资料库索引。
7. 改后按 skill 自验规则回读上下文。

## Layer Rules

- `paths.plan` 管长期方向，不因单章完成自动改写。
- `paths.chapter_groups` 管接下来一组章节，不能覆盖角色卡、正式设定和已写正文。
- `paths.progress` 只写已发生内容、最近摘要和短期衔接提示，不写未来规划。
- `paths.interactive` 的试演内容不直接进入正文事实。
