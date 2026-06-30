import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/jwt";
import crypto from "crypto";

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

    const { reference, status } = await req.json();
    if (!reference || !status) {
      return NextResponse.json(
        { error: "Faltan parámetros (reference, status)." },
        { status: 400 }
      );
    }

    const transactionId = `sim-wompi-${Date.now()}`;
    const amountInCents = 15000 * 100;
    const timestamp = Math.floor(Date.now() / 1000);
    const eventsSecret = process.env.WOMPI_EVENTS_SECRET || "secret_test_events_12345";

    // Wompi checksum formula: SHA256 of transaction.id + transaction.status + transaction.amount_in_cents + timestamp + events_secret
    const concatString = `${transactionId}${status}${amountInCents}${timestamp}${eventsSecret}`;
    const checksum = crypto
      .createHash("sha256")
      .update(concatString)
      .digest("hex");

    const webhookBody = {
      event: "transaction.updated",
      data: {
        transaction: {
          id: transactionId,
          status,
          reference,
          amount_in_cents: amountInCents,
          currency: "COP",
        },
      },
      sent_at: new Date().toISOString(),
      timestamp,
      signature: {
        properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
        checksum,
      },
    };

    // Post to the webhook endpoint locally
    let origin = new URL(req.url).origin;
    if (origin.startsWith("https://localhost:") || origin.startsWith("https://127.0.0.1:")) {
      origin = origin.replace("https://", "http://");
    }
    const webhookUrl = `${origin}/api/webhook/wompi`;
    
    console.log(`Llamando al webhook localmente: ${webhookUrl}`);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "La llamada interna al webhook de Wompi falló." },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Webhook de Wompi simulado con éxito. El ticket ahora está marcado como ${status}.`,
    }, { status: 200 });

  } catch (error) {
    console.error("Error en simulación de webhook:", error);
    return NextResponse.json(
      { error: "Error interno del servidor en el simulador." },
      { status: 500 }
    );
  }
}
