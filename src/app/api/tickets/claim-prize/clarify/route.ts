import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/jwt";
import { sendAdminPrizeClarificationAlert } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const user = getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión." },
        { status: 401 }
      );
    }

    // 2. Parse request JSON body
    const body = await req.json();
    const { clientNote } = body;

    if (!clientNote || clientNote.trim() === "") {
      return NextResponse.json(
        { error: "La nota aclaratoria es requerida." },
        { status: 400 }
      );
    }

    // 3. Retrieve the current raffle state
    const raffleState = await prisma.raffleState.findUnique({
      where: { id: "current" },
    });

    if (!raffleState || !raffleState.winningNumber || !raffleState.drawnAt) {
      return NextResponse.json(
        { error: "El sorteo de esta semana no tiene un sorteo finalizado aún." },
        { status: 400 }
      );
    }

    const raffleId = raffleState.drawnAt.toISOString();

    // 4. Find the user's rejected claim for this draw
    const claim = await prisma.prizeClaim.findUnique({
      where: {
        userId_raffleId: {
          userId: user.id,
          raffleId,
        },
      },
    });

    if (!claim) {
      return NextResponse.json(
        { error: "No se encontró una reclamación de premio para este sorteo." },
        { status: 404 }
      );
    }

    if (claim.status !== "REJECTED") {
      return NextResponse.json(
        { error: "Solo puedes enviar aclaraciones si tu reclamación fue rechazada." },
        { status: 400 }
      );
    }

    // 5. Update the claim with the client note
    await prisma.prizeClaim.update({
      where: { id: claim.id },
      data: {
        clientNote,
      },
    });

    // 6. Dynamically retrieve the email of the administrator in the database
    let adminEmail: string | undefined;
    try {
      const adminUser = await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { email: true },
      });
      if (adminUser) {
        adminEmail = adminUser.email;
      }
    } catch (dbErr) {
      console.error("Error al buscar email de administrador en DB:", dbErr);
    }

    // 7. Dispatch clarification email to administrator
    sendAdminPrizeClarificationAlert({
      adminEmail,
      clientEmail: user.email,
      tickets: claim.tickets,
      totalAmount: claim.totalAmount,
      rejectionReason: claim.rejectionReason || "Sin especificar",
      clientNote,
    }).catch(err => {
      console.error("Fallo al enviar correo de aclaración al administrador:", err);
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tu nota aclaratoria ha sido enviada con éxito al administrador para su revisión.",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error en endpoint de aclaración de premio:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar la aclaración." },
      { status: 500 }
    );
  }
}
