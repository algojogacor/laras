import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { computeCompletion, serializeProfile, type ProfileWithRelations } from "@/lib/profile"
import {
  requireActor,
  getRequiredProfileId,
  handleAuthorizationError,
  AuthorizationError,
} from "@/lib/authorization"

export async function GET() {
  try {
    const actor = await requireActor()
    if (!actor.profileId) {
      return NextResponse.json({ profile: null }, { status: 200 })
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

    if (!profile) return NextResponse.json({ profile: null }, { status: 200 })
    return NextResponse.json({ profile: serializeProfile(profile) })
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

    let body: any
    try {
      body = await request.json()
    } catch {
      throw new AuthorizationError("BAD_REQUEST")
    }

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
      experiences = [], skills = [], educations = [], certifications = [], languages = [],
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

      if (experiences.length) {
        await tx.experience.createMany({
          data: experiences.map((e: RelationInput, i: number) => ({
            userProfileId: profileId!, // ignore client-supplied IDs
            type: e.type ?? "work",
            title: e.title ?? "",
            organization: e.organization ?? "",
            startDate: e.startDate ?? null,
            endDate: e.endDate ?? null,
            current: e.current ?? false,
            location: e.location ?? null,
            description: e.description ?? null,
            achievements: e.achievements ? JSON.stringify(e.achievements) : null,
            contextNotes: e.contextNotes ?? null,
            order: e.order ?? i,
          })),
        })
      }
      if (skills.length) {
        await tx.skill.createMany({
          data: skills.map((s: RelationInput, i: number) => ({
            userProfileId: profileId!, // ignore client-supplied IDs
            name: s.name ?? "",
            category: s.category ?? null,
            proficiency: s.proficiency ?? null,
            context: s.context ?? null,
            order: s.order ?? i,
          })),
        })
      }
      if (educations.length) {
        await tx.education.createMany({
          data: educations.map((e: RelationInput, i: number) => ({
            userProfileId: profileId!, // ignore client-supplied IDs
            institution: e.institution ?? "",
            degree: e.degree ?? null,
            field: e.field ?? null,
            startDate: e.startDate ?? null,
            endDate: e.endDate ?? null,
            current: e.current ?? false,
            gpa: e.gpa ?? null,
            description: e.description ?? null,
            order: e.order ?? i,
          })),
        })
      }
      if (certifications.length) {
        await tx.certification.createMany({
          data: certifications.map((c: RelationInput, i: number) => ({
            userProfileId: profileId!, // ignore client-supplied IDs
            name: c.name ?? "",
            issuer: c.issuer ?? null,
            issueDate: c.issueDate ?? null,
            expiryDate: c.expiryDate ?? null,
            credentialId: c.credentialId ?? null,
            url: c.url ?? null,
            order: c.order ?? i,
          })),
        })
      }
      if (languages.length) {
        await tx.languageProficiency.createMany({
          data: languages.map((l: RelationInput, i: number) => ({
            userProfileId: profileId!, // ignore client-supplied IDs
            language: l.language ?? "",
            level: l.level ?? null,
            order: l.order ?? i,
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

    return NextResponse.json({ ok: true, profileCompletion: completion })
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

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleAuthorizationError(error)
  }
}
