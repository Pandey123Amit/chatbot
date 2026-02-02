'use client';

import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import { ChannelIcon } from '@/components/shared/ChannelIcon';
import type { Ticket } from '@/types';
import { cn } from '@/lib/utils';

interface TicketCardProps {
  ticket: Ticket;
  isSelected?: boolean;
  onClick?: () => void;
}

export function TicketCard({ ticket, isSelected, onClick }: TicketCardProps) {
  const initials = ticket.customer?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors hover:bg-accent',
        isSelected && 'border-primary bg-accent'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                #{ticket.ticketNumber}
              </span>
              <ChannelIcon channel={ticket.channel} className="h-3 w-3 text-muted-foreground" />
            </div>
            <h4 className="font-medium truncate">{ticket.subject}</h4>
            <p className="text-sm text-muted-foreground truncate">
              {ticket.customer?.name || 'Unknown'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        {ticket.isLocked && ticket.assignedTo && (
          <div className="mt-2 text-xs text-muted-foreground">
            Assigned to {ticket.assignedTo.name}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
