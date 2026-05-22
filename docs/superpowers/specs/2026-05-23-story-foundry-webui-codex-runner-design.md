# Story Foundry WebUI + Codex Runner 设计

日期：2026-05-23

## 目标

为 `story-foundry` 增加一个本地 WebUI，使小说项目的写作进度、章节状态、审稿结果和 Codex 执行流程更直观。

这个工具不是新的小说编辑器。Markdown 仓库仍是唯一事实源，VS Code 仍是主要编辑环境，Codex 仍负责读文件、审稿、改稿和验证。WebUI 的职责是把项目状态呈现出来，并作为 Codex CLI Runner 的安全前台。

第一版围绕默认作品 `works/song-of-blaze/` 实现，但数据读取应从 `ka.yaml` 和作品目录派生，避免把《炽炎的颂歌》硬编码进核心逻辑。

## 已确认决策

1. 形态选择：本地 WebUI 控制台。
2. 阅读模板：审稿阅读器。
3. Codex 结合方式：本地 CLI Runner。
4. Runner 安全模式：先只读审稿，用户确认后再改稿。
5. 数据策略：Markdown 报告优先，缓存不做权威，状态回写克制。
6. 失败恢复：日志可见，失败不覆盖报告，写入前检查 dirty tree，重试必须手动触发。

## 非目标

1. 不做富文本编辑器。正文编辑仍在 VS Code 和 Markdown 文件中完成。
2. 不做一键自动驾驶。改稿必须基于审稿报告由用户确认。
3. 不依赖 Codex App 私有接口。第一版只使用稳定的文件系统和 Codex CLI 能力。
4. 不把本地缓存作为设定、进度或任务权威。
5. 不自动改写正式设定。设定同步和角色卡整理仍走明确任务。

## 用户体验

WebUI 首页是项目控制台，显示当前作品、阶段、章节进度、开放任务、阻塞项和下一步建议。信息来自作品 `README.md`、`ka.yaml`、`state/README.md`、`tasks/README.md` 和 `handoff/README.md`。

章节地图展示 `drafts/chapters/` 下的正文、接手说明和 `plan/outline/分幕/` 中的章节大纲之间的关系。它要能看出哪些章节已有正文、哪些只有大纲、哪些只有接手说明。

审稿阅读器采用“阅读优先 + 右侧审稿栏”的布局。主区域只读展示章节正文，右侧显示章节任务、事实源、相关角色/设定、审稿发现和可执行操作。第一版不做行内批注存储，只显示报告中的问题和定位信息。

Runner 面板负责发起 Codex 任务、展示运行状态、保存日志、显示最终报告，并在审稿完成后提供“确认改稿”入口。

## 架构

系统分为四个模块。

`project-indexer` 读取作品目录，构建章节、任务、状态、事实源和报告索引。它只从仓库文件生成视图模型，不把结果当作权威数据。

`web-ui` 提供项目控制台、章节地图、审稿阅读器、报告列表和 Runner 面板。它通过本地后端读取索引、发起 Runner 任务、展示运行状态。

`codex-runner` 封装 Codex CLI 调用。审稿阶段使用只读 sandbox，写入阶段使用 workspace-write sandbox。所有运行都有 run id、日志目录、最终消息文件和退出状态。

`report-writer` 把审稿结果写入 `works/<work-id>/reviews/`，并在用户确认改稿成功后克制地更新 `tasks/README.md` 和 `handoff/README.md`。

## 数据边界

事实源包括：

- `works/<work-id>/ka.yaml`
- `works/<work-id>/README.md`
- `works/<work-id>/state/README.md`
- `works/<work-id>/tasks/README.md`
- `works/<work-id>/handoff/README.md`
- `works/<work-id>/drafts/chapters/*.md`
- `works/<work-id>/plan/outline/**/*.md`
- `works/<work-id>/canon/**/*.md`
- `works/<work-id>/style/**/*.md`

可提交产物包括：

- `works/<work-id>/reviews/YYYY-MM-DD-<slug>.md`
- 必要的 `works/<work-id>/tasks/README.md` 状态更新
- 必要的 `works/<work-id>/handoff/README.md` 交接记录
- 可复用检查项沉淀到 `works/<work-id>/evals/*.md`
- 用户确认后的正文或设定改动

本地缓存包括：

- `.story-foundry/cache/index.sqlite`
- `.story-foundry/runs/<run-id>/events.jsonl`
- `.story-foundry/runs/<run-id>/final.md`
- `.story-foundry/runs/<run-id>/context-pack.md`

缓存必须可以删除并从仓库重建。`.story-foundry/` 不应作为事实源。

## 核心实体

`Work` 表示一个作品，来自 `ka.yaml`。

`Chapter` 表示章节或接手说明，来自 `drafts/chapters/`，并关联分章大纲。

`SourceRef` 表示事实源引用，指向 `canon/`、`plan/`、`style/` 或相邻正文。

`ReviewRun` 表示一次只读审稿运行，包含目标章节、上下文包、Codex 命令、日志、最终报告和状态。

