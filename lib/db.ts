import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Check if cached instance has Quote model, if not, create fresh instance
let prismaInstance = globalForPrisma.prisma
if (prismaInstance && typeof prismaInstance.quote === 'undefined') {
  console.warn('⚠️  Cached Prisma client missing Quote model. Creating fresh instance...')
  // Disconnect old instance and create new one
  prismaInstance.$disconnect().catch(() => {})
  prismaInstance = undefined
  globalForPrisma.prisma = undefined
}

export const prisma = prismaInstance ?? new PrismaClient()

// Final safety check: if quote model still doesn't exist, warn user
// Don't throw here as it prevents the app from starting - let API routes handle it gracefully
if (typeof prisma.quote === 'undefined') {
  console.error('❌ Prisma client missing Quote model. Please run: npx prisma generate && restart dev server')
  console.error('Available models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')))
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma