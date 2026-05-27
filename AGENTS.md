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
│   ├── protocols/                      # 仓库协议
│   └── workflows/                      # 可执行工作流
├── ai/                                 # prompts、schemas、evals 等 AI 资产
├── works/
│   ├── song-of-blaze/                # 默认项目：《炽炎的颂歌》
│   └── madoka-fanfic/                # 同人孵化项目
├── shared/                           # 跨作品共享角色和系列级事实源
├── imports/
├── references/
├── archive/
└── scripts/
```

## 接到任务时

1. 读取 `WORKFLOW.md`，确认本轮任务属于哪个 work。默认 `works/song-of-blaze/`。
2. 读取该作品 `README.md`、`ka.yaml`、`ka.yaml` 中 `agent_surface.state` 指向的状态文件。
3. 一切写作协作规范见 `.agents/skills/novel-fiction/SKILL.md`；其他写作 skill 必须从这里路由并继承其约束。
4. 发布相关任务（commit、push、提 PR、通过 PR）读取 `.agents/skills/publish-pr-flow/SKILL.md`。
5. 按任务类型选读 `.agents/workflows/` 中的对应流程。
6. 不凭记忆判断设定，必须回到 `ka.yaml.paths` 指向的设定、大纲、正文、写作资料，或用户本轮明确指令。
7. 涉及系列共享角色时，先读 `shared/角色/`；例如天泽近卫的核心人设以 `shared/角色/天泽近卫.md` 为准。

## Public 仓库注意事项

- 不提交第三方作品全文、抓取语料、批量原文节选。
- 不提交 token、`.env`、私有账号信息、临时脚本和本地缓存。
- 旧仓库迁移时只迁作品资产和必要规范；旧分支、旧包管理模板、生成 zip 不迁。
