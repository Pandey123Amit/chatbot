import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { reassignTicketSchema } from '@/lib/validators';
import { reassignTicket } from '@/lib/auto-assign';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can reassign tickets
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { agentId } = reassignTicketSchema.parse(body);

    // Check if agent exists
    const agent = await prisma.user.findUnique({
      where: { id: agentId, role: 'AGENT' },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const ticket = await reassignTicket(id, agentId);

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error reassigning ticket:', error);
    return NextResponse.json(
      { error: 'Failed to reassign ticket' },
      { status: 500 }
    );
  }
}
