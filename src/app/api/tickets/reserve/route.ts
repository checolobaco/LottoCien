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

    // Check raffle state to see if purchases are blocked (1h before / after draw)
    const currentState = await prisma.raffleState.findUnique({
      where: { id: "current" },
    });

    if (currentState) {
      if (currentState.winningNumber !== null) {
        return NextResponse.json(
          { error: "Las compras están cerradas porque el sorteo ya se ha ejecutado." },
          { status: 400 }
        );
      }

      if (currentState.drawDate) {
        const now = new Date();
        const drawTime = new Date(currentState.drawDate);
        const oneHour = 60 * 60 * 1000;
        const diff = now.getTime() - drawTime.getTime();

        if (diff >= -oneHour && diff <= oneHour) {
          return NextResponse.json(
            { error: "Las compras están deshabilitadas temporalmente (1 hora antes y 1 hora después del sorteo)." },
            { status: 400 }
          );
        }
      }
    }

    // 2. Perform atomic reservation transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify existence of all requested tickets
      const ticketsCount = await tx.ticket.count({
        where: { number: { in: numbers } },
      });

      if (ticketsCount !== numbers.length) {
        throw new Error("TICKET_NOT_FOUND");
      }

      // Generate a unique transaction reference covering all selected numbers
      const timestamp = Date.now();
      const numbersSuffix = numbers.join("-");
      const transactionRef = `rifa-${numbersSuffix.slice(0, 15)}-${user.id.slice(0, 8)}-${timestamp}`;

      // 2. Free up other PENDING tickets for this user that are NOT in the current numbers selection
      await tx.ticket.updateMany({
        where: {
          status: "PENDING",
          userId: user.id,
          number: { notIn: numbers }
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

      // 3. Atomically attempt to reserve the requested numbers.
      // We check that they are either AVAILABLE, or PENDING but expired (older than 10 mins), or PENDING by this same user.
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const updateResult = await tx.ticket.updateMany({
        where: {
          number: { in: numbers },
          OR: [
            { status: "AVAILABLE" },
            {
              status: "PENDING",
              reservedAt: { lt: tenMinutesAgo }
            },
            {
              status: "PENDING",
              userId: user.id
            }
          ]
        },
        data: {
          status: "PENDING",
          userId: user.id,
          reservedAt: new Date(),
          transactionRef,
        },
      });

      // If the number of updated tickets is less than requested, it means someone else took one or more of them
      if (updateResult.count !== numbers.length) {
        throw new Error("TICKET_TAKEN");
      }

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
