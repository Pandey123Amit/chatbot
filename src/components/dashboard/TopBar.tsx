'use client';

import { Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AgentStatusIndicator } from './AgentStatusIndicator';
import { useAuth } from '@/hooks/useAuth';

interface TopBarProps {
  title: string;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  children?: React.ReactNode;
}

export function TopBar({ title, showSearch, onSearch, children }: TopBarProps) {
  const { isAgent } = useAuth();

  return (
    <div className="border-b bg-background">
      <div className="flex h-16 items-center px-4 gap-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        {children}

        {showSearch && (
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                className="pl-8"
                onChange={(e) => onSearch?.(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex-1" />

        {isAgent && <AgentStatusIndicator />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
              >
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuItem>
              <div className="flex flex-col">
                <span className="font-medium">New ticket assigned</span>
                <span className="text-sm text-muted-foreground">
                  Ticket #1234 has been assigned to you
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <div className="flex flex-col">
                <span className="font-medium">Customer replied</span>
                <span className="text-sm text-muted-foreground">
                  New message on ticket #1232
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
