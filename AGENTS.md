# AGENTS.md

Agent 总入口。按需展开，不要一次读完。

## 仓库结构

```text
story-foundry/
├── AGENTS.md
├── README.md
├── ai/skills/novel-fiction/SKILL.md  # 写作规范唯一权威来源
├── works/
│   ├── song-of-blaze/                # 默认项目：《炽炎的颂歌》
│   └── madoka-fanfic/                # 同人孵化项目
├── imports/
├── references/
├── archive/
└── scripts/
```

## 接到任务时

1. 确认作品。默认 `works/song-of-blaze/`。
2. 读取该作品 `README.md` 和 `ka.yaml`。
3. 一切写作协作规范见 `ai/skills/novel-fiction/SKILL.md`。
4. 不凭记忆判断设定，必须回到 `canon/`、`plan/`、`drafts/` 或用户本轮明确指令。

## Public 仓库注意事项

- 不提交第三方作品全文、抓取语料、批量原文节选。
- 不提交 token、`.env`、私有账号信息、临时脚本和本地缓存。
- 旧仓库迁移时只迁作品资产和必要规范；旧分支、旧包管理模板、生成 zip 不迁。
