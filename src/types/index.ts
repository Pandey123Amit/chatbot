export type Role = 'ADMIN' | 'AGENT' | 'CUSTOMER';

export type TicketStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type Channel = 'CHAT' | 'EMAIL' | 'WHATSAPP';

export type AgentStatus = 'ONLINE' | 'OFFLINE' | 'BUSY';

export type ChatSessionStatus = 'WAITING' | 'ACTIVE' | 'ENDED' | 'CONVERTED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string | null;
  agentStatus: AgentStatus;
  maxChats: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  subject: string;
  description?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  channel: Channel;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date | null;
  customerId: string;
  customer?: User;
  assignedToId?: string | null;
  assignedTo?: User | null;
  messages?: Message[];
  chatSessionId?: string | null;
}

export interface Message {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: Date;
  ticketId: string;
  senderId: string;
  sender?: User;
}

export interface ChatSession {
  id: string;
  status: ChatSessionStatus;
  startedAt: Date;
  endedAt?: Date | null;
  customerId: string;
  customer?: User;
  agentId?: string | null;
  agent?: User | null;
  chatMessages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  content: string;
  senderType: 'CUSTOMER' | 'AGENT' | 'SYSTEM';
  senderId?: string | null;
  createdAt: Date;
  chatSessionId: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResponseTime: number;
  onlineAgents: number;
  ticketsPerAgent: Record<string, number>;
}

// Input types
export interface CreateTicketInput {
  subject: string;
  description?: string;
  priority?: TicketPriority;
  channel: Channel;
  customerId?: string;
}

export interface UpdateTicketInput {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToId?: string | null;
}
