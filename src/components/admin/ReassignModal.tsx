'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import type { User, Ticket } from '@/types';

interface ReassignModalProps {
  open: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  agents: User[];
  onReassign: (ticketId: string, agentId: string) => void;
  isLoading?: boolean;
}

export function ReassignModal({
  open,
  onClose,
  ticket,
  agents,
  onReassign,
  isLoading,
}: ReassignModalProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const handleReassign = () => {
    if (ticket && selectedAgentId) {
      onReassign(ticket.id, selectedAgentId);
      setSelectedAgentId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign Ticket</DialogTitle>
          <DialogDescription>
            {ticket && (
              <>
                Reassign ticket #{ticket.ticketNumber}: {ticket.subject}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Assignment</Label>
            {ticket?.assignedTo ? (
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {ticket.assignedTo.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{ticket.assignedTo.name}</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Unassigned</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <span>{agent.name}</span>
                      <span className="text-muted-foreground">
                        ({agent.agentStatus.toLowerCase()})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleReassign}
            disabled={!selectedAgentId || isLoading}
          >
            {isLoading ? 'Reassigning...' : 'Reassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
