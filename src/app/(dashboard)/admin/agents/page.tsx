'use client';

import { useState, useEffect } from 'react';
import { TopBar } from '@/components/dashboard/TopBar';
import { AgentTable } from '@/components/admin/AgentTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import type { User } from '@/types';

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<User[]>([]);
  const [ticketCounts, setTicketCounts] = useState<Record<string, number>>({});
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // New agent form
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [newAgentPassword, setNewAgentPassword] = useState('');

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents);

        // Build ticket counts
        const counts: Record<string, number> = {};
        data.agents.forEach((agent: any) => {
          counts[agent.id] = agent.activeTickets || 0;
        });
        setTicketCounts(counts);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const handleAddAgent = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAgentName,
          email: newAgentEmail,
          password: newAgentPassword,
        }),
      });

      if (res.ok) {
        setShowAddAgent(false);
        setNewAgentName('');
        setNewAgentEmail('');
        setNewAgentPassword('');
        fetchAgents();
      }
    } catch (error) {
      console.error('Failed to add agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (agent: User) => {
    const newStatus = agent.agentStatus === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try {
      await fetch(`/api/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentStatus: newStatus }),
      });
      fetchAgents();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Agent Management" />
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">All Agents</h2>
          <Button onClick={() => setShowAddAgent(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Agent
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <AgentTable
              agents={agents}
              ticketCounts={ticketCounts}
              onToggleStatus={handleToggleStatus}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddAgent} onOpenChange={setShowAddAgent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Agent</DialogTitle>
            <DialogDescription>
              Create a new agent account for your support team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Name</Label>
              <Input
                id="agent-name"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="Agent name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-email">Email</Label>
              <Input
                id="agent-email"
                type="email"
                value={newAgentEmail}
                onChange={(e) => setNewAgentEmail(e.target.value)}
                placeholder="agent@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-password">Password</Label>
              <Input
                id="agent-password"
                type="password"
                value={newAgentPassword}
                onChange={(e) => setNewAgentPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAgent(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAgent} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
