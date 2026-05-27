# 外部写作 Worker

用于把 Claude Code、Codex、SeedClaw Agent 或其他本地/远端 agent 当作独立小说写作 worker。主线程负责调度、验收和合入，不把 worker 输出直接当正式正文。

## 适用场景

- 用户明确说让 Claude Code、Codex worker、SeedClaw Agent、子 agent 接管写作。
- 需要并行生成章节草稿、改写方案、审读报告或候选片段。
- 需要验证 worker 是否真正读取了仓库 skill、作品入口和参考清单。

## 固定边界

- Worker 默认只写草稿或报告，不直接覆盖正式正文、角色卡、设定、大纲。
- 输出优先放在任务作用域目录，例如 `.agent_context/tasks/<task-id>/`；需要长期保留时再移动到作品的审稿、草稿或交接目录。
- public 仓库不得接收 token、账号信息、私有素材、第三方作品全文、抓取语料或批量原文节选。
- Worker 可以提出设定改动建议，但正式事实仍以 `ka.yaml.paths` 指向的资产为准。
- 合入正式文件前，主线程必须回读上下文并按本 skill 自验。

## 启动前输入

给 worker 的 prompt 至少包含：

1. 让它先读取 `.agents/skills/novel-fiction/SKILL.md`。
2. 让它读取 `WORKFLOW.md`、目标作品 `README.md`、`ka.yaml` 和 `agent_surface.state`。
3. 指定任务类型和必要 reference：
   - 初稿推动：`references/draft-mode.md`。
   - 分幕或多章重写：`references/act-rewrite-supervision.md`。
   - 合入前自验：`references/edit-verification.md`。
   - 审读报告：`references/review-checklist.md`。
   - 文风任务：`references/style-routing.md`。
4. 指定需要读取的章纲、上一章、目标章、角色卡或设定文件。
5. 明确输出路径、输出格式和禁止修改的正式文件。

## 任务模板

```text
你是 story-foundry 的小说写作 worker。

先读取：
- .agents/skills/novel-fiction/SKILL.md
- WORKFLOW.md
- works/<work-id>/README.md
- works/<work-id>/ka.yaml
- works/<work-id>/<state-path>

本次任务：
- 类型：草稿 / 审读 / 改写候选 / 设定核对
- 目标：
- 必读正文/设定/大纲：
- 输出到：

边界：
- 不覆盖正式正文、设定和大纲。
- 不引入未核验事实。
- 不提交私有内容、token、第三方全文或批量原文节选。

输出报告需说明：
- 已读取文件。
- 关键依据。
- 可采用内容。
- 不能直接采用的风险。
- 合入前需要主线程复核的点。
```

## SeedClaw / Codex 使用

- 多个 SeedClaw Agent 可以绑定同一个本机 Codex runtime，用不同 instructions 区分 writer、reviewer、planner。
- 同一 workdir 并发写文件有冲突风险；writer 可以写草稿，reviewer 默认只读。
- 对需要合入正式文件的任务，优先让一个主线程完成最后编辑和检查。

## Claude Code 使用

非交互试跑可用 `claude -p`，但命令参数以当前机器安装版本为准。重点不是命令形式，而是限制工具权限、输出路径和预算。

报告型任务只需要读取和写报告；草稿型任务也不要直接覆盖正式章节。若 Claude Code 当前存在 auth 冲突，先处理登录态再交给它执行。

## 主线程验收

1. 读取 worker 输出，不只看命令是否成功。
2. 对照本 skill、任务 reference 和正式事实源核验。
3. 搜索私有信息、旧名、未核验真实资料、第三方原文和 public 仓库禁入内容。
4. 判断结构变化是否会影响前后章节、角色卡、设定或大纲。
5. 合入后按任务类型运行检查：

```bash
python3 scripts/check-structure.py
python3 scripts/check-names.py --work <work-id>
```

普通报告或未合入正式文件的草稿，可以只做读取验收，不强行跑全量检查。
