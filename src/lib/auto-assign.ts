import prisma from './db';

export async function getAvailableAgent() {
  // Get all online agents with their active ticket counts
  const onlineAgents = await prisma.user.findMany({
    where: {
      role: 'AGENT',
      agentStatus: 'ONLINE',
    },
    include: {
      assignedTickets: {
        where: {
          status: {
            in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'],
          },
        },
      },
      chatSessionsAsAgent: {
        where: {
          status: 'ACTIVE',
        },
      },
    },
  });

  if (onlineAgents.length === 0) {
    return null;
  }

  // Sort by workload (tickets + active chats)
  const sortedAgents = onlineAgents.sort((a, b) => {
    const aWorkload = a.assignedTickets.length + a.chatSessionsAsAgent.length;
    const bWorkload = b.assignedTickets.length + b.chatSessionsAsAgent.length;
    return aWorkload - bWorkload;
  });

  // Return the least busy agent
  return sortedAgents[0];
}

export async function autoAssignTicket(ticketId: string) {
  const agent = await getAvailableAgent();

  if (!agent) {
    return null;
  }

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assignedToId: agent.id,
      status: 'ASSIGNED',
      isLocked: true,
    },
    include: {
      assignedTo: true,
      customer: true,
    },
  });

  return ticket;
}

export async function autoAssignChat(chatSessionId: string) {
  const agent = await getAvailableAgent();

  if (!agent) {
    return null;
  }

  const chatSession = await prisma.chatSession.update({
    where: { id: chatSessionId },
    data: {
      agentId: agent.id,
      status: 'ACTIVE',
    },
    include: {
      agent: true,
      customer: true,
    },
  });

  return chatSession;
}

export async function reassignTicket(ticketId: string, newAgentId: string) {
  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assignedToId: newAgentId,
      status: 'ASSIGNED',
      isLocked: true,
    },
    include: {
      assignedTo: true,
      customer: true,
    },
  });

  return ticket;
}
