import { sendClientDrawWarningEmail } from "./mail";
import { PrismaClient } from "@prisma/client";

export function initScheduler(prisma: PrismaClient) {
  if (typeof window !== "undefined") return;

  // Prevent running background threads during the Next.js static build phase
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const g = globalThis as unknown as { __drawSchedulerRunning?: boolean };
  if (g.__drawSchedulerRunning) {
    return;
  }
  g.__drawSchedulerRunning = true;

  console.log("[Scheduler] Inicializando background check de sorteos...");

  // Run immediately on startup
  checkDrawWarning(prisma).catch(err => {
    console.error("[Scheduler] Error en ejecución inicial:", err);
  });

  // Check every 2 minutes (120000 ms)
  setInterval(() => {
    checkDrawWarning(prisma).catch(err => {
      console.error("[Scheduler] Error en ejecución de scheduler:", err);
    });
  }, 120000);
}

export async function checkDrawWarning(prisma: PrismaClient) {
  try {
    const state = await prisma.raffleState.findUnique({
      where: { id: "current" },
    });

    if (!state || !state.drawDate || state.drawWarningSent) {
      return;
    }

    const now = new Date();
    const drawDate = new Date(state.drawDate);
    const timeDiffMs = drawDate.getTime() - now.getTime();
    
    // 2 hours in ms = 2 * 60 * 60 * 1000 = 7,200,000 ms
    const twoHoursMs = 2 * 60 * 60 * 1000;

    if (timeDiffMs > 0 && timeDiffMs <= twoHoursMs) {
      const soldCount = await prisma.ticket.count({
        where: { status: "SOLD" },
      });

      if (soldCount < 80) {
        console.log(`[Scheduler] Ventas por debajo del 80% (${soldCount}%). Enviando correos de advertencia a los clientes...`);

        const clients = await prisma.user.findMany({
          where: { role: "CLIENT" },
          select: { email: true },
        });

        for (const client of clients) {
          try {
            await sendClientDrawWarningEmail({
              clientEmail: client.email,
              warningMessage: state.drawWarningMessage,
              drawDate: drawDate,
              soldPercentage: soldCount,
            });
          } catch (mailErr) {
            console.error(`[Scheduler] Fallo al enviar correo de advertencia a ${client.email}:`, mailErr);
          }
        }

        await prisma.raffleState.update({
          where: { id: "current" },
          data: { drawWarningSent: true },
        });

        console.log("[Scheduler] Todos los correos de advertencia enviados y RaffleState actualizado.");
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error en checkDrawWarning:", error);
  }
}
