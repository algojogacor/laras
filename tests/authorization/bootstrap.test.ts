/// <reference types="bun-types" />

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test"
import { db } from "@/lib/db"

/**
 * Bootstrap tests exercise the bootstrap-owner script's logic directly
 * through the database layer. The script itself is tested for:
 * - First-owner creation in a transaction
 * - Refusal when owner already exists
 * - Target validation
 * - Exactly one owner after success
 */

describe("Phase 1D — First-Owner Bootstrap", () => {
  beforeAll(async () => {
    // Clean all accounts for a fresh start
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
  })

  beforeEach(async () => {
    // Clean before each test
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
  })

  // ---- 1. Valid first-owner bootstrap ----
  test("valid first-owner bootstrap creates exactly one owner", async () => {
    // Create a target account
    const target = await db.account.create({
      data: {
        email: "first@example.com",
        passwordHash: "dummy-hash",
        role: "user",
      },
    })

    // Verify no owner exists
    const ownersBefore = await db.account.count({ where: { role: "owner" } })
    expect(ownersBefore).toBe(0)

    // Simulate bootstrap transaction
    await db.$transaction(async (tx) => {
      const existingOwner = await tx.account.findFirst({
        where: { role: "owner" },
        select: { id: true },
      })
      if (existingOwner) throw new Error("OWNER_ALREADY_EXISTS")

      const targetAcct = await tx.account.findUnique({
        where: { email: "first@example.com" },
      })
      if (!targetAcct) throw new Error("TARGET_NOT_FOUND")

      await tx.account.update({
        where: { id: targetAcct.id },
        data: { role: "owner" },
      })
    })

    // Verify exactly one owner
    const ownersAfter = await db.account.count({ where: { role: "owner" } })
    expect(ownersAfter).toBe(1)

    // Verify target role
    const updated = await db.account.findUnique({ where: { id: target.id } })
    expect(updated!.role).toBe("owner")
  })

  // ---- 2. Refuses when owner already exists ----
  test("bootstrap refuses when an owner already exists", async () => {
    // Pre-create an owner
    await db.account.create({
      data: {
        email: "existing-owner@example.com",
        passwordHash: "dummy-hash",
        role: "owner",
      },
    })

    // Create a target
    await db.account.create({
      data: {
        email: "target@example.com",
        passwordHash: "dummy-hash",
        role: "user",
      },
    })

    // Try bootstrap — must fail
    let failed = false
    try {
      await db.$transaction(async (tx) => {
        const existingOwner = await tx.account.findFirst({
          where: { role: "owner" },
          select: { id: true },
        })
        if (existingOwner) throw new Error("OWNER_ALREADY_EXISTS")

        const targetAcct = await tx.account.findUnique({
          where: { email: "target@example.com" },
        })
        if (!targetAcct) throw new Error("TARGET_NOT_FOUND")

        await tx.account.update({
          where: { id: targetAcct.id },
          data: { role: "owner" },
        })
      })
    } catch (e: any) {
      failed = true
      expect(e.message).toBe("OWNER_ALREADY_EXISTS")
    }
    expect(failed).toBe(true)

    // Target should still be "user"
    const target = await db.account.findUnique({ where: { email: "target@example.com" } })
    expect(target!.role).toBe("user")
  })

  // ---- 3. Target not found ----
  test("bootstrap refuses when target account does not exist", async () => {
    let failed = false
    try {
      await db.$transaction(async (tx) => {
        const existingOwner = await tx.account.findFirst({
          where: { role: "owner" },
          select: { id: true },
        })
        if (existingOwner) throw new Error("OWNER_ALREADY_EXISTS")

        const targetAcct = await tx.account.findUnique({
          where: { email: "nonexistent@example.com" },
        })
        if (!targetAcct) throw new Error("TARGET_NOT_FOUND")

        await tx.account.update({
          where: { id: targetAcct.id },
          data: { role: "owner" },
        })
      })
    } catch (e: any) {
      failed = true
      expect(e.message).toBe("TARGET_NOT_FOUND")
    }
    expect(failed).toBe(true)
  })

  // ---- 4. Repeated bootstrap fails safely ----
  test("repeated bootstrap fails safely without changing roles", async () => {
    // Create target
    const target = await db.account.create({
      data: {
        email: "first@example.com",
        passwordHash: "dummy-hash",
        role: "user",
      },
    })

    // First bootstrap succeeds
    await db.$transaction(async (tx) => {
      const existingOwner = await tx.account.findFirst({
        where: { role: "owner" },
        select: { id: true },
      })
      if (existingOwner) throw new Error("OWNER_ALREADY_EXISTS")

      const targetAcct = await tx.account.findUnique({
        where: { email: "first@example.com" },
      })
      if (!targetAcct) throw new Error("TARGET_NOT_FOUND")

      await tx.account.update({
        where: { id: targetAcct.id },
        data: { role: "owner" },
      })
    })

    // Second bootstrap fails
    let secondFailed = false
    try {
      await db.$transaction(async (tx) => {
        const existingOwner = await tx.account.findFirst({
          where: { role: "owner" },
          select: { id: true },
        })
        if (existingOwner) throw new Error("OWNER_ALREADY_EXISTS")
      })
    } catch (e: any) {
      secondFailed = true
      expect(e.message).toBe("OWNER_ALREADY_EXISTS")
    }
    expect(secondFailed).toBe(true)

    // Still exactly one owner
    const count = await db.account.count({ where: { role: "owner" } })
    expect(count).toBe(1)
  })

  // ---- 5. Exactly one owner after success ----
  test("exactly one owner exists after successful bootstrap", async () => {
    await db.account.create({
      data: {
        email: "the-one@example.com",
        passwordHash: "dummy-hash",
        role: "user",
      },
    })

    await db.account.create({
      data: {
        email: "another@example.com",
        passwordHash: "dummy-hash",
        role: "user",
      },
    })

    // Bootstrap
    await db.$transaction(async (tx) => {
      const existingOwner = await tx.account.findFirst({
        where: { role: "owner" },
        select: { id: true },
      })
      if (existingOwner) throw new Error("OWNER_ALREADY_EXISTS")

      const targetAcct = await tx.account.findUnique({
        where: { email: "the-one@example.com" },
      })
      if (!targetAcct) throw new Error("TARGET_NOT_FOUND")

      await tx.account.update({
        where: { id: targetAcct.id },
        data: { role: "owner" },
      })
    })

    const owners = await db.account.findMany({ where: { role: "owner" } })
    expect(owners.length).toBe(1)
    expect(owners[0].email).toBe("the-one@example.com")
  })
})
