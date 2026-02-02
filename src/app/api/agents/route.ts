import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';

// Get all agents
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and agents can view agent list
    if (session.user.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const agents = await prisma.user.findMany({
      where: { role: 'AGENT' },
      select: {
        id: true,
        name: true,
        email: true,
        agentStatus: true,
        maxChats: true,
        createdAt: true,
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
              },
            },
          },
        },
      },
    });

    // Format response
    const formattedAgents = agents.map((agent) => ({
      ...agent,
      activeTickets: agent._count.assignedTickets,
      _count: undefined,
    }));

    return NextResponse.json({ agents: formattedAgents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

// Create new agent (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password } = body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const agent = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'AGENT',
        agentStatus: 'OFFLINE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        agentStatus: true,
        maxChats: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}
