import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/jwt";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    
    // Check authentication
    const user = getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { number: ticketId }
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
    }

    // Verify ownership (unless admin)
    if (ticket.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // Check if the ticket is sold (approved)
    if (ticket.status !== "SOLD") {
      return NextResponse.json(
        { error: "La compra asociada a este ticket aún no ha sido aprobada." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      number: ticket.number,
      status: ticket.status,
      pasatiempoConsumido: ticket.pasatiempoConsumido,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    
    // Check authentication
    const user = getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { number: ticketId }
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
    }

    // Verify ownership (unless admin)
    if (ticket.userId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    // Check if the ticket is sold (approved)
    if (ticket.status !== "SOLD") {
      return NextResponse.json(
        { error: "La compra asociada a este ticket aún no ha sido aprobada." },
        { status: 400 }
      );
    }

    // Lock game consumption (set pasatiempoConsumido to true)
    const updatedTicket = await prisma.ticket.update({
      where: { number: ticketId },
      data: { pasatiempoConsumido: true }
    });

    return NextResponse.json({
      success: true,
      number: updatedTicket.number,
      pasatiempoConsumido: updatedTicket.pasatiempoConsumido,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
