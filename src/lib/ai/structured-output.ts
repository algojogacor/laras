import { z } from "zod"
import { extractJSON } from "@/lib/ai/deepseek"

export class StructuredOutputError extends Error {
  constructor(public readonly label: string, message: string) {
    super(`${label}: ${message}`)
    this.name = "StructuredOutputError"
  }
}

export function parseStructured<T>(raw: string, schema: z.ZodType<T>, label: string): T {
  let value: unknown
  try {
    value = extractJSON(raw)
  } catch {
    throw new StructuredOutputError(label, "invalid JSON")
  }
  const result = schema.safeParse(value)
  if (!result.success) throw new StructuredOutputError(label, result.error.issues[0]?.message || "schema mismatch")
  return result.data
}
