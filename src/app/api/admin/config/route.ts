import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/jwt";

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

    const {
      ticketPrice,
      prizeMayor,
      prizeSecundario,
      prizeConsolacion,
      lotteryName,
      termsAndConditions,
      wompiEnabled,
      drawDate,
      drawWarningMessage,
      showDrawWarning,
      showDrawHistory,
      bankName,
      accountNumber,
      accountType,
      accountHolder,
    } = await req.json();

    // Validate inputs
    if (
      typeof ticketPrice !== "number" || ticketPrice <= 0 ||
      typeof prizeMayor !== "number" || prizeMayor <= 0 ||
      typeof prizeSecundario !== "number" || prizeSecundario <= 0 ||
      typeof prizeConsolacion !== "number" || prizeConsolacion <= 0 ||
      !lotteryName || !lotteryName.trim() ||
      !termsAndConditions || !termsAndConditions.trim() ||
      typeof wompiEnabled !== "boolean" ||
      typeof showDrawWarning !== "boolean" ||
      typeof showDrawHistory !== "boolean" ||
      typeof bankName !== "string" || !bankName.trim() ||
      typeof accountNumber !== "string" || !accountNumber.trim() ||
      typeof accountType !== "string" || !accountType.trim() ||
      typeof accountHolder !== "string" || !accountHolder.trim()
    ) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios (incluyendo los datos bancarios) y deben contener valores válidos." },
        { status: 400 }
      );
    }

    let parsedDrawDate: Date | null = null;
    if (drawDate) {
      parsedDrawDate = new Date(drawDate);
      if (isNaN(parsedDrawDate.getTime())) {
        return NextResponse.json(
          { error: "La fecha del sorteo no es válida." },
          { status: 400 }
        );
      }
    }

    if (drawWarningMessage && typeof drawWarningMessage !== "string") {
      return NextResponse.json(
        { error: "El mensaje de advertencia debe ser de tipo texto." },
        { status: 400 }
      );
    }

    // Fetch current state to determine if draw date has changed
    const currentState = await prisma.raffleState.findUnique({
      where: { id: "current" },
    });

    let drawWarningSent = currentState?.drawWarningSent ?? false;
    if (currentState) {
      const currentDrawTime = currentState.drawDate ? new Date(currentState.drawDate).getTime() : null;
      const newDrawTime = parsedDrawDate ? parsedDrawDate.getTime() : null;
      if (currentDrawTime !== newDrawTime) {
        drawWarningSent = false;
      }
    }

    // 2. Update configuration in RaffleState
    const updatedState = await prisma.raffleState.update({
      where: { id: "current" },
      data: {
        ticketPrice,
        prizeMayor,
        prizeSecundario,
        prizeConsolacion,
        lotteryName: lotteryName.trim(),
        termsAndConditions: termsAndConditions.trim(),
        wompiEnabled,
        drawDate: parsedDrawDate,
        drawWarningMessage: drawWarningMessage ? drawWarningMessage.trim() : undefined,
        drawWarningSent,
        showDrawWarning,
        showDrawHistory,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountType: accountType.trim(),
        accountHolder: accountHolder.trim(),
      },
    });

    console.log(`Configuración del sorteo actualizada por el administrador (${user.email}):`);
    console.log(`- Precio del Ticket: $${ticketPrice}`);
    console.log(`- Referencia Lotería: ${lotteryName}`);

    return NextResponse.json({
      success: true,
      raffleState: updatedState,
    }, { status: 200 });

  } catch (error) {
    console.error("Error al actualizar la configuración del sorteo:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al actualizar la configuración." },
      { status: 500 }
    );
  }
}
