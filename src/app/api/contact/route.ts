import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { contactFormSchema } from "@/lib/validators";
import { WEBSITE_VISITOR_EMAIL } from "@/lib/constants";
import { autoAssignTicket } from "@/lib/auto-assign";
import { sendContactNotificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = contactFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, phone, message, sessionId } = parsed.data;

    // Duplicate-submission guard: if session already has a ticket, reject
    if (sessionId) {
      const existingTicket = await prisma.ticket.findUnique({
        where: { chatSessionId: sessionId },
      });
      if (existingTicket) {
        return NextResponse.json(
          {
            error: "A ticket has already been created for this conversation.",
            ticketNumber: existingTicket.ticketNumber,
          },
          { status: 409 }
        );
      }
    }

    // Get sentinel visitor user
    const visitor = await prisma.user.findUnique({
      where: { email: WEBSITE_VISITOR_EMAIL },
    });

    if (!visitor) {
      return NextResponse.json(
        { error: "System user not found. Run prisma db seed." },
        { status: 500 }
      );
    }

    // Build ticket description with contact info + summary
    const description = [
      `Contact: ${name} <${email}>${phone ? ` | Phone: ${phone}` : ""}`,
      "",
      message,
    ].join("\n");

    // Create the ticket
    const ticket = await prisma.ticket.create({
      data: {
        subject: `Chat inquiry from ${name}`,
        description,
        channel: "CHAT",
        priority: "MEDIUM",
        customerId: visitor.id,
        chatSessionId: sessionId || undefined,
      },
    });

    // Update chat session to CONVERTED if linked
    if (sessionId) {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { status: "CONVERTED" },
      }).catch((err: unknown) => {
        console.error("Error updating chat session status:", err);
      });
    }

    // Auto-assign to an available agent
    autoAssignTicket(ticket.id).catch((err: unknown) => {
      console.error("Auto-assign failed:", err);
    });

    // Fire email notification (non-blocking)
    sendContactNotificationEmail({
      name,
      email,
      phone,
      message,
      ticketNumber: ticket.ticketNumber,
    });

    return NextResponse.json({
      success: true,
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.id,
    });
  } catch (error) {
    console.error("Contact form API error:", error);
    return NextResponse.json(
      { error: "Failed to process contact form" },
      { status: 500 }
    );
  }
}
