'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/dashboard/TopBar';
import { KPICards } from '@/components/admin/KPICards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketList } from '@/components/tickets/TicketList';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTickets } from '@/hooks/useTickets';
import { Plus } from 'lucide-react';
import type { DashboardStats } from '@/types';

interface AgentInfo {
  id: string;
  name: string;
  email: string;
  agentStatus: string;
  activeTickets: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    avgResponseTime: 0,
    onlineAgents: 0,
    totalAgents: 0,
    ticketsPerAgent: {},
  });
  const [agents, setAgents] = useState<AgentInfo[]>([]);

  const { data: tickets, isLoading } = useTickets({ status: 'OPEN' });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    }

    async function fetchAgents() {
      try {
        const res = await fetch('/api/agents');
        if (res.ok) {
          const data = await res.json();
          setAgents(data.agents);
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    }

    fetchStats();
    fetchAgents();
  }, []);

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const statusVariant = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'default' as const;
      case 'BUSY': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Admin Dashboard" />
      <div className="flex-1 p-6 space-y-6">
        <KPICards stats={stats} />

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Open Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketList
                tickets={tickets?.slice(0, 5) || []}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agent Workload</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.ticketsPerAgent).map(([agentName, count]) => (
                  <div key={agentName} className="flex items-center justify-between">
                    <span className="text-sm">{agentName}</span>
                    <span className="font-medium">{count} tickets</span>
                  </div>
                ))}
                {Object.keys(stats.ticketsPerAgent).length === 0 && (
                  <p className="text-sm text-muted-foreground">No agents with active tickets</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Agent Management</CardTitle>
            <Button size="sm" onClick={() => router.push('/admin/agents')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Agent
            </Button>
          </CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agents found</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push('/admin/agents')}
                  >
                    <Avatar>
                      <AvatarFallback>{getInitials(agent.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={statusVariant(agent.agentStatus)}>
                        {agent.agentStatus.toLowerCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {agent.activeTickets} tickets
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
