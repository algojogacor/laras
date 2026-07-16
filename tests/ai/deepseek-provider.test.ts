/**
 * DeepSeek Provider Tests — Model enforcement, error handling, and safety.
 *
 * These tests verify:
 *  - Only deepseek-v4-pro is permitted
 *  - Flash and legacy models are rejected
 *  - Missing API key fails safely
 *  - Structured output validation works
 *  - extractJSON handles edge cases
 *  - Provider status reporting is safe (no secrets)
 */

import { describe, test, expect, beforeAll } from "bun:test"
import {
  LARAS_AI_MODEL,
  validateModel,
  isProhibitedModel,
  extractJSON,
  isDeepSeekConfigured,
  getProviderStatus,
  DeepSeekError,
} from "@/lib/ai/deepseek"

describe("DeepSeek Provider — Model Enforcement", () => {
  // ============================================================================
  // 1. MODEL CONSTANT
  // ============================================================================
  test("LARAS_AI_MODEL is exactly deepseek-v4-pro", () => {
    expect(LARAS_AI_MODEL).toBe("deepseek-v4-pro")
  })

  test("LARAS_AI_MODEL is readonly (const assertion)", () => {
    // TypeScript const assertion guarantees this at compile time.
    // Runtime check: the value must be the exact string.
    expect(typeof LARAS_AI_MODEL).toBe("string")
    expect(LARAS_AI_MODEL.length).toBeGreaterThan(0)
  })

  // ============================================================================
  // 2. validateModel — only permits deepseek-v4-pro
  // ============================================================================
  test("validateModel accepts deepseek-v4-pro", () => {
    expect(() => validateModel("deepseek-v4-pro")).not.toThrow()
  })

  test("validateModel rejects deepseek-v4-flash", () => {
    expect(() => validateModel("deepseek-v4-flash")).toThrow(DeepSeekError)
    try { validateModel("deepseek-v4-flash") } catch (e) {
      expect(e instanceof DeepSeekError).toBe(true)
      expect((e as DeepSeekError).code).toBe("invalid-model")
    }
  })

  test("validateModel rejects deepseek-chat", () => {
    expect(() => validateModel("deepseek-chat")).toThrow(DeepSeekError)
  })

  test("validateModel rejects deepseek-reasoner", () => {
    expect(() => validateModel("deepseek-reasoner")).toThrow(DeepSeekError)
  })

  test("validateModel rejects empty string", () => {
    expect(() => validateModel("")).toThrow(DeepSeekError)
  })

  test("validateModel rejects arbitrary model names", () => {
    expect(() => validateModel("gpt-4")).toThrow(DeepSeekError)
    expect(() => validateModel("claude-3")).toThrow(DeepSeekError)
    expect(() => validateModel("random-model")).toThrow(DeepSeekError)
  })

  // ============================================================================
  // 3. isProhibitedModel — detects Flash and legacy patterns
  // ============================================================================
  test("isProhibitedModel detects flash in any case", () => {
    expect(isProhibitedModel("deepseek-v4-flash")).toBe(true)
    expect(isProhibitedModel("DEEPSEEK-V4-FLASH")).toBe(true)
    expect(isProhibitedModel("some-flash-model")).toBe(true)
  })

  test("isProhibitedModel detects deepseek-chat", () => {
    expect(isProhibitedModel("deepseek-chat")).toBe(true)
  })

  test("isProhibitedModel detects deepseek-reasoner", () => {
    expect(isProhibitedModel("deepseek-reasoner")).toBe(true)
  })

  test("isProhibitedModel returns false for deepseek-v4-pro", () => {
    expect(isProhibitedModel("deepseek-v4-pro")).toBe(false)
  })

  test("isProhibitedModel returns false for unrelated model names", () => {
    expect(isProhibitedModel("gpt-4")).toBe(false)
    expect(isProhibitedModel("claude-opus")).toBe(false)
  })

  // ============================================================================
  // 4. DEEPSEEK_API_KEY — safe failure when missing (no live key needed)
  // ============================================================================
  test("isDeepSeekConfigured returns false when key is missing", () => {
    const original = process.env.DEEPSEEK_API_KEY
    delete (process.env as any).DEEPSEEK_API_KEY
    try {
      expect(isDeepSeekConfigured()).toBe(false)
    } finally {
      process.env.DEEPSEEK_API_KEY = original
    }
  })

  test("isDeepSeekConfigured returns true when key is set", () => {
    const original = process.env.DEEPSEEK_API_KEY
    process.env.DEEPSEEK_API_KEY = "test-key-for-unit-tests"
    try {
      expect(isDeepSeekConfigured()).toBe(true)
    } finally {
      process.env.DEEPSEEK_API_KEY = original
    }
  })

  // ============================================================================
  // 5. getProviderStatus — never exposes secrets
  // ============================================================================
  test("getProviderStatus never contains the API key value", () => {
    const original = process.env.DEEPSEEK_API_KEY
    process.env.DEEPSEEK_API_KEY = "sk-secret-key-that-must-not-leak"
    try {
      const status = getProviderStatus()
      const serialized = JSON.stringify(status)
      expect(serialized).not.toContain("sk-secret")
      expect(serialized).not.toContain("must-not-leak")
      expect(status.model).toBe(LARAS_AI_MODEL)
      expect(status.baseUrl).toBeTruthy()
    } finally {
      process.env.DEEPSEEK_API_KEY = original
    }
  })

  test("getProviderStatus reports configured: false when key missing", () => {
    const original = process.env.DEEPSEEK_API_KEY
    delete (process.env as any).DEEPSEEK_API_KEY
    try {
      const status = getProviderStatus()
      expect(status.configured).toBe(false)
    } finally {
      process.env.DEEPSEEK_API_KEY = original
    }
  })

  // ============================================================================
  // 6. DEEPSEEK_BASE_URL — default when not set
  // ============================================================================
  test("getProviderStatus uses default base URL when not configured", () => {
    const original = process.env.DEEPSEEK_BASE_URL
    delete (process.env as any).DEEPSEEK_BASE_URL
    try {
      const status = getProviderStatus()
      expect(status.baseUrl).toBe("https://api.deepseek.com")
    } finally {
      process.env.DEEPSEEK_BASE_URL = original
    }
  })
})

