import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { initScheduler } from "./scheduler";

const prismaClientSingleton = () => {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/lottocien?schema=triplika";

  // Parse custom schema from DATABASE_URL
  let schema = "triplika";
  try {
    const urlObj = new URL(connectionString);
    const schemaParam = urlObj.searchParams.get("schema") || urlObj.searchParams.get("currentSchema");
    if (schemaParam) {
      schema = schemaParam;
    }
  } catch (e) {
    // Fallback to default schema if URL parsing fails
  }

  // Configure Pool to apply search_path options on connection
  const pool = new Pool({
    connectionString,
    options: `-c search_path="${schema}"`,
  });
  
  // Initialize PrismaPg adapter with schema context
  const adapter = new PrismaPg(pool, { schema });
  
  return new PrismaClient({ adapter });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

// Initialize the draw scheduler
initScheduler(prisma);

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

