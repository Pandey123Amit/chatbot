'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Circle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/types';

const statusConfig: Record<AgentStatus, { label: string; color: string }> = {
  ONLINE: { label: 'Online', color: 'text-green-500' },
  OFFLINE: { label: 'Offline', color: 'text-gray-400' },
  BUSY: { label: 'Busy', color: 'text-orange-500' },
};

export function AgentStatusIndicator() {
  const [status, setStatus] = useState<AgentStatus>('OFFLINE');

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

  const config = statusConfig[status];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Circle className={cn('h-3 w-3 mr-2 fill-current', config.color)} />
          {config.label}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {(Object.keys(statusConfig) as AgentStatus[]).map((s) => (
          <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)}>
            <Circle
              className={cn('h-3 w-3 mr-2 fill-current', statusConfig[s].color)}
            />
            {statusConfig[s].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
