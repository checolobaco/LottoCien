import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const config = await prisma.raffleState.findUnique({
      where: { id: "current" },
      select: {
        ticketPrice: true,
        prizeMayor: true,
        prizeSecundario: true,
        prizeConsolacion: true,
        lotteryName: true,
        termsAndConditions: true,
      },
    });

    if (!config) {
      return NextResponse.json(
        { error: "No se encontró la configuración del sorteo." },
        { status: 404 }
      );
    }

    return NextResponse.json(config, { status: 200 });
  } catch (error) {
    console.error("Error al obtener la configuración pública:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al obtener la configuración." },
      { status: 500 }
    );
  }
}
