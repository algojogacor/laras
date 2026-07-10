import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  // Prefer TURSO_DATABASE_URL (libsql://) — some sandboxes inject a local
  // sqlite DATABASE_URL into the shell env that would otherwise shadow .env.
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL

  // If using Turso (libsql:// protocol), use the libsql adapter
  if (url && url.startsWith('libsql://')) {
    const authToken = process.env.TURSO_AUTH_TOKEN
    const adapter = new PrismaLibSql({ url, authToken })
    return new PrismaClient({ adapter } as any)
  }

  // Fallback: local SQLite (file: protocol)
  return new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
  })
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
