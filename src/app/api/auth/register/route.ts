import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    const { email, password, phone } = await req.json();

    if (!email || !password || !phone) {
      return NextResponse.json(
        { error: "Email, contraseña y teléfono son obligatorios." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El correo electrónico ya está registrado." },
        { status: 400 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        phone: phone.trim(),
        role: "CLIENT", // Default role
      },
    });

    // Generate token
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      token,
    }, { status: 201 });
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al registrar el usuario." },
      { status: 500 }
    );
  }
}
