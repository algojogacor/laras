// Reset the Laras test database
const { PrismaClient } = require("@prisma/client")
const db = new PrismaClient()

async function main() {
  // Use $transaction like the fixtures do
  await db.$transaction([
    db.appeal.deleteMany(),
    db.moderationCase.deleteMany(),
    db.report.deleteMany(),
    db.scopedAssignment.deleteMany(),
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
    db.evidence.deleteMany(),
    db.achievement.deleteMany(),
    db.opportunity.deleteMany(),
    db.announcementRead.deleteMany(),
    db.announcement.deleteMany(),
    db.licenseCode.deleteMany(),
    db.auditLog.deleteMany(),
    db.verificationBadge.deleteMany(),
    db.license.deleteMany(),
    db.quotaLedger.deleteMany(),
    db.consentSetting.deleteMany(),
    db.connection.deleteMany(),
    db.userProfile.deleteMany(),
    db.account.deleteMany(),
  ])
  const count = await db.account.count()
  console.log("Accounts remaining:", count)
  await db.$disconnect()
}

main().catch((e) => {
  console.error("Clean failed:", e.message)
  db.$disconnect().then(() => process.exit(1))
})
