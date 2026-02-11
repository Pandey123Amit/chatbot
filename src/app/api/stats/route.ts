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
      inProgressTickets,
      resolvedToday,
      onlineAgents,
      totalAgents,
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
          status: 'IN_PROGRESS',
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
      prisma.user.count({
        where: {
          role: 'AGENT',
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

    // Calculate real average response time
    // Find tickets that have at least one agent reply, compute time between ticket creation and first agent message
    const ticketsWithFirstReply = await prisma.ticket.findMany({
      where: {
        messages: {
          some: {
            sender: { role: 'AGENT' },
          },
        },
      },
      select: {
        createdAt: true,
        messages: {
          where: {
            sender: { role: 'AGENT' },
          },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { createdAt: true },
        },
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    let avgResponseTime = 0;
    if (ticketsWithFirstReply.length > 0) {
      const totalMinutes = ticketsWithFirstReply.reduce((sum, ticket) => {
        if (ticket.messages.length > 0) {
          const diffMs = new Date(ticket.messages[0].createdAt).getTime() - new Date(ticket.createdAt).getTime();
          return sum + diffMs / (1000 * 60); // convert to minutes
        }
        return sum;
      }, 0);
      avgResponseTime = Math.round(totalMinutes / ticketsWithFirstReply.length);
    }

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
      inProgressTickets,
      resolvedTickets: resolvedToday,
      avgResponseTime,
      onlineAgents,
      totalAgents,
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
