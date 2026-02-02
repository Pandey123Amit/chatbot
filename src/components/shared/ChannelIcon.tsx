'use client';

import { MessageCircle, Mail, MessageSquare } from 'lucide-react';
import type { Channel } from '@/types';

interface ChannelIconProps {
  channel: Channel;
  className?: string;
}

export function ChannelIcon({ channel, className = 'h-4 w-4' }: ChannelIconProps) {
  switch (channel) {
    case 'CHAT':
      return <MessageCircle className={className} />;
    case 'EMAIL':
      return <Mail className={className} />;
    case 'WHATSAPP':
      return <MessageSquare className={className} />;
    default:
      return <MessageCircle className={className} />;
  }
}
