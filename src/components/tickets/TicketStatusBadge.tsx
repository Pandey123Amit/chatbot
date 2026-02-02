'use client';

import { Badge } from '@/components/ui/badge';
import type { TicketStatus } from '@/types';

interface TicketStatusBadgeProps {
  status: TicketStatus;
}

const statusConfig: Record<TicketStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  OPEN: { label: 'Open', variant: 'destructive' },
  ASSIGNED: { label: 'Assigned', variant: 'default' },
  IN_PROGRESS: { label: 'In Progress', variant: 'default' },
  WAITING: { label: 'Waiting', variant: 'secondary' },
  RESOLVED: { label: 'Resolved', variant: 'outline' },
  CLOSED: { label: 'Closed', variant: 'outline' },
};

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
