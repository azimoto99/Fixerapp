import React from '@/lib/ensure-react';
import { useState } from 'react';
import { Link } from 'wouter';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationList } from './NotificationList';
import { BellIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface NotificationPopoverProps {
  className?: string;
}

export function NotificationPopover({ className }: NotificationPopoverProps) {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("relative", className)}
          aria-label={`${unreadCount} unread notifications`}
          style={{ isolation: 'isolate' }}
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <div className="absolute top-0 right-0 pointer-events-none" style={{ zIndex: 999 }}>
              <div className="h-4 min-w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[380px] p-0" 
        align="end"
        sideOffset={8}
      >
        <NotificationList limit={5} />
        
        <div className="p-2 border-t text-center">
          <Link href="/notifications">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}