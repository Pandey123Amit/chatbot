'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, User, UserCircle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocket } from '@/hooks/useSocket';
import type { ChatMessage as DBChatMessage, ChatSession } from '@/types';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'agent' | 'system';
  timestamp: Date;
  isAI?: boolean;
}

interface ChatHistory {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<'ai' | 'human' | 'waiting'>('ai');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [initialQuerySent, setInitialQuerySent] = useState(false);

  // Socket handlers for human agent chat
  const handleSocketMessage = useCallback((message: DBChatMessage) => {
    if (message.chatSessionId === sessionId) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [
          ...prev,
          {
            id: message.id,
            content: message.content,
            sender: message.senderType === 'CUSTOMER' ? 'user' : message.senderType === 'SYSTEM' ? 'system' : 'agent',
            timestamp: new Date(message.createdAt),
          },
        ];
      });
    }
  }, [sessionId]);

  const handleAgentJoined = useCallback((chatSession: ChatSession) => {
    const agent = chatSession.agent;
    if (chatSession.id === sessionId && agent) {
      setAgentName(agent.name);
      setChatMode('human');
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          content: `${agent.name} has joined the chat.`,
          sender: 'system',
          timestamp: new Date(),
        },
      ]);
    }
  }, [sessionId]);

  const { isConnected, joinChat } = useSocket({
    userId: session?.user?.id,
    sessionId: sessionId || undefined,
    onMessage: handleSocketMessage,
    onAgentJoined: handleAgentJoined,
  });

  // Join chat room when sessionId changes
  useEffect(() => {
    if (sessionId && isConnected) {
      joinChat(sessionId);
    }
  }, [sessionId, isConnected, joinChat]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Initial greeting and handle query parameter
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          content: "Hello! I'm GroceryBot, your AI assistant for GroceryMart. I can help you with questions about orders, delivery, payments, and more. How can I assist you today?",
          sender: 'ai',
          timestamp: new Date(),
          isAI: true,
        },
      ]);
    }
  }, []);

  // Handle query parameter for quick questions
  useEffect(() => {
    const query = searchParams.get('q');
    if (query && !initialQuerySent && messages.length > 0) {
      setInitialQuerySent(true);
      // Add user message and send to AI
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content: query,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      sendToAI(query);
    }
  }, [searchParams, messages.length, initialQuerySent]);

  // Send message to AI
  const sendToAI = async (content: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          sessionId,
          chatHistory,
        }),
      });

      const data = await res.json();

      // Add AI response
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        content: data.response,
        sender: 'ai',
        timestamp: new Date(),
        isAI: true,
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Update chat history for context
      setChatHistory((prev) => [
        ...prev,
        { role: 'user', content },
        { role: 'assistant', content: data.response },
      ]);

      // Handle escalation
      if (data.shouldEscalate) {
        handleEscalation(data.escalationReason);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content: "I'm having trouble right now. Let me connect you with a human agent.",
          sender: 'ai',
          timestamp: new Date(),
          isAI: true,
        },
      ]);
      handleEscalation('AI error');
    } finally {
      setIsLoading(false);
    }
  };

  // Send message to human agent
  const sendToAgent = async (content: string) => {
    if (!sessionId) return;
    try {
      await fetch(`/api/chat/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
    } catch (error) {
      console.error('Failed to send message to agent:', error);
    }
  };

  // Handle escalation to human agent
  const handleEscalation = async (reason?: string) => {
    setChatMode('waiting');
    setMessages((prev) => [
      ...prev,
      {
        id: `system-${Date.now()}`,
        content: 'Connecting you with a human agent. Please wait...',
        sender: 'system',
        timestamp: new Date(),
      },
    ]);

    try {
      // Create chat session for human agent
      const res = await fetch('/api/chat', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.chatSession.id);
        if (data.chatSession.agent) {
          setAgentName(data.chatSession.agent.name);
          setChatMode('human');
        }
      }
    } catch (error) {
      console.error('Failed to connect to agent:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content: 'Sorry, no agents are available right now. Please try again later or email support@groceryapp.com',
          sender: 'system',
          timestamp: new Date(),
        },
      ]);
      setChatMode('ai');
    }
  };

  // Handle send message
  const handleSend = () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    if (chatMode === 'ai') {
      sendToAI(inputMessage);
    } else if (chatMode === 'human') {
      sendToAgent(inputMessage);
    }

    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Manual escalation to human
  const requestHumanAgent = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        content: 'I would like to speak to a human agent',
        sender: 'user',
        timestamp: new Date(),
      },
      {
        id: `ai-${Date.now()}`,
        content: "Of course! I'll connect you with a human agent right away.",
        sender: 'ai',
        timestamp: new Date(),
        isAI: true,
      },
    ]);
    handleEscalation('Customer requested human agent');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            GroceryMart Support
          </h1>
          <p className="text-muted-foreground">
            {chatMode === 'ai' && "Chat with our AI assistant - I'm here to help 24/7"}
            {chatMode === 'waiting' && 'Connecting you with a human agent...'}
            {chatMode === 'human' && `Chatting with ${agentName || 'Agent'}`}
          </p>
          {isConnected && chatMode !== 'ai' && (
            <p className="text-sm text-green-600 mt-1">Connected</p>
          )}
        </div>

        {/* Chat Card */}
        <Card className="shadow-lg">
          <CardHeader className="bg-green-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              {chatMode === 'ai' ? (
                <>
                  <Bot className="h-5 w-5" />
                  GroceryBot
                </>
              ) : chatMode === 'waiting' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <UserCircle className="h-5 w-5" />
                  {agentName || 'Agent'}
                </>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {/* Messages */}
            <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.sender !== 'user' && msg.sender !== 'system' && (
                      <div className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                        msg.sender === 'ai' ? 'bg-green-100' : 'bg-blue-100'
                      )}>
                        {msg.sender === 'ai' ? (
                          <Bot className="h-4 w-4 text-green-600" />
                        ) : (
                          <UserCircle className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    )}

                    <div
                      className={cn(
                        'max-w-[75%] rounded-lg px-4 py-2',
                        msg.sender === 'user'
                          ? 'bg-green-600 text-white'
                          : msg.sender === 'system'
                          ? 'bg-gray-100 text-gray-600 text-center text-sm w-full max-w-full'
                          : 'bg-gray-100 text-gray-900'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={cn(
                        'text-xs mt-1',
                        msg.sender === 'user' ? 'text-green-100' : 'text-gray-400'
                      )}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {msg.sender === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t">
              {chatMode === 'ai' && (
                <div className="mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={requestHumanAgent}
                  >
                    <UserCircle className="h-3 w-3 mr-1" />
                    Talk to a human agent
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  placeholder={
                    chatMode === 'waiting'
                      ? 'Waiting for agent...'
                      : 'Type your message...'
                  }
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || chatMode === 'waiting'}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputMessage.trim() || isLoading || chatMode === 'waiting'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {chatMode === 'ai' && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Track my order',
                'Delivery time',
                'Refund policy',
                'Cancel order',
              ].map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setInputMessage(question);
                  }}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
