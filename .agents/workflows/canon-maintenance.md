# Canon Maintenance Workflow

适用于设定同步、角色卡整理、世界观核对和名称迁移。

## Steps

1. 读取 `.agents/skills/novel-fiction/SKILL.md` 的事实源路由和设定优先级。
2. 读取目标作品 `README.md`、`ka.yaml`、`agent_surface.state` 指向的状态文件。
3. 从 `ka.yaml.paths` 指向的设定、大纲、章节组、正文、进度和资料库目录找事实源；正式事实仍以 `paths.canon` 和已写正文为主。
4. 如果灵感片段和正式设定冲突，先指出冲突，不直接提升为正式事实。
5. 如果资料库索引和正式设定冲突，先修正式设定或正文，再同步资料库索引；不要只改索引制造假一致。
6. 名称迁移或称呼统一后运行 `python scripts/check-names.py --work <work-id>`。
