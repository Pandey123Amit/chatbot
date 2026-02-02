import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { autoAssignChat } from '@/lib/auto-assign';
import { emitNewChatSession, emitAgentJoined, emitChatMessage } from '@/lib/socket-handlers';

// Start a new chat session
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create chat session
    const chatSession = await prisma.chatSession.create({
      data: {
        customerId: session.user.id,
        status: 'WAITING',
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Add system message
    await prisma.chatMessage.create({
      data: {
        chatSessionId: chatSession.id,
        content: 'Chat started. Connecting you to an agent...',
        senderType: 'SYSTEM',
      },
    });

    // Auto-assign an agent
    const assignedSession = await autoAssignChat(chatSession.id);

    if (assignedSession && assignedSession.agentId) {
      const systemMessage = await prisma.chatMessage.create({
        data: {
          chatSessionId: chatSession.id,
          content: `${assignedSession.agent?.name} has joined the chat.`,
          senderType: 'SYSTEM',
        },
      });

      // Emit real-time events
      emitNewChatSession(assignedSession.agentId, assignedSession);
      emitAgentJoined(chatSession.id, assignedSession);
      emitChatMessage(chatSession.id, systemMessage);
    }

    return NextResponse.json({
      chatSession: assignedSession || chatSession
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}

// Get active chat sessions (for agents)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let where: any = {};

    if (session.user.role === 'AGENT') {
      where = {
        agentId: session.user.id,
        status: { in: ['WAITING', 'ACTIVE'] },
      };
    } else if (session.user.role === 'ADMIN') {
      where = {
        status: { in: ['WAITING', 'ACTIVE'] },
      };
    } else {
      where = {
        customerId: session.user.id,
        status: { in: ['WAITING', 'ACTIVE'] },
      };
    }

    const chatSessions = await prisma.chatSession.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        agent: {
          select: { id: true, name: true, email: true },
        },
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    return NextResponse.json({ chatSessions });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat sessions' },
      { status: 500 }
    );
  }
}
