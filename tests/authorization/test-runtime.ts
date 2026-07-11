import { mock } from "bun:test"

type AsyncHook = (() => Promise<void>) | undefined

/**
 * One shared state object backs every authorization test mock. Bun keeps
 * mock.module overrides for the lifetime of the test process, so file-local
 * closures make outcomes depend on which test file loads first.
 */
export const testRuntime = {
  cookieValue: undefined as string | undefined,
  zaiCompletionsHook: undefined as AsyncHook,
  notFoundTriggered: false,
}

export function resetTestRuntime() {
  testRuntime.cookieValue = undefined
  testRuntime.zaiCompletionsHook = undefined
  testRuntime.notFoundTriggered = false
}

mock.module("server-only", () => ({}))

mock.module("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === "laras_session" && testRuntime.cookieValue) {
        return { name: "laras_session", value: testRuntime.cookieValue }
      }
      return undefined
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

mock.module("z-ai-web-dev-sdk", () => ({
  default: {
    create: async () => ({
      chat: {
        completions: {
          create: async () => {
            await testRuntime.zaiCompletionsHook?.()
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
        },
      },
    }),
  },
}))
