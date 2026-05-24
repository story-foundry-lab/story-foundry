# Canon Maintenance Workflow

适用于设定同步、角色卡整理、世界观核对和名称迁移。

## Steps

1. 读取 `.agents/skills/novel-fiction/SKILL.md` 的事实源路由和设定优先级。
2. 读取目标作品 `README.md`、`ka.yaml`、`agent_surface.state` 指向的状态文件。
3. 从 `ka.yaml.paths` 指向的设定、大纲、正文目录找正式事实源。
4. 如果灵感片段和正式设定冲突，先指出冲突，不直接提升为正式事实。
5. 名称迁移或称呼统一后运行 `python scripts/check-names.py --work <work-id>`。
