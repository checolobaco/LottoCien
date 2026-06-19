import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Clean up expired pending reservations automatically
    await prisma.ticket.updateMany({
      where: {
        status: "PENDING",
        reservedAt: {
          lt: tenMinutesAgo,
        },
      },
      data: {
        status: "AVAILABLE",
        userId: null,
        reservedAt: null,
        transactionRef: null,
        paymentMethod: null,
        receiptUrl: null,
      },
    });

    // Retrieve all 100 tickets with purchaser details (email)
    const tickets = await prisma.ticket.findMany({
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        number: "asc",
      },
    });

    // Retrieve the current raffle state
    const raffleState = await prisma.raffleState.findUnique({
      where: { id: "current" },
    });

    // Retrieve past draw history
    const drawHistory = await prisma.drawHistory.findMany({
      orderBy: {
        drawnAt: "desc",
      },
    });

    return NextResponse.json({ tickets, raffleState, drawHistory }, { status: 200 });
  } catch (error: any) {
    console.error("Error al obtener tickets:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al obtener los números." },
      { status: 500 }
    );
  }
}
