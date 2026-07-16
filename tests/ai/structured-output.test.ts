import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { parseStructured, StructuredOutputError } from "@/lib/ai/structured-output"

const schema = z.object({
  url: z.string().url().refine((value) => new URL(value).protocol === "https:", "https required"),
  category: z.enum(["bug", "suggestion"]),
  description: z.string().min(10).max(100),
}).strict()

describe("structured AI output", () => {
  test("accepts valid JSON matching the schema", () => {
    expect(parseStructured('{"url":"https://example.com","category":"bug","description":"A sufficiently detailed report"}', schema, "test").category).toBe("bug")
  })

  test.each([
    ["missing field", '{"url":"https://example.com","category":"bug"}'],
    ["wrong type", '{"url":"https://example.com","category":"bug","description":42}'],
    ["unexpected field", '{"url":"https://example.com","category":"bug","description":"A sufficiently detailed report","extra":true}'],
    ["unsafe URL", '{"url":"http://example.com","category":"bug","description":"A sufficiently detailed report"}'],
    ["invalid enum", '{"url":"https://example.com","category":"other","description":"A sufficiently detailed report"}'],
    ["oversized field", `{"url":"https://example.com","category":"bug","description":"${"x".repeat(101)}"}`],
  ])("rejects %s without returning partial data", (_, raw) => {
    expect(() => parseStructured(raw, schema, "test")).toThrow(StructuredOutputError)
  })
})
