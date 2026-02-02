'use client';

import { TopBar } from '@/components/dashboard/TopBar';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { TicketList } from '@/components/tickets/TicketList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTickets } from '@/hooks/useTickets';
import { useRouter } from 'next/navigation';
import { Ticket, CheckCircle, Clock, MessageCircle } from 'lucide-react';

export default function AgentDashboard() {
  const router = useRouter();
  const { data: tickets, isLoading } = useTickets({ assignedToMe: 'true' });

  const openTickets = tickets?.filter(
    (t) => ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(t.status)
  ) || [];

  const waitingTickets = tickets?.filter((t) => t.status === 'WAITING') || [];

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Agent Dashboard" />
      <div className="flex-1 p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            title="My Open Tickets"
            value={openTickets.length}
            icon={Ticket}
          />
          <StatsCard
            title="Waiting for Reply"
            value={waitingTickets.length}
            icon={Clock}
          />
          <StatsCard
            title="Resolved Today"
            value={tickets?.filter((t) => t.status === 'RESOLVED').length || 0}
            icon={CheckCircle}
          />
          <StatsCard
            title="Active Chats"
            value={0}
            description="Go online to receive chats"
            icon={MessageCircle}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Open Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketList
                tickets={openTickets.slice(0, 5)}
                isLoading={isLoading}
                onSelect={(ticket) => router.push(`/agent/tickets/${ticket.id}`)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Waiting for Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketList
                tickets={waitingTickets.slice(0, 5)}
                isLoading={isLoading}
                onSelect={(ticket) => router.push(`/agent/tickets/${ticket.id}`)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
