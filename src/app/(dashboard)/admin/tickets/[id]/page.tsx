'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TopBar } from '@/components/dashboard/TopBar';
import { TicketConversation } from '@/components/tickets/TicketConversation';
import { TicketInfoPanel } from '@/components/tickets/TicketInfoPanel';
import { TicketActions } from '@/components/tickets/TicketActions';
import { ReassignModal } from '@/components/admin/ReassignModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/shared/LoadingSpinner';
import { useTicket, useUpdateTicket, useReassignTicket } from '@/hooks/useTickets';
import { useSession } from 'next-auth/react';
import type { User, TicketStatus, Message } from '@/types';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function AdminTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const ticketId = params.id as string;

  const { data: ticket, isLoading } = useTicket(ticketId);
  const updateTicket = useUpdateTicket();
  const reassignTicket = useReassignTicket();

  const [agents, setAgents] = useState<User[]>([]);
  const [showReassign, setShowReassign] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (ticket?.messages) {
      setMessages(ticket.messages);
    }
  }, [ticket]);

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/agents');
        if (res.ok) {
          const data = await res.json();
          setAgents(data.agents);
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    }
    fetchAgents();
  }, []);

  const handleSendMessage = async (content: string, isInternal: boolean) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, isInternal }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleStatusChange = async (status: TicketStatus) => {
    try {
      await updateTicket.mutateAsync({ id: ticketId, status });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleReassign = async (ticketId: string, agentId: string) => {
    try {
      await reassignTicket.mutateAsync({ ticketId, agentId });
      setShowReassign(false);
    } catch (error) {
      console.error('Failed to reassign:', error);
    }
  };

  if (isLoading || !ticket) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title={`Ticket #${ticket.ticketNumber}`} />
      <div className="flex-1 p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button variant="outline" onClick={() => setShowReassign(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Reassign
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{ticket.subject}</CardTitle>
                {ticket.description && (
                  <p className="text-sm text-muted-foreground">{ticket.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <TicketConversation
                  messages={messages}
                  currentUserId={session?.user?.id}
                />
              </CardContent>
            </Card>

            <TicketActions
              ticket={ticket}
              canEdit={true}
              onSendMessage={handleSendMessage}
              onStatusChange={handleStatusChange}
            />
          </div>

          <div>
            <TicketInfoPanel ticket={ticket} />
          </div>
        </div>
      </div>

      <ReassignModal
        open={showReassign}
        onClose={() => setShowReassign(false)}
        ticket={ticket}
        agents={agents}
        onReassign={handleReassign}
        isLoading={reassignTicket.isPending}
      />
    </div>
  );
}
