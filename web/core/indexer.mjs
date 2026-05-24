import fs from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { writeIndexCache } from "./cache.mjs";

const TEXT_EXTENSIONS = new Set([".md", ".markdown"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const DEFAULT_WORK_PATHS = {
  state: "state",
  tasks: "tasks",
  handoff: "handoff",
  drafts: "drafts/chapters",
  canon: "canon/worlds",
  plan: "plan/outline",
  style: "style/writing-style",
  reviews: "reviews"
};

export async function buildProjectIndex({ repoRoot = process.cwd(), workId } = {}) {
  const root = path.resolve(repoRoot);
  const workflow = await readWorkflow(root);
  const works = await discoverWorks(root);
  const defaultWorkPath = normalizePath(workflow.default_work || "works/song-of-blaze");
  const work =
    works.find((item) => item.id === workId) ||
    works.find((item) => item.path === defaultWorkPath) ||
    works[0];

  if (!work) {
    throw new Error("No work with ka.yaml was found under works/.");
  }

  const workRoot = path.join(root, work.path);
  const readmePath = `${work.path}/README.md`;
  const statePath = workFilePath(work, "state", "README.md");
  const tasksPath = workFilePath(work, "tasks", "README.md");
  const handoffPath = workFilePath(work, "handoff", "README.md");
  const [readme, state, tasks, handoff, chapters, reviews, coverImage] = await Promise.all([
    readText(path.join(root, readmePath)),
    readText(path.join(root, statePath)),
    readText(path.join(root, tasksPath)),
    readText(path.join(root, handoffPath)),
    buildChapters({ root, workRoot, workPath: work.path, work }),
    buildReviews({ root, workRoot, work }),
    findCoverImage({ workRoot, work })
  ]);

  const index = {
    repoRoot: root,
    workflow,
    works,
    work: {
      ...work,
      readmePath,
      statePath,
      tasksPath,
      handoffPath
    },
    dashboard: {
      current: sectionItems(state, "Current"),
      next: sectionItems(state, "Next"),
      blockers: sectionItems(state, "Blockers"),
      openTasks: sectionItems(tasks, "Open"),
      handoff: latestHandoffItems(handoff),
      readmeSummary: firstParagraph(readme),
      progress: summarizeProgress(chapters)
    },
    chapters,
    reviews,
    coverImage
  };
  await writeIndexCache({ repoRoot: root, index });
  return index;
}

export async function discoverWorks(repoRoot) {
  const worksRoot = path.join(repoRoot, "works");
  const entries = await listDir(worksRoot);
  const works = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const workPath = normalizePath(path.join("works", entry.name));
    const kaPath = path.join(repoRoot, workPath, "ka.yaml");
    const kaRaw = await readText(kaPath);
    if (!kaRaw) continue;
    const ka = yaml.load(kaRaw) || {};
    works.push({
      id: ka.id || entry.name,
      title: ka.title || entry.name,
      type: ka.type || "",
      status: ka.status || "",
      stage: ka.stage || "",
      priority: ka.priority || "",
      language: ka.language || "",
      visibility: ka.visibility || "",
      path: workPath,
      kaPath: `${workPath}/ka.yaml`,
      agentSurface: ka.agent_surface || {},
      source: ka.source || {},
      paths: ka.paths || {}
    });
  }

  return works.sort((a, b) => a.path.localeCompare(b.path, "zh-CN"));
}

export async function readChapter({ repoRoot = process.cwd(), workId = "song-of-blaze", chapterId }) {
  const index = await buildProjectIndex({ repoRoot, workId });
  const chapter = index.chapters.find((item) => item.id === chapterId);
  if (!chapter) {
    throw new Error(`Unknown chapter: ${chapterId}`);
  }
  const chapterPath = chapter.draftPath || chapter.handoffPath || chapter.outlinePath;
  const content = chapterPath ? await readText(path.join(repoRoot, chapterPath)) : "";
  return { ...chapter, content };
}

async function readWorkflow(root) {
  const raw = await readText(path.join(root, "WORKFLOW.md"));
  const frontmatter = parseFrontmatter(raw);
  return frontmatter || {};
}

async function buildChapters({ root, workRoot, workPath, work }) {
  const draftsRoot = path.join(workRoot, workSubpath(work, "drafts"));
  const outlineRoot = path.join(workRoot, workSubpath(work, "plan"));
  const reviewRefs = await buildSourceCatalog({ root, workRoot, workPath, work });
  const entries = new Map();

  for (const file of await walkFiles(draftsRoot)) {
    if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;
    const name = path.basename(file);
    const match = name.match(/^chapter-(\d+)(-README)?\.md$/);
    if (!match) continue;
    const number = Number(match[1]);
    const entry = ensureChapter(entries, number);
    const relativePath = rel(root, file);
    if (match[2]) {
      entry.handoffPath = relativePath;
      entry.hasHandoff = true;
    } else {
      entry.draftPath = relativePath;
      entry.hasDraft = true;
      entry.wordCount = countReadableChars(await readText(file));
    }
  }

  for (const file of await walkFiles(outlineRoot)) {
    if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;
    const number = chapterNumberFromOutline(file);
    if (number === undefined) continue;
    const entry = ensureChapter(entries, number);
    entry.outlinePath = rel(root, file);
    entry.hasOutline = true;
    entry.outlineTitle = stripExtension(path.basename(file));
  }

  const chapters = [];
  for (const [number, entry] of [...entries].sort((a, b) => a[0] - b[0])) {
    const content = await combinedChapterText(root, entry);
    const title =
      firstHeading(content) ||
      entry.outlineTitle?.replace("_", "：") ||
      `第 ${number} 章`;
    chapters.push({
      id: `chapter-${number}`,
      number,
      title,
      status: chapterStatus(entry),
      hasDraft: Boolean(entry.hasDraft),
      hasHandoff: Boolean(entry.hasHandoff),
      hasOutline: Boolean(entry.hasOutline),
      draftPath: entry.draftPath,
      handoffPath: entry.handoffPath,
      outlinePath: entry.outlinePath,
      outlineTitle: entry.outlineTitle,
      wordCount: entry.wordCount || 0,
      summary: firstParagraph(content),
      sourceRefs: relatedSources({ content, entry, reviewRefs })
    });
  }

  return chapters;
}

async function buildReviews({ root, workRoot, work }) {
  const reviewRoot = path.join(workRoot, workSubpath(work, "reviews"));
  const reviews = [];
  for (const file of await walkFiles(reviewRoot)) {
    if (path.basename(file) === "README.md") continue;
    if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;
    const raw = await readText(file);
    reviews.push({
      id: stripExtension(path.basename(file)),
      path: rel(root, file),
      title: firstHeading(raw) || stripExtension(path.basename(file)),
      chapterId: inferChapterId(path.basename(file), raw),
      findings: sectionItems(raw, "失败点"),
      verification: sectionItems(raw, "验证"),
      updatedAt: await fileMtime(file)
    });
  }
  return reviews.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function buildSourceCatalog({ root, workRoot, workPath, work }) {
  const sources = [];
  const styleEntryPath = normalizePath(path.join(workPath, workSubpath(work, "style"), "README.md"));
  const sourceRoots = [
    ["canon", path.join(workRoot, workSubpath(work, "canon"))],
    ["style", path.join(workRoot, workSubpath(work, "style"))],
    ["plan", path.join(workRoot, workSubpath(work, "plan"))]
  ];

  for (const [type, sourceRoot] of sourceRoots) {
    for (const file of await walkFiles(sourceRoot)) {
      if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;
      const base = stripExtension(path.basename(file));
      const names = sourceNames(base);
      const relativePath = rel(root, file);
      sources.push({
        type,
        label: base,
        path: relativePath,
        isEntry: type === "style" && relativePath === styleEntryPath,
        names
      });
    }
  }

  const overview = normalizePath(path.join(workPath, workSubpath(work, "canon"), "树藤世界/概览.md"));
  if (await exists(path.join(root, overview))) {
    sources.unshift({
      type: "canon",
      label: "树藤世界概览",
      path: overview,
      names: ["树藤世界", "安姆", "巨树"]
    });
  }

  return sources;
}

function relatedSources({ content, entry, reviewRefs }) {
  const refs = [];
  if (entry.outlinePath) {
    refs.push({
      type: "plan",
      label: entry.outlineTitle || "分章大纲",
      path: entry.outlinePath,
      reason: "本章大纲"
    });
  }

  for (const source of reviewRefs) {
    if (source.path === entry.outlinePath) continue;
    if (refs.some((item) => item.path === source.path)) continue;
    const hit = source.names.some((name) => name && content.includes(name));
    if (!hit && source.type !== "style") continue;
    if (source.type === "style" && !source.isEntry) continue;
    refs.push({
      type: source.type,
      label: source.label,
      path: source.path,
      reason: hit ? "正文或大纲提及" : "作品文风入口"
    });
    if (refs.length >= 8) break;
  }

  return refs;
}

function summarizeProgress(chapters) {
  const drafted = chapters.filter((item) => item.hasDraft).length;
  const outlined = chapters.filter((item) => item.hasOutline).length;
  const handoffOnly = chapters.filter((item) => item.hasHandoff && !item.hasDraft).length;
  return {
    drafted,
    outlined,
    handoffOnly,
    total: chapters.length
  };
}

function ensureChapter(entries, number) {
  if (!entries.has(number)) {
    entries.set(number, { number });
  }
  return entries.get(number);
}

function chapterStatus(entry) {
  if (entry.hasDraft) return "drafted";
  if (entry.hasHandoff) return "handoff-only";
  if (entry.hasOutline) return "outline-only";
  return "missing";
}

async function combinedChapterText(root, entry) {
  const chunks = [];
  for (const relativePath of [entry.draftPath, entry.handoffPath, entry.outlinePath]) {
    if (!relativePath) continue;
    chunks.push(await readText(path.join(root, relativePath)));
  }
  return chunks.join("\n\n");
}

function chapterNumberFromOutline(file) {
  const name = path.basename(file);
  const match = name.match(/第\s*([0-9一二三四五六七八九十]+)\s*章/);
  if (!match) return undefined;
  return /^\d+$/.test(match[1]) ? Number(match[1]) : chineseNumber(match[1]);
}

function chineseNumber(value) {
  const digits = {
    零: 0,
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10
  };
  if (value === "十") return 10;
  if (value.includes("十")) {
    const [ten, one] = value.split("十");
    return (ten ? digits[ten] : 1) * 10 + (one ? digits[one] : 0);
  }
  return digits[value];
}

async function findCoverImage({ workRoot, work }) {
  const candidates = [];
  for (const file of await walkFiles(path.join(workRoot, workSubpath(work, "canon")))) {
    if (!IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    candidates.push(normalizePath(path.relative(workRoot, file)));
  }
  candidates.sort((a, b) => a.localeCompare(b, "zh-CN"));
  return candidates.find((item) => item.includes("总览")) || candidates[0] || "";
}

function sectionItems(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const items = [];
  let active = false;
  let inFence = false;
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (headingMatch) {
      active = headingMatch[1] === "##" && headingMatch[2].trim() === heading;
      continue;
    }
    if (!active) continue;
    const clean = cleanupListItem(line);
    if (clean) items.push(clean);
  }
  return items;
}

function latestHandoffItems(markdown) {
  const sectionTitle = markdown
    .split(/\r?\n/)
    .find((line) => /^##\s+\d{4}-\d{2}-\d{2}\s+-/.test(line));
  return sectionTitle ? sectionItems(markdown, sectionTitle.replace(/^##\s+/, "")) : [];
}

function cleanupListItem(line) {
  const trimmed = line.trim();
  if (!trimmed) return "";
  if (/^#+\s+/.test(trimmed)) return "";
  return trimmed.replace(/^[-*]\s+(?:\[[ xX]\]\s+)?/, "").trim();
}

function firstHeading(markdown) {
  return markdown.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() || "";
}

function firstParagraph(markdown) {
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-") || trimmed.startsWith("|")) continue;
    return trimmed;
  }
  return "";
}

function countReadableChars(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#+\s+.*$/gm, "")
    .replace(/[`\s*_>#|:-]/g, "").length;
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? yaml.load(match[1]) : {};
}

function sourceNames(base) {
  const names = new Set([base]);
  const parenthetical = base.match(/（(.+?)）|\((.+?)\)/);
  if (parenthetical) {
    names.add(parenthetical[1] || parenthetical[2]);
    names.add(base.replace(/（.+?）|\(.+?\)/g, ""));
  }
  for (const part of base.split(/[-_]/)) {
    if (part.length >= 2) names.add(part);
  }
  return [...names].filter(Boolean);
}

function workFilePath(work, key, filename) {
  return normalizePath(path.join(work.path, workSubpath(work, key), filename));
}

function workSubpath(work, key) {
  return normalizePath(work.paths?.[key] || DEFAULT_WORK_PATHS[key] || key);
}

function inferChapterId(filename, raw) {
  const match = `${filename}\n${raw}`.match(/chapter-(\d+)/i);
  return match ? `chapter-${match[1]}` : "";
}

async function fileMtime(file) {
  const stat = await fs.stat(file);
  return stat.mtime.toISOString();
}

async function listDir(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function walkFiles(dir) {
  const files = [];
  for (const entry of await listDir(dir)) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(absolute)));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }
  return files;
}

async function readText(file) {
  try {
    return await fs.readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function stripExtension(file) {
  return file.replace(/\.[^.]+$/, "");
}

function rel(root, file) {
  return normalizePath(path.relative(root, file));
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}
