'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, UserCircle, MessageCircle, Clock } from 'lucide-react';

export default function CustomerChatPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="container mx-auto py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              GroceryMart Support
            </h1>
            <p className="text-lg text-muted-foreground">
              How would you like to get help today?
            </p>
          </div>

          {/* Support Options */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* AI Chat Option - Recommended */}
            <Card className="border-2 border-green-500 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">AI Assistant</CardTitle>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  </div>
                </div>
                <CardDescription className="mt-3">
                  Get instant help from GroceryBot, our AI-powered assistant.
                  Available 24/7 with instant responses.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-500" />
                    Instant responses - no waiting
                  </li>
                  <li className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    Can escalate to human if needed
                  </li>
                </ul>
                <Link href="/chat/ai">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <Bot className="h-4 w-4 mr-2" />
                    Start AI Chat
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Human Agent Option */}
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">Human Agent</CardTitle>
                </div>
                <CardDescription className="mt-3">
                  Chat directly with a human support agent for complex issues
                  or personalized assistance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    May require wait time
                  </li>
                  <li className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                    Best for complex issues
                  </li>
                </ul>
                <Link href="/chat/human">
                  <Button variant="outline" className="w-full">
                    <UserCircle className="h-4 w-4 mr-2" />
                    Talk to Agent
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="mt-12 text-center">
            <h2 className="text-xl font-semibold mb-4">Common Questions</h2>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'How do I track my order?',
                'What is the delivery time?',
                'How do I get a refund?',
                'How do I cancel my order?',
                'What payment methods do you accept?',
              ].map((question) => (
                <Link
                  key={question}
                  href={`/chat/ai?q=${encodeURIComponent(question)}`}
                >
                  <Button variant="outline" size="sm" className="text-xs">
                    {question}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
