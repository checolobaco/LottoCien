import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const user = getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión para comprar." },
        { status: 401 }
      );
    }

    const body = await req.json();
    
    // Support both multiple numbers or a single number payload for backward compatibility
    const numbers: string[] = body.numbers || (body.number ? [body.number] : []);

    if (numbers.length === 0) {
      return NextResponse.json(
        { error: "Debe proporcionar al menos un número para realizar la reserva." },
        { status: 400 }
      );
    }

    // Validate each number format
    for (const num of numbers) {
      if (!num || num.length !== 2 || isNaN(Number(num))) {
        return NextResponse.json(
          { error: `Número '${num}' inválido. Debe ser de 2 cifras (00-99).` },
          { status: 400 }
        );
      }
    }

    // 2. Perform atomic reservation transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find all target tickets
      const tickets = await tx.ticket.findMany({
        where: { number: { in: numbers } },
      });

      if (tickets.length !== numbers.length) {
        throw new Error("TICKET_NOT_FOUND");
      }

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      // Verify that every requested ticket is actually available
      for (const ticket of tickets) {
        const isAvailable = ticket.status === "AVAILABLE";
        const isExpiredPending =
          ticket.status === "PENDING" &&
          ticket.reservedAt &&
          ticket.reservedAt < tenMinutesAgo;

        if (!isAvailable && !isExpiredPending) {
          throw new Error("TICKET_TAKEN");
        }
      }

      // Enforce limits: Free up any previously pending temporary ticket checkouts for this user
      await tx.ticket.updateMany({
        where: {
          status: "PENDING",
          userId: user.id,
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

      // Generate a unique transaction reference covering all selected numbers
      const timestamp = Date.now();
      const numbersSuffix = numbers.join("-");
      const transactionRef = `rifa-${numbersSuffix.slice(0, 15)}-${user.id.slice(0, 8)}-${timestamp}`;

      // Update all selected tickets to PENDING state
      await tx.ticket.updateMany({
        where: { number: { in: numbers } },
        data: {
          status: "PENDING",
          userId: user.id,
          reservedAt: new Date(),
          transactionRef,
        },
      });

      // Retrieve the updated rows to return to the client
      const updatedTickets = await tx.ticket.findMany({
        where: { number: { in: numbers } },
      });

      return { tickets: updatedTickets, transactionRef };
    });

    return NextResponse.json({
      success: true,
      tickets: result.tickets,
      transactionRef: result.transactionRef,
    }, { status: 200 });

  } catch (error) {
    console.error("Error al reservar tickets:", error);
    const err = error as Error;
    if (err.message === "TICKET_TAKEN") {
      return NextResponse.json(
        { error: "Uno o más de los números elegidos ya han sido reservados o comprados por otro usuario." },
        { status: 409 }
      );
    }
    if (err.message === "TICKET_NOT_FOUND") {
      return NextResponse.json(
        { error: "Uno o más números no existen en el inventario." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Error interno del servidor al realizar la reserva." },
      { status: 500 }
    );
  }
}
