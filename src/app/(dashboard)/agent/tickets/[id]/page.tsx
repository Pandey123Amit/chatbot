'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { TopBar } from '@/components/dashboard/TopBar';
import { TicketConversation } from '@/components/tickets/TicketConversation';
import { TicketInfoPanel } from '@/components/tickets/TicketInfoPanel';
import { TicketActions } from '@/components/tickets/TicketActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/shared/LoadingSpinner';
import { useTicket, useUpdateTicket } from '@/hooks/useTickets';
import type { TicketStatus, Message } from '@/types';
import { ArrowLeft } from 'lucide-react';

export default function AgentTicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const ticketId = params.id as string;

  const { data: ticket, isLoading } = useTicket(ticketId);
  const updateTicket = useUpdateTicket();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (ticket?.messages) {
      setMessages(ticket.messages);
    }
  }, [ticket]);

  const canEdit =
    ticket?.assignedToId === session?.user?.id || !ticket?.isLocked;

  const handleSendMessage = async (content: string, isInternal: boolean) => {
    setIsSending(true);
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
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (status: TicketStatus) => {
    try {
      await updateTicket.mutateAsync({ id: ticketId, status });
    } catch (error) {
      console.error('Failed to update status:', error);
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
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{ticket.subject}</CardTitle>
                {ticket.description && (
                  <p className="text-sm text-muted-foreground">
                    {ticket.description}
                  </p>
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
              canEdit={canEdit}
              onSendMessage={handleSendMessage}
              onStatusChange={handleStatusChange}
              isSending={isSending}
            />
          </div>

          <div>
            <TicketInfoPanel ticket={ticket} />
          </div>
        </div>
      </div>
    </div>
  );
}
