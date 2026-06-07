# Cross Repo Sync SOP

`story-foundry` 和 `private-story-foundry` 都是小说工作仓库。凡是会影响 agent 写作方式、KA 结构、检查脚本或通用工作流的基建改动，都要评估是否双仓同步。

## Repositories

| Repo | Path | Role |
|---|---|---|
| public | `/Users/bytedance/Documents/code/js/story-foundry` | 公开小说工作流、public-safe 作品和通用基建试点 |
| private | `/Users/bytedance/Documents/code/js/private-story-foundry` | 私有小说项目、历史题材和不适合公开的素材 |

## What To Sync

默认需要同步：

- `.agents/protocols/` 中的通用协议和本 SOP。
- `.agents/workflows/` 中不依赖单一作品设定的通用 workflow。
- `.agents/skills/novel-fiction/SKILL.md` 中的通用写作层级、事实源路由和自验规则。
- `WORKFLOW.md` 中的通用入口、层级和完成定义。
- `scripts/check-structure.py`、`scripts/check-names.py` 中的通用结构约束。

默认不同步：

- 具体作品正文、设定、灵感、审稿报告和交接记录。
- public 仓的 public hygiene 到 private 仓；private 仓应使用自己的 secrets / historical materials 规则。
- private 仓的真实历史资料、私有素材、历史题材风格规范到 public 仓。
- 包管理文件、缓存、构建产物、`.env`、token、临时脚本。

## Procedure

1. 先定位两个仓库并读取各自 `AGENTS.md`、`WORKFLOW.md`、默认 work 的 `ka.yaml`。
2. 分清本轮改动类型：通用基建、公开仓专属、私有仓专属、具体作品内容。
3. 通用基建先在源仓完成并验证，再同步到目标仓；同步时保留目标仓的默认 work、可见性、历史题材或 private 规则。
4. 新增通用路径时，同时更新 `ka.yaml.paths`、作品 README、状态/进度 README、结构检查脚本。
5. 新增通用 workflow/protocol 时，同时更新 `AGENTS.md` 或 `WORKFLOW.md` 的入口说明。
6. 同步完成后分别运行两个仓库的结构和名称检查；如果某仓没有 WebUI 或 package，不补跑不存在的测试。

## Verification

Public repo:

```bash
cd /Users/bytedance/Documents/code/js/story-foundry
python3 scripts/check-structure.py
python3 scripts/check-names.py --work song-of-blaze
rg -n 'ai[/\\]skills' -S .
```

Private repo:

```bash
cd /Users/bytedance/Documents/code/js/private-story-foundry
python3 scripts/check-structure.py
python3 scripts/check-names.py --work real-history
```

## Reporting

最终汇报必须说明：

- 两个仓库实际路径。
- 哪些文件是双仓同步，哪些是目标仓适配。
- 两边分别跑了哪些验证。
- 哪些内容因为仓库差异没有同步。
