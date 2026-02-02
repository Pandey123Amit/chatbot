import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { createMessageSchema } from '@/lib/validators';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const messages = await prisma.message.findMany({
      where: { ticketId: id },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Filter internal messages for customers
    const filteredMessages =
      session.user.role === 'CUSTOMER'
        ? messages.filter((m) => !m.isInternal)
        : messages;

    return NextResponse.json({ messages: filteredMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const validatedData = createMessageSchema.parse(body);

    // Check ticket exists and user has access
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check permissions
    if (session.user.role === 'AGENT') {
      if (ticket.isLocked && ticket.assignedToId !== session.user.id) {
        return NextResponse.json(
          { error: 'Ticket is locked to another agent' },
          { status: 403 }
        );
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content: validatedData.content,
        isInternal: validatedData.isInternal || false,
        ticketId: id,
        senderId: session.user.id,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Update ticket status if customer replies and ticket was resolved
    if (
      session.user.role === 'CUSTOMER' &&
      (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED')
    ) {
      await prisma.ticket.update({
        where: { id },
        data: {
          status: 'ASSIGNED',
          resolvedAt: null,
        },
      });
    }

    // Update ticket timestamp
    await prisma.ticket.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}
