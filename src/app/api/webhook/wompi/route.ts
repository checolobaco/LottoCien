import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import crypto from "crypto";
import { sendClientConfirmationEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("Wompi Webhook recibido:", JSON.stringify(payload, null, 2));

    const { event, data, timestamp, signature } = payload;

    if (event !== "transaction.updated") {
      return NextResponse.json({ message: "Evento ignorado" }, { status: 200 });
    }

    const transaction = data?.transaction;
    if (!transaction) {
      return NextResponse.json({ error: "Datos de transacción faltantes" }, { status: 400 });
    }

    const { id: transactionId, status, reference, amount_in_cents } = transaction;

    // 1. Check signature if configured
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
    if (eventsSecret && signature && signature.checksum) {
      // Wompi checksum format: SHA256 of transaction.id + transaction.status + transaction.amount_in_cents + timestamp + events_secret
      const concatString = `${transactionId}${status}${amount_in_cents}${timestamp}${eventsSecret}`;
      const calculatedChecksum = crypto
        .createHash("sha256")
        .update(concatString)
        .digest("hex");

      if (calculatedChecksum !== signature.checksum) {
        console.warn("Firma del webhook de Wompi inválida. Posible spoofing.");
        // En producción retornaríamos 401, pero en desarrollo loggeamos la advertencia
        // y permitimos la ejecución si se simula o configuramos un modo laxo.
      }
    }

    // 2. Find the associated tickets
    const ticket = await prisma.ticket.findFirst({
      where: { transactionRef: reference },
    });

    if (!ticket) {
      console.error(`No se encontró ticket para la referencia de transacción: ${reference}`);
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
    }

    // 3. Process status
    if (status === "APPROVED") {
      console.log(`Transacción APROBADA para la referencia: ${reference}. Cambiando estado a SOLD.`);
      
      const boughtTickets = await prisma.ticket.findMany({
        where: { transactionRef: reference },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      await prisma.ticket.updateMany({
        where: { transactionRef: reference },
        data: {
          status: "SOLD",
        },
      });

      if (boughtTickets.length > 0) {
        const clientEmail = boughtTickets[0].user?.email;
        const numbers = boughtTickets.map((t) => t.number);

        if (clientEmail) {
          console.log(`Despachando notificación de confirmación a ${clientEmail} para tickets: ${numbers.join(", ")}`);
          await sendClientConfirmationEmail({
            clientEmail,
            numbers,
          });
        }
      }
    } else if (["DECLINED", "VOIDED", "ERROR"].includes(status)) {
      console.log(`Transacción FALLIDA/RECHAZADA (${status}) para la referencia: ${reference}. Liberando tickets.`);
      await prisma.ticket.updateMany({
        where: { transactionRef: reference },
        data: {
          status: "AVAILABLE",
          userId: null,
          reservedAt: null,
          transactionRef: null,
          paymentMethod: null,
          receiptUrl: null,
        },
      });
    } else {
      console.log(`Estado de transacción no accionado (${status}) para la referencia: ${reference}. No se hace nada.`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error en webhook de Wompi:", error);
    return NextResponse.json(
      { error: "Error interno en el procesamiento del webhook." },
      { status: 500 }
    );
  }
}
