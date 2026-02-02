import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';

// Update agent availability status
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'AGENT') {
      return NextResponse.json({ error: 'Only agents can update availability' }, { status: 403 });
    }

    const body = await req.json();
    const { agentStatus } = body;

    if (!['ONLINE', 'OFFLINE', 'BUSY'].includes(agentStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const agent = await prisma.user.update({
      where: { id: session.user.id },
      data: { agentStatus },
      select: {
        id: true,
        name: true,
        agentStatus: true,
      },
    });

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json(
      { error: 'Failed to update availability' },
      { status: 500 }
    );
  }
}

// Get online agents
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const onlineAgents = await prisma.user.findMany({
      where: {
        role: 'AGENT',
        agentStatus: 'ONLINE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        agentStatus: true,
      },
    });

    return NextResponse.json({ agents: onlineAgents });
  } catch (error) {
    console.error('Error fetching online agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch online agents' },
      { status: 500 }
    );
  }
}
