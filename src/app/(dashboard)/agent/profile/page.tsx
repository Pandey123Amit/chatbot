'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { TopBar } from '@/components/dashboard/TopBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { AgentStatus } from '@/types';

export default function AgentProfilePage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(session?.user?.name || '');
  const [status, setStatus] = useState<AgentStatus>('OFFLINE');
  const [maxChats, setMaxChats] = useState(5);

  const initials = session?.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await fetch(`/api/agents/${session?.user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, maxChats }),
      });
      // Update session
      await update({ name });
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: AgentStatus) => {
    try {
      await fetch('/api/agents/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentStatus: newStatus }),
      });
      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Profile" />
      <div className="flex-1 p-6">
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{session?.user?.name}</h3>
                  <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
              <CardDescription>Control your online status and chat capacity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => handleStatusChange(v as AgentStatus)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="BUSY">Busy</SelectItem>
                    <SelectItem value="OFFLINE">Offline</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  When online, you will receive new chat requests
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxChats">Max Concurrent Chats</Label>
                <Input
                  id="maxChats"
                  type="number"
                  min={1}
                  max={20}
                  value={maxChats}
                  onChange={(e) => setMaxChats(parseInt(e.target.value))}
                  className="w-24"
                />
                <p className="text-sm text-muted-foreground">
                  Maximum number of simultaneous chat sessions
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
