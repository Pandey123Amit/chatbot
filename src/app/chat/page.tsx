'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { useSocket } from '@/hooks/useSocket';
import type { ChatMessage, ChatSession } from '@/types';

export default function CustomerChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [agentName, setAgentName] = useState<string | undefined>();
  const [chatEnded, setChatEnded] = useState(false);

  // Handle incoming messages via socket
  const handleMessage = useCallback((message: ChatMessage) => {
    if (message.chatSessionId === sessionId) {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    }
  }, [sessionId]);

  // Handle agent joined event
  const handleAgentJoined = useCallback((chatSession: ChatSession) => {
    if (chatSession.id === sessionId && chatSession.agent) {
      setAgentName(chatSession.agent.name);
    }
  }, [sessionId]);

  // Handle chat ended event
  const handleChatEnded = useCallback((endedSessionId: string) => {
    if (endedSessionId === sessionId) {
      setChatEnded(true);
    }
  }, [sessionId]);

  // Initialize socket connection
  const { isConnected, joinChat } = useSocket({
    userId: session?.user?.id,
    sessionId: sessionId || undefined,
    onMessage: handleMessage,
    onAgentJoined: handleAgentJoined,
    onChatEnded: handleChatEnded,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Join chat room when sessionId changes
  useEffect(() => {
    if (sessionId && isConnected) {
      joinChat(sessionId);
    }
  }, [sessionId, isConnected, joinChat]);

  // Fetch initial messages when session is created
  const fetchMessages = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/chat/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.chatSession.chatMessages || []);
        if (data.chatSession.agent) {
          setAgentName(data.chatSession.agent.name);
        }
        if (data.chatSession.status === 'ENDED' || data.chatSession.status === 'CONVERTED') {
          setChatEnded(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleStartChat = async () => {
    setIsConnecting(true);
    setChatEnded(false);
    try {
      const res = await fetch('/api/chat', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.chatSession.id);
        if (data.chatSession.agent) {
          setAgentName(data.chatSession.agent.name);
        }
        // Fetch initial messages
        setTimeout(fetchMessages, 500);
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!sessionId || chatEnded) return;
    try {
      const res = await fetch(`/api/chat/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        console.error('Failed to send message');
      }
      // Message will be added via socket event
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (status === 'loading') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Customer Support</h1>
          <p className="text-muted-foreground">
            Need help? Start a chat with our support team.
          </p>
          {isConnected && (
            <p className="text-sm text-green-600 mt-2">Connected to support</p>
          )}
        </div>
      </div>

      <ChatWidget
        sessionId={sessionId || undefined}
        messages={messages}
        onSendMessage={handleSendMessage}
        onStartChat={handleStartChat}
        isConnecting={isConnecting}
        agentName={agentName}
        disabled={chatEnded}
      />
    </div>
  );
}
