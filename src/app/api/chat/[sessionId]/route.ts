import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { chatMessageSchema } from '@/lib/validators';
import { emitChatMessage, emitChatEnded } from '@/lib/socket-handlers';

// Get chat session with messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        agent: {
          select: { id: true, name: true, email: true },
        },
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    // Check access
    if (
      session.user.role === 'CUSTOMER' &&
      chatSession.customerId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (
      session.user.role === 'AGENT' &&
      chatSession.agentId !== session.user.id &&
      !chatSession.isAISession
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ chatSession });
  } catch (error) {
    console.error('Error fetching chat session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat session' },
      { status: 500 }
    );
  }
}

// Send message to chat session
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;
    const body = await req.json();
    const { content } = chatMessageSchema.parse(body);

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    if (chatSession.status === 'ENDED' || chatSession.status === 'CONVERTED') {
      return NextResponse.json({ error: 'Chat session has ended' }, { status: 400 });
    }

    const senderType = session.user.role === 'CUSTOMER' ? 'CUSTOMER' : 'AGENT';

    const message = await prisma.chatMessage.create({
      data: {
        chatSessionId: sessionId,
        content,
        senderType,
        senderId: session.user.id,
      },
    });

    // Emit real-time event
    emitChatMessage(sessionId, message);

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

// End chat session
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;

    const chatSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
    });

    // Add system message
    const endMessage = await prisma.chatMessage.create({
      data: {
        chatSessionId: sessionId,
        content: 'Chat ended.',
        senderType: 'SYSTEM',
      },
    });

    // Emit real-time events
    emitChatMessage(sessionId, endMessage);
    emitChatEnded(sessionId);

    return NextResponse.json({ chatSession });
  } catch (error) {
    console.error('Error ending chat session:', error);
    return NextResponse.json(
      { error: 'Failed to end chat session' },
      { status: 500 }
    );
  }
}
