'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, User, UserCircle, Loader2, ArrowRight, ExternalLink, ClipboardCopy, Mail, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: Date;
  isSummary?: boolean;
}

interface ChatHistory {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}>
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
          content: "Hello! I'm RemoteStateBot, your AI assistant for RemoteState. I can help you with questions about our services, technologies, pricing, and more. You can also tell me about a project idea and I'll help you define the requirements!",
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  // Copy summary to clipboard
  const handleCopySummary = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  // Email summary to team
  const handleEmailSummary = (content: string) => {
    const subject = encodeURIComponent('Project Requirements Summary \u2014 RemoteState Discovery');
    const body = encodeURIComponent(content);
    window.open(`mailto:[email protected]?subject=${subject}&body=${body}`, '_blank');
  };

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
        }),
      });

      const data = await res.json();

      // Strip markdown link syntax [text](url) → just the url
      const cleanResponse = data.response.replace(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '$2');

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          content: cleanResponse,
          sender: 'ai',
          timestamp: new Date(),
          isSummary: data.isSummary || false,
        },
      ]);

      setChatHistory((prev) => [
        ...prev,
        { role: 'user', content },
        { role: 'assistant', content: data.response },
      ]);

      // Handle escalation
      if (data.shouldEscalate) {
        setMessages((prev) => [
          ...prev,
          {
            id: `system-${Date.now()}`,
            content: 'To connect with our team directly, please visit https://www.remotestate.com/contactus',
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
          content: "I'm having trouble right now. Please reach out to our team at https://www.remotestate.com/contactus for assistance.",
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle send message
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

  // Contact Us - open RemoteState contact page
  const handleContactUs = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        content: 'I would like to speak to someone',
        sender: 'user',
        timestamp: new Date(),
      },
      {
        id: `ai-${Date.now()}`,
        content: "Of course! I'll redirect you to our contact page where our team can assist you personally.",
        sender: 'ai',
        timestamp: new Date(),
      },
    ]);
    window.open('https://www.remotestate.com/contactus', '_blank');
  };

  // Render URL-aware text content
  const renderMessageContent = (content: string) => {
    return content.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
      part.match(/^https?:\/\//) ? (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium inline-flex items-center gap-1"
        >
          {part}
          <ExternalLink className="h-3 w-3 inline" />
        </a>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            RemoteState Support
          </h1>
          <p className="text-muted-foreground">
            Ask questions or discuss a project idea &mdash; I&apos;m here to help 24/7
          </p>
        </div>

        {/* Chat Card */}
        <Card className="shadow-lg">
          <CardHeader className="bg-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5" />
              RemoteStateBot
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {/* Messages */}
            <ScrollArea className="h-[400px] p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-3',
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.sender === 'ai' && (
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-blue-600" />
                      </div>
                    )}

                    {/* Summary card rendering */}
                    {msg.isSummary ? (
                      <div className="max-w-[85%] rounded-lg border-2 border-emerald-200 bg-emerald-50 px-4 py-3">
                        <div className="flex items-center gap-2 mb-2 text-emerald-800 font-semibold">
                          <FileText className="h-4 w-4" />
                          Project Requirements Summary
                        </div>
                        <p className="text-sm whitespace-pre-wrap text-gray-900">
                          {renderMessageContent(msg.content)}
                        </p>
                        <div className="flex gap-2 mt-3 pt-2 border-t border-emerald-200">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleCopySummary(msg.content)}
                          >
                            <ClipboardCopy className="h-3 w-3 mr-1" />
                            Copy to Clipboard
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleEmailSummary(msg.content)}
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            Email to Team
                          </Button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'max-w-[75%] rounded-lg px-4 py-2',
                          msg.sender === 'user'
                            ? 'bg-blue-600 text-white'
                            : msg.sender === 'system'
                            ? 'bg-gray-100 text-gray-600 text-center text-sm w-full max-w-full'
                            : 'bg-gray-100 text-gray-900'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {renderMessageContent(msg.content)}
                        </p>
                        <p className={cn(
                          'text-xs mt-1',
                          msg.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                        )}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}

                    {msg.sender === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t">
              <div className="mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={handleContactUs}
                >
                  <UserCircle className="h-3 w-3 mr-1" />
                  Contact Us
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'What services do you offer?',
              'I want to build an app',
              'Pricing & engagement',
              'AI & ML solutions',
            ].map((question) => (
              <Button
                key={question}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setInputMessage(question);
                }}
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
