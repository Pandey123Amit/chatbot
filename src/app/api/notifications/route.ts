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

    const userId = session.user.id;
    const role = session.user.role;
    const since = new Date();
    since.setDate(since.getDate() - 7); // Last 7 days

    const notifications: Array<{
      id: string;
      type: 'TICKET_ASSIGNED' | 'CUSTOMER_REPLY' | 'STATUS_CHANGE';
      title: string;
      message: string;
      createdAt: Date;
      ticketId?: string;
    }> = [];

    if (role === 'AGENT') {
      // Tickets recently assigned to this agent
      const assignedTickets = await prisma.ticket.findMany({
        where: {
          assignedToId: userId,
          updatedAt: { gte: since },
        },
        include: {
          customer: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });

      for (const ticket of assignedTickets) {
        notifications.push({
          id: `assign-${ticket.id}`,
          type: 'TICKET_ASSIGNED',
          title: 'Ticket assigned to you',
          message: `#${ticket.ticketNumber}: ${ticket.subject}`,
          createdAt: ticket.updatedAt,
          ticketId: ticket.id,
        });
      }

      // Recent customer replies on agent's tickets
      const customerReplies = await prisma.message.findMany({
        where: {
          ticket: { assignedToId: userId },
          sender: { role: 'CUSTOMER' },
          createdAt: { gte: since },
        },
        include: {
          ticket: { select: { id: true, ticketNumber: true, subject: true } },
          sender: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      for (const reply of customerReplies) {
        notifications.push({
          id: `reply-${reply.id}`,
          type: 'CUSTOMER_REPLY',
          title: 'Customer replied',
          message: `${reply.sender.name} on #${reply.ticket.ticketNumber}: ${reply.ticket.subject}`,
          createdAt: reply.createdAt,
          ticketId: reply.ticket.id,
        });
      }
    } else if (role === 'ADMIN') {
      // New tickets created recently
      const recentTickets = await prisma.ticket.findMany({
        where: {
          createdAt: { gte: since },
        },
        include: {
          customer: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      for (const ticket of recentTickets) {
        notifications.push({
          id: `new-${ticket.id}`,
          type: 'STATUS_CHANGE',
          title: 'New ticket created',
          message: `#${ticket.ticketNumber}: ${ticket.subject} by ${ticket.customer.name}`,
          createdAt: ticket.createdAt,
          ticketId: ticket.id,
        });
      }

      // Recent status changes (resolved tickets)
      const resolvedTickets = await prisma.ticket.findMany({
        where: {
          status: { in: ['RESOLVED', 'CLOSED'] },
          resolvedAt: { gte: since },
        },
        include: {
          assignedTo: { select: { name: true } },
        },
        orderBy: { resolvedAt: 'desc' },
        take: 10,
      });

      for (const ticket of resolvedTickets) {
        notifications.push({
          id: `resolved-${ticket.id}`,
          type: 'STATUS_CHANGE',
          title: 'Ticket resolved',
          message: `#${ticket.ticketNumber}: ${ticket.subject}${ticket.assignedTo ? ` by ${ticket.assignedTo.name}` : ''}`,
          createdAt: ticket.resolvedAt || ticket.updatedAt,
          ticketId: ticket.id,
        });
      }
    } else {
      // Customer: status changes on their tickets
      const myTickets = await prisma.ticket.findMany({
        where: {
          customerId: userId,
          updatedAt: { gte: since },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });

      for (const ticket of myTickets) {
        notifications.push({
          id: `status-${ticket.id}`,
          type: 'STATUS_CHANGE',
          title: `Ticket ${ticket.status.toLowerCase().replace('_', ' ')}`,
          message: `#${ticket.ticketNumber}: ${ticket.subject}`,
          createdAt: ticket.updatedAt,
          ticketId: ticket.id,
        });
      }
    }

    // Sort by date descending and take top 20
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const topNotifications = notifications.slice(0, 20);

    return NextResponse.json({
      notifications: topNotifications.map((n) => ({ ...n, read: false })),
      unreadCount: topNotifications.length,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
