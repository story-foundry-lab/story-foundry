# 名称映射表

> 所有旧名在正文中必须替换为新名。大纲/设定文件发现旧名时顺手替换。

## 角色名

| 旧名 | 新名 | 备注 |
|------|------|------|
| 泰钟 / 苔钟 | 达恩 | 守歌人。全名"达恩瑟尔"保留备用，不在正文中出现 |
| 格朗 | 格里朗 | 守夜人。3音节增加分量感 |
| 杜里 / 阿堆叔 | （匿名化） | 已从正文中移除，用"旁边搓藤绳的人"等匿名描述 |
| 塔姆婶 | 塔玛婶 / 塔尔玛 | "塔尔玛"为正式名，"塔玛婶"为露维视角昵称 |
| 大伯 | 格里朗 | 合并为同一角色 |
| 颂达 | 达恩 | 曾短暂使用后废弃 |
| 安洁莉娜 | 安洁丽雅 | 早期文档可能残留旧拼法 |

## 设定名

| 旧名 | 新名 | 备注 |
|------|------|------|
| 苔薯（达恩出场段落） | 藤扣 | 达恩出场时系的是藤扣不是在处理苔薯 |

## 替换操作规范

```python
# 标准替换模板
import pathlib

target = pathlib.Path("目标文件.md")
text = target.read_text("utf-8")

replacements = {
    "旧名": "新名",
}

for old, new in replacements.items():
    count = text.count(old)
    if count > 0:
        print(f"{old} → {new}: {count} 处")
        text = text.replace(old, new)

target.write_text(text, "utf-8")

# 验证
for old in replacements:
    assert text.count(old) == 0, f"残留: {old}"
```
