import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/jwt";

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

    // 2. Reset all 100 tickets to AVAILABLE
    await prisma.ticket.updateMany({
      data: {
        status: "AVAILABLE",
        userId: null,
        reservedAt: null,
        transactionRef: null,
        paymentMethod: null,
        receiptUrl: null,
      },
    });

    // 3. Reset the raffle winning number and draw scheduling settings
    const updatedState = await prisma.raffleState.update({
      where: { id: "current" },
      data: {
        winningNumber: null,
        drawnAt: null,
        drawDate: null,
        drawWarningSent: false,
      },
    });

    console.log("Sorteo reiniciado por el administrador.");

    return NextResponse.json({
      success: true,
      message: "El sorteo ha sido reiniciado con éxito.",
      raffleState: updatedState,
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error al reiniciar sorteo:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al reiniciar el sorteo." },
      { status: 500 }
    );
  }
}
