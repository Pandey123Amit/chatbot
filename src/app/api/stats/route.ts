import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can view full stats
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalTickets,
      openTickets,
      resolvedToday,
      onlineAgents,
      agents,
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({
        where: {
          status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING'] },
        },
      }),
      prisma.ticket.count({
        where: {
          status: { in: ['RESOLVED', 'CLOSED'] },
          resolvedAt: { gte: today },
        },
      }),
      prisma.user.count({
        where: {
          role: 'AGENT',
          agentStatus: 'ONLINE',
        },
      }),
      prisma.user.findMany({
        where: { role: 'AGENT' },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    // Get ticket counts per agent separately
    const ticketCounts: Record<string, number> = {};
    for (const agent of agents) {
      const count = await prisma.ticket.count({
        where: {
          assignedToId: agent.id,
          status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
        },
      });
      ticketCounts[agent.name] = count;
    }

    const stats = {
      totalTickets,
      openTickets,
      resolvedTickets: resolvedToday,
      avgResponseTime: 15, // Placeholder - would need proper calculation
      onlineAgents,
      ticketsPerAgent: ticketCounts,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
