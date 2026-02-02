'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useChatStore } from '@/store/chatStore';
import type { ChatMessage, ChatSession } from '@/types';

interface UseSocketOptions {
  userId?: string;
  sessionId?: string;
  onMessage?: (message: ChatMessage) => void;
  onAgentJoined?: (session: ChatSession) => void;
  onChatEnded?: (sessionId: string) => void;
  onNewSession?: (session: ChatSession) => void;
  onTyping?: (data: { sessionId: string; isTyping: boolean; senderType: string }) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const {
    userId,
    sessionId,
    onMessage,
    onAgentJoined,
    onChatEnded,
    onNewSession,
    onTyping,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { setConnected, addMessage, addSession, updateSession } = useChatStore();

  useEffect(() => {
    if (!userId) return;

    const socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      path: '/socket.io',
      query: { userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      setConnected(true);

      // Auto-join session room if sessionId is provided
      if (sessionId) {
        socket.emit('chat:join', { sessionId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      setConnected(false);
    });

    socket.on('chat:new-message', (message: ChatMessage) => {
      addMessage(message);
      onMessage?.(message);
    });

    socket.on('chat:agent-joined', (session: ChatSession) => {
      updateSession(session.id, session);
      onAgentJoined?.(session);
    });

    socket.on('chat:ended', ({ sessionId: endedSessionId }: { sessionId: string }) => {
      updateSession(endedSessionId, { status: 'ENDED' });
      onChatEnded?.(endedSessionId);
    });

    socket.on('chat:new-session', (session: ChatSession) => {
      addSession(session);
      onNewSession?.(session);
    });

    socket.on('chat:typing', (data: { sessionId: string; isTyping: boolean; senderType: string }) => {
      onTyping?.(data);
    });

    socket.on('chat:session-updated', (session: ChatSession) => {
      updateSession(session.id, session);
    });

    return () => {
      if (sessionId) {
        socket.emit('chat:leave', { sessionId });
      }
      socket.disconnect();
    };
  }, [userId, sessionId, setConnected, addMessage, addSession, updateSession, onMessage, onAgentJoined, onChatEnded, onNewSession, onTyping]);

  // Join a chat room
  const joinChat = useCallback((chatSessionId: string) => {
    socketRef.current?.emit('chat:join', { sessionId: chatSessionId });
  }, []);

  // Leave a chat room
  const leaveChat = useCallback((chatSessionId: string) => {
    socketRef.current?.emit('chat:leave', { sessionId: chatSessionId });
  }, []);

  // Send a message via socket
  const sendMessage = useCallback((chatSessionId: string, content: string, senderType: 'CUSTOMER' | 'AGENT') => {
    socketRef.current?.emit('chat:send-message', {
      sessionId: chatSessionId,
      content,
      senderType,
    });
  }, []);

  // Set typing indicator
  const setTyping = useCallback((chatSessionId: string, isTyping: boolean, senderType: 'CUSTOMER' | 'AGENT') => {
    socketRef.current?.emit('chat:typing', {
      sessionId: chatSessionId,
      isTyping,
      senderType,
    });
  }, []);

  // Agent status management
  const goOnline = useCallback(() => {
    socketRef.current?.emit('agent:go-online');
  }, []);

  const goOffline = useCallback(() => {
    socketRef.current?.emit('agent:go-offline');
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    joinChat,
    leaveChat,
    sendMessage,
    setTyping,
    goOnline,
    goOffline,
  };
}
