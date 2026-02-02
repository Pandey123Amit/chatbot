'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import type { ChatSession, ChatMessage } from '@/types';
import { Send, Ticket, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  session: ChatSession;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onConvertToTicket: () => void;
  onEndChat: () => void;
}

export function ChatWindow({
  session,
  messages,
  onSendMessage,
  onConvertToTicket,
  onEndChat,
}: ChatWindowProps) {
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

  const customerInitials = session.customer?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{customerInitials}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base">{session.customer?.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{session.customer?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={session.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {session.status}
          </Badge>
          <Button variant="outline" size="sm" onClick={onConvertToTicket}>
            <Ticket className="h-4 w-4 mr-1" />
            Convert to Ticket
          </Button>
          <Button variant="ghost" size="sm" onClick={onEndChat}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => {
            const isAgent = msg.senderType === 'AGENT';
            const isSystem = msg.senderType === 'SYSTEM';

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn('flex gap-3', isAgent && 'flex-row-reverse')}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {isAgent ? 'AG' : customerInitials}
                  </AvatarFallback>
                </Avatar>
                <div className={cn('flex flex-col max-w-[70%]', isAgent && 'items-end')}>
                  <div
                    className={cn(
                      'rounded-lg px-3 py-2',
                      isAgent ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <CardContent className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={2}
            className="resize-none"
          />
          <Button onClick={handleSend} disabled={!message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
