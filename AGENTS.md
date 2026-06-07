# AGENTS.md

Agent 总入口。按需展开，不要一次读完。

## 仓库结构

```text
story-foundry/
├── AGENTS.md
├── WORKFLOW.md                         # agent 运行契约
├── README.md
├── .agents/
│   ├── skills/novel-fiction/SKILL.md   # 写作规范唯一权威来源
│   ├── skills/fiction-idea-tournament/SKILL.md # 多 agent 创意锦标赛，必须继承 novel-fiction
│   ├── skills/publish-pr-flow/SKILL.md # commit / push / PR 发布流程
│   ├── protocols/                      # 仓库协议（repository + cross-repo-sync）
│   └── workflows/                      # 可执行工作流
├── ai/                                 # prompts、schemas、evals 等 AI 资产
├── works/
│   ├── song-of-blaze/                # 默认项目：《炽炎的颂歌》
│   └── madoka-fanfic/                # 同人孵化项目
├── shared/                           # 跨作品共享角色和系列级事实源
└── scripts/
```

## 接到任务时

1. 读取 `WORKFLOW.md`，确认本轮任务属于哪个 work。默认 `works/song-of-blaze/`。
2. 读取该作品 `README.md`、`ka.yaml`、`ka.yaml` 中 `agent_surface.state` 指向的状态文件。
3. 一切写作协作规范见 `.agents/skills/novel-fiction/SKILL.md`；其他写作 skill 必须从这里路由并继承其约束。
4. 发布相关任务（commit、push、提 PR、通过 PR）读取 `.agents/skills/publish-pr-flow/SKILL.md`。
5. 大多数写作任务（审读、编辑、续写、设定同步、文风、插画等）由 SKILL.md 的路由表直接展开；章节组规划、互动试演、语言审读有独立流程，见 `.agents/workflows/`。
6. 不凭记忆判断设定，必须回到 `ka.yaml.paths` 指向的设定、大纲、章节组细纲、创作进度、正文、写作资料，或用户本轮明确指令。
7. 涉及系列共享角色时，先读 `shared/角色/`；例如天泽近卫的核心人设以 `shared/角色/天泽近卫.md` 为准。
8. 涉及通用 workflow、协议、检查脚本或 SOP 改动时，读取 `.agents/protocols/cross-repo-sync.md`，评估是否同步到 `private-story-foundry`。

## 长篇工作流层级

默认按“创作灵感 -> 长期大纲 -> 章节组细纲 -> 单章草稿/定稿 -> 创作进度同步”推进。互动试演和资料库索引只辅助写作，不自动成为正文或设定事实。分层定义、状态分工、事实源优先级和 public hygiene 见 `.agents/protocols/repository.md`。
