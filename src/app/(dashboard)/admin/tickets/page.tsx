'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/dashboard/TopBar';
import { TicketList } from '@/components/tickets/TicketList';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTickets } from '@/hooks/useTickets';

export default function AdminTicketsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(query);
    }, 300);
  }, []);

  const filters: Record<string, string> = {};
  if (statusFilter !== 'all') filters.status = statusFilter;
  if (channelFilter !== 'all') filters.channel = channelFilter;
  if (searchQuery) filters.search = searchQuery;

  const { data: tickets, isLoading } = useTickets(
    Object.keys(filters).length > 0 ? filters : undefined
  );

  return (
    <div className="flex flex-col h-full">
      <TopBar title="All Tickets" showSearch onSearch={handleSearch} />
      <div className="flex-1 p-6">
        <div className="flex items-center gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="ASSIGNED">Assigned</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="WAITING">Waiting</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="CHAT">Chat</SelectItem>
              <SelectItem value="EMAIL">Email</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TicketList
          tickets={tickets || []}
          isLoading={isLoading}
          onSelect={(ticket) => router.push(`/admin/tickets/${ticket.id}`)}
        />
      </div>
    </div>
  );
}
