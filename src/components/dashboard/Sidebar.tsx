'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Ticket,
  MessageCircle,
  Users,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user, isAdmin, isAgent, logout } = useAuth();

  const adminLinks = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/tickets', label: 'All Tickets', icon: Ticket },
    { href: '/admin/agents', label: 'Agents', icon: Users },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const agentLinks = [
    { href: '/agent', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/agent/tickets', label: 'My Tickets', icon: Ticket },
    { href: '/agent/chat', label: 'Live Chat', icon: MessageCircle },
    { href: '/agent/profile', label: 'Profile', icon: Settings },
  ];

  const links = isAdmin ? adminLinks : agentLinks;

  return (
    <div className={cn('pb-12 w-64 border-r bg-background', className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <h2 className="text-lg font-semibold tracking-tight">Amit's Resume Assistant</h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Admin Panel' : 'Agent Portal'}
          </p>
        </div>
        <Separator />
        <ScrollArea className="px-2">
          <div className="space-y-1">
            {links.map((link) => (
              <Button
                key={link.href}
                variant={pathname === link.href ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  pathname === link.href && 'bg-accent'
                )}
                asChild
              >
                <Link href={link.href}>
                  <link.icon className="mr-2 h-4 w-4" />
                  {link.label}
                </Link>
              </Button>
            ))}
          </div>
        </ScrollArea>
        <Separator />
        <div className="px-2">
          <div className="flex items-center gap-2 px-2 py-2 mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
