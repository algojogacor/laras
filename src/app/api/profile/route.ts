import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { computeCompletion, serializeProfile, type ProfileWithRelations } from "@/lib/profile"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const profile = (await db.userProfile.findUnique({
    where: { accountId: session.userId },
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
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 })
  }

  const account = await db.account.findUnique({
    where: { id: session.userId },
    include: { profile: true },
  })
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  // Ensure profile exists
  let profile = account.profile
  if (!profile) {
    profile = await db.userProfile.create({
      data: { accountId: account.id, email: account.email, fullName: account.name },
    })
  }

  const {
    fullName, headline, summary, email, phone, location, photoUrl, links,
    uiLocale, docLocale, targetRegion, opportunityTypes, preferredTone, urgency, targetExamScore,
    experiences = [], skills = [], educations = [], certifications = [], languages = [],
  } = body

  await db.$transaction(async (tx) => {
    await tx.userProfile.update({
      where: { id: profile!.id },
      data: {
        fullName: fullName ?? profile!.fullName,
        headline: headline ?? profile!.headline,
        summary: summary ?? profile!.summary,
        email: email ?? profile!.email,
        phone: phone ?? profile!.phone,
        location: location ?? profile!.location,
        photoUrl: photoUrl ?? profile!.photoUrl,
        links: links ? JSON.stringify(links) : profile!.links,
        uiLocale: uiLocale ?? profile!.uiLocale,
        docLocale: docLocale ?? profile!.docLocale,
        targetRegion: targetRegion ?? profile!.targetRegion,
        opportunityTypes: opportunityTypes ? JSON.stringify(opportunityTypes) : profile!.opportunityTypes,
        preferredTone: preferredTone ?? profile!.preferredTone,
        urgency: urgency ?? profile!.urgency,
        targetExamScore: targetExamScore ?? profile!.targetExamScore,
      },
    })

    // Replace relations
    await tx.experience.deleteMany({ where: { userProfileId: profile!.id } })
    await tx.skill.deleteMany({ where: { userProfileId: profile!.id } })
    await tx.education.deleteMany({ where: { userProfileId: profile!.id } })
    await tx.certification.deleteMany({ where: { userProfileId: profile!.id } })
    await tx.languageProficiency.deleteMany({ where: { userProfileId: profile!.id } })

    if (experiences.length) {
      await tx.experience.createMany({
        data: experiences.map((e: RelationInput, i: number) => ({
          userProfileId: profile!.id,
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
          userProfileId: profile!.id,
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
          userProfileId: profile!.id,
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
          userProfileId: profile!.id,
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
          userProfileId: profile!.id,
          language: l.language ?? "",
          level: l.level ?? null,
          order: l.order ?? i,
        })),
      })
    }
  })

  // Recompute completion
  const updated = (await db.userProfile.findUnique({
    where: { id: profile.id },
    include: {
      experiences: true, educations: true, skills: true,
      certifications: true, languages: true,
    },
  })) as ProfileWithRelations
  const completion = computeCompletion(updated)
  await db.userProfile.update({
    where: { id: profile.id },
    data: { profileCompletion: completion },
  })

  return NextResponse.json({ ok: true, profileCompletion: completion })
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 })
  }

  const profile = await db.userProfile.findUnique({ where: { accountId: session.userId } })
  if (!profile) return NextResponse.json({ error: "no-profile" }, { status: 404 })

  const data: any = {}
  if (typeof body.onboardingComplete === "boolean") data.onboardingComplete = body.onboardingComplete
  if (typeof body.onboardingStep === "number") data.onboardingStep = body.onboardingStep
  if (typeof body.uiLocale === "string") data.uiLocale = body.uiLocale
  if (typeof body.docLocale === "string") data.docLocale = body.docLocale

  await db.userProfile.update({ where: { id: profile.id }, data })

  return NextResponse.json({ ok: true })
}
