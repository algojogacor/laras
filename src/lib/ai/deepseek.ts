/**
 * Centralized DeepSeek AI Provider — Laras.
 *
 * EVERY AI request in the application MUST go through this module.
 * No route, component, or service may instantiate a DeepSeek client independently.
 *
 * Hard invariants:
 *   - Model is ALWAYS `deepseek-v4-pro`.
 *   - Flash models (deepseek-v4-flash, deepseek-chat, deepseek-reasoner, or any
 *     model containing "flash") are STRICTLY PROHIBITED.
 *   - No automatic fallback to a cheaper/faster model.
 *   - If the Pro model is unavailable → fail explicitly, return a safe error,
 *     preserve retry/recovery, and never downgrade.
 *
 * The official DeepSeek API is OpenAI-compatible:
 *   Base URL : https://api.deepseek.com  (overridable via DEEPSEEK_BASE_URL)
 *   Model    : deepseek-v4-pro
 *   Auth     : Bearer <DEEPSEEK_API_KEY>
 */

// NOTE: Do NOT import "server-only" here. This module is imported by test
// files that mock server-only. The functions themselves are server-safe
// because they read process.env which is not available in the browser.
// Routes and Server Components that use this module already have their own
// "server-only" guards.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The one and only permitted model. Never change this at runtime. */
export const LARAS_AI_MODEL = "deepseek-v4-pro" as const

/** Prohibited model substrings. If a value contains any of these, reject it. */
const PROHIBITED_MODEL_PATTERNS = [
  "flash",
  "deepseek-chat",
  "deepseek-reasoner",
] as const

const DEFAULT_BASE_URL = "https://api.deepseek.com"
const DEFAULT_TIMEOUT_MS = 120_000 // 2 minutes
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key || key.length === 0) {
    throw new DeepSeekError(
      "DEEPSEEK_API_KEY is not set. AI features are unavailable until configured.",
      "missing-key",
      500
    )
  }
  return key
}

function getBaseUrl(): string {
  const url = process.env.DEEPSEEK_BASE_URL
  if (url && url.length > 0) return url.replace(/\/+$/, "")
  return DEFAULT_BASE_URL
}

/** Validate that the model is deepseek-v4-pro and nothing else. */
export function validateModel(model: string): asserts model is typeof LARAS_AI_MODEL {
  if (model !== LARAS_AI_MODEL) {
    throw new DeepSeekError(
      `Model "${model}" is not permitted. Only ${LARAS_AI_MODEL} may be used.`,
      "invalid-model",
      500
    )
  }
}

/** Check whether a model string contains prohibited patterns. */
export function isProhibitedModel(model: string): boolean {
  const lower = model.toLowerCase()
  return PROHIBITED_MODEL_PATTERNS.some((p) => lower.includes(p))
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class DeepSeekError extends Error {
  public readonly code: string
  public readonly status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = "DeepSeekError"
    this.code = code
    this.status = status
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeepSeekMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type DeepSeekCompletionRequest = {
  messages: DeepSeekMessage[]
  thinking?: { type: "enabled" } | { type: "disabled" }
  temperature?: number
  max_tokens?: number
  signal?: AbortSignal
}

export type DeepSeekCompletionResponse = {
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// ---------------------------------------------------------------------------
// HTTP client (server-side only — no secrets exposed)
// ---------------------------------------------------------------------------

/**
 * Build headers for DeepSeek API requests.
 * NEVER includes the key in error messages, logs, or responses.
 */
function buildHeaders(): Record<string, string> {
  const apiKey = getApiKey()
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  }
}

/**
 * Sanitize headers for logging — strips Authorization entirely.
 */
function sanitizedHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: "Bearer ***" }
}

// ---------------------------------------------------------------------------
// Core completion
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof DeepSeekError) return false // auth/model errors never retry
  if (error instanceof DOMException && error.name === "AbortError") return false
  return true
}

/**
 * Execute a completion request against the DeepSeek API.
 *
 * This is the single entry point for all LLM calls. Every AI workflow
 * in Laras ultimately flows through this function.
 */
