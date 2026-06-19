import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/jwt";
import { sendAdminPrizeClaimAlert } from "@/lib/mail";

export async function GET(req: Request) {
  try {
    // 1. Authenticate user
    const user = getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión." },
        { status: 401 }
      );
    }

    // 2. Retrieve the current raffle state
    const raffleState = await prisma.raffleState.findUnique({
      where: { id: "current" },
    });

    if (!raffleState || !raffleState.winningNumber || !raffleState.drawnAt) {
      return NextResponse.json({ claim: null }, { status: 200 });
    }

    // 3. Find the claim for the current draw
    const raffleId = raffleState.drawnAt.toISOString();
    const claim = await prisma.prizeClaim.findUnique({
      where: {
        userId_raffleId: {
          userId: user.id,
          raffleId,
        },
      },
    });

    return NextResponse.json({ claim }, { status: 200 });
  } catch (error: any) {
    console.error("Error al obtener reclamación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const user = getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión para reclamar su premio." },
        { status: 401 }
      );
    }

    // 2. Parse request JSON body
    const body = await req.json();
    const { bankName, accountNumber, accountType, accountHolder, documentNumber } = body;

    if (!bankName || !accountNumber || !accountType || !accountHolder || !documentNumber) {
      return NextResponse.json(
        { error: "Todos los campos de datos bancarios y documento son requeridos." },
        { status: 400 }
      );
    }

    // 3. Retrieve the current raffle state
    const raffleState = await prisma.raffleState.findUnique({
      where: { id: "current" },
    });

    if (!raffleState || !raffleState.winningNumber || !raffleState.drawnAt) {
      return NextResponse.json(
        { error: "El sorteo de esta semana no tiene un número ganador registrado aún." },
        { status: 400 }
      );
    }

    const raffleId = raffleState.drawnAt.toISOString();

    // 4. Check if claim already exists for this draw
    const existingClaim = await prisma.prizeClaim.findUnique({
      where: {
        userId_raffleId: {
          userId: user.id,
          raffleId,
        },
      },
    });

    if (existingClaim) {
      return NextResponse.json(
        { error: "Ya has enviado una reclamación para este sorteo." },
        { status: 400 }
      );
    }

    // 5. Fetch user's purchased tickets
    const tickets = await prisma.ticket.findMany({
      where: {
        userId: user.id,
        status: "SOLD",
      },
    });

    if (tickets.length === 0) {
      return NextResponse.json(
        { error: "No tienes tickets comprados en este sorteo." },
        { status: 400 }
      );
    }

    // 6. Calculate winnings server-side
    const winningNumber = raffleState.winningNumber;
    const mayor = winningNumber.slice(2, 4);
    const secundario = winningNumber.slice(0, 2);
    const consolacion = winningNumber.slice(1, 3);

    const winnings = [];
    let totalAmount = 0;

    for (const ticket of tickets) {
      const ticketNum = ticket.number;
      const prizes = [];
      let value = 0;

      if (ticketNum === mayor) {
        prizes.push("Premio Mayor");
        value += raffleState.prizeMayor;
      }
      if (ticketNum === secundario) {
        prizes.push("Premio Secundario");
        value += raffleState.prizeSecundario;
      }
      if (ticketNum === consolacion) {
        prizes.push("Premio de Consolación");
        value += raffleState.prizeConsolacion;
      }

      if (prizes.length > 0) {
        winnings.push({
          ticket: ticketNum,
          prizes,
          value,
        });
        totalAmount += value;
      }
    }

    if (winnings.length === 0) {
      return NextResponse.json(
        { error: "No tienes ningún ticket ganador asociado en este sorteo." },
        { status: 400 }
      );
    }

    // 7. Save claim in database
    const ticketsStr = winnings.map((w) => w.ticket).join(", ");
    const prizesStr = winnings.flatMap((w) => w.prizes).join(", ");

    await prisma.prizeClaim.create({
      data: {
        userId: user.id,
        raffleId,
        winningNumber,
        tickets: ticketsStr,
        prizes: prizesStr,
        totalAmount,
        bankName,
        accountNumber,
        accountType,
        accountHolder,
        documentNumber,
        status: "PENDING",
      },
    });

    // 8. Dynamically retrieve the email of the administrator in the database
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

    // 9. Dispatch prize claim notification email to administrator
    sendAdminPrizeClaimAlert({
      adminEmail,
      clientEmail: user.email,
      bankDetails: {
        bankName,
        accountNumber,
        accountType,
        accountHolder,
        documentNumber,
      },
      winnings,
      totalAmount,
      lotteryName: raffleState.lotteryName,
      winningNumber,
    }).catch(err => {
      console.error("Fallo al enviar correo de reclamo de premio al administrador:", err);
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tu solicitud de reclamo de premio ha sido enviada con éxito. El administrador revisará tus datos para realizar la transferencia.",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error en endpoint de reclamo de premio:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar el reclamo de premio." },
      { status: 500 }
    );
  }
}