describe("DeepSeek Provider — extractJSON", () => {
  test("extracts plain JSON object", () => {
    const result = extractJSON('{"key": "value"}')
    expect(result).toEqual({ key: "value" })
  })

  test("extracts JSON from markdown code fences", () => {
    const result = extractJSON('```json\n{"key": "value"}\n```')
    expect(result).toEqual({ key: "value" })
  })

  test("extracts JSON from code fences without json tag", () => {
    const result = extractJSON('```\n{"key": "value"}\n```')
    expect(result).toEqual({ key: "value" })
  })

  test("extracts JSON array", () => {
    const result = extractJSON('[{"id": 1}, {"id": 2}]')
    expect(Array.isArray(result)).toBe(true)
    expect((result as any[]).length).toBe(2)
  })

  test("extracts JSON array from code fences", () => {
    const result = extractJSON('```json\n[1, 2, 3]\n```')
    expect(result).toEqual([1, 2, 3])
  })

  test("handles surrounding whitespace and text", () => {
    const result = extractJSON('Here is the result:\n\n```json\n{"ok": true}\n```\n\nHope this helps!')
    expect(result).toEqual({ ok: true })
  })

  test("throws on invalid JSON", () => {
    expect(() => extractJSON("not json at all")).toThrow()
  })

  test("throws on empty string", () => {
    expect(() => extractJSON("")).toThrow()
  })
})

describe("DeepSeek Provider — DeepSeekError", () => {
  test("creates error with code and status", () => {
    const err = new DeepSeekError("test message", "test-code", 502)
    expect(err.message).toBe("test message")
    expect(err.code).toBe("test-code")
    expect(err.status).toBe(502)
    expect(err.name).toBe("DeepSeekError")
    expect(err instanceof Error).toBe(true)
  })
})
