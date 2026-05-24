import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildProjectIndex, readChapter } from "../core/indexer.mjs";
import {
  createEditContext,
  createReviewContext,
  currentGitStatus,
  listRuns,
  readRun,
  startCodexRun
} from "../core/runner.mjs";

const repoRoot = path.resolve(process.env.STORY_FOUNDRY_ROOT || process.cwd());
const port = Number(process.env.STORY_FOUNDRY_PORT || 4789);
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(serverDir, "../ui/dist");

const server = http.createServer(async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    if (url.pathname.startsWith("/work-assets/")) {
      await handleWorkAsset(res, url);
      return;
    }
    await handleStatic(res, url);
  } catch (error) {
    const status = error.httpStatus || (error.code === "DIRTY_TREE" ? 409 : 500);
    sendJson(res, status, {
      error: error.message,
      code: error.code || "SERVER_ERROR",
      status: error.status || ""
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Story Foundry API listening on http://127.0.0.1:${port}`);
});

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/project") {
    const index = await buildProjectIndex({ repoRoot, workId: url.searchParams.get("workId") || undefined });
    sendJson(res, 200, index);
    return;
  }

  const chapterMatch = url.pathname.match(/^\/api\/chapters\/([^/]+)$/);
  if (req.method === "GET" && chapterMatch) {
    const chapter = await readChapter({
      repoRoot,
      workId: url.searchParams.get("workId") || "song-of-blaze",
      chapterId: chapterMatch[1]
    });
    sendJson(res, 200, chapter);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/git/status") {
    const status = await currentGitStatus(repoRoot);
    sendJson(res, 200, { status });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/runs") {
    sendJson(res, 200, { runs: await listRuns(repoRoot) });
    return;
  }

  const runMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
  if (req.method === "GET" && runMatch) {
    sendJson(res, 200, await readRun(repoRoot, runMatch[1]));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/runs/review") {
    const body = await readJson(req);
    const index = await buildProjectIndex({ repoRoot, workId: body.workId || "song-of-blaze" });
    const chapter = await readChapter({ repoRoot, workId: index.work.id, chapterId: body.chapterId });
    const context = await createReviewContext({ index, chapter, mode: body.mode || "chapter-review" });
    const run = await startCodexRun({
      repoRoot,
      workId: index.work.id,
      workPath: index.work.path,
      workPaths: index.work.paths,
      chapterId: chapter.id,
      phase: "review",
      context
    });
    sendJson(res, 202, publicRun(run));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/runs/edit") {
    const body = await readJson(req);
    const index = await buildProjectIndex({ repoRoot, workId: body.workId || "song-of-blaze" });
    const chapter = await readChapter({ repoRoot, workId: index.work.id, chapterId: body.chapterId });
    const reviewRun = body.reviewRunId ? await readRun(repoRoot, body.reviewRunId) : null;
    const context = await createEditContext({
      index,
      chapter,
      reviewRun,
      acceptedFindings: body.acceptedFindings || []
    });
    const run = await startCodexRun({
      repoRoot,
      workId: index.work.id,
      workPath: index.work.path,
      workPaths: index.work.paths,
      chapterId: chapter.id,
      phase: "edit",
      context,
      confirmDirty: Boolean(body.confirmDirty),
      reviewReportPath: reviewRun?.reportPath || body.reportPath || ""
    });
    sendJson(res, 202, publicRun(run));
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

async function handleWorkAsset(res, url) {
  const index = await buildProjectIndex({ repoRoot, workId: url.searchParams.get("workId") || undefined });
  const relative = decodeURIComponent(url.pathname.replace(/^\/work-assets\//, ""));
  const workRoot = path.resolve(repoRoot, index.work.path);
  const target = path.resolve(workRoot, relative);
  if (!target.startsWith(`${workRoot}${path.sep}`)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  const data = await fs.readFile(target);
  res.writeHead(200, { "Content-Type": contentType(target), "Cache-Control": "no-store" });
  res.end(data);
}

async function handleStatic(res, url) {
  const requested = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  let target = path.resolve(distDir, requested);
  if (!target.startsWith(distDir)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }
  try {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) target = path.join(target, "index.html");
    const data = await fs.readFile(target);
    res.writeHead(200, { "Content-Type": contentType(target), "Cache-Control": "no-store" });
    res.end(data);
  } catch {
    const fallback = path.join(distDir, "index.html");
    try {
      const data = await fs.readFile(fallback);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(data);
    } catch {
      sendJson(res, 404, {
        error: "Web UI build not found. Run npm run build or use npm run dev."
      });
    }
  }
}

function publicRun(run) {
  return {
    id: run.id,
    phase: run.phase,
    workId: run.workId,
    chapterId: run.chapterId,
    childPid: run.childPid,
    paths: run.meta?.paths,
    command: run.command ? [run.command.command, ...run.command.args] : undefined
  };
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}
