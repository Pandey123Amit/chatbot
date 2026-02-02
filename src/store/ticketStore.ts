import { create } from 'zustand';
import type { Ticket, TicketStatus } from '@/types';

interface TicketFilters {
  status?: TicketStatus;
  priority?: string;
  channel?: string;
  search?: string;
}

interface TicketStore {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  filters: TicketFilters;
  isLoading: boolean;
  setTickets: (tickets: Ticket[]) => void;
  addTicket: (ticket: Ticket) => void;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  removeTicket: (id: string) => void;
  setSelectedTicket: (ticket: Ticket | null) => void;
  setFilters: (filters: TicketFilters) => void;
  setLoading: (loading: boolean) => void;
}

export const useTicketStore = create<TicketStore>((set) => ({
  tickets: [],
  selectedTicket: null,
  filters: {},
  isLoading: false,
  setTickets: (tickets) => set({ tickets }),
  addTicket: (ticket) =>
    set((state) => ({ tickets: [ticket, ...state.tickets] })),
  updateTicket: (id, updates) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
      selectedTicket:
        state.selectedTicket?.id === id
          ? { ...state.selectedTicket, ...updates }
          : state.selectedTicket,
    })),
  removeTicket: (id) =>
    set((state) => ({
      tickets: state.tickets.filter((t) => t.id !== id),
      selectedTicket: state.selectedTicket?.id === id ? null : state.selectedTicket,
    })),
  setSelectedTicket: (ticket) => set({ selectedTicket: ticket }),
  setFilters: (filters) => set({ filters }),
  setLoading: (isLoading) => set({ isLoading }),
}));
