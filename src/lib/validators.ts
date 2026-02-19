import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'AGENT', 'CUSTOMER']).optional(),
});

export const createTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  channel: z.enum(['CHAT', 'EMAIL', 'WHATSAPP']),
  customerId: z.string().optional(),
});

export const updateTicketSchema = z.object({
  subject: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.string().nullable().optional(),
});

export const createMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty'),
  isInternal: z.boolean().optional(),
});

export const chatMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty'),
});

export const reassignTicketSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
});

export const updateAgentSchema = z.object({
  name: z.string().min(2).optional(),
  agentStatus: z.enum(['ONLINE', 'OFFLINE', 'BUSY']).optional(),
  maxChats: z.number().min(1).max(20).optional(),
});

export const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  sessionId: z.string().optional(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ReassignTicketInput = z.infer<typeof reassignTicketSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
