#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const DEFAULT_MODEL = "gemini-3.5-flash";
export const DEFAULT_PROMPT = "Reply with exactly: Gemini API connected.";
export const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export function parseDotEnv(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const equalsIndex = line.indexOf("=");
        if (equalsIndex === -1) {
          return [line, ""];
        }

        const key = line.slice(0, equalsIndex).trim();
        const value = stripQuotes(line.slice(equalsIndex + 1).trim());
        return [key, value];
      })
      .filter(([key]) => key),
  );
}

export function loadDotEnvFile(envFilePath = resolve(process.cwd(), ".env")) {
  if (!existsSync(envFilePath)) {
    return {};
  }

  return parseDotEnv(readFileSync(envFilePath, "utf8"));
}

export function loadRuntimeEnv({ env = process.env, envFilePath = resolve(process.cwd(), ".env") } = {}) {
  return {
    ...loadDotEnvFile(envFilePath),
    ...env,
  };
}

export function requireApiKey(env = loadRuntimeEnv()) {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Set GEMINI_API_KEY in your shell or in .env before running this demo.");
  }
  return apiKey;
}

export function buildGenerateContentRequest({ apiKey, model = DEFAULT_MODEL, prompt = DEFAULT_PROMPT }) {
  if (!apiKey?.trim()) {
    throw new Error("apiKey is required.");
  }
  if (!model?.trim()) {
    throw new Error("model is required.");
  }
  if (!prompt?.trim()) {
    throw new Error("prompt is required.");
  }

  return {
    url: `${GEMINI_API_BASE_URL}/models/${model}:generateContent`,
    options: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  };
}

export function extractText(responseBody) {
  const parts = responseBody?.candidates?.flatMap((candidate) => candidate?.content?.parts ?? []) ?? [];
  const text = parts
    .map((part) => part?.text)
    .filter((partText) => typeof partText === "string")
    .join("");

  if (!text) {
    throw new Error("Gemini response did not contain text output.");
  }

  return text;
}

export async function generateContent({
  apiKey,
  fetchImpl = globalThis.fetch,
  model = DEFAULT_MODEL,
  prompt = DEFAULT_PROMPT,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("This demo needs a fetch implementation. Use Node.js 18 or newer.");
  }

  const request = buildGenerateContentRequest({ apiKey, model, prompt });
  const response = await fetchImpl(request.url, request.options);

  if (!response.ok) {
    const errorBody = await readErrorBody(response, apiKey);
    throw new Error(`Gemini API request failed with HTTP ${response.status}: ${errorBody}`);
  }

  const responseBody = await response.json();
  return {
    model,
    text: extractText(responseBody),
  };
}

function parseArgs(argv, env = loadRuntimeEnv()) {
  const args = [...argv];
  let model = env.GEMINI_MODEL || DEFAULT_MODEL;
  const promptParts = [];

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--model") {
      model = args.shift() || "";
    } else if (arg === "--prompt") {
      promptParts.push(args.shift() || "");
    } else {
      promptParts.push(arg);
    }
  }

  return {
    model,
    prompt: promptParts.join(" ").trim() || env.GEMINI_PROMPT || DEFAULT_PROMPT,
  };
}

async function readErrorBody(response, apiKey) {
  try {
    const text = await response.text();
    return redact(text || response.statusText || "no response body", apiKey);
  } catch {
    return response.statusText || "no response body";
  }
}

function redact(text, apiKey) {
  return apiKey ? text.replaceAll(apiKey, "[redacted-api-key]") : text;
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

async function main() {
  const env = loadRuntimeEnv();
  const apiKey = requireApiKey(env);
  const { model, prompt } = parseArgs(process.argv.slice(2), env);
  const result = await generateContent({ apiKey, model, prompt });

  console.log(`model: ${result.model}`);
  console.log(result.text);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[gemini-demo] ${error.message}`);
    process.exitCode = 1;
  });
}
