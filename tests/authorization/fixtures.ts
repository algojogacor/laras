import { db } from "@/lib/db"

export const IDS = {
  accountA: "",
  accountB: "",
  adminC: "",
  unknownD: "",
  accountE: "",
  ownerF: "",
  moderatorG: "",

  profileA: "",
  profileB: "",
  profileC: "",
  profileD: "",
  profileF: "",
  profileG: "",

  documentA: "",
  documentB: "",
  documentF: "",

  applicationA: "",
  applicationB: "",
  applicationF: "",

  setA: "",
  setB: "",
  setF: "",

  questionA: "",
  questionB: "",
  questionF: "",

  sessionA: "",
  sessionB: "",
  sessionF: "",

  certA: "",
  certB: "",
  certF: "",

  appDocA: "",
  appDocB: "",
  appDocF: "",

  evidenceA: "",
  evidenceB: "",
  evidenceF: "",

  opportunityA: "",
  opportunityB: "",
  opportunityF: "",
}

export const CANARIES = {
  documentA: "Canary Document Content A",
  documentB: "Canary Document Content B",
  documentF: "Canary Document Content F",
  appA: "Canary App Notes A",
  appB: "Canary App Notes B",
  appF: "Canary App Notes F",
  questionA: "Canary Question A",
  questionB: "Canary Question B",
  questionF: "Canary Question F",
  passageA: "Canary Passage A",
  passageB: "Canary Passage B",
  passageF: "Canary Passage F",
  certA: "Canary Cert Title A",
  certB: "Canary Cert Title B",
  certF: "Canary Cert Title F",
  evidenceA: "Canary Evidence Title A",
  evidenceB: "Canary Evidence Title B",
  evidenceF: "Canary Evidence Title F",

  oppA: "Canary Opportunity Title A",
  oppB: "Canary Opportunity Title B",
  oppF: "Canary Opportunity Title F",
}

// Mutex to serialize DB operations across concurrent tests
let _dbMutex: Promise<void> = Promise.resolve()
function withMutex<T>(fn: () => Promise<T>): Promise<T> {
  const prev = _dbMutex
  let release!: () => void
  _dbMutex = new Promise<void>((resolve) => { release = resolve })
  return prev.then(fn).finally(release)
}

export async function cleanDb() {
  // Delete in FK-safe order: children first, then parents.
  // Uses Prisma model deleteMany (not raw SQL) for connection-pool safety.
  const tables = [
    // No FKs to UserProfile/Account
    "appeal", "moderationCase", "report", "scopedAssignment",
    "rolePermission", "permission",

    // Messaging: reference Conversation + UserProfile
    "messageRequest", "message", "conversationParticipant",
    "conversation",

    // Mentorship: reference UserProfile
    "mentorshipSession", "mentorshipRequest", "mentorshipProfile",

    // Circles: reference UserProfile
    "circleMembership", "careerCircle",

    // Organizations: reference UserProfile + Account
    "organizationMembership", "organization",

    // Campaigns: reference Account + Campaign
    "campaignMember", "licenseCode", "campaign",

    // Config
    "featureFlag", "dynamicConfig",

    // Docs + Apps: reference UserProfile + Document + Application
    "applicationDocument", "documentVersion", "revisionRequest",
    "document", "application",

    // Interview: reference UserProfile + InterviewSet
    "interviewQuestion", "interviewSet",

    // Essays, Evidence, Achievements: reference UserProfile
    "essay", "evidence", "achievement",

    // Announcements
    "announcementRead", "announcement",

    // Audit, Verification, License, Quota: reference UserProfile
    "auditLog", "verificationBadge", "license", "quotaLedger",

    // Profile content: reference UserProfile
    "experience", "education", "skill", "certification", "languageProficiency",
    "consentSetting",

    // Graph: reference UserProfile
    "connection", "block",

    // Notifications, Activity: reference UserProfile
    "notification", "activityEvent",

    // Opportunities, English: reference UserProfile
    "opportunity", "englishCertificate", "englishSession",

    // Question banks
    "listeningQuestion", "readingQuestion", "structureQuestion",

    // Parents last
    "userProfile", "account",
  ]
  // Clean PeerReview before parent tables to avoid FK violations
  try { await db.peerReview.deleteMany() } catch (_) {}
  for (const t of tables) {
    try {
      await (db as any)[t].deleteMany()
    } catch (e: any) {
      // Non-fatal: table may not exist in current schema
    }
  }
}

