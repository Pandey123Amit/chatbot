import { create } from 'zustand';
import type { ChatSession, ChatMessage } from '@/types';

interface ChatStore {
  activeSessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isConnected: boolean;
  setActiveSessions: (sessions: ChatSession[]) => void;
  addSession: (session: ChatSession) => void;
  updateSession: (id: string, updates: Partial<ChatSession>) => void;
  removeSession: (id: string) => void;
  setCurrentSession: (session: ChatSession | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setConnected: (connected: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeSessions: [],
  currentSession: null,
  messages: [],
  isConnected: false,
  setActiveSessions: (sessions) => set({ activeSessions: sessions }),
  addSession: (session) =>
    set((state) => ({ activeSessions: [...state.activeSessions, session] })),
  updateSession: (id, updates) =>
    set((state) => ({
      activeSessions: state.activeSessions.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      currentSession:
        state.currentSession?.id === id
          ? { ...state.currentSession, ...updates }
          : state.currentSession,
    })),
  removeSession: (id) =>
    set((state) => ({
      activeSessions: state.activeSessions.filter((s) => s.id !== id),
      currentSession: state.currentSession?.id === id ? null : state.currentSession,
    })),
  setCurrentSession: (session) => set({ currentSession: session }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setConnected: (isConnected) => set({ isConnected }),
}));
