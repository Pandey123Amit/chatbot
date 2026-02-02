'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Ticket, CreateTicketInput, UpdateTicketInput } from '@/types';

async function fetchTickets(filters?: Record<string, string>): Promise<Ticket[]> {
  const params = new URLSearchParams(filters);
  const res = await fetch(`/api/tickets?${params}`);
  if (!res.ok) throw new Error('Failed to fetch tickets');
  const data = await res.json();
  return data.tickets;
}

async function fetchTicket(id: string): Promise<Ticket> {
  const res = await fetch(`/api/tickets/${id}`);
  if (!res.ok) throw new Error('Failed to fetch ticket');
  const data = await res.json();
  return data.ticket;
}

async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const res = await fetch('/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to create ticket');
  const data = await res.json();
  return data.ticket;
}

async function updateTicket({ id, ...input }: UpdateTicketInput & { id: string }): Promise<Ticket> {
  const res = await fetch(`/api/tickets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Failed to update ticket');
  const data = await res.json();
  return data.ticket;
}

async function reassignTicket({ ticketId, agentId }: { ticketId: string; agentId: string }): Promise<Ticket> {
  const res = await fetch(`/api/tickets/${ticketId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId }),
  });
  if (!res.ok) throw new Error('Failed to reassign ticket');
  const data = await res.json();
  return data.ticket;
}

export function useTickets(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => fetchTickets(filters),
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id),
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTicket,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', data.id] });
    },
  });
}

export function useReassignTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reassignTicket,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', data.id] });
    },
  });
}
