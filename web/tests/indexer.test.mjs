import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { buildProjectIndex } from "../core/indexer.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("project-indexer", () => {
  test("discovers the default work from ka.yaml without hardcoding the title", async () => {
    const index = await buildProjectIndex({ repoRoot });

    expect(index.work.id).toBe("song-of-blaze");
    expect(index.work.title).toBe("炽炎的颂歌");
    expect(index.work.stage).toBe("drafting");
    expect(index.dashboard.openTasks).toContain("创建并推进 `正文草稿/章节/chapter-3.md`。");
    expect(index.dashboard.blockers).toContain("第二幕到第五幕总纲已定，分幕仍待细化。");
  });

  test("connects draft chapters, handoff notes, and outline files", async () => {
    const index = await buildProjectIndex({ repoRoot, workId: "song-of-blaze" });
    const chapter2 = index.chapters.find((chapter) => chapter.id === "chapter-2");
    const chapter3 = index.chapters.find((chapter) => chapter.id === "chapter-3");

    expect(chapter2).toMatchObject({
      hasDraft: true,
      hasOutline: true,
      draftPath: "works/song-of-blaze/正文草稿/章节/chapter-2.md"
    });
    expect(chapter2.outlinePath).toContain("第2章_暗期之上.md");
    expect(chapter2.sourceRefs.some((source) => source.path.includes("角色/露维"))).toBe(true);

    expect(chapter3).toMatchObject({
      hasDraft: false,
      hasHandoff: true,
      hasOutline: true,
      handoffPath: "works/song-of-blaze/正文草稿/章节/chapter-3-README.md"
    });
    expect(chapter3.status).toBe("handoff-only");
  });

  test("rebuilds the local index cache after it is deleted", async () => {
    const cachePath = path.join(repoRoot, ".story-foundry/cache/index.sqlite");
    await fs.rm(path.dirname(cachePath), { force: true, recursive: true });

    const first = await buildProjectIndex({ repoRoot });
    await expect(fs.stat(cachePath)).resolves.toBeTruthy();

    await fs.rm(path.dirname(cachePath), { force: true, recursive: true });
    const second = await buildProjectIndex({ repoRoot });

    expect(second.work.id).toBe(first.work.id);
    await expect(fs.stat(cachePath)).resolves.toBeTruthy();
  });
});
