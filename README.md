# Story Foundry

故事铸造所。这里是公开的小说项目工作仓库，用来维护可持续推进的作品、设定、正文草稿、审读规范和 AI 辅助写作流程。

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
├── imports/             # 外部导入稿索引，不直接当正式设定
├── references/          # 可公开的参考资料与索引
├── archive/             # 暂不维护项目
└── scripts/             # 结构和维护检查
```

每个 `works/<work-id>/` 是一个 KA。完整 KA 推荐包含：

```text
README.md
ka.yaml
state/       # 当前状态、下一步、阻塞项
tasks/       # 可领取任务索引
handoff/     # 跨会话交接记录
drafts/       # 正文草稿
canon/        # 正式设定源
plan/         # 大纲、章节计划
style/        # 文风规范与学习笔记
fragments/    # 灵感碎片
evals/        # 作品级验收标准
reviews/      # 审读记录
legacy/       # 旧稿和迁移前版本
```

## Public Hygiene

- 不提交私钥、token、`.env`、本地路径敏感配置。
- 不提交第三方作品全文、批量原文节选或抓取语料；只保留索引、拆解、读法和少量必要引用。
- 不迁移旧 Lerna/package 模板、生成 zip、缓存文件和临时脚本。
- 同人项目保持清晰标注，公开发布前单独做版权和引用检查。

## Checks

```powershell
python scripts/check-structure.py
python scripts/check-names.py --work song-of-blaze
rg -n 'ai[/\\]skills' -S .
```
