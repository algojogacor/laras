import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { computeCompletion, serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
  safeNextResponse
} from "@/lib/authorization"
import { validateProfilePutPayload } from "@/lib/profile-validation"

export async function GET() {
  try {
    const actor = await requireActor()
    if (!actor.profileId) {
      return safeNextResponse({ profile: null }, { status: 200 })
    }

    const profile = (await db.userProfile.findUnique({
      where: { id: actor.profileId },
      include: {
        experiences: { orderBy: { order: "asc" } },
        educations: { orderBy: { order: "asc" } },
        skills: { orderBy: { order: "asc" } },
        certifications: { orderBy: { order: "asc" } },
        languages: { orderBy: { order: "asc" } },
      },
    })) as ProfileWithRelations | null

    if (!profile) return safeNextResponse({ profile: null }, { status: 200 })
    return safeNextResponse({ profile: serializeProfile(profile) })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

type RelationInput = {
  // experiences
  type?: string
  title?: string
  organization?: string
  startDate?: string | null
  endDate?: string | null
  current?: boolean
  location?: string | null
  description?: string | null
  achievements?: string[]
  contextNotes?: string | null
  order?: number
  // education
  institution?: string
  degree?: string | null
  field?: string | null
  gpa?: string | null
  // skill
  name?: string
  category?: string | null
  proficiency?: string | null
  context?: string | null
  // certification
  issuer?: string | null
  issueDate?: string | null
  expiryDate?: string | null
  credentialId?: string | null
  url?: string | null
  // language
  language?: string
  level?: string | null
}

export async function PUT(request: Request) {
  try {
    const actor = await requireActor()

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    // Validate the complete payload before any database writes.
    // This rejects non-arrays, oversized collections, invalid child types,
    // protected field injection, and mixed-validity collections atomically.
    const validated = validateProfilePutPayload(rawBody)

    const body = rawBody as Record<string, unknown>

    // Ensure profile exists or create it
    let profileId = actor.profileId
    if (!profileId) {
      const newProfile = await db.userProfile.create({
        data: {
          accountId: actor.accountId,
          email: actor.email,
        },
      })
      profileId = newProfile.id
    }

    const {
      fullName, headline, summary, email, phone, location, photoUrl, links,
      uiLocale, docLocale, targetRegion, opportunityTypes, preferredTone, urgency, targetExamScore,
    } = body

    await db.$transaction(async (tx) => {
      const currentProfile = await tx.userProfile.findUnique({
        where: { id: profileId! },
      })
      if (!currentProfile) {
        throw new AuthorizationError("NOT_FOUND")
      }

      await tx.userProfile.update({
        where: { id: profileId! },
        data: {
          fullName: fullName ?? currentProfile.fullName,
          headline: headline ?? currentProfile.headline,
          summary: summary ?? currentProfile.summary,
          email: email ?? currentProfile.email,
          phone: phone ?? currentProfile.phone,
          location: location ?? currentProfile.location,
          photoUrl: photoUrl ?? currentProfile.photoUrl,
          links: links ? JSON.stringify(links) : currentProfile.links,
          uiLocale: uiLocale ?? currentProfile.uiLocale,
          docLocale: docLocale ?? currentProfile.docLocale,
          targetRegion: targetRegion ?? currentProfile.targetRegion,
          opportunityTypes: opportunityTypes ? JSON.stringify(opportunityTypes) : currentProfile.opportunityTypes,
          preferredTone: preferredTone ?? currentProfile.preferredTone,
          urgency: urgency ?? currentProfile.urgency,
          targetExamScore: targetExamScore ?? currentProfile.targetExamScore,
        },
      })

      // Replace relations under transaction
      await tx.experience.deleteMany({ where: { userProfileId: profileId! } })
      await tx.skill.deleteMany({ where: { userProfileId: profileId! } })
      await tx.education.deleteMany({ where: { userProfileId: profileId! } })
      await tx.certification.deleteMany({ where: { userProfileId: profileId! } })
      await tx.languageProficiency.deleteMany({ where: { userProfileId: profileId! } })

      if (validated.experiences.length) {
        await tx.experience.createMany({
          data: validated.experiences.map((e: Record<string, unknown>, i: number) => ({
            userProfileId: profileId!,
            type: (e.type as string) ?? "work",
            title: (e.title as string) ?? "",
            organization: (e.organization as string) ?? "",
            startDate: (e.startDate as string) ?? null,
            endDate: (e.endDate as string) ?? null,
            current: (e.current as boolean) ?? false,
            location: (e.location as string) ?? null,
            description: (e.description as string) ?? null,
            achievements: e.achievements ? JSON.stringify(e.achievements) : null,
            contextNotes: (e.contextNotes as string) ?? null,
            order: (e.order as number) ?? i,
          })),
        })
      }
      if (validated.skills.length) {
        await tx.skill.createMany({
          data: validated.skills.map((s: Record<string, unknown>, i: number) => ({
            userProfileId: profileId!,
            name: (s.name as string) ?? "",
            category: (s.category as string) ?? null,
            proficiency: (s.proficiency as string) ?? null,
            context: (s.context as string) ?? null,
            order: (s.order as number) ?? i,
          })),
        })
      }
      if (validated.educations.length) {
        await tx.education.createMany({
          data: validated.educations.map((e: Record<string, unknown>, i: number) => ({
            userProfileId: profileId!,
            institution: (e.institution as string) ?? "",
            degree: (e.degree as string) ?? null,
            field: (e.field as string) ?? null,
            startDate: (e.startDate as string) ?? null,
            endDate: (e.endDate as string) ?? null,
            current: (e.current as boolean) ?? false,
            gpa: (e.gpa as string) ?? null,
            description: (e.description as string) ?? null,
            order: (e.order as number) ?? i,
          })),
        })
      }
      if (validated.certifications.length) {
        await tx.certification.createMany({
          data: validated.certifications.map((c: Record<string, unknown>, i: number) => ({
            userProfileId: profileId!,
            name: (c.name as string) ?? "",
            issuer: (c.issuer as string) ?? null,
            issueDate: (c.issueDate as string) ?? null,
            expiryDate: (c.expiryDate as string) ?? null,
            credentialId: (c.credentialId as string) ?? null,
            url: (c.url as string) ?? null,
            order: (c.order as number) ?? i,
          })),
        })
      }
      if (validated.languages.length) {
        await tx.languageProficiency.createMany({
          data: validated.languages.map((l: Record<string, unknown>, i: number) => ({
            userProfileId: profileId!,
            language: (l.language as string) ?? "",
            level: (l.level as string) ?? null,
            order: (l.order as number) ?? i,
          })),
        })
      }
    })

    // Recompute completion
    const updated = (await db.userProfile.findUnique({
      where: { id: profileId },
      include: {
        experiences: true,
        educations: true,
        skills: true,
        certifications: true,
        languages: true,
      },
    })) as ProfileWithRelations

    const completion = computeCompletion(updated)
    await db.userProfile.update({
      where: { id: profileId },
      data: { profileCompletion: completion },
    })

    return safeNextResponse({ ok: true, profileCompletion: completion })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireActor()
    const profileId = getRequiredProfileId(actor)

    let body: any
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

    const data: any = {}
    if (typeof body.onboardingComplete === "boolean") data.onboardingComplete = body.onboardingComplete
    if (typeof body.onboardingStep === "number") data.onboardingStep = body.onboardingStep
    if (typeof body.uiLocale === "string") data.uiLocale = body.uiLocale
    if (typeof body.docLocale === "string") data.docLocale = body.docLocale

    await db.userProfile.update({
      where: { id: profileId },
      data,
    })

    return safeNextResponse({ ok: true })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
