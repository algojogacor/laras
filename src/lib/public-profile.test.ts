/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test"
import {
  projectPublicProfile,
  type PublicProfileProjectionInput,
} from "./public-profile"

const CANARIES = {
  publicHeadline: "PUBLIC_HEADLINE_CANARY",
  privateEmail: "private-email-canary@example.test",
  privatePhone: "PRIVATE_PHONE_CANARY",
  connectionOnly: "CONNECTION_ONLY_CANARY",
  privateSummary: "PRIVATE_SUMMARY_CANARY",
  verificationEvidence: "PRIVATE_VERIFICATION_EVIDENCE_CANARY",
} as const

function fixture(
  overrides: Partial<PublicProfileProjectionInput> = {}
): PublicProfileProjectionInput {
  return {
    profile: {
      id: "owner-profile",
      accountId: "owner-account",
      fullName: "Public Name",
      headline: CANARIES.publicHeadline,
      summary: CANARIES.privateSummary,
      email: CANARIES.privateEmail,
      phone: CANARIES.privatePhone,
      location: CANARIES.connectionOnly,
      photoUrl: "https://example.test/avatar.png",
      links: JSON.stringify({
        website: "https://example.test/CONNECTION_ONLY_CANARY",
        linkedin: "https://linkedin.example/CONNECTION_ONLY_CANARY",
      }),
      createdAt: new Date("2025-01-02T00:00:00.000Z"),
      experiences: [
        {
          title: "Public Experience",
          organization: "Public Organization",
          startDate: "2024-01",
          endDate: null,
          current: true,
          location: "Public nested location",
          description: "Public nested description",
          achievements: JSON.stringify(["PRIVATE_ACHIEVEMENT_CANARY"]),
          contextNotes: "PRIVATE_CONTEXT_CANARY",
        },
      ],
      educations: [
        {
          institution: "Public University",
          degree: "Public Degree",
          field: "Public Field",
          startDate: "2020-01",
          endDate: "2024-01",
          current: false,
          gpa: "PRIVATE_GPA_CANARY",
          description: "PRIVATE_EDUCATION_DESCRIPTION_CANARY",
        },
      ],
      skills: [
        {
          name: "Public Skill",
          category: "technical",
          proficiency: "advanced",
          context: "PRIVATE_SKILL_CONTEXT_CANARY",
        },
      ],
      certifications: [
        {
          name: "Public Certification",
          issuer: "Public Issuer",
          credentialId: "PRIVATE_CREDENTIAL_ID_CANARY",
          url: "https://credential.example/PRIVATE_CREDENTIAL_URL_CANARY",
        },
      ],
      languages: [{ language: "Indonesian", level: "native" }],
      verificationBadges: [
        {
          type: "identity",
          status: "verified",
          evidence: CANARIES.verificationEvidence,
          note: "PRIVATE_VERIFIER_NOTE_CANARY",
        },
        {
          type: "email",
          status: "pending",
          evidence: "PRIVATE_PENDING_EVIDENCE_CANARY",
          note: null,
        },
        {
          type: "PRIVATE_UNKNOWN_BADGE_TYPE_CANARY",
          status: "verified",
          evidence: null,
          note: null,
        },
      ],
    },
    consentSettings: [
      { field: "fullName", visibility: "public" },
      { field: "email", visibility: "private" },
      { field: "phone", visibility: "private" },
      { field: "location", visibility: "connections" },
      { field: "links", visibility: "connections" },
      { field: "experiences", visibility: "public" },
      { field: "education", visibility: "public" },
      { field: "skills", visibility: "public" },
      { field: "certifications", visibility: "public" },
      { field: "languages", visibility: "public" },
    ],
    viewer: null,
    relationships: [],
    ...overrides,
  }
}

function serialized(input: PublicProfileProjectionInput): string {
  return JSON.stringify(projectPublicProfile(input))
}

