'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Circle } from 'lucide-react';
import type { User, AgentStatus } from '@/types';
import { cn } from '@/lib/utils';

interface AgentTableProps {
  agents: User[];
  ticketCounts: Record<string, number>;
  onEdit?: (agent: User) => void;
  onToggleStatus?: (agent: User) => void;
}

const statusColors: Record<AgentStatus, string> = {
  ONLINE: 'text-green-500',
  OFFLINE: 'text-gray-400',
  BUSY: 'text-orange-500',
};

export function AgentTable({
  agents,
  ticketCounts,
  onEdit,
  onToggleStatus,
}: AgentTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Active Tickets</TableHead>
          <TableHead>Max Chats</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((agent) => {
          const initials = agent.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase();

          return (
            <TableRow key={agent.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-sm text-muted-foreground">{agent.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Circle
                    className={cn(
                      'h-3 w-3 fill-current',
                      statusColors[agent.agentStatus]
                    )}
                  />
                  <span className="capitalize">{agent.agentStatus.toLowerCase()}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{ticketCounts[agent.id] || 0}</Badge>
              </TableCell>
              <TableCell>{agent.maxChats}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(agent)}>
                      Edit Agent
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleStatus?.(agent)}>
                      Toggle Status
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
