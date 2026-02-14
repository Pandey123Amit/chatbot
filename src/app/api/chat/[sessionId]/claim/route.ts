import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { emitChatMessage, emitChatSessionUpdate } from '@/lib/socket-handlers';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'AGENT' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { sessionId } = await params;

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    if (chatSession.status !== 'AI_ACTIVE' && chatSession.status !== 'WAITING') {
      return NextResponse.json(
        { error: 'Session cannot be claimed in its current state' },
        { status: 400 }
      );
    }

    // Assign agent and change status to ACTIVE
    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        agentId: session.user.id,
        status: 'ACTIVE',
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        agent: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create system message
    const systemMessage = await prisma.chatMessage.create({
      data: {
        chatSessionId: sessionId,
        content: `${session.user.name} has taken over this conversation.`,
        senderType: 'SYSTEM',
      },
    });

    // Emit socket events
    emitChatMessage(sessionId, systemMessage);
    emitChatSessionUpdate(sessionId, updatedSession);

    return NextResponse.json({ chatSession: updatedSession });
  } catch (error) {
    console.error('Error claiming chat session:', error);
    return NextResponse.json(
      { error: 'Failed to claim chat session' },
      { status: 500 }
    );
  }
}
