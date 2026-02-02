'use client';

import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Message } from '@/types';
import { cn } from '@/lib/utils';

interface TicketConversationProps {
  messages: Message[];
  currentUserId?: string;
}

export function TicketConversation({ messages, currentUserId }: TicketConversationProps) {
  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {messages.map((message) => {
          const isOwn = message.senderId === currentUserId;
          const initials = message.sender?.name
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase() || '?';

          return (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                isOwn && 'flex-row-reverse'
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  'flex flex-col max-w-[70%]',
                  isOwn && 'items-end'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {message.sender?.name || 'Unknown'}
                  </span>
                  {message.isInternal && (
                    <Badge variant="outline" className="text-xs">
                      Internal Note
                    </Badge>
                  )}
                </div>
                <div
                  className={cn(
                    'rounded-lg p-3',
                    isOwn
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted',
                    message.isInternal && 'bg-yellow-50 border border-yellow-200'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
