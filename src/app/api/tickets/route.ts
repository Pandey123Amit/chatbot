import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { createTicketSchema } from '@/lib/validators';
import { autoAssignTicket } from '@/lib/auto-assign';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const channel = searchParams.get('channel');
    const assignedToMe = searchParams.get('assignedToMe');
    const search = searchParams.get('search');

    const where: any = {};

    // Role-based filtering
    if (session.user.role === 'AGENT') {
      if (assignedToMe === 'true') {
        where.assignedToId = session.user.id;
      }
    } else if (session.user.role === 'CUSTOMER') {
      where.customerId = session.user.id;
    }

    if (status) {
      where.status = status;
    }

    if (channel) {
      where.channel = channel;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createTicketSchema.parse(body);

    // Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        subject: validatedData.subject,
        description: validatedData.description,
        priority: validatedData.priority || 'MEDIUM',
        channel: validatedData.channel,
        customerId: validatedData.customerId || session.user.id,
        status: 'OPEN',
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Auto-assign if agents are available
    const assignedTicket = await autoAssignTicket(ticket.id);

    return NextResponse.json({
      ticket: assignedTicket || ticket
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}
