import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { sendAdminContactForm } from "@/lib/mail";
import { getCurrentUser } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { email, phone, message } = body;

    // Optional authentication check to prefill or override email/phone
    const user = getCurrentUser(req);
    if (user) {
      email = email || user.email;
      // Fetch the actual user model to get their phone if not provided
      const userDb = await prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true, phone: true },
      });
      if (userDb) {
        email = email || userDb.email;
        phone = phone || userDb.phone;
      }
    }

    if (!email || !message) {
      return NextResponse.json(
        { error: "El correo y el mensaje son requeridos." },
        { status: 400 }
      );
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "El formato de correo ingresado no es válido." },
        { status: 400 }
      );
    }

    if (message.trim().length < 10) {
      return NextResponse.json(
        { error: "El mensaje debe contener al menos 10 caracteres." },
        { status: 400 }
      );
    }

    // Retrieve administrator email from DB
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { email: true },
    });
    const adminEmail = adminUser?.email || process.env.ADMIN_EMAIL || "admin@lottocien.com";

    console.log(`Enviando formulario de contacto de ${email} a administrador ${adminEmail}...`);
    const mailResult = await sendAdminContactForm({
      adminEmail,
      clientEmail: email,
      clientPhone: phone || undefined,
      message,
    });

    if (!mailResult.success) {
      return NextResponse.json(
        { error: "Ocurrió un error al enviar el correo a soporte. Inténtelo de nuevo." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Su mensaje ha sido enviado al administrador con éxito." },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error en contacto API:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar su solicitud de contacto." },
      { status: 500 }
    );
  }
}
