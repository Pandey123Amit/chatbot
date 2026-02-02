'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Ticket, TicketStatus } from '@/types';
import { Send, CheckCircle } from 'lucide-react';

interface TicketActionsProps {
  ticket: Ticket;
  canEdit: boolean;
  onSendMessage: (content: string, isInternal: boolean) => void;
  onStatusChange: (status: TicketStatus) => void;
  isSending?: boolean;
}

export function TicketActions({
  ticket,
  canEdit,
  onSendMessage,
  onStatusChange,
  isSending,
}: TicketActionsProps) {
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const handleSend = () => {
    if (!message.trim()) return;
    onSendMessage(message, isInternal);
    setMessage('');
    setIsInternal(false);
  };

  if (!canEdit) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-center text-muted-foreground">
            This ticket is assigned to another agent. You can view but not edit.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reply</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Textarea
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="internal"
              checked={isInternal}
              onCheckedChange={setIsInternal}
            />
            <Label htmlFor="internal" className="text-sm">
              Internal note (not visible to customer)
            </Label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSend} disabled={!message.trim() || isSending}>
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Sending...' : 'Send'}
          </Button>

          {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
            <Button
              variant="outline"
              onClick={() => onStatusChange('RESOLVED')}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Resolved
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-sm">Status:</Label>
          <Select
            value={ticket.status}
            onValueChange={(value) => onStatusChange(value as TicketStatus)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="ASSIGNED">Assigned</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="WAITING">Waiting</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
