import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/jwt";

// GET all prize claims
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

    // 2. Fetch all claims including user email
    const claims = await prisma.prizeClaim.findMany({
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ claims }, { status: 200 });
  } catch (error) {
    console.error("Error al obtener reclamaciones (admin):", error);
    return NextResponse.json(
      { error: "Error interno del servidor al obtener reclamaciones." },
      { status: 500 }
    );
  }
}

// Update a claim status (PAID or REJECTED)
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

    // 2. Parse request body
    const { claimId, status, rejectionReason } = await req.json();

    if (!claimId || !status || (status !== "PAID" && status !== "REJECTED")) {
      return NextResponse.json(
        { error: "Parámetros inválidos. Se requiere claimId y status ('PAID' o 'REJECTED')." },
        { status: 400 }
      );
    }

    if (status === "REJECTED" && (!rejectionReason || rejectionReason.trim() === "")) {
      return NextResponse.json(
        { error: "Se requiere especificar una nota del por qué se rechaza la reclamación." },
        { status: 400 }
      );
    }

    // 3. Update the claim status
    const updatedClaim = await prisma.prizeClaim.update({
      where: { id: claimId },
      data: { 
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason : null,
        // Reset client note when rejecting again to allow new appeals, or keep it when paid
        clientNote: status === "REJECTED" ? null : undefined,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Reclamación marcada como ${status === "PAID" ? "PAGADA" : "RECHAZADA"} con éxito.`,
        claim: updatedClaim,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al actualizar reclamación (admin):", error);
    return NextResponse.json(
      { error: "Error interno del servidor al actualizar la reclamación." },
      { status: 500 }
    );
  }
}
