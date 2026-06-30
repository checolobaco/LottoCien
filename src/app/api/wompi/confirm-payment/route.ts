import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { sendClientConfirmationEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const { transactionId } = await req.json();

    if (!transactionId) {
      return NextResponse.json(
        { error: "El parámetro transactionId es requerido." },
        { status: 400 }
      );
    }

    const privateKey = process.env.WOMPI_PRIVATE_KEY;
    if (!privateKey) {
      console.error("WOMPI_PRIVATE_KEY no está configurada en las variables de entorno.");
      return NextResponse.json(
        { error: "Error de configuración en el servidor de pagos." },
        { status: 500 }
      );
    }

    // Determine if we are in Sandbox or Production
    const isTest = privateKey.startsWith("prv_test_");
    const wompiUrl = `https://${isTest ? "sandbox" : "production"}.wompi.co/v1/transactions/${transactionId}`;

    console.log(`Verificando transacción ${transactionId} en Wompi (${isTest ? "Sandbox" : "Production"})...`);

    const res = await fetch(wompiUrl, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${privateKey}`,
      },
    });
    if (!res.ok) {
      console.error(`Error al consultar transacción en Wompi. Status: ${res.status}`);
      return NextResponse.json(
        { error: "No se pudo consultar el estado de la transacción en Wompi." },
        { status: 502 }
      );
    }

    const { data: transaction } = await res.json();
    if (!transaction) {
      return NextResponse.json(
        { error: "No se encontró información de la transacción en la respuesta de Wompi." },
        { status: 404 }
      );
    }

    const { status, reference } = transaction;
    console.log(`Estado obtenido de Wompi para ${transactionId}: ${status}, Referencia: ${reference}`);

    // Find the associated tickets
    const ticket = await prisma.ticket.findFirst({
      where: { transactionRef: reference },
    });

    if (!ticket) {
      console.warn(`No se encontró ticket para la referencia: ${reference}. Quizá ya fue procesado o eliminado.`);
      return NextResponse.json({ status, reference, message: "Ticket no encontrado en base de datos." }, { status: 200 });
    }

    // Process status
    if (status === "APPROVED") {
      // Check if already SOLD to avoid redundant updates/emails
      if (ticket.status !== "SOLD") {
        console.log(`Confirmando pago APPROVED de forma proactiva para referencia: ${reference}`);
        
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
            console.log(`Despachando email de confirmación proactiva a ${clientEmail} para tickets: ${numbers.join(", ")}`);
            try {
              await sendClientConfirmationEmail({
                clientEmail,
                numbers,
              });
            } catch (emailErr) {
              console.error("Error al enviar email de confirmación:", emailErr);
            }
          }
        }
      }
    } else if (["DECLINED", "VOIDED", "ERROR"].includes(status)) {
      if (ticket.status !== "AVAILABLE") {
        console.log(`Liberando tickets por transacción fallida/rechazada de forma proactiva para referencia: ${reference}`);
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
      }
    }

    return NextResponse.json({ status, reference, success: true }, { status: 200 });
  } catch (error) {
    console.error("Error en confirmación proactiva de Wompi:", error);
    return NextResponse.json(
      { error: "Error interno al verificar la transacción de Wompi." },
      { status: 500 }
    );
  }
}
