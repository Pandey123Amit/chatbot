import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from './db';

interface ConnectedUser {
  socketId: string;
  userId: string;
  role?: string;
}

const connectedUsers = new Map<string, ConnectedUser>();
const userSockets = new Map<string, Set<string>>();

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.query.userId as string;

    if (userId) {
      // Track connected user
      connectedUsers.set(socket.id, { socketId: socket.id, userId });

      // Track multiple sockets per user
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(socket.id);

      console.log(`User ${userId} connected with socket ${socket.id}`);
    }

    // Join a chat room
    socket.on('chat:join', async ({ sessionId }: { sessionId: string }) => {
      socket.join(`chat:${sessionId}`);
      console.log(`Socket ${socket.id} joined chat:${sessionId}`);
    });

    // Leave a chat room
    socket.on('chat:leave', ({ sessionId }: { sessionId: string }) => {
      socket.leave(`chat:${sessionId}`);
      console.log(`Socket ${socket.id} left chat:${sessionId}`);
    });

    // Handle sending messages
    socket.on('chat:send-message', async ({
      sessionId,
      content,
      senderType,
    }: {
      sessionId: string;
      content: string;
      senderType: 'CUSTOMER' | 'AGENT' | 'SYSTEM';
    }) => {
      try {
        // Get the chat session to determine sender ID
        const chatSession = await prisma.chatSession.findUnique({
          where: { id: sessionId },
        });

        if (!chatSession) {
          socket.emit('error', { message: 'Chat session not found' });
          return;
        }

        // Determine sender ID based on type
        let senderId: string | null = null;
        if (senderType === 'CUSTOMER') {
          senderId = chatSession.customerId;
        } else if (senderType === 'AGENT' && chatSession.agentId) {
          senderId = chatSession.agentId;
        }

        // Create the message in database
        const message = await prisma.chatMessage.create({
          data: {
            content,
            senderType,
            senderId,
            chatSessionId: sessionId,
          },
        });

        // Broadcast to all in the chat room
        io.to(`chat:${sessionId}`).emit('chat:new-message', message);

        // Also emit to specific users who might not be in the room
        if (chatSession.customerId) {
          emitToUser(io, chatSession.customerId, 'chat:new-message', message);
        }
        if (chatSession.agentId) {
          emitToUser(io, chatSession.agentId, 'chat:new-message', message);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('chat:typing', ({
      sessionId,
      isTyping,
      senderType,
    }: {
      sessionId: string;
      isTyping: boolean;
      senderType: 'CUSTOMER' | 'AGENT';
    }) => {
      socket.to(`chat:${sessionId}`).emit('chat:typing', {
        sessionId,
        isTyping,
        senderType,
      });
    });

    // Agent goes online
    socket.on('agent:go-online', async () => {
      if (!userId) return;

      try {
        await prisma.user.update({
          where: { id: userId },
          data: { agentStatus: 'ONLINE' },
        });

        io.emit('agent:status-changed', { agentId: userId, status: 'ONLINE' });
      } catch (error) {
        console.error('Error updating agent status:', error);
      }
    });

    // Agent goes offline
    socket.on('agent:go-offline', async () => {
      if (!userId) return;

      try {
        await prisma.user.update({
          where: { id: userId },
          data: { agentStatus: 'OFFLINE' },
        });

        io.emit('agent:status-changed', { agentId: userId, status: 'OFFLINE' });
      } catch (error) {
        console.error('Error updating agent status:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Socket ${socket.id} disconnected`);

      const user = connectedUsers.get(socket.id);
      if (user) {
        connectedUsers.delete(socket.id);

        const userSocketSet = userSockets.get(user.userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            userSockets.delete(user.userId);
          }
        }
      }
    });
  });
}

// Helper function to emit to a specific user (across all their sockets)
function emitToUser(io: SocketIOServer, userId: string, event: string, data: any) {
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
  }
}

// Export helper functions for use in API routes
export function getIO(): SocketIOServer | null {
  return (global as any).io || null;
}

export function emitChatMessage(sessionId: string, message: any) {
  const io = getIO();
  if (io) {
    io.to(`chat:${sessionId}`).emit('chat:new-message', message);
  }
}

export function emitChatSessionUpdate(sessionId: string, session: any) {
  const io = getIO();
  if (io) {
    io.to(`chat:${sessionId}`).emit('chat:session-updated', session);
  }
}

export function emitAgentJoined(sessionId: string, session: any) {
  const io = getIO();
  if (io) {
    io.to(`chat:${sessionId}`).emit('chat:agent-joined', session);
  }
}

export function emitChatEnded(sessionId: string) {
  const io = getIO();
  if (io) {
    io.to(`chat:${sessionId}`).emit('chat:ended', { sessionId });
  }
}

export function emitNewChatSession(agentId: string, session: any) {
  const io = getIO();
  if (io) {
    const sockets = userSockets.get(agentId);
    if (sockets) {
      sockets.forEach((socketId) => {
        io.to(socketId).emit('chat:new-session', session);
      });
    }
  }
}

export function emitTicketUpdate(ticketId: string, ticket: any) {
  const io = getIO();
  if (io) {
    io.emit('ticket:updated', { ticketId, ticket });
  }
}

export function emitTicketAssigned(agentId: string, ticket: any) {
  const io = getIO();
  if (io) {
    const sockets = userSockets.get(agentId);
    if (sockets) {
      sockets.forEach((socketId) => {
        io.to(socketId).emit('ticket:assigned', ticket);
      });
    }
  }
}
