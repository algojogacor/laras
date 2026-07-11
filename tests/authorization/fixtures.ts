import { db } from "@/lib/db"

export const IDS = {
  accountA: "caccounta000000000000000a",
  accountB: "caccountb000000000000000b",
  adminC: "cadminc0000000000000000c",
  unknownD: "cunknownd000000000000000d",
  accountE: "caccounte000000000000000e",

  profileA: "cprofilea0000000000000000a",
  profileB: "cprofileb0000000000000000b",
  profileC: "cprofilec0000000000000000c",
  profileD: "cprofiled0000000000000000d",

  documentA: "cdocumenta000000000000000a",
  documentB: "cdocumentb000000000000000b",

  applicationA: "capplicationa00000000000a",
  applicationB: "capplicationb00000000000b",

  setA: "cinterviewseta0000000000a",
  setB: "cinterviewsetb0000000000b",

  questionA: "cquestiona00000000000000a",
  questionB: "cquestionb00000000000000b",

  sessionA: "csessiona000000000000000a",
  sessionB: "csessionb000000000000000b",

  certA: "ccertificatea00000000000a",
  certB: "ccertificateb00000000000b",

  appDocA: "cappdoca0000000000000000a",
  appDocB: "cappdocb0000000000000000b",
}

export const CANARIES = {
  documentA: "Canary Document Content A",
  documentB: "Canary Document Content B",
  appA: "Canary App Notes A",
  appB: "Canary App Notes B",
  questionA: "Canary Question A",
  questionB: "Canary Question B",
  passageA: "Canary Passage A",
  passageB: "Canary Passage B",
  certA: "Canary Cert Title A",
  certB: "Canary Cert Title B",
}

export async function cleanDb() {
  await db.$transaction([
    db.applicationDocument.deleteMany(),
    db.documentVersion.deleteMany(),
    db.revisionRequest.deleteMany(),
    db.document.deleteMany(),
    db.application.deleteMany(),
    db.interviewQuestion.deleteMany(),
    db.interviewSet.deleteMany(),
    db.essay.deleteMany(),
    db.englishCertificate.deleteMany(),
    db.englishSession.deleteMany(),
    db.achievement.deleteMany(),
    db.auditLog.deleteMany(),
    db.verificationBadge.deleteMany(),
    db.license.deleteMany(),
    db.consentSetting.deleteMany(),
    db.connection.deleteMany(),
    db.userProfile.deleteMany(),
    db.account.deleteMany(),
  ])
}

export async function seedDb() {
  // 1. Create Accounts
  await db.account.createMany({
    data: [
      {
        id: IDS.accountA,
        email: "user-a@example.com",
        passwordHash: "dummy-hash-a",
        role: "user",
      },
      {
        id: IDS.accountB,
        email: "user-b@example.com",
        passwordHash: "dummy-hash-b",
        role: "user",
      },
      {
        id: IDS.adminC,
        email: "admin-c@example.com",
        passwordHash: "dummy-hash-c",
        role: "admin",
      },
      {
        id: IDS.unknownD,
        email: "unknown-d@example.com",
        passwordHash: "dummy-hash-d",
        role: "moderator", // unknown role string
      },
      {
        id: IDS.accountE,
        email: "user-e@example.com",
        passwordHash: "dummy-hash-e",
        role: "user", // Account E exists but will not have a profile
      },
    ],
  })

  // 2. Create UserProfiles
  await db.userProfile.createMany({
    data: [
      {
        id: IDS.profileA,
        accountId: IDS.accountA,
        fullName: "User A",
        email: "user-a@example.com",
      },
      {
        id: IDS.profileB,
        accountId: IDS.accountB,
        fullName: "User B",
        email: "user-b@example.com",
      },
      {
        id: IDS.profileC,
        accountId: IDS.adminC,
        fullName: "Admin C",
        email: "admin-c@example.com",
      },
      {
        id: IDS.profileD,
        accountId: IDS.unknownD,
        fullName: "Unknown D",
        email: "unknown-d@example.com",
      },
    ],
  })

  // 3. Create Documents
  await db.document.createMany({
    data: [
      {
        id: IDS.documentA,
        userProfileId: IDS.profileA,
        type: "cv-ats",
        title: "CV ATS A",
        content: CANARIES.documentA,
        config: "{}",
      },
      {
        id: IDS.documentB,
        userProfileId: IDS.profileB,
        type: "cv-ats",
        title: "CV ATS B",
        content: CANARIES.documentB,
        config: "{}",
      },
    ],
  })

  // 4. Create Applications
  await db.application.createMany({
    data: [
      {
        id: IDS.applicationA,
        userProfileId: IDS.profileA,
        type: "work",
        position: "Software Engineer A",
        organization: "Org A",
        notes: CANARIES.appA,
      },
      {
        id: IDS.applicationB,
        userProfileId: IDS.profileB,
        type: "work",
        position: "Software Engineer B",
        organization: "Org B",
        notes: CANARIES.appB,
      },
    ],
  })

  // 5. Create InterviewSets
  await db.interviewSet.createMany({
    data: [
      {
        id: IDS.setA,
        userProfileId: IDS.profileA,
        title: "Interview Set A",
      },
      {
        id: IDS.setB,
        userProfileId: IDS.profileB,
        title: "Interview Set B",
      },
    ],
  })

  // 6. Create InterviewQuestions
  await db.interviewQuestion.createMany({
    data: [
      {
        id: IDS.questionA,
        interviewSetId: IDS.setA,
        question: CANARIES.questionA,
        order: 1,
      },
      {
        id: IDS.questionB,
        interviewSetId: IDS.setB,
        question: CANARIES.questionB,
        order: 1,
      },
    ],
  })

  // 7. Create EnglishSessions
  await db.englishSession.createMany({
    data: [
      {
        id: IDS.sessionA,
        userProfileId: IDS.profileA,
        module: "reading",
        passage: CANARIES.passageA,
      },
      {
        id: IDS.sessionB,
        userProfileId: IDS.profileB,
        module: "reading",
        passage: CANARIES.passageB,
      },
    ],
  })

  // 8. Create EnglishCertificates
  await db.englishCertificate.createMany({
    data: [
      {
        id: IDS.certA,
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
      {
        id: IDS.certB,
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
    ],
  })

  // 9. Create ApplicationDocument Links
  await db.applicationDocument.createMany({
    data: [
      {
        id: IDS.appDocA,
        applicationId: IDS.applicationA,
        documentId: IDS.documentA,
      },
      {
        id: IDS.appDocB,
        applicationId: IDS.applicationB,
        documentId: IDS.documentB,
      },
    ],
  })
}
