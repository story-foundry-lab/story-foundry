# Story Foundry

故事铸造所。这里是公开的小说项目工作仓库，用来维护可持续推进的作品、设定、长期大纲、章节组细纲、正文草稿、创作进度、审读规范和 AI 辅助写作流程。

## Works

| Work | Type | Status | Notes |
|---|---|---|---|
| `works/song-of-blaze/` | 原创长篇 | active | 《炽炎的颂歌》，完整 KA（Knowledge Asset）试点 |
| `works/madoka-fanfic/` | 同人孵化 | incubating | 《魔法少女小圆》同人，先按 KA-lite 迁移 |

## Structure

```text
story-foundry/
├── AGENTS.md
├── WORKFLOW.md         # agent 运行契约和完成定义
├── README.md
├── .agents/            # agent 操作规程
│   ├── skills/         # agent skills，写作协作规范唯一权威来源
│   ├── protocols/      # 仓库协议、作品生命周期、public hygiene
│   └── workflows/      # 章节审读、正文编辑、设定维护等可执行流程
├── ai/
│   ├── prompts/         # 可复用提示词
│   ├── schemas/         # KA 元数据 schema
│   └── evals/           # 跨作品评估方法
├── works/               # 可独立推进的作品
├── shared/              # 跨作品共享角色、术语和系列级事实源
├── imports/             # 外部导入稿索引，不直接当正式设定
├── references/          # 可公开的参考资料与索引
├── archive/             # 暂不维护项目
└── scripts/             # 结构和维护检查
```

每个 `works/<work-id>/` 是一个 KA。具体路径以作品的 `ka.yaml` 为准。`works/song-of-blaze/` 当前使用更适合阅读的中文目录：

```text
README.md
ka.yaml
故事设定/     # 世界、角色、聚落、规则
剧情大纲/     # 总纲、分章大纲、分幕、章节组细纲
正文草稿/     # 章节正文和接手说明
审稿修订/     # 审读记录和改稿报告
写作资料/     # 灵感片段、笔记、文风参考、互动试演
项目管理/     # 当前状态、创作进度、待办任务、交接、验收、导出、旧稿
```

`shared/` 保存跨作品共享资产。当前 `shared/角色/天泽近卫.md` 是系列主角的共享角色卡；作品内可以补充当期表现，但核心人设、能力边界和成长方向以共享角色卡为准。

通用 agent 基建与私有写作仓库同步规则见 `.agents/protocols/cross-repo-sync.md`。涉及 workflow、protocol、检查脚本、写作 skill 通用层的改动时，需要评估是否同步到 `/Users/bytedance/Documents/code/js/private-story-foundry`。

## Writing Layers

Story Foundry 的长篇写作默认按层推进：

1. 创作灵感：松散想法和参考读法。
2. 长期大纲：全书结构、分幕和阶段目标。
3. 章节组细纲：接下来一组章节的短期执行计划。
4. 单章草稿/定稿：实际正文和接手说明。
5. 创作进度：已发生内容、当前落点和短期衔接提示。
6. 结构化资料库：角色、地点、势力、规则、物品等事实卡或索引。
7. 互动试演：剧情分支和角色反应实验，默认不进入正史。

## Public Hygiene

- 不提交私钥、token、`.env`、本地路径敏感配置。
- 不提交第三方作品全文、批量原文节选或抓取语料；只保留索引、拆解、读法和少量必要引用。
- 不迁移旧 Lerna/package 模板、生成 zip、缓存文件和临时脚本。
- 同人项目保持清晰标注，公开发布前单独做版权和引用检查。

## WebUI

本地 WebUI 用来查看作品状态、章节地图、审稿阅读器和 Codex Runner。Markdown 仓库仍是唯一事实源，`.story-foundry/` 只放可删除的本地运行缓存。

```bash
npm install
npm run dev
```

默认地址：

- WebUI：`http://127.0.0.1:5173`
- API：`http://127.0.0.1:4789`

也可以先构建，再用同一个本地后端服务静态页面：

```bash
npm run build
npm run preview
```

`npm run preview` 默认打开 `http://127.0.0.1:4789`。

## Checks

```powershell
python scripts/check-structure.py
python scripts/check-names.py --work song-of-blaze
rg -n 'ai[/\\]skills' -S .
npm test -- web/tests/indexer.test.mjs web/tests/runner.test.mjs
```
