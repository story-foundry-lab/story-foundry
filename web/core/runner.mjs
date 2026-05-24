import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);

const STATUS_BY_PHASE = {
  review: "running_review",
  edit: "running_edit"
};

const SUCCESS_BY_PHASE = {
  review: "awaiting_confirmation",
  edit: "done"
};

const FAILURE_BY_PHASE = {
  review: "review_failed",
  edit: "verification_failed"
};

const DEFAULT_WORK_PATHS = {
  handoff: "handoff",
  reviews: "reviews"
};

export function buildCodexCommand({ phase, repoRoot, finalPath, codexBin = "codex" }) {
  const sandbox = phase === "edit" ? "workspace-write" : "read-only";
  return {
    command: codexBin,
    args: [
      "exec",
      "--cd",
      repoRoot,
      "--sandbox",
      sandbox,
      "--json",
      "--output-last-message",
      finalPath,
      "-"
    ],
    sandbox
  };
}

export function createRunId(phase = "run") {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const suffix = crypto.randomBytes(4).toString("hex");
  return `${phase}-${stamp}-${suffix}`;
}

export async function prepareRun({ repoRoot, phase, workId, chapterId }) {
  const id = createRunId(phase);
  const runDir = path.join(repoRoot, ".story-foundry", "runs", id);
  const paths = {
    runDir,
    eventsPath: path.join(runDir, "events.jsonl"),
    stderrPath: path.join(runDir, "stderr.log"),
    finalPath: path.join(runDir, "final.md"),
    contextPath: path.join(runDir, "context-pack.md"),
    metaPath: path.join(runDir, "run.json")
  };
  await fs.mkdir(runDir, { recursive: true });
  const meta = {
    id,
    phase,
    workId,
    chapterId,
    status: "draft",
    createdAt: new Date().toISOString(),
    paths: publicPaths(repoRoot, paths)
  };
  await writeJson(paths.metaPath, meta);
  return { id, phase, workId, chapterId, paths, meta };
}

export async function ensureWritableForEdit({ repoRoot = process.cwd(), gitStatus, confirmDirty = false }) {
  const status = gitStatus ? await gitStatus() : await currentGitStatus(repoRoot);
  if (status.trim() && !confirmDirty) {
    const error = new Error("Dirty tree requires explicit confirmation before edit runs.");
    error.code = "DIRTY_TREE";
    error.status = status;
    throw error;
  }
  return status;
}

