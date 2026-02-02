'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/dashboard/TopBar';
import { TicketList } from '@/components/tickets/TicketList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTickets } from '@/hooks/useTickets';

export default function AgentTicketsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');

  const { data: allTickets, isLoading } = useTickets({ assignedToMe: 'true' });

  const openTickets = allTickets?.filter(
    (t) => ['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(t.status)
  ) || [];

  const waitingTickets = allTickets?.filter((t) => t.status === 'WAITING') || [];

  const resolvedTickets = allTickets?.filter(
    (t) => ['RESOLVED', 'CLOSED'].includes(t.status)
  ) || [];

  return (
    <div className="flex flex-col h-full">
      <TopBar title="My Tickets" showSearch />
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              All ({allTickets?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="open">
              Open ({openTickets.length})
            </TabsTrigger>
            <TabsTrigger value="waiting">
              Waiting ({waitingTickets.length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved ({resolvedTickets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <TicketList
              tickets={allTickets || []}
              isLoading={isLoading}
              onSelect={(ticket) => router.push(`/agent/tickets/${ticket.id}`)}
            />
          </TabsContent>

          <TabsContent value="open" className="mt-6">
            <TicketList
              tickets={openTickets}
              isLoading={isLoading}
              onSelect={(ticket) => router.push(`/agent/tickets/${ticket.id}`)}
            />
          </TabsContent>

          <TabsContent value="waiting" className="mt-6">
            <TicketList
              tickets={waitingTickets}
              isLoading={isLoading}
              onSelect={(ticket) => router.push(`/agent/tickets/${ticket.id}`)}
            />
          </TabsContent>

          <TabsContent value="resolved" className="mt-6">
            <TicketList
              tickets={resolvedTickets}
              isLoading={isLoading}
              onSelect={(ticket) => router.push(`/agent/tickets/${ticket.id}`)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
