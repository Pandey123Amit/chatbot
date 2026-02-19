'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, User, Loader2, ArrowRight, ExternalLink, Mail, Phone, Download, Linkedin, Github, Sparkles, MessageCircle, Code2, Briefcase, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: Date;
}

interface ChatHistory {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <AIChatContent />
    </Suspense>
  );
}

function AIChatContent() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [initialQuerySent, setInitialQuerySent] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  // Email gate state
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);

  // Handle email gate submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorEmail.trim()) return;

    setIsSubmittingEmail(true);
    try {
      await fetch('/api/chatbot-visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: visitorEmail.trim(),
          name: visitorName.trim() || undefined,
        }),
      });
    } catch (error) {
      console.error('Visitor registration error:', error);
    } finally {
      setEmailSubmitted(true);
      setIsSubmittingEmail(false);
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          content: "Hi there! I'm AmitBot — Amit's AI-powered resume assistant. Ask me anything about his skills, experience, projects, or education. I'm here to help you learn more about him!",
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  // Handle query parameter for quick questions
  useEffect(() => {
    const query = searchParams.get('q');
    if (query && !initialQuerySent && messages.length > 0) {
      setInitialQuerySent(true);
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content: query,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      sendToAI(query);
    }
  }, [searchParams, messages.length, initialQuerySent]);

  // Send message to AI
  const sendToAI = async (content: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          chatHistory,
          sessionId: sessionIdRef.current,
        }),
      });

      const data = await res.json();

      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
      }

      const cleanResponse = data.response.replace(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '$2');

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          content: cleanResponse,
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);

      const updatedHistory: ChatHistory[] = [
        ...chatHistory,
        { role: 'user', content },
        { role: 'assistant', content: data.response },
      ];
      setChatHistory(updatedHistory);

      if (data.shouldEscalate) {
        setMessages((prev) => [
          ...prev,
          {
            id: `system-${Date.now()}`,
            content: 'To connect with Amit directly, email pandey.amit1598@gmail.com or call +91 8986605695.',
            sender: 'system',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content: "I'm having trouble right now. Please reach out to Amit directly at pandey.amit1598@gmail.com for assistance.",
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!inputMessage.trim() || isLoading) return;
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    sendToAI(inputMessage);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickQuestion = (question: string) => {
    if (isLoading) return;
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: question,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    sendToAI(question);
  };

  const renderMessageContent = (content: string) => {
    return content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
      part.match(/^https?:\/\//) ? (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline underline-offset-2 inline-flex items-center gap-0.5 break-all"
        >
          {part.length > 50 ? part.slice(0, 50) + '...' : part}
          <ExternalLink className="h-3 w-3 inline flex-shrink-0" />
        </a>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  // ── EMAIL GATE SCREEN ──
  if (!emailSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30"></div>
              <div className="relative">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-white">AK</span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">Amit Kumar Pandey</h1>
                <p className="text-blue-100 text-sm">Software Engineer | Back-End Developer</p>
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs">Go</Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs">JavaScript</Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs">Python</Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs">AI/LLM</Badge>
                </div>
              </div>
            </div>

            {/* Form Body */}
            <div className="px-6 py-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <MessageCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Chat with AmitBot</p>
                  <p className="text-xs text-gray-500">AI-powered interactive resume</p>
                </div>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Work Email *</label>
                  <Input
                    type="email"
                    placeholder="your@company.com"
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    required
                    autoFocus
                    className="h-11 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Your Name <span className="text-gray-400">(optional)</span></label>
                  <Input
                    placeholder="Jane Smith"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="h-11 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmittingEmail || !visitorEmail.trim()}
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg text-sm font-medium shadow-md shadow-blue-500/20 transition-all"
                >
                  {isSubmittingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Start Conversation
                    </>
                  )}
                </Button>
              </form>

              <p className="text-[11px] text-center text-gray-400 mt-4">
                Your email helps Amit follow up with you if needed.
              </p>
            </div>

            {/* Quick Links Footer */}
            <div className="border-t border-gray-100 px-6 py-3 bg-gray-50/50 flex items-center justify-center gap-4">
              <a href="mailto:pandey.amit1598@gmail.com" className="text-gray-400 hover:text-blue-600 transition-colors"><Mail className="h-4 w-4" /></a>
              <a href="tel:+918986605695" className="text-gray-400 hover:text-blue-600 transition-colors"><Phone className="h-4 w-4" /></a>
              <a href="https://linkedin.com/in/amit_pandey" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors"><Linkedin className="h-4 w-4" /></a>
              <a href="https://github.com/amit_pandey" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors"><Github className="h-4 w-4" /></a>
              <a
                href="https://remotestate-website-public.s3.ap-south-1.amazonaws.com/uploads/pdfs/b516c8c9-6a46-4314-90eb-2fd298c9a443-AmitPandey_new.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-600 transition-colors"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── CHAT SCREEN ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto py-4 px-4 max-w-3xl flex flex-col min-h-screen">

        {/* Chat Card — fills the screen */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden my-2">

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                <span className="text-sm font-bold text-white">AK</span>
              </div>
              <div>
                <h1 className="text-white font-semibold text-sm">Amit Kumar Pandey</h1>
                <p className="text-blue-200 text-xs flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  AmitBot online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://remotestate-website-public.s3.ap-south-1.amazonaws.com/uploads/pdfs/b516c8c9-6a46-4314-90eb-2fd298c9a443-AmitPandey_new.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-xs h-8 gap-1">
                  <Download className="h-3.5 w-3.5" />
                  Resume
                </Button>
              </a>
              <a href="mailto:pandey.amit1598@gmail.com">
                <Button size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 h-8 px-2">
                  <Mail className="h-3.5 w-3.5" />
                </Button>
              </a>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-2.5',
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.sender === 'ai' && (
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}

                {msg.sender === 'system' ? (
                  <div className="w-full text-center py-2">
                    <span className="inline-block bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full border border-blue-100">
                      {renderMessageContent(msg.content)}
                    </span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed',
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl rounded-br-md shadow-sm'
                        : 'bg-gray-50 text-gray-800 rounded-2xl rounded-bl-md border border-gray-100'
                    )}
                  >
                    <p className="whitespace-pre-wrap">
                      {renderMessageContent(msg.content)}
                    </p>
                    <p className={cn(
                      'text-[10px] mt-1.5',
                      msg.sender === 'user' ? 'text-blue-200' : 'text-gray-400'
                    )}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}

                {msg.sender === 'user' && (
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-2.5">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick questions — shown only when few messages */}
            {messages.length <= 1 && !isLoading && (
              <div className="pt-2">
                <p className="text-xs text-gray-400 mb-2 ml-9">Try asking:</p>
                <div className="flex flex-wrap gap-2 ml-9">
                  {[
                    { icon: Code2, text: 'Technical skills' },
                    { icon: Briefcase, text: 'Work experience' },
                    { icon: Sparkles, text: 'Projects built' },
                    { icon: GraduationCap, text: 'Education' },
                  ].map(({ icon: Icon, text }) => (
                    <button
                      key={text}
                      onClick={() => handleQuickQuestion(`Tell me about Amit's ${text.toLowerCase()}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all cursor-pointer"
                    >
                      <Icon className="h-3 w-3" />
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-100 p-3 bg-gray-50/50">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Ask about skills, experience, projects..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1 h-10 rounded-xl border-gray-200 bg-white focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
              <Button
                onClick={handleSend}
                disabled={!inputMessage.trim() || isLoading}
                className="h-10 w-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm shadow-blue-500/20 p-0 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Footer bar */}
        <div className="flex items-center justify-between px-2 py-2 text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <a href="mailto:pandey.amit1598@gmail.com" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </a>
            <a href="tel:+918986605695" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <Phone className="h-3 w-3" /> +91 8986605695
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://linkedin.com/in/amit_pandey" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors"><Linkedin className="h-3.5 w-3.5" /></a>
            <a href="https://github.com/amit_pandey" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors"><Github className="h-3.5 w-3.5" /></a>
            <a
              href="https://remotestate-website-public.s3.ap-south-1.amazonaws.com/uploads/pdfs/b516c8c9-6a46-4314-90eb-2fd298c9a443-AmitPandey_new.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <Download className="h-3 w-3" /> Resume PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
