import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/jwt";
import { sendClientConfirmationEmail } from "@/lib/mail";

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

    const body = await req.json();
    const { type, value } = body;

    if (!type || !value) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos (type, value)." },
        { status: 400 }
      );
    }

    if (type === "number") {
      const formattedNumber = value.trim().padStart(2, "0");
      if (formattedNumber.length !== 2 || isNaN(Number(formattedNumber))) {
        return NextResponse.json(
          { error: "Número de ticket inválido. Debe ser de 2 cifras (ej: 07 o 45)." },
          { status: 400 }
        );
      }

      // Find the ticket and its owner
      const ticket = await prisma.ticket.findUnique({
        where: { number: formattedNumber },
        include: { user: true },
      });

      if (!ticket) {
        return NextResponse.json(
          { error: `El número de ticket '${formattedNumber}' no existe en el inventario.` },
          { status: 404 }
        );
      }

      if (ticket.status !== "SOLD") {
        return NextResponse.json(
          { error: `El ticket '${formattedNumber}' no se encuentra vendido (Estado actual: ${ticket.status}). Solo se pueden reenviar tickets vendidos.` },
          { status: 400 }
        );
      }

      if (!ticket.user) {
        return NextResponse.json(
          { error: "El ticket está marcado como vendido pero no tiene un usuario asociado." },
          { status: 500 }
        );
      }

      // Fetch all sold tickets for this user to send a complete email
      const soldTickets = await prisma.ticket.findMany({
        where: { userId: ticket.userId, status: "SOLD" },
        select: { number: true },
      });

      const numbers = soldTickets.map((t) => t.number);

      console.log(`Reenviando confirmación de tickets [${numbers.join(", ")}] a ${ticket.user.email} (por número de ticket)...`);
      const mailResult = await sendClientConfirmationEmail({
        clientEmail: ticket.user.email,
        numbers,
      });

      if (!mailResult.success) {
        return NextResponse.json(
          { error: `Error al enviar correo: ${mailResult.error || "problema desconocido"}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Comprobante de tickets [${numbers.join(", ")}] reenviado exitosamente a ${ticket.user.email}.`,
      });

    } else if (type === "email") {
      const emailQuery = value.trim();
      const clientUser = await prisma.user.findFirst({
        where: {
          email: {
            equals: emailQuery,
            mode: "insensitive",
          },
        },
      });

      if (!clientUser) {
        return NextResponse.json(
          { error: `No se encontró ningún cliente registrado con el correo '${emailQuery}'.` },
          { status: 404 }
        );
      }

      // Fetch all sold tickets for this user
      const soldTickets = await prisma.ticket.findMany({
        where: { userId: clientUser.id, status: "SOLD" },
        select: { number: true },
      });

      if (soldTickets.length === 0) {
        return NextResponse.json(
          { error: `El cliente '${clientUser.email}' no tiene ningún ticket comprado/vendido en el sorteo actual.` },
          { status: 400 }
        );
      }

      const numbers = soldTickets.map((t) => t.number);

      console.log(`Reenviando confirmación de tickets [${numbers.join(", ")}] a ${clientUser.email} (por cliente)...`);
      const mailResult = await sendClientConfirmationEmail({
        clientEmail: clientUser.email,
        numbers,
      });

      if (!mailResult.success) {
        return NextResponse.json(
          { error: `Error al enviar correo: ${mailResult.error || "problema desconocido"}` },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Comprobante de tickets [${numbers.join(", ")}] reenviado exitosamente a ${clientUser.email}.`,
      });

    } else {
      return NextResponse.json(
        { error: "Tipo de reenvío inválido. Debe ser 'number' o 'email'." },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Error al reenviar tickets:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar el reenvío de tickets." },
      { status: 500 }
    );
  }
}
