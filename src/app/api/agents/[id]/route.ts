import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { updateAgentSchema } from '@/lib/validators';

// Get agent details
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

    const agent = await prisma.user.findUnique({
      where: { id, role: 'AGENT' },
      select: {
        id: true,
        name: true,
        email: true,
        agentStatus: true,
        maxChats: true,
        createdAt: true,
        assignedTickets: {
          where: {
            status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
          },
          select: {
            id: true,
            ticketNumber: true,
            subject: true,
            status: true,
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

// Update agent
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Agents can update their own profile, admins can update any agent
    if (session.user.role === 'AGENT' && session.user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = updateAgentSchema.parse(body);

    const agent = await prisma.user.update({
      where: { id, role: 'AGENT' },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        agentStatus: true,
        maxChats: true,
      },
    });

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

// Delete agent (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check for active tickets
    const activeTickets = await prisma.ticket.count({
      where: {
        assignedToId: id,
        status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
      },
    });

    if (activeTickets > 0) {
      return NextResponse.json(
        { error: 'Cannot delete agent with active tickets' },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id, role: 'AGENT' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
