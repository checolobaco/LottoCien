import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/jwt";
import { sendClientConfirmationEmail, sendClientRejectionEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    // 1. Authenticate user and verify Admin role
    const admin = getCurrentUser(req);
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 403 }
      );
    }

    const { transactionRef, action, reason } = await req.json();

    if (!transactionRef || !action || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { error: "Parámetros inválidos (transactionRef, action 'APPROVE' o 'REJECT')." },
        { status: 400 }
      );
    }

    if (action === "REJECT" && (!reason || reason.trim() === "")) {
      return NextResponse.json(
        { error: "Debe proporcionar un motivo para rechazar la transacción." },
        { status: 400 }
      );
    }

    // 2. Process action atomically
    const result = await prisma.$transaction(async (tx) => {
      // Find all tickets under this transaction reference
      const tickets = await tx.ticket.findMany({
        where: { transactionRef },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      if (tickets.length === 0) {
        throw new Error("TRANSACTION_NOT_FOUND");
      }

      // Verify they are in PENDING_APPROVAL status
      const needsApproval = tickets.every(t => t.status === "PENDING_APPROVAL");
      if (!needsApproval) {
        throw new Error("TICKETS_NOT_PENDING_APPROVAL");
      }

      const clientEmail = tickets[0].user?.email || "desconocido@example.com";
      const numbersList = tickets.map(t => t.number);

      if (action === "APPROVE") {
        // Mark tickets as SOLD
        await tx.ticket.updateMany({
          where: { transactionRef },
          data: {
            status: "SOLD",
          },
        });
        
        return { action, clientEmail, numbersList };
      } else {
        // Release tickets to AVAILABLE
        await tx.ticket.updateMany({
          where: { transactionRef },
          data: {
            status: "AVAILABLE",
            userId: null,
            reservedAt: null,
            transactionRef: null,
            paymentMethod: null,
            receiptUrl: null,
          },
        });

        return { action, clientEmail, numbersList };
      }
    });

    // 3. Send Notification Emails to Client
    const { clientEmail, numbersList } = result;

    if (action === "APPROVE") {
      console.log(`Compra aprobada para ${clientEmail}. Enviando correo de confirmación...`);
      sendClientConfirmationEmail({
        clientEmail,
        numbers: numbersList,
      }).catch(err => console.error("Fallo al enviar correo de confirmación al cliente:", err));
    } else {
      console.log(`Reserva rechazada para ${clientEmail}. Motivo: ${reason}. Enviando correo de rechazo...`);
      sendClientRejectionEmail({
        clientEmail,
        numbers: numbersList,
        reason,
      }).catch(err => console.error("Fallo al enviar correo de rechazo al cliente:", err));
    }

    return NextResponse.json({
      success: true,
      message: action === "APPROVE" 
        ? "La compra ha sido aprobada y los números asignados permanentemente." 
        : "La compra ha sido rechazada y los números han sido liberados.",
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error al procesar acción del administrador sobre recibo:", error);
    if (error.message === "TRANSACTION_NOT_FOUND") {
      return NextResponse.json(
        { error: "No se encontraron tickets asociados a la referencia de pago especificada." },
        { status: 404 }
      );
    }
    if (error.message === "TICKETS_NOT_PENDING_APPROVAL") {
      return NextResponse.json(
        { error: "Los números de esta transacción no están esperando aprobación (ya fueron procesados o expiraron)." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error interno en el procesamiento administrativo." },
      { status: 500 }
    );
  }
}
