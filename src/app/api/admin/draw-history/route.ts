import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/jwt";

export async function GET(req: Request) {
  try {
    // 1. Authenticate and check Admin role
    const user = getCurrentUser(req);
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 403 }
      );
    }

    // 2. Fetch past draws ordered by drawnAt descending
    const history = await prisma.drawHistory.findMany({
      orderBy: {
        drawnAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      history,
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error al obtener el historial de sorteos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al obtener el historial." },
      { status: 500 }
    );
  }
}