export async function writeReviewReport({
  repoRoot,
  workId,
  workPath,
  workPaths,
  chapterId,
  runId,
  status,
  finalMessage
}) {
  if (status !== "awaiting_confirmation") {
    throw new Error("Review reports are written only for successful review runs.");
  }
  const date = new Date().toISOString().slice(0, 10);
  const safeRunId = slug(runId || createRunId("review"));
  const reportPath = normalizePath(
    path.join(
      workPath || path.join("works", workId),
      workSubpath(workPaths, "reviews"),
      `${date}-${slug(chapterId || "review")}-${safeRunId}.md`
    )
  );
  const absolutePath = path.join(repoRoot, reportPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  const content = [
    `# ${date} - ${chapterId || "chapter"} 审稿`,
    "",
    "## 目标",
    "",
    `- Run ID: \`${runId || safeRunId}\``,
    `- 章节: \`${chapterId || ""}\``,
    "",
    finalMessage.trim(),
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
    "- 尚未验证。"
  ].join("\n");
  await fs.writeFile(absolutePath, `${content}\n`, "utf8");
  return { reportPath, absolutePath };
}

export async function createReviewContext({ index, chapter, mode = "chapter-review" }) {
  const fileList = [
    "AGENTS.md",
    "WORKFLOW.md",
    ".agents/skills/novel-fiction/SKILL.md",
    index.work.readmePath,
    index.work.kaPath,
    index.work.statePath,
    index.work.tasksPath,
    index.work.handoffPath,
    chapter.draftPath,
    chapter.handoffPath,
    chapter.outlinePath,
    ...chapter.sourceRefs.map((item) => item.path)
  ].filter(Boolean);

  return [
    `# Story Foundry Review Context`,
    "",
    `目标：对 ${chapter.id} 做只读审稿，模式 ${mode}。`,
    "",
    "## 禁止事项",
    "",
    "- 不修改任何文件。",
    "- 不读取或展示 .env、token、认证文件和 Codex 私有凭据。",
    "- 不把缓存目录当作事实源。",
    "",
    "## 必读文件",
    "",
    ...unique(fileList).map((item) => `- ${item}`),
    "",
    "## 输出格式",
    "",
    "请用 Markdown 输出审稿报告，包含：目标、读取文件、测试点、失败点、建议改法、用户确认、改稿记录、验证。",
    "每个失败点写明测试点、失败点、影响和建议改法。"
  ].join("\n");
}

export async function createEditContext({ index, chapter, reviewRun, acceptedFindings = [] }) {
  return [
    "# Story Foundry Edit Context",
    "",
    `目标：根据用户确认的审稿发现修改 ${chapter.id}。`,
    "",
    "## 必须遵守",
    "",
    "- 遵守 `.agents/skills/novel-fiction/SKILL.md` 和对应 workflow。",
    "- 只修改用户确认的范围。",
    "- 修改后运行相关检查，并在最终回复中写明验证结果。",
    "- 不读取或展示 .env、token、认证文件和 Codex 私有凭据。",
    "",
    "## 目标文件",
    "",
    `- ${chapter.draftPath || chapter.handoffPath || chapter.outlinePath}`,
    "",
    "## 参考报告",
    "",
    `- ${reviewRun?.reportPath || reviewRun?.paths?.finalPath || reviewRun?.id || ""}`,
    "",
    "## 用户确认的 findings",
    "",
    ...(acceptedFindings.length ? acceptedFindings.map((item) => `- ${item}`) : ["- 用户选择在 WebUI 中确认改稿入口，具体取舍以报告和最终上下文为准。"]),
    "",
    "## 作品入口",
    "",
    `- ${index.work.readmePath}`,
    `- ${index.work.kaPath}`,
    `- ${index.work.statePath}`,
    `- ${index.work.tasksPath}`,
    `- ${index.work.handoffPath}`
  ].join("\n");
}

export async function startCodexRun({
  repoRoot,
  workId,
  workPath,
  workPaths,
  chapterId,
  phase,
  context,
  confirmDirty = false,
  reviewReportPath = "",
  codexBin = "codex",
  gitStatus,
  onComplete
}) {
  if (phase === "edit") {
    await ensureWritableForEdit({ repoRoot, confirmDirty, gitStatus });
  }

  const run = await prepareRun({ repoRoot, phase, workId, chapterId });
  await fs.writeFile(run.paths.contextPath, `${context.trim()}\n`, "utf8");
  const command = buildCodexCommand({ phase, repoRoot, finalPath: run.paths.finalPath, codexBin });
  await updateRunMeta(run.paths.metaPath, {
    status: STATUS_BY_PHASE[phase],
    command: [command.command, ...command.args],
    startedAt: new Date().toISOString()
  });

  const child = spawn(command.command, command.args, {
    cwd: repoRoot,
    stdio: ["pipe", "pipe", "pipe"]
  });

  child.stdin.end(context);
  const eventsHandle = await fs.open(run.paths.eventsPath, "a");
  const stderrHandle = await fs.open(run.paths.stderrPath, "a");

  child.stdout.on("data", (chunk) => {
    eventsHandle.write(chunk).catch(() => {});
  });
  child.stderr.on("data", (chunk) => {
    stderrHandle.write(chunk).catch(() => {});
  });

  child.on("close", async (code) => {
    await eventsHandle.close();
    await stderrHandle.close();
    const success = code === 0;
    const status = success ? SUCCESS_BY_PHASE[phase] : FAILURE_BY_PHASE[phase];
    let report = null;
    const finalMessage = await readText(run.paths.finalPath);
    if (success && phase === "review") {
      report = await writeReviewReport({
        repoRoot,
        workId,
        workPath,
        workPaths,
        chapterId,
        runId: run.id,
        status,
        finalMessage: finalMessage || "审稿完成，但 Codex 未写入最终消息。"
      });
    }
    if (success && phase === "edit") {
      if (reviewReportPath) {
        await markReviewReportEdited({
          repoRoot,
          reportPath: reviewReportPath,
          editRunId: run.id,
          verification: finalMessage || "见 Codex Runner final.md。"
        });
      }
      await appendHandoff({ repoRoot, workId, workPath, workPaths, chapterId, runId: run.id });
    }
    await updateRunMeta(run.paths.metaPath, {
      status,
      exitCode: code,
      finishedAt: new Date().toISOString(),
      reportPath: report?.reportPath || null
    });
    if (onComplete) await onComplete({ ...run, status, exitCode: code, report });
  });

  return { ...run, command, childPid: child.pid };
}

export async function markReviewReportEdited({ repoRoot, reportPath, editRunId, verification }) {
  if (!reportPath) return null;
  const absolutePath = path.resolve(repoRoot, reportPath);
  if (!absolutePath.startsWith(`${path.resolve(repoRoot)}${path.sep}`)) {
    throw new Error("Report path must stay inside the repository.");
  }
  let content = await readText(absolutePath);
  if (!content) {
    throw new Error(`Review report not found: ${reportPath}`);
  }

  content = content.replace("- [ ] 待确认", "- [x] 已确认并改稿");
  content = replaceSectionLine({
    content,
    section: "改稿记录",
    oldLine: "- 尚未改稿。",
    newLine: `- Edit Run ID: \`${editRunId}\``
  });
  content = replaceSectionLine({
    content,
    section: "验证",
    oldLine: "- 尚未验证。",
    newLine: `- ${verification}`
  });

  await fs.writeFile(absolutePath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  return absolutePath;
}

export async function readRun(repoRoot, runId) {
  const runDir = path.join(repoRoot, ".story-foundry", "runs", runId);
  const metaPath = path.join(runDir, "run.json");
  const meta = JSON.parse(await readText(metaPath));
  const [finalMessage, stderr, events] = await Promise.all([
    readText(path.join(runDir, "final.md")),
    readText(path.join(runDir, "stderr.log")),
    tailText(path.join(runDir, "events.jsonl"), 80)
  ]);
  return { ...meta, finalMessage, stderr, events };
}

export async function listRuns(repoRoot) {
  const runsRoot = path.join(repoRoot, ".story-foundry", "runs");
  let entries = [];
  try {
    entries = await fs.readdir(runsRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const runs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const meta = JSON.parse(await readText(path.join(runsRoot, entry.name, "run.json")));
      runs.push(meta);
    } catch {
      runs.push({ id: entry.name, status: "unknown" });
    }
  }
  return runs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function currentGitStatus(repoRoot) {
  const { stdout } = await execFileAsync("git", ["status", "--short"], { cwd: repoRoot });
  return stdout;
}

async function appendHandoff({ repoRoot, workId, workPath, workPaths, chapterId, runId }) {
  const handoffPath = path.join(
    repoRoot,
    workPath || path.join("works", workId),
    workSubpath(workPaths, "handoff"),
    "README.md"
  );
  const date = new Date().toISOString().slice(0, 10);
  const entry = [
    "",
    `## ${date} - ${chapterId} WebUI 改稿`,
    "",
    `- Goal: 根据 WebUI Runner 确认的审稿发现改稿。`,
    `- Files read: 见 .story-foundry/runs/${runId}/context-pack.md。`,
    "- Files changed: 见当前 git diff。",
    "- Verification: 见 Codex Runner final.md。",
    "- Next: 人工复查报告和正文 diff。",
    ""
  ].join("\n");
  await fs.appendFile(handoffPath, entry, "utf8");
}

async function updateRunMeta(metaPath, patch) {
  const current = JSON.parse(await readText(metaPath));
  await writeJson(metaPath, { ...current, ...patch });
}

function publicPaths(repoRoot, paths) {
  return Object.fromEntries(
    Object.entries(paths).map(([key, value]) => [key, normalizePath(path.relative(repoRoot, value))])
  );
}

function replaceSectionLine({ content, section, oldLine, newLine }) {
  if (content.includes(oldLine)) {
    return content.replace(oldLine, newLine);
  }
  const sectionPattern = new RegExp(`(## ${escapeRegExp(section)}\\n+)`);
  if (sectionPattern.test(content)) {
    return content.replace(sectionPattern, `$1${newLine}\n\n`);
  }
  return `${content.trim()}\n\n## ${section}\n\n${newLine}\n`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function writeJson(file, value) {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function tailText(file, lines) {
  const raw = await readText(file);
  return raw.split(/\r?\n/).slice(-lines).join("\n");
}

async function readText(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

function slug(value) {
  return String(value || "")
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function workSubpath(workPaths, key) {
  return normalizePath(workPaths?.[key] || DEFAULT_WORK_PATHS[key] || key);
}

function unique(items) {
  return [...new Set(items)];
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}
