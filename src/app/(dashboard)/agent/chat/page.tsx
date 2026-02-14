'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/dashboard/TopBar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChatSessionCard } from '@/components/chat/ChatSessionCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSocket } from '@/hooks/useSocket';
import type { ChatSession, ChatMessage } from '@/types';
import { MessageCircle, Wifi, WifiOff } from 'lucide-react';

export default function AgentChatPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Handle incoming messages via socket
  const handleMessage = useCallback((message: ChatMessage) => {
    // Update messages if it's for the selected session
    if (selectedSession && message.chatSessionId === selectedSession.id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    }
    // Update the last message in session list
    setChatSessions((prev) =>
      prev.map((s) =>
        s.id === message.chatSessionId
          ? { ...s, chatMessages: [message] }
          : s
      )
    );
  }, [selectedSession]);

  // Handle new chat session assigned to this agent
  const handleNewSession = useCallback((newSession: ChatSession) => {
    setChatSessions((prev) => {
      if (prev.some((s) => s.id === newSession.id)) return prev;
      return [newSession, ...prev];
    });
  }, []);

  // Handle chat ended
  const handleChatEnded = useCallback((endedSessionId: string) => {
    setChatSessions((prev) =>
      prev.filter((s) => s.id !== endedSessionId)
    );
    if (selectedSession?.id === endedSessionId) {
      setSelectedSession(null);
      setMessages([]);
    }
  }, [selectedSession]);

  // Initialize socket connection
  const { isConnected, joinChat, leaveChat } = useSocket({
    userId: session?.user?.id,
    onMessage: handleMessage,
    onNewSession: handleNewSession,
    onChatEnded: handleChatEnded,
  });

  // Fetch initial chat sessions
  useEffect(() => {
    fetchChatSessions();
  }, []);

  // Join/leave chat rooms when selected session changes
  useEffect(() => {
    if (selectedSession && isConnected) {
      joinChat(selectedSession.id);
      fetchMessages(selectedSession.id);
    }
    return () => {
      if (selectedSession) {
        leaveChat(selectedSession.id);
      }
    };
  }, [selectedSession?.id, isConnected, joinChat, leaveChat]);

  const fetchChatSessions = async () => {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        const data = await res.json();
        setChatSessions(data.chatSessions);
      }
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.chatSession.chatMessages || []);
        setSelectedSession(data.chatSession);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedSession) return;
    try {
      const res = await fetch(`/api/chat/${selectedSession.id}`, {
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

  const handleConvertToTicket = async () => {
    if (!selectedSession) return;
    try {
      const res = await fetch(`/api/chat/${selectedSession.id}/convert`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/agent/tickets/${data.ticket.id}`);
      }
    } catch (error) {
      console.error('Failed to convert to ticket:', error);
    }
  };

  const handleClaimSession = async () => {
    if (!selectedSession) return;
    try {
      const res = await fetch(`/api/chat/${selectedSession.id}/claim`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        // Update the session in local state
        setSelectedSession(data.chatSession);
        setChatSessions((prev) =>
          prev.map((s) => (s.id === data.chatSession.id ? data.chatSession : s))
        );
        // Re-fetch messages to include the system "took over" message
        fetchMessages(selectedSession.id);
      }
    } catch (error) {
      console.error('Failed to claim session:', error);
    }
  };

  const handleEndChat = async () => {
    if (!selectedSession) return;
    try {
      await fetch(`/api/chat/${selectedSession.id}`, {
        method: 'DELETE',
      });
      // Session will be removed via socket event
      setSelectedSession(null);
      setMessages([]);
      fetchChatSessions();
    } catch (error) {
      console.error('Failed to end chat:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Live Chat">
        <Badge variant={isConnected ? 'default' : 'secondary'} className="gap-1">
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              Connected
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              Disconnected
            </>
          )}
        </Badge>
      </TopBar>
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Sessions List */}
        <div className="w-80 border-r bg-background">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Active Chats</h3>
            <p className="text-sm text-muted-foreground">
              {chatSessions.length} conversation(s)
            </p>
          </div>
          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="p-2 space-y-2">
              {chatSessions.map((chat) => (
                <ChatSessionCard
                  key={chat.id}
                  session={chat}
                  isSelected={selectedSession?.id === chat.id}
                  onClick={() => setSelectedSession(chat)}
                />
              ))}
              {chatSessions.length === 0 && (
                <EmptyState
                  icon={<MessageCircle className="h-8 w-8" />}
                  title="No active chats"
                  description="Go online to receive chats"
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Window */}
        <div className="flex-1">
          {selectedSession ? (
            <ChatWindow
              session={selectedSession}
              messages={messages}
              onSendMessage={handleSendMessage}
              onConvertToTicket={handleConvertToTicket}
              onEndChat={handleEndChat}
              onClaimSession={handleClaimSession}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <EmptyState
                icon={<MessageCircle className="h-12 w-12" />}
                title="Select a chat"
                description="Choose a conversation from the list to start chatting"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
