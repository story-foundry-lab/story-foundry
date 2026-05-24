import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  buildCodexCommand,
  createRunId,
  ensureWritableForEdit,
  markReviewReportEdited,
  prepareRun,
  startCodexRun,
  writeReviewReport
} from "../core/runner.mjs";

let tmpDir;
const workPath = "works/song-of-blaze";
const workPaths = {
  reviews: "审稿修订",
  handoff: "项目管理/交接记录"
};

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "story-foundry-runner-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { force: true, recursive: true });
});

describe("codex-runner", () => {
  test("builds review and edit commands with the required sandbox modes", () => {
    const review = buildCodexCommand({
      phase: "review",
      repoRoot: "/repo",
      finalPath: "/repo/.story-foundry/runs/a/final.md"
    });
    const edit = buildCodexCommand({
      phase: "edit",
      repoRoot: "/repo",
      finalPath: "/repo/.story-foundry/runs/b/final.md"
    });

    expect(review.args).toEqual([
      "exec",
      "--cd",
      "/repo",
      "--sandbox",
      "read-only",
      "--json",
      "--output-last-message",
      "/repo/.story-foundry/runs/a/final.md",
      "-"
    ]);
    expect(edit.args).toContain("workspace-write");
    expect(edit.args).not.toContain("danger-full-access");
  });

  test("creates independent run ids and run directories", async () => {
    const firstId = createRunId("review");
    const secondId = createRunId("review");

    expect(firstId).not.toBe(secondId);

    const first = await prepareRun({ repoRoot: tmpDir, phase: "review", workId: "song-of-blaze" });
    const second = await prepareRun({ repoRoot: tmpDir, phase: "review", workId: "song-of-blaze" });

    expect(first.id).not.toBe(second.id);
    await expect(fs.stat(first.paths.runDir)).resolves.toBeTruthy();
    await expect(fs.stat(second.paths.runDir)).resolves.toBeTruthy();
  });

  test("does not allow silent edit runs when the tree is dirty", async () => {
    const gitStatus = vi.fn().mockResolvedValue(" M works/song-of-blaze/项目管理/待办任务/README.md\n");

    await expect(ensureWritableForEdit({ gitStatus, confirmDirty: false })).rejects.toMatchObject({
      code: "DIRTY_TREE"
    });
    await expect(ensureWritableForEdit({ gitStatus, confirmDirty: true })).resolves.toContain("项目管理/待办任务/README.md");
  });

  test("writes review reports only for successful review runs and never reuses paths", async () => {
    const workRoot = path.join(tmpDir, workPath);
    await fs.mkdir(path.join(workRoot, workPaths.reviews), { recursive: true });

    await expect(
      writeReviewReport({
        repoRoot: tmpDir,
        workId: "song-of-blaze",
        workPath,
        workPaths,
        chapterId: "chapter-2",
        status: "review_failed",
        finalMessage: "partial output"
      })
    ).rejects.toThrow(/successful/);

    const first = await writeReviewReport({
      repoRoot: tmpDir,
      workId: "song-of-blaze",
      workPath,
      workPaths,
      chapterId: "chapter-2",
      runId: "review-a",
      status: "awaiting_confirmation",
      finalMessage: "# 审稿\n\n## 失败点\n\n- A"
    });
    const second = await writeReviewReport({
      repoRoot: tmpDir,
      workId: "song-of-blaze",
      workPath,
      workPaths,
      chapterId: "chapter-2",
      runId: "review-b",
      status: "awaiting_confirmation",
      finalMessage: "# 审稿\n\n## 失败点\n\n- B"
    });

    expect(first.reportPath).not.toBe(second.reportPath);
    await expect(fs.readFile(first.absolutePath, "utf8")).resolves.toContain("review-a");
    await expect(fs.readFile(second.absolutePath, "utf8")).resolves.toContain("review-b");
  });

  test("marks the review report after a successful edit run", async () => {
    const reportPath = "works/song-of-blaze/审稿修订/2026-05-23-chapter-2-review-a.md";
    const absolutePath = path.join(tmpDir, reportPath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(
      absolutePath,
      [
        "# 2026-05-23 - chapter-2 审稿",
        "",
        "## 用户确认",
        "",
        "- [ ] 待确认",
        "",
        "## 改稿记录",
        "",
        "- 尚未改稿。",
        "",
        "## 验证",
        "",
        "- 尚未验证。",
        ""
      ].join("\n"),
      "utf8"
    );

    await markReviewReportEdited({
      repoRoot: tmpDir,
      reportPath,
      editRunId: "edit-a",
      verification: "npm test"
    });

    const updated = await fs.readFile(absolutePath, "utf8");
    expect(updated).toContain("- [x] 已确认并改稿");
    expect(updated).toContain("Edit Run ID: `edit-a`");
    expect(updated).toContain("npm test");
  });

  test("runs a review command, captures logs, and writes a report", async () => {
    const fakeCodex = path.join(tmpDir, "fake-codex");
    await fs.writeFile(
      fakeCodex,
      [
        "#!/bin/sh",
        "final=''",
        "while [ \"$#\" -gt 0 ]; do",
        "  if [ \"$1\" = '--output-last-message' ]; then",
        "    shift",
        "    final=\"$1\"",
        "  fi",
        "  shift",
        "done",
        "cat >/dev/null",
        "printf '%s\\n' '{\"type\":\"message\",\"content\":\"ok\"}'",
        "printf '%s\\n' '# fake review' '' '## 失败点' '' '- fake finding' > \"$final\"",
        "exit 0"
      ].join("\n"),
      "utf8"
    );
    await fs.chmod(fakeCodex, 0o755);
    await fs.mkdir(path.join(tmpDir, workPath, workPaths.reviews), { recursive: true });

    const run = await startCodexRun({
      repoRoot: tmpDir,
      workId: "song-of-blaze",
      workPath,
      workPaths,
      chapterId: "chapter-2",
      phase: "review",
      context: "review context",
      codexBin: fakeCodex
    });

    const meta = await waitForRunStatus(run.paths.metaPath, "awaiting_confirmation");
    const final = await fs.readFile(run.paths.finalPath, "utf8");
    const events = await fs.readFile(run.paths.eventsPath, "utf8");

    expect(meta.reportPath).toContain("works/song-of-blaze/审稿修订/");
    expect(final).toContain("fake review");
    expect(events).toContain("\"content\":\"ok\"");
    await expect(fs.stat(path.join(tmpDir, meta.reportPath))).resolves.toBeTruthy();
  });

  test("successful edit runs mark the report and append handoff", async () => {
    const fakeCodex = path.join(tmpDir, "fake-codex-edit");
    await fs.writeFile(
      fakeCodex,
      [
        "#!/bin/sh",
        "final=''",
        "while [ \"$#\" -gt 0 ]; do",
        "  if [ \"$1\" = '--output-last-message' ]; then",
        "    shift",
        "    final=\"$1\"",
        "  fi",
        "  shift",
        "done",
        "cat >/dev/null",
        "printf '%s\\n' '{\"type\":\"message\",\"content\":\"edit ok\"}'",
        "printf '%s\\n' '# edit done' '' '- npm test' > \"$final\"",
        "exit 0"
      ].join("\n"),
      "utf8"
    );
    await fs.chmod(fakeCodex, 0o755);

    const reportPath = "works/song-of-blaze/审稿修订/2026-05-23-chapter-2-review-a.md";
    await fs.mkdir(path.join(tmpDir, workPath, workPaths.reviews), { recursive: true });
    await fs.mkdir(path.join(tmpDir, workPath, workPaths.handoff), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, reportPath),
      "# review\n\n## 用户确认\n\n- [ ] 待确认\n\n## 改稿记录\n\n- 尚未改稿。\n\n## 验证\n\n- 尚未验证。\n",
      "utf8"
    );
    await fs.writeFile(path.join(tmpDir, workPath, workPaths.handoff, "README.md"), "# Handoff\n", "utf8");

    const run = await startCodexRun({
      repoRoot: tmpDir,
      workId: "song-of-blaze",
      workPath,
      workPaths,
      chapterId: "chapter-2",
      phase: "edit",
      context: "edit context",
      confirmDirty: true,
      gitStatus: async () => "",
      reviewReportPath: reportPath,
      codexBin: fakeCodex
    });

    const meta = await waitForRunStatus(run.paths.metaPath, "done");
    const report = await fs.readFile(path.join(tmpDir, reportPath), "utf8");
    const handoff = await fs.readFile(path.join(tmpDir, workPath, workPaths.handoff, "README.md"), "utf8");

    expect(meta.exitCode).toBe(0);
    expect(report).toContain(`Edit Run ID: \`${run.id}\``);
    expect(report).toContain("edit done");
    expect(handoff).toContain("chapter-2 WebUI 改稿");
  });
});

async function waitForRunStatus(metaPath, status) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
    if (meta.status === status) return meta;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Run did not reach ${status}`);
}
