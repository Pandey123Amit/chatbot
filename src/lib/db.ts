import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Fallback for when env is not loaded yet
    const pool = new Pool({
      user: 'postgres',
      password: 'password',
      host: 'localhost',
      port: 5438,
      database: 'helpdesk',
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  // Parse connection string
  const url = new URL(connectionString);
  const pool = new Pool({
    user: url.username || 'postgres',
    password: url.password || 'password',
    host: url.hostname || 'localhost',
    port: parseInt(url.port || '5432', 10),
    database: url.pathname.slice(1) || 'helpdesk',
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = createPrismaClient();
}

export const prisma = globalForPrisma.prisma;
export default prisma;