export async function createCompletion(
  request: DeepSeekCompletionRequest
): Promise<DeepSeekCompletionResponse> {
  // Validate model before anything else
  validateModel(LARAS_AI_MODEL)

  const apiKey = getApiKey()
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/v1/chat/completions`

  const body: Record<string, unknown> = {
    model: LARAS_AI_MODEL,
    messages: request.messages,
  }

  if (request.thinking) {
    // DeepSeek supports thinking via the chat_completion_reasoning_effort param.
    // For "enabled" we pass the thinking object; for "disabled" we omit it.
    if (request.thinking.type === "enabled") {
      body.thinking = { type: "enabled" }
    }
    // disabled = omit entirely (DeepSeek defaults to no thinking)
  }

  if (request.temperature !== undefined) body.temperature = request.temperature
  if (request.max_tokens !== undefined) body.max_tokens = request.max_tokens

  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Each retry gets a fresh controller and timeout. Reusing an aborted
    // controller (or clearing one shared timer) would leave later attempts
    // without a bounded timeout.
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
    const onCallerAbort = () => controller.abort()
    request.signal?.addEventListener("abort", onCallerAbort, { once: true })
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "(no body)")
        const status = response.status

        // Classify errors
        if (status === 401 || status === 403) {
          throw new DeepSeekError(
            "DeepSeek API authentication failed. Check your DEEPSEEK_API_KEY.",
            "auth-failed",
            502
          )
        }
        if (status === 404) {
          throw new DeepSeekError(
            `Model ${LARAS_AI_MODEL} not found or not available.`,
            "model-unavailable",
            502
          )
        }

        // Retryable errors
        if (isRetryableStatus(status) && attempt < MAX_RETRIES) {
          console.warn(
            `[deepseek] retryable error (status ${status}), attempt ${attempt + 1}/${MAX_RETRIES}`
          )
          lastError = new Error(`DeepSeek API error ${status}: ${errorText.slice(0, 200)}`)
          await sleep(RETRY_DELAY_MS * (attempt + 1)) // backoff
          continue
        }

        throw new DeepSeekError(
          `DeepSeek API error ${status}`,
          "api-error",
          502
        )
      }

      const data = (await response.json()) as DeepSeekCompletionResponse

      // Safety: verify we got choices before returning
      if (!data.choices || data.choices.length === 0) {
        throw new DeepSeekError(
          "DeepSeek returned no choices in the response.",
          "empty-response",
          502
        )
      }

      // Log usage metadata (never content)
      if (data.usage) {
        console.log(
          `[deepseek] tokens: ${data.usage.total_tokens} (${data.usage.prompt_tokens} prompt + ${data.usage.completion_tokens} completion)`
        )
      }

      return data
    } catch (error) {
      clearTimeout(timeoutId)
      request.signal?.removeEventListener("abort", onCallerAbort)

      // Don't retry auth errors, model errors, or aborts
      if (!isRetryableError(error) || attempt >= MAX_RETRIES) {
        if (error instanceof DeepSeekError) throw error

        // Abort / timeout
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new DeepSeekError(
            "AI request timed out. Please try again.",
            "timeout",
            504
          )
        }

        // Unknown error — sanitize
        console.error("[deepseek] unexpected error:", (error as Error).message)
        throw new DeepSeekError(
          "An unexpected error occurred with the AI service.",
          "unknown",
          502
        )
      }

      lastError = error
      console.warn(
        `[deepseek] retrying after error: ${(error as Error).message.slice(0, 100)}, attempt ${attempt + 1}/${MAX_RETRIES}`
      )
      await sleep(RETRY_DELAY_MS * (attempt + 1))
    } finally {
      clearTimeout(timeoutId)
      request.signal?.removeEventListener("abort", onCallerAbort)
    }
  }

  // Should be unreachable, but TypeScript needs it
  throw new DeepSeekError(
    "AI request failed after all retries.",
    "retries-exhausted",
    502
  )
}

// ---------------------------------------------------------------------------
// Structured output helpers
// ---------------------------------------------------------------------------

/**
 * Extract JSON from an LLM response that may wrap it in markdown fences.
 * Shared across all AI workflows — keeps parsing consistent.
 */
export function extractJSON(raw: string): unknown {
  let s = raw.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()
  const firstBracket = s.indexOf("[")
  const firstBrace = s.indexOf("{")
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    const lastBracket = s.lastIndexOf("]")
    if (lastBracket !== -1) s = s.slice(firstBracket, lastBracket + 1)
  } else if (firstBrace !== -1) {
    const lastBrace = s.lastIndexOf("}")
    if (lastBrace !== -1) s = s.slice(firstBrace, lastBrace + 1)
  }
  return JSON.parse(s)
}

// ---------------------------------------------------------------------------
// Readiness check
// ---------------------------------------------------------------------------

/**
 * Check whether the DeepSeek provider is configured and ready.
 * Does NOT make a network call — only checks that the API key is present.
 */
export function isDeepSeekConfigured(): boolean {
  try {
    getApiKey()
    return true
  } catch {
    return false
  }
}

/**
 * Get a safe description of the provider state (no secrets).
 */
export function getProviderStatus(): {
  configured: boolean
  model: string
  baseUrl: string
} {
  return {
    configured: isDeepSeekConfigured(),
    model: LARAS_AI_MODEL,
    baseUrl: process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL,
  }
}
