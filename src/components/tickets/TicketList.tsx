'use client';

import { TicketCard } from './TicketCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { Ticket } from '@/types';
import { Ticket as TicketIcon } from 'lucide-react';

interface TicketListProps {
  tickets: Ticket[];
  isLoading?: boolean;
  selectedId?: string;
  onSelect?: (ticket: Ticket) => void;
}

export function TicketList({ tickets, isLoading, selectedId, onSelect }: TicketListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={<TicketIcon className="h-12 w-12" />}
        title="No tickets found"
        description="Tickets will appear here when created"
      />
    );
  }

  return (
    <div className="space-y-2">
      {tickets.map((ticket) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          isSelected={ticket.id === selectedId}
          onClick={() => onSelect?.(ticket)}
        />
      ))}
    </div>
  );
}
