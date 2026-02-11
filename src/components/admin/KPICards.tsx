'use client';

import { StatsCard } from '@/components/dashboard/StatsCard';
import { Ticket, CheckCircle, Clock, Users } from 'lucide-react';
import type { DashboardStats } from '@/types';

interface KPICardsProps {
  stats: DashboardStats;
}

export function KPICards({ stats }: KPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Open Tickets"
        value={stats.openTickets}
        description={`${stats.inProgressTickets} in progress`}
        icon={Ticket}
      />
      <StatsCard
        title="Resolved Today"
        value={stats.resolvedTickets}
        description="Tickets closed today"
        icon={CheckCircle}
      />
      <StatsCard
        title="Avg Response Time"
        value={`${stats.avgResponseTime}m`}
        description="First response time"
        icon={Clock}
      />
      <StatsCard
        title="Agents Online"
        value={`${stats.onlineAgents}/${stats.totalAgents}`}
        description="Available for chat"
        icon={Users}
      />
    </div>
  );
}
