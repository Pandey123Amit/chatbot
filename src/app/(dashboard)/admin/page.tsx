'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/dashboard/TopBar';
import { KPICards } from '@/components/admin/KPICards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TicketList } from '@/components/tickets/TicketList';
import { useTickets } from '@/hooks/useTickets';
import type { DashboardStats } from '@/types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    avgResponseTime: 0,
    onlineAgents: 0,
    ticketsPerAgent: {},
  });

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
    fetchStats();
  }, []);

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
                {Object.entries(stats.ticketsPerAgent).map(([agentId, count]) => (
                  <div key={agentId} className="flex items-center justify-between">
                    <span className="text-sm">Agent {agentId.slice(0, 8)}...</span>
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
      </div>
    </div>
  );
}
