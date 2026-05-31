# Chapter Review Workflow

适用于章节审读、衔接检查、动机链判断和是否需要修改的判断。

## Steps

1. 读取目标作品 `README.md`、`ka.yaml`、`agent_surface.state` 指向的状态文件。
2. 读取 `paths.progress`、待审章节、前后章节摘要或相邻正文、当前章节组细纲、相关分幕大纲。
3. 必要时读取角色卡、聚落/专项设定和文风规范。
4. 按 `.agents/skills/novel-fiction/references/review-checklist.md` 和 `review-dimensions.md` 输出最高价值问题。
5. 用户没有要求直接改时，不编辑文件。

## Review Focus

- 本章是否完成当前章节组细纲分配的短期功能。
- 当前章节组细纲是否仍符合已写正文；如果不符合，先建议校准细纲，不直接要求改长期大纲。
- 正文事实、角色状态和 `paths.progress` 是否一致；不一致时指出需要同步哪一侧。