`Finding` 表示审稿发现，包含测试点、失败点、影响、改法和确认状态。

`EditRun` 表示用户确认后的改稿运行，包含采用的 findings、Codex 命令、改动文件、验证结果和 handoff 摘要。

## Runner 流程

第一阶段是只读审稿。

1. 用户在阅读器中选择章节和审稿模式。
2. 系统生成上下文包，列出目标、必读文件、事实源优先级、验收口径和禁止事项。
3. Runner 启动 `codex exec --cd <repo> --sandbox read-only --json --output-last-message <file>`。
4. JSONL 事件写入 `.story-foundry/runs/<run-id>/events.jsonl`。
5. 最终消息写入 `.story-foundry/runs/<run-id>/final.md`。
6. 报告解析后写入 `reviews/YYYY-MM-DD-<slug>.md`，并在 WebUI 中展示。

第二阶段是确认后改稿。

1. 用户在报告中选择要接受的 findings。
2. Runner 检查 git dirty 状态并展示给用户。
3. 用户确认后，Runner 启动 `codex exec --cd <repo> --sandbox workspace-write`。
4. 改稿任务必须遵守 `.agents/skills/novel-fiction/SKILL.md` 和对应 workflow。
5. 运行与改动相关的检查，至少包括 `WORKFLOW.md` 中列出的结构或名称检查；正文改稿还要按小说 skill 的自验规则回读上下文。
6. 成功后更新审稿报告状态，并写入必要的 `tasks/README.md` 或 `handoff/README.md`。

## Runner 状态机

`draft`：任务已创建，尚未运行。

`running_review`：Codex 正在只读审稿。

`review_failed`：审稿失败，可查看日志并手动重试。

`awaiting_confirmation`：审稿完成，等待用户确认改法。

`running_edit`：确认后的 Codex 改稿正在运行。

`verification_failed`：改稿结束但检查失败，保留日志和工作区状态，等待人工处理。

`done`：报告、改稿、验证和交接完成。

## 失败恢复

每次运行使用新的 run id，不覆盖旧运行目录。

失败时保留启动参数、stdout JSONL、stderr、最终消息、退出码和上下文包。

审稿失败不会生成“成功报告”。如果有部分输出，只作为失败日志展示。

改稿失败或验证失败时不自动重试，不自动回滚。WebUI 展示失败状态、改动文件、验证输出和建议的下一步。

写入阶段前必须展示 git dirty 状态。存在未提交或未跟踪改动时，用户仍可继续，但需要显式确认。

## 报告格式

审稿报告使用 Markdown，建议结构如下：

```markdown
# YYYY-MM-DD - chapter-name 审稿

## 目标

## 读取文件

## 测试点

## 失败点

## 建议改法

## 用户确认

## 改稿记录

## 验证
```

报告必须能被人直接阅读，也能被后续 Codex 任务引用。第一版不强制 JSON frontmatter；如果后续需要更稳定的解析，再增加轻量 frontmatter。

## 安全与权限

审稿阶段默认只读。

写入阶段默认 workspace-write。

第一版不使用 `danger-full-access`。

Runner 不读取或展示 `.env`、token、认证文件和 Codex 私有凭据。

WebUI 不把完整 Codex 日志暴露为公开产物；日志保存在本地缓存目录，只有摘要或经整理的报告进入仓库。

## 测试与验证

项目索引测试应覆盖：

- 能读取 `ka.yaml` 并发现默认作品。
- 能识别已有章节正文、接手说明和分章大纲。
- 能从 `state/README.md`、`tasks/README.md`、`handoff/README.md` 生成控制台摘要。
- 缓存删除后能重建索引。

Runner 测试应覆盖：

- 审稿命令使用 read-only sandbox。
- 写入命令使用 workspace-write sandbox。
- 每次运行生成独立 run id。
- 失败不覆盖旧报告。
- dirty tree 会阻止静默写入。
- 手动重试会创建新运行。

端到端垂直切片：

1. 在 WebUI 打开 `chapter-2.md`。
2. 右侧显示章节状态和相关事实源。
3. 点击运行只读审稿。
4. 生成并展示审稿报告。
5. 用户确认一条改法。
6. Runner 启动改稿任务。
7. 检查运行并写入 handoff。

## 第一版范围

第一版只实现一个垂直切片：章节审稿。

它包括项目控制台的基础摘要、章节地图、审稿阅读器、Runner 只读审稿、审稿报告写入、确认后改稿入口、运行日志和失败状态。

不实现多用户协作、在线部署、富文本编辑、完整批注系统、发布导出模板和 MCP/Plugin。MCP/Plugin 是后续方向，等 WebUI 的项目模型稳定后再抽象。

## 后续方向

第二阶段可以加入专项审稿模式，例如角色动机、设定一致性、文风回归、章节衔接。

第三阶段可以加入更强的报告结构化能力，例如 JSON schema 输出、finding 状态追踪和批注定位。

第四阶段可以把稳定能力抽成 Story Foundry MCP 或 Codex Plugin，让 Codex 在聊天中直接查询章节、任务、事实源和审稿报告。
