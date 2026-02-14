'use client';

import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { ChatSession } from '@/types';
import { cn } from '@/lib/utils';

interface ChatSessionCardProps {
  session: ChatSession;
  isSelected?: boolean;
  onClick?: () => void;
  unreadCount?: number;
}

export function ChatSessionCard({
  session,
  isSelected,
  onClick,
  unreadCount = 0,
}: ChatSessionCardProps) {
  const initials = session.customer?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const lastMessage = session.chatMessages?.[session.chatMessages.length - 1];

  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors hover:bg-accent',
        isSelected && 'border-primary bg-accent'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {session.status === 'ACTIVE' && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            )}
            {session.status === 'AI_ACTIVE' && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-blue-500 border-2 border-background" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <h4 className="font-medium truncate">{session.customer?.name}</h4>
                {session.isAISession && (
                  <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 h-4 border-blue-300 text-blue-600">
                    AI
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center">
                  {unreadCount}
                </Badge>
              )}
            </div>
            {lastMessage && (
              <p className="text-sm text-muted-foreground truncate">
                {lastMessage.content}
              </p>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
