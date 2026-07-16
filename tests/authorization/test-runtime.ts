import { mock } from "bun:test"

type AsyncHook = (() => Promise<void>) | undefined

/**
 * One shared state object backs every authorization test mock. Bun keeps
 * mock.module overrides for the lifetime of the test process, so file-local
 * closures make outcomes depend on which test file loads first.
 */
export const testRuntime = {
  cookieValue: undefined as string | undefined,
  csrfCookieValue: undefined as string | undefined,
  deepseekCompletionsHook: undefined as AsyncHook,
  notFoundTriggered: false,
}

export function resetTestRuntime() {
  testRuntime.cookieValue = undefined
  testRuntime.csrfCookieValue = undefined
  testRuntime.deepseekCompletionsHook = undefined
  testRuntime.notFoundTriggered = false
}

mock.module("server-only", () => ({}))

mock.module("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === "laras_session" && testRuntime.cookieValue) {
        return { name: "laras_session", value: testRuntime.cookieValue }
      }
      if (name === "laras_csrf" && testRuntime.csrfCookieValue) {
        return { name: "laras_csrf", value: testRuntime.csrfCookieValue }
      }
      return undefined
    },
    set: (name: string, value: string) => {
      // No-op in test — just track that it was called
      if (name === "laras_csrf") testRuntime.csrfCookieValue = value
    },
    delete: (name: string) => {
      if (name === "laras_csrf") testRuntime.csrfCookieValue = undefined
      if (name === "laras_session") testRuntime.cookieValue = undefined
    },
  }),
}))

mock.module("next/navigation", () => ({
  notFound: () => {
    testRuntime.notFoundTriggered = true
    throw new Error("NEXT_NOT_FOUND")
  },
}))

mock.module("@/lib/i18n", () => ({
  getLocale: async () => "id",
  getLocaleAndDict: async () => ({
    t: {
      publicProfile: {
        title: "Profil",
        back: "Kembali",
        connectToView: "Hubungkan",
        privateField: "Privat",
        connectionsOnly: "Koneksi saja",
        editProfile: "Edit",
        headline: "Headline",
        summary: "Summary",
        experience: "Experience",
        education: "Education",
        skills: "Skills",
        certifications: "Certifications",
        languages: "Languages",
        location: "Location",
        links: "Links",
        noExperience: "No exp",
        noEducation: "No edu",
        noSkills: "No skills",
        connectButton: "Connect",
        verifiedBadges: "Badges",
        memberSince: "Member",
      },
    },
  }),
}))

mock.module("@/lib/ai/deepseek", () => ({
  LARAS_AI_MODEL: "deepseek-v4-pro",
  createCompletion: async () => {
    await testRuntime.deepseekCompletionsHook?.()
    return {
      choices: [
        {
          message: {
            content: JSON.stringify({
              fullName: "User A Revised",
              experiences: [],
              warnings: [],
            }),
          },
        },
      ],
    }
  },
  extractJSON: (raw: string) => JSON.parse(raw.trim()),
  validateModel: () => {}, // no-op: accepts deepseek-v4-pro
  isProhibitedModel: () => false,
  isDeepSeekConfigured: () => true,
  getProviderStatus: () => ({ configured: true, model: "deepseek-v4-pro", baseUrl: "https://api.deepseek.com" }),
  DeepSeekError: class DeepSeekError extends Error {
    code: string; status: number
    constructor(message: string, code: string, status: number) {
      super(message); this.name = "DeepSeekError"; this.code = code; this.status = status
    }
  },
}))
