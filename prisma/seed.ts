import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

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
} catch {
  // Fallback
}

// Create Pool with schema search path
const pool = new Pool({
  connectionString,
  options: `-c search_path="${schema}"`,
});

const adapter = new PrismaPg(pool, { schema });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`Seeding database (schema: ${schema})...`);

  // 1. Create default admin if not exists
  const adminEmail = process.env.ADMIN_EMAIL || "admin@lottocien.com";
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`Admin user created: ${adminEmail} / admin123`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  // 2. Create the 100 tickets ("00" to "99")
  const ticketCount = await prisma.ticket.count();
  if (ticketCount === 0) {
    const ticketsData = [];
    for (let i = 0; i < 100; i++) {
      const numStr = i.toString().padStart(2, "0");
      ticketsData.push({
        number: numStr,
        status: "AVAILABLE",
      });
    }
    
    await prisma.ticket.createMany({
      data: ticketsData,
    });
    console.log("100 tickets created (00-99).");
  } else {
    console.log("Tickets already seeded.");
  }

  // 3. Create initial raffle state if not exists
  const raffleState = await prisma.raffleState.findUnique({
    where: { id: "current" },
  });

  if (!raffleState) {
    await prisma.raffleState.create({
      data: {
        id: "current",
        winningNumber: null,
        drawnAt: null,
        ticketPrice: 15000,
        prizeMayor: 700000,
        prizeSecundario: 200000,
        prizeConsolacion: 100000,
        lotteryName: "Lotería de Medellín",
      },
    });
    console.log("Raffle state initialized with default prizes and lottery.");
  } else {
    console.log("Raffle state already exists.");
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
