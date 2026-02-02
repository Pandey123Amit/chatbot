import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';

// Convert chat session to ticket
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only agents can convert chats to tickets
    if (session.user.role !== 'AGENT' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { sessionId } = await params;

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        customer: true,
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    if (chatSession.status === 'CONVERTED') {
      return NextResponse.json({ error: 'Chat already converted' }, { status: 400 });
    }

    // Create ticket from chat
    const ticket = await prisma.ticket.create({
      data: {
        subject: `Chat conversation with ${chatSession.customer.name}`,
        description: 'Converted from live chat',
        status: 'ASSIGNED',
        channel: 'CHAT',
        isLocked: true,
        customerId: chatSession.customerId,
        assignedToId: chatSession.agentId, // Same agent continues
        chatSessionId: chatSession.id,
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Copy chat messages to ticket messages
    for (const chatMsg of chatSession.chatMessages) {
      if (chatMsg.senderType !== 'SYSTEM' && chatMsg.senderId) {
        await prisma.message.create({
          data: {
            ticketId: ticket.id,
            content: chatMsg.content,
            senderId: chatMsg.senderId,
            isInternal: false,
            createdAt: chatMsg.createdAt,
          },
        });
      }
    }

    // Update chat session status
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        status: 'CONVERTED',
        endedAt: new Date(),
      },
    });

    // Add system message
    await prisma.chatMessage.create({
      data: {
        chatSessionId: sessionId,
        content: `Chat converted to ticket #${ticket.ticketNumber}. The conversation will continue there.`,
        senderType: 'SYSTEM',
      },
    });

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error converting chat to ticket:', error);
    return NextResponse.json(
      { error: 'Failed to convert chat to ticket' },
      { status: 500 }
    );
  }
}
