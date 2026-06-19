import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/jwt";
import { sendClientWinnerNotificationEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    // 1. Authenticate and check Admin role
    const user = getCurrentUser(req);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 403 }
      );
    }

    const { winningNumber } = await req.json();

    if (!winningNumber || winningNumber.length !== 4 || isNaN(Number(winningNumber))) {
      return NextResponse.json(
        { error: "Número ganador inválido. Debe ser de 4 cifras (ej: 1234)." },
        { status: 400 }
      );
    }

    // Fetch current state to verify if draw has already been executed
    const currentState = await prisma.raffleState.findUnique({
      where: { id: "current" },
    });

    if (currentState && currentState.winningNumber !== null) {
      return NextResponse.json(
        { error: "El sorteo ya ha sido ejecutado y los ganadores calculados. Debe reiniciar el sorteo si desea registrar uno nuevo." },
        { status: 400 }
      );
    }

    // 2. Save winning number in RaffleState
    const updatedState = await prisma.raffleState.update({
      where: { id: "current" },
      data: {
        winningNumber,
        drawnAt: new Date(),
      },
    });

    // Extract the winning 2-digit combinations
    const firstTwo = winningNumber.slice(0, 2);      // Premio Secundario
    const middleTwo = winningNumber.slice(1, 3);     // Premio Consolación
    const lastTwo = winningNumber.slice(2, 4);       // Premio Mayor

    console.log(`Ganadores calculados para lotería ${winningNumber}:`);
    console.log(`- Mayor: ${lastTwo}`);
    console.log(`- Secundario: ${firstTwo}`);
    console.log(`- Consolación: ${middleTwo}`);

    // 3. Find all sold tickets
    const soldTickets = await prisma.ticket.findMany({
      where: { status: "SOLD" },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    // 4. Match winners
    const winners = soldTickets.map((ticket) => {
      const prizesWon: string[] = [];

      if (ticket.number === lastTwo) {
        prizesWon.push("Premio Mayor");
      }
      if (ticket.number === firstTwo) {
        prizesWon.push("Premio Secundario");
      }
      if (ticket.number === middleTwo) {
        prizesWon.push("Premio de Consolación");
      }

      if (prizesWon.length > 0) {
        return {
          number: ticket.number,
          email: ticket.user?.email || "Desconocido",
          prizes: prizesWon,
        };
      }
      return null;
    }).filter((w): w is { number: string; email: string; prizes: string[] } => w !== null);

    // Group winners by email to send a single notification email per winner
    const winnersByEmail: { [email: string]: { number: string; prizes: string[] }[] } = {};
    for (const w of winners) {
      if (w.email && w.email !== "Desconocido") {
        if (!winnersByEmail[w.email]) {
          winnersByEmail[w.email] = [];
        }
        winnersByEmail[w.email].push({
          number: w.number,
          prizes: w.prizes,
        });
      }
    }

    const appUrl = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Send emails asynchronously
    try {
      await Promise.all(
        Object.entries(winnersByEmail).map(([email, tickets]) =>
          sendClientWinnerNotificationEmail({
            clientEmail: email,
            winningNumber,
            lotteryName: updatedState.lotteryName,
            tickets,
            appUrl,
          })
        )
      );
    } catch (mailError) {
      console.error("Error al enviar correos de notificación a los ganadores:", mailError);
    }

    // 5. Create DrawHistory record
    await prisma.drawHistory.create({
      data: {
        winningNumber,
        drawnAt: updatedState.drawnAt || new Date(),
        lotteryName: updatedState.lotteryName,
        ticketPrice: updatedState.ticketPrice,
        prizeMayor: updatedState.prizeMayor,
        prizeSecundario: updatedState.prizeSecundario,
        prizeConsolacion: updatedState.prizeConsolacion,
        winners: JSON.stringify(winners),
      },
    });

    return NextResponse.json({
      success: true,
      raffleState: updatedState,
      winners,
      winningCombinations: {
        mayor: lastTwo,
        secundario: firstTwo,
        consolacion: middleTwo,
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error al calcular ganadores:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al calcular ganadores." },
      { status: 500 }
    );
  }
}
