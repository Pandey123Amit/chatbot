'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, X, Minimize2 } from 'lucide-react';
import type { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';

interface ChatWidgetProps {
  sessionId?: string;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onStartChat: () => void;
  isConnecting?: boolean;
  agentName?: string;
  disabled?: boolean;
}

export function ChatWidget({
  sessionId,
  messages,
  onSendMessage,
  onStartChat,
  isConnecting,
  agentName,
  disabled,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    onSendMessage(message);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between p-4 bg-primary text-primary-foreground rounded-t-lg">
        <CardTitle className="text-base">
          {agentName ? `Chat with ${agentName}` : 'Support Chat'}
        </CardTitle>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:text-primary-foreground/80"
            onClick={() => setIsOpen(false)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!sessionId ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Start a conversation with our support team
            </p>
            <Button onClick={onStartChat} disabled={isConnecting}>
              {isConnecting ? 'Connecting...' : 'Start Chat'}
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="h-80 p-4" ref={scrollRef}>
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex',
                      msg.senderType === 'CUSTOMER' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                        msg.senderType === 'CUSTOMER'
                          ? 'bg-primary text-primary-foreground'
                          : msg.senderType === 'SYSTEM'
                          ? 'bg-muted text-muted-foreground text-center w-full'
                          : 'bg-muted'
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 border-t">
              {disabled ? (
                <p className="text-sm text-muted-foreground text-center">
                  This chat has ended.
                </p>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={disabled}
                  />
                  <Button size="icon" onClick={handleSend} disabled={!message.trim() || disabled}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
