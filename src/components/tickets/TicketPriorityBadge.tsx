'use client';

import { Badge } from '@/components/ui/badge';
import type { TicketPriority } from '@/types';
import { cn } from '@/lib/utils';

interface TicketPriorityBadgeProps {
  priority: TicketPriority;
}

const priorityConfig: Record<TicketPriority, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
  MEDIUM: { label: 'Medium', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  HIGH: { label: 'High', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
  URGENT: { label: 'Urgent', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
};

export function TicketPriorityBadge({ priority }: TicketPriorityBadgeProps) {
  const config = priorityConfig[priority];
  return (
    <Badge variant="outline" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