describe("projectPublicProfile", () => {
  test("owner receives private profile fields but never private verification evidence", () => {
    const result = projectPublicProfile(
      fixture({ viewer: { accountId: "owner-account", profileId: "owner-profile" } })
    )

    expect(result.viewerClass).toBe("OWNER")
    expect(result.profile.email).toBe(CANARIES.privateEmail)
    expect(result.profile.phone).toBe(CANARIES.privatePhone)
    expect(result.profile.summary).toBe(CANARIES.privateSummary)
    expect(JSON.stringify(result)).not.toContain(CANARIES.verificationEvidence)
  })

  test("accepted connection receives connection-only fields but not private fields", () => {
    const input = fixture({
      viewer: { accountId: "connection-account", profileId: "connection-profile" },
      relationships: [
        {
          requesterId: "connection-profile",
          addresseeId: "owner-profile",
          status: "accepted",
        },
      ],
    })
    const result = projectPublicProfile(input)
    const json = JSON.stringify(result)

    expect(result.viewerClass).toBe("ACCEPTED_CONNECTION")
    expect(json).toContain(CANARIES.connectionOnly)
    expect("email" in result.profile).toBe(false)
    expect("phone" in result.profile).toBe(false)
    expect("summary" in result.profile).toBe(false)
    expect(json).not.toContain(CANARIES.privateEmail)
    expect(json).not.toContain(CANARIES.privatePhone)
    expect(json).not.toContain(CANARIES.privateSummary)
  })

  test.each([
    {
      label: "incoming pending relationship",
      viewer: { accountId: "pending-account", profileId: "pending-profile" },
      relationships: [
        { requesterId: "owner-profile", addresseeId: "pending-profile", status: "pending" },
      ],
      expected: "PENDING_CONNECTION",
    },
    {
      label: "outgoing pending relationship",
      viewer: { accountId: "pending-account", profileId: "pending-profile" },
      relationships: [
        { requesterId: "pending-profile", addresseeId: "owner-profile", status: "pending" },
      ],
      expected: "PENDING_CONNECTION",
    },
    {
      label: "declined relationship",
      viewer: { accountId: "declined-account", profileId: "declined-profile" },
      relationships: [
        { requesterId: "declined-profile", addresseeId: "owner-profile", status: "declined" },
      ],
      expected: "AUTHENTICATED_STRANGER",
    },
    {
      label: "blocked relationship",
      viewer: { accountId: "blocked-account", profileId: "blocked-profile" },
      relationships: [
        { requesterId: "owner-profile", addresseeId: "blocked-profile", status: "blocked" },
      ],
      expected: "AUTHENTICATED_STRANGER",
    },
    {
      label: "authenticated stranger",
      viewer: { accountId: "stranger-account", profileId: "stranger-profile" },
      relationships: [],
      expected: "AUTHENTICATED_STRANGER",
    },
  ])("$label receives public fields only", ({ viewer, relationships, expected }) => {
    const result = projectPublicProfile(fixture({ viewer, relationships }))
    const json = JSON.stringify(result)

    expect(result.viewerClass).toBe(expected)
    expect(json).toContain(CANARIES.publicHeadline)
    expect(json).not.toContain(CANARIES.connectionOnly)
    expect(json).not.toContain(CANARIES.privateEmail)
    expect(json).not.toContain(CANARIES.privatePhone)
    expect(json).not.toContain(CANARIES.privateSummary)
  })

  test("anonymous viewer receives public fields only", () => {
    const json = serialized(fixture())

    expect(json).toContain(CANARIES.publicHeadline)
    expect(json).not.toContain(CANARIES.connectionOnly)
    expect(json).not.toContain(CANARIES.privateEmail)
    expect(json).not.toContain(CANARIES.privatePhone)
    expect(json).not.toContain(CANARIES.privateSummary)
  })

  test("malformed duplicate consent fails closed for the affected field", () => {
    const input = fixture()
    input.consentSettings = [
      ...input.consentSettings,
      { field: "experiences", visibility: "connections" },
    ]
    const result = projectPublicProfile(input)

    expect("experiences" in result.profile).toBe(false)
  })

  test("unknown consent value fails closed for the affected field", () => {
    const input = fixture()
    input.consentSettings = input.consentSettings.map((entry) =>
      entry.field === "experiences"
        ? { field: "experiences", visibility: "unknown" }
        : entry
    )
    const result = projectPublicProfile(input)

    expect("experiences" in result.profile).toBe(false)
  })

  test("missing relationship result fails closed", () => {
    const result = projectPublicProfile(
      fixture({
        viewer: { accountId: "connection-account", profileId: "connection-profile" },
        relationships: undefined,
      })
    )
    const json = JSON.stringify(result)

    expect(result.viewerClass).toBe("AUTHENTICATED_STRANGER")
    expect(json).not.toContain(CANARIES.connectionOnly)
  })

  test("duplicated accepted relationships fail closed", () => {
    const result = projectPublicProfile(
      fixture({
        viewer: { accountId: "connection-account", profileId: "connection-profile" },
        relationships: [
          {
            requesterId: "connection-profile",
            addresseeId: "owner-profile",
            status: "accepted",
          },
          {
            requesterId: "owner-profile",
            addresseeId: "connection-profile",
            status: "accepted",
          },
        ],
      })
    )
    const json = JSON.stringify(result)

    expect(result.viewerClass).toBe("AUTHENTICATED_STRANGER")
    expect(json).not.toContain(CANARIES.connectionOnly)
  })

  test("missing consent rows use documented conservative defaults", () => {
    const input = fixture()
    input.consentSettings = input.consentSettings.filter(
      (entry) => entry.field !== "email" && entry.field !== "experiences"
    )
    const result = projectPublicProfile(input)

    expect("email" in result.profile).toBe(false)
    expect(result.profile.experiences?.[0]?.title).toBe("Public Experience")
  })

  test("nested private data, internal IDs, account fields, and consent records never serialize", () => {
    const json = serialized(fixture())

    for (const canary of [
      "PRIVATE_ACHIEVEMENT_CANARY",
      "PRIVATE_CONTEXT_CANARY",
      "PRIVATE_GPA_CANARY",
      "PRIVATE_EDUCATION_DESCRIPTION_CANARY",
      "PRIVATE_SKILL_CONTEXT_CANARY",
      "PRIVATE_CREDENTIAL_ID_CANARY",
      "PRIVATE_CREDENTIAL_URL_CANARY",
      "PRIVATE_VERIFIER_NOTE_CANARY",
      "PRIVATE_PENDING_EVIDENCE_CANARY",
      "PRIVATE_UNKNOWN_BADGE_TYPE_CANARY",
      "owner-account",
      "owner-profile",
    ]) {
      expect(json).not.toContain(canary)
    }
    expect(json).not.toContain("consentSettings")
    expect(json).not.toContain("requesterId")
    expect(json).not.toContain("addresseeId")
  })
})
