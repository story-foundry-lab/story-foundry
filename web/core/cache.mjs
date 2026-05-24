import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

export async function writeIndexCache({ repoRoot, index }) {
  const cacheDir = path.join(repoRoot, ".story-foundry", "cache");
  const cachePath = path.join(cacheDir, "index.sqlite");
  await fs.mkdir(cacheDir, { recursive: true });

  const statements = [
    "CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
    "CREATE TABLE IF NOT EXISTS chapters (id TEXT PRIMARY KEY, value TEXT NOT NULL);",
    "CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, value TEXT NOT NULL);",
    "BEGIN;",
    "DELETE FROM metadata;",
    "DELETE FROM chapters;",
    "DELETE FROM reviews;",
    insertSql(
      "metadata",
      ["key", "value"],
      [
        "project",
        JSON.stringify({
          cachedAt: new Date().toISOString(),
          work: index.work,
          dashboard: index.dashboard,
          coverImage: index.coverImage
        })
      ]
    ),
    ...index.chapters.map((chapter) => insertSql("chapters", ["id", "value"], [chapter.id, JSON.stringify(chapter)])),
    ...index.reviews.map((review) => insertSql("reviews", ["id", "value"], [review.id, JSON.stringify(review)])),
    "COMMIT;"
  ];

  await runSqlite(cachePath, statements.join("\n"));
  return cachePath;
}

function insertSql(table, columns, values) {
  return `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${values.map(sqlString).join(", ")});`;
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runSqlite(cachePath, sql) {
  return new Promise((resolve, reject) => {
    const child = spawn("sqlite3", [cachePath], { stdio: ["pipe", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr || `sqlite3 exited with code ${code}`));
    });
    child.stdin.end(sql);
  });
}
