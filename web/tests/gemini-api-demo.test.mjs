import { describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DEFAULT_MODEL,
  buildGenerateContentRequest,
  extractText,
  generateContent,
  loadDotEnvFile,
  loadRuntimeEnv,
  parseDotEnv,
  requireApiKey,
} from "../../scripts/gemini-api-demo.mjs";

describe("gemini api demo", () => {
  it("defaults to the current Gemini 3.5 Flash model", () => {
    expect(DEFAULT_MODEL).toBe("gemini-3.5-flash");
  });

  it("builds a generateContent REST request without exposing the API key in the URL", () => {
    const request = buildGenerateContentRequest({
      apiKey: "test-key",
      model: "gemini-3.5-flash",
      prompt: "ping",
    });

    expect(request.url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
    );
    expect(request.options.headers["x-goog-api-key"]).toBe("test-key");
    expect(request.options.body).toBe(
      JSON.stringify({
        contents: [{ parts: [{ text: "ping" }] }],
      }),
    );
    expect(request.url).not.toContain("test-key");
  });

  it("extracts text from all returned text parts", () => {
    const text = extractText({
      candidates: [
        {
          content: {
            parts: [{ text: "hello" }, { text: " world" }],
          },
        },
      ],
    });

    expect(text).toBe("hello world");
  });

  it("requires GEMINI_API_KEY before making a request", () => {
    expect(() => requireApiKey({})).toThrow("Set GEMINI_API_KEY");
  });

  it("parses GEMINI_API_KEY from dotenv text", () => {
    expect(parseDotEnv("# comment\nGEMINI_API_KEY=\"from-env-file\"\nOTHER=value")).toEqual({
      GEMINI_API_KEY: "from-env-file",
      OTHER: "value",
    });
  });

  it("loads .env and lets process env override it", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "gemini-demo-"));
    const envPath = join(tempDir, ".env");

    try {
      await writeFile(envPath, "GEMINI_API_KEY=from-dotenv\nGEMINI_MODEL=from-dotenv-model\n", "utf8");

      expect(loadDotEnvFile(envPath).GEMINI_API_KEY).toBe("from-dotenv");
      expect(
        loadRuntimeEnv({
          env: { GEMINI_API_KEY: "from-process" },
          envFilePath: envPath,
        }).GEMINI_API_KEY,
      ).toBe("from-process");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("calls fetch and returns generated text", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "connected" }] } }],
      }),
    }));

    const result = await generateContent({
      apiKey: "test-key",
      fetchImpl,
      model: "gemini-3.5-flash",
      prompt: "ping",
    });

    expect(result).toEqual({
      model: "gemini-3.5-flash",
      text: "connected",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
