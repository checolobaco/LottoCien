import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/jwt";
import { uploadReceiptToR2 } from "@/lib/r2";
import { sendAdminNewTransferAlert } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const user = getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión para enviar comprobantes." },
        { status: 401 }
      );
    }

    // Check raffle state to see if purchases/payments are blocked (1h before / after draw)
    const currentState = await prisma.raffleState.findUnique({
      where: { id: "current" },
    });

    if (currentState) {
      if (currentState.winningNumber !== null) {
        return NextResponse.json(
          { error: "Las compras y pagos están cerrados porque el sorteo ya se ha ejecutado." },
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
            { error: "Las compras y pagos están deshabilitados temporalmente (1 hora antes y 1 hora después del sorteo)." },
            { status: 400 }
          );
        }
      }
    }

    // 2. Read Multipart FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const transactionRef = formData.get("transactionRef") as string | null;

    if (!file || !transactionRef) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos (file, transactionRef)." },
        { status: 400 }
      );
    }

    // Validate file type (allow common images and PDF)
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Solo se aceptan imágenes (JPG, PNG, WEBP) o documentos PDF." },
        { status: 400 }
      );
    }

    // Validate file size (limit to 5MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: "El archivo es demasiado grande. El límite máximo es de 5MB." },
        { status: 400 }
      );
    }

    // 3. Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Upload to Cloudflare R2
    console.log(`Subiendo comprobante para transacción: ${transactionRef} a Cloudflare R2...`);
    const receiptUrl = await uploadReceiptToR2(buffer, file.name, file.type);
    console.log(`Subido con éxito: ${receiptUrl}`);

    // 5. Update tickets in Database atomically
    const tickets = await prisma.$transaction(async (tx) => {
      // Find tickets associated with this transaction reference
      const associatedTickets = await tx.ticket.findMany({
        where: {
          transactionRef,
          userId: user.id,
        },
      });

      if (associatedTickets.length === 0) {
        throw new Error("TRANSACTION_NOT_FOUND");
      }

      // Verify that tickets are in PENDING status (temporary hold)
      const invalidStatus = associatedTickets.some(t => t.status !== "PENDING");
      if (invalidStatus) {
        throw new Error("INVALID_TICKET_STATUS");
      }

      // Update tickets status to PENDING_APPROVAL and attach receipt
      await tx.ticket.updateMany({
        where: { transactionRef },
        data: {
          status: "PENDING_APPROVAL",
          paymentMethod: "TRANSFER",
          receiptUrl,
        },
      });

      return associatedTickets;
    });

    // 6. Notify Administrator via Email
    const ticketNumbers = tickets.map(t => t.number);
    const appUrl = new URL(req.url).origin;

    // Dynamically retrieve the email of the administrator in the database
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

    console.log(`Enviando notificación al administrador (${adminEmail || "correo predeterminado"}) para los tickets: ${ticketNumbers.join(", ")}`);
    
    // Fire email asynchronously in background
    sendAdminNewTransferAlert({
      adminEmail,
      clientEmail: user.email,
      numbers: ticketNumbers,
      receiptUrl,
      transactionRef,
      appUrl,
    }).catch(err => {
      console.error("Fallo al enviar correo de alerta de comprobante:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Comprobante recibido con éxito. En espera de aprobación por el administrador.",
      receiptUrl,
      ticketCount: tickets.length,
    }, { status: 200 });

  } catch (error) {
    console.error("Error al procesar comprobante de pago:", error);
    const err = error as Error;
    if (err.message === "TRANSACTION_NOT_FOUND") {
      return NextResponse.json(
        { error: "No se encontraron registros activos para la referencia de pago proporcionada." },
        { status: 404 }
      );
    }
    if (err.message === "INVALID_TICKET_STATUS") {
      return NextResponse.json(
        { error: "Los números de esta transacción ya han sido procesados, aprobados o su tiempo expiró." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Error interno del servidor al procesar la subida del comprobante." },
      { status: 500 }
    );
  }
}
