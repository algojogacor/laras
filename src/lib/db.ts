import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL

  // If using Turso (libsql:// protocol), use the libsql adapter
  if (url && url.startsWith('libsql://')) {
    const authToken = process.env.TURSO_AUTH_TOKEN
    const libsql = createClient({ url, authToken })
    // Cast: @prisma/adapter-libsql v7 expects a Config shape that differs from
    // @libsql/client's Client type at the type level; runtime is compatible.
    const adapter = new PrismaLibSql(libsql as any)
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
