import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { reference, amountInCents, currency } = await req.json();

    if (!reference || !amountInCents || !currency) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos (reference, amountInCents, currency)." },
        { status: 400 }
      );
    }

    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET || "secret_test_integrity_12345";

    // Wompi Integrity Signature formula: SHA256 of reference + amountInCents + currency + integritySecret
    const concatString = `${reference}${amountInCents}${currency}${integritySecret}`;
    const signature = crypto
      .createHash("sha256")
      .update(concatString)
      .digest("hex");

    return NextResponse.json({ signature }, { status: 200 });
  } catch (error) {
    console.error("Error al generar firma de integridad:", error);
    return NextResponse.json(
      { error: "Error interno al generar la firma de integridad." },
      { status: 500 }
    );
  }
}