export async function seedDb() {
  return withMutex(async () => {

  // 1. Create Accounts sequentially/individually so we get generated IDs
  const accountA = await db.account.create({
    data: {
      email: "user-a@example.com",
      passwordHash: "dummy-hash-a",
      role: "user",
    },
  })
  const accountB = await db.account.create({
    data: {
      email: "user-b@example.com",
      passwordHash: "dummy-hash-b",
      role: "user",
    },
  })
  const adminC = await db.account.create({
    data: {
      email: "admin-c@example.com",
      passwordHash: "dummy-hash-c",
      role: "admin",
    },
  })
  const unknownD = await db.account.create({
    data: {
      email: "unknown-d@example.com",
      passwordHash: "dummy-hash-d",
      role: "moderator", // unknown role string
    },
  })
  const accountE = await db.account.create({
    data: {
      email: "user-e@example.com",
      passwordHash: "dummy-hash-e",
      role: "user",
    },
  })

  const ownerF = await db.account.create({
    data: {
      email: "owner-f@example.com",
      passwordHash: "dummy-hash-f",
      role: "owner",
    },
  })

  const moderatorG = await db.account.create({
    data: {
      email: "moderator-g@example.com",
      passwordHash: "dummy-hash-g",
      role: "moderator",
    },
  })

  IDS.accountA = accountA.id
  IDS.accountB = accountB.id
  IDS.adminC = adminC.id
  IDS.unknownD = unknownD.id
  IDS.accountE = accountE.id
  IDS.ownerF = ownerF.id
  IDS.moderatorG = moderatorG.id

  // 2. Create UserProfiles
  const profileA = await db.userProfile.create({
    data: {
      accountId: IDS.accountA,
      fullName: "User A",
      email: "user-a@example.com",
    },
  })
  const profileB = await db.userProfile.create({
    data: {
      accountId: IDS.accountB,
      fullName: "User B",
      email: "user-b@example.com",
    },
  })
  const profileC = await db.userProfile.create({
    data: {
      accountId: IDS.adminC,
      fullName: "Admin C",
      email: "admin-c@example.com",
    },
  })
  const profileD = await db.userProfile.create({
    data: {
      accountId: IDS.unknownD,
      fullName: "Unknown D",
      email: "unknown-d@example.com",
    },
  })

  IDS.profileA = profileA.id
  IDS.profileB = profileB.id
  IDS.profileC = profileC.id
  IDS.profileD = profileD.id

  // Seed profile A's skills, experience, education, languages for match analysis
  await db.skill.createMany({
    data: [
      { userProfileId: IDS.profileA, name: "TypeScript", category: "technical", proficiency: "advanced" },
      { userProfileId: IDS.profileA, name: "React", category: "technical", proficiency: "advanced" },
      { userProfileId: IDS.profileA, name: "Docker", category: "tool", proficiency: "intermediate" },
    ],
  })
  await db.education.create({
    data: {
      userProfileId: IDS.profileA,
      degree: "Bachelor",
      field: "Computer Science",
      institution: "Test University",
      gpa: "3.5",
    },
  })
  await db.experience.create({
    data: {
      userProfileId: IDS.profileA,
      type: "work",
      title: "Frontend Developer",
      organization: "Tech Corp",
      description: "Built React and TypeScript applications",
      achievements: JSON.stringify(["Led 3 product launches"]),
    },
  })
  await db.languageProficiency.createMany({
    data: [
      { userProfileId: IDS.profileA, language: "English", level: "advanced" },
      { userProfileId: IDS.profileA, language: "Indonesian", level: "native" },
    ],
  })

  const profileF = await db.userProfile.create({
    data: {
      accountId: IDS.ownerF,
      fullName: "Owner F",
      email: "owner-f@example.com",
    },
  })
  IDS.profileF = profileF.id

  const profileG = await db.userProfile.create({
    data: {
      accountId: IDS.moderatorG,
      fullName: "Moderator G",
      email: "moderator-g@example.com",
    },
  })
  IDS.profileG = profileG.id

  // 3. Create Documents
  const docA = await db.document.create({
    data: {
      userProfileId: IDS.profileA,
      type: "cv-ats",
      title: "CV ATS A",
      content: CANARIES.documentA,
      config: "{}",
    },
  })
  await db.documentVersion.create({
    data: {
      documentId: docA.id,
      versionNumber: 1,
      content: CANARIES.documentA,
      configSnapshot: "{}",
    },
  })

  const docB = await db.document.create({
    data: {
      userProfileId: IDS.profileB,
      type: "cv-ats",
      title: "CV ATS B",
      content: CANARIES.documentB,
      config: "{}",
    },
  })
  await db.documentVersion.create({
    data: {
      documentId: docB.id,
      versionNumber: 1,
      content: CANARIES.documentB,
      configSnapshot: "{}",
    },
  })

  IDS.documentA = docA.id
  IDS.documentB = docB.id

  const docF = await db.document.create({
    data: {
      userProfileId: IDS.profileF,
      type: "cv-ats",
      title: "CV ATS F",
      content: CANARIES.documentF,
      config: "{}",
    },
  })
  await db.documentVersion.create({
    data: {
      documentId: docF.id,
      versionNumber: 1,
      content: CANARIES.documentF,
      configSnapshot: "{}",
    },
  })
  IDS.documentF = docF.id

  // 4. Create Applications
  const appA = await db.application.create({
    data: {
      userProfileId: IDS.profileA,
      type: "work",
      position: "Software Engineer A",
      organization: "Org A",
      notes: CANARIES.appA,
    },
  })
  const appB = await db.application.create({
    data: {
      userProfileId: IDS.profileB,
      type: "work",
      position: "Software Engineer B",
      organization: "Org B",
      notes: CANARIES.appB,
    },
  })

  IDS.applicationA = appA.id
  IDS.applicationB = appB.id

  const appF = await db.application.create({
    data: {
      userProfileId: IDS.profileF,
      type: "work",
      position: "Software Engineer F",
      organization: "Org F",
      notes: CANARIES.appF,
    },
  })
  IDS.applicationF = appF.id

  // 5. Create InterviewSets
  const setA = await db.interviewSet.create({
    data: {
      userProfileId: IDS.profileA,
      title: "Interview Set A",
    },
  })
  const setB = await db.interviewSet.create({
    data: {
      userProfileId: IDS.profileB,
      title: "Interview Set B",
    },
  })

  IDS.setA = setA.id
  IDS.setB = setB.id

  const setF = await db.interviewSet.create({
    data: {
      userProfileId: IDS.profileF,
      title: "Interview Set F",
    },
  })
  IDS.setF = setF.id

  // 6. Create InterviewQuestions
  const qA = await db.interviewQuestion.create({
    data: {
      interviewSetId: IDS.setA,
      question: CANARIES.questionA,
      order: 1,
    },
  })
  const qB = await db.interviewQuestion.create({
    data: {
      interviewSetId: IDS.setB,
      question: CANARIES.questionB,
      order: 1,
    },
  })

  IDS.questionA = qA.id
  IDS.questionB = qB.id

  const qF = await db.interviewQuestion.create({
    data: {
      interviewSetId: IDS.setF,
      question: CANARIES.questionF,
      order: 1,
    },
  })
  IDS.questionF = qF.id

  // 7. Create EnglishSessions
  const sessA = await db.englishSession.create({
    data: {
      userProfileId: IDS.profileA,
      module: "reading",
      passage: CANARIES.passageA,
    },
  })
  const sessB = await db.englishSession.create({
    data: {
      userProfileId: IDS.profileB,
      module: "reading",
      passage: CANARIES.passageB,
    },
  })

  IDS.sessionA = sessA.id
  IDS.sessionB = sessB.id

  const sessF = await db.englishSession.create({
    data: {
      userProfileId: IDS.profileF,
      module: "reading",
      passage: CANARIES.passageF,
    },
  })
  IDS.sessionF = sessF.id

  // 8. Create EnglishCertificates
  const certA = await db.englishCertificate.create({
    data: {
      userProfileId: IDS.profileA,
      sessionId: IDS.sessionA,
      certificateId: "cert-id-a",
      title: CANARIES.certA,
      testMode: "reading",
      testSpec: "LARAS_TOEFL_STYLE",
      rawScore: 90,
      percentage: 90,
      confidence: "high",
      skillBreakdown: "{}",
      questionCount: 10,
      disclaimerText: "",
    },
  })
  const certB = await db.englishCertificate.create({
    data: {
      userProfileId: IDS.profileB,
      sessionId: IDS.sessionB,
      certificateId: "cert-id-b",
      title: CANARIES.certB,
      testMode: "reading",
      testSpec: "LARAS_TOEFL_STYLE",
      rawScore: 85,
      percentage: 85,
      confidence: "high",
      skillBreakdown: "{}",
      questionCount: 10,
      disclaimerText: "",
    },
  })

  IDS.certA = certA.id
  IDS.certB = certB.id

  const certF = await db.englishCertificate.create({
    data: {
      userProfileId: IDS.profileF,
      sessionId: IDS.sessionF,
      certificateId: "cert-id-f",
      title: CANARIES.certF,
      testMode: "reading",
      testSpec: "LARAS_TOEFL_STYLE",
      rawScore: 95,
      percentage: 95,
      confidence: "high",
      skillBreakdown: "{}",
      questionCount: 10,
      disclaimerText: "",
    },
  })
  IDS.certF = certF.id

  // 9. Create ApplicationDocument Links
  const appDocA = await db.applicationDocument.create({
    data: {
      applicationId: IDS.applicationA,
      documentId: IDS.documentA,
    },
  })
  const appDocB = await db.applicationDocument.create({
    data: {
      applicationId: IDS.applicationB,
      documentId: IDS.documentB,
    },
  })

  IDS.appDocA = appDocA.id
  IDS.appDocB = appDocB.id

  const appDocF = await db.applicationDocument.create({
    data: {
      applicationId: IDS.applicationF,
      documentId: IDS.documentF,
    },
  })
  IDS.appDocF = appDocF.id

  // 10. Create Evidence items
  const evidenceA = await db.evidence.create({
    data: {
      userProfileId: IDS.profileA,
      type: "project",
      title: CANARIES.evidenceA,
      description: "Canary evidence description A",
      sourceUrl: "https://github.com/user-a/project",
      verificationStatus: "self-reported",
    },
  })
  const evidenceB = await db.evidence.create({
    data: {
      userProfileId: IDS.profileB,
      type: "metric",
      title: CANARIES.evidenceB,
      description: "Canary evidence description B",
      metricValue: "42% improvement",
      metricContext: "Measured over Q1-Q2 2025",
      verificationStatus: "self-reported",
    },
  })

  IDS.evidenceA = evidenceA.id
  IDS.evidenceB = evidenceB.id

  const evidenceF = await db.evidence.create({
    data: {
      userProfileId: IDS.profileF,
      type: "artifact",
      title: CANARIES.evidenceF,
      description: "Canary evidence description F",
      sourceUrl: "https://owner-f.example.com/portfolio",
      verificationStatus: "self-reported",
    },
  })
  IDS.evidenceF = evidenceF.id

  // 11. Create Opportunities
  const opportunityA = await db.opportunity.create({
    data: {
      userProfileId: IDS.profileA,
      type: "job",
      title: CANARIES.oppA,
      organization: "Org A",
      description: "Test opportunity for User A",
      requirements: JSON.stringify({
        required: ["typescript", "react"],
        preferred: ["graphql", "docker"],
      }),
      status: "saved",
    },
  })
  const opportunityB = await db.opportunity.create({
    data: {
      userProfileId: IDS.profileB,
      type: "internship",
      title: CANARIES.oppB,
      organization: "Org B",
      description: "Test opportunity for User B",
      requirements: JSON.stringify({
        required: ["python", "sql"],
        preferred: ["machine learning"],
        minimumEducation: "bachelor",
      }),
      status: "applied",
    },
  })

  IDS.opportunityA = opportunityA.id
  IDS.opportunityB = opportunityB.id

  const opportunityF = await db.opportunity.create({
    data: {
      userProfileId: IDS.profileF,
      type: "job",
      title: CANARIES.oppF,
      organization: "Org F",
      description: "Test opportunity for Owner F",
      requirements: JSON.stringify({
        required: ["leadership", "strategy"],
        preferred: ["negotiation"],
      }),
      status: "saved",
    },
  })
  IDS.opportunityF = opportunityF.id

  return IDS
  })
}
