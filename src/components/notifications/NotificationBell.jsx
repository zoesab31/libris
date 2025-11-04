import React, { useState } from 'react';
import { Bell } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NotificationBell({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.filter({ created_by: user?.email }, '-created_date', 20),
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = (notification) => {
    markAsReadMutation.mutate(notification.id);
    
    // Navigate based on link_type
    if (notification.link_type === 'book' && notification.link_id) {
      navigate(createPageUrl('MyLibrary'));
    } else if (notification.link_type === 'shared_reading' && notification.link_id) {
      navigate(createPageUrl('SharedReadings'));
    } else if (notification.link_type === 'profile') {
      navigate(createPageUrl('Profile'));
    } else if (notification.link_type === 'quote') {
      navigate(createPageUrl('Quotes'));
    }
    
    setOpen(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'friend_comment': return '💬';
      case 'new_quote': return '✨';
      case 'shared_reading_update': return '📚';
      case 'friend_request': return '👋';
      case 'bingo_complete': return '🎉';
      case 'milestone': return '🏆';
      default: return '🔔';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="w-5 h-5" style={{ color: 'var(--deep-pink)' }} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
                  style={{ backgroundColor: 'var(--deep-pink)' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b" style={{ borderColor: 'var(--beige)' }}>
          <h3 className="font-bold text-lg" style={{ color: 'var(--dark-text)' }}>
            Notifications
          </h3>
          {unreadCount > 0 && (
            <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
              {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: 'var(--warm-pink)' }} />
              <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                Aucune notification
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ divideColor: 'var(--beige)' }}>
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full p-4 text-left hover:bg-opacity-50 transition-colors"
                  style={{
                    backgroundColor: notification.is_read ? 'white' : 'var(--cream)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm mb-1" style={{ color: 'var(--dark-text)' }}>
                        {notification.title}
                      </p>
                      <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--warm-pink)' }}>
                        {notification.message}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--soft-pink)' }}>
                        {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                           style={{ backgroundColor: 'var(--deep-pink)' }} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}