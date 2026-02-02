'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import { ChannelIcon } from '@/components/shared/ChannelIcon';
import type { Ticket } from '@/types';
import { User, Calendar, Lock, Unlock } from 'lucide-react';

interface TicketInfoPanelProps {
  ticket: Ticket;
}

export function TicketInfoPanel({ ticket }: TicketInfoPanelProps) {
  const customerInitials = ticket.customer?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const agentInitials = ticket.assignedTo?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ticket Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <TicketStatusBadge status={ticket.status} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Priority</span>
          <TicketPriorityBadge priority={ticket.priority} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Channel</span>
          <div className="flex items-center gap-1">
            <ChannelIcon channel={ticket.channel} className="h-4 w-4" />
            <span className="text-sm">{ticket.channel}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Lock Status</span>
          <div className="flex items-center gap-1">
            {ticket.isLocked ? (
              <>
                <Lock className="h-4 w-4 text-orange-500" />
                <span className="text-sm">Locked</span>
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 text-green-500" />
                <span className="text-sm">Unlocked</span>
              </>
            )}
          </div>
        </div>

        <Separator />

        <div>
          <span className="text-sm text-muted-foreground">Customer</span>
          <div className="flex items-center gap-2 mt-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{customerInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{ticket.customer?.name}</p>
              <p className="text-xs text-muted-foreground">{ticket.customer?.email}</p>
            </div>
          </div>
        </div>

        <div>
          <span className="text-sm text-muted-foreground">Assigned To</span>
          {ticket.assignedTo ? (
            <div className="flex items-center gap-2 mt-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{agentInitials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{ticket.assignedTo.name}</p>
                <p className="text-xs text-muted-foreground">{ticket.assignedTo.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">Unassigned</p>
          )}
        </div>

        <Separator />

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Created {format(new Date(ticket.createdAt), 'PPp')}</span>
        </div>

        {ticket.resolvedAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Resolved {format(new Date(ticket.resolvedAt), 'PPp')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
