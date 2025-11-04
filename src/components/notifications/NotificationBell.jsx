import React, { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NotificationBell({ user }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const prevCountRef = useRef(0);
  const audioRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUR0MU6rkMsB0JhA4jdXyzH4rBiVzxe/glEoOE1q37uedUQ8IQJrd8cR1IwU1idP00oIyBhxqvu/mnlATDFSr5u22aRoGN4vU8cp8KwYlc8Xw4JNKDBRV');
  }, []);

  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.filter({ 
      created_by: user?.email 
    }, '-created_date', 50),
    enabled: !!user,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => 
      base44.entities.Notification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Play sound when new notification arrives
  useEffect(() => {
    if (unreadCount > prevCountRef.current && prevCountRef.current > 0) {
      // New notification arrived
      if (audioRef.current) {
        audioRef.current.play().catch(err => {
          console.log('Could not play notification sound:', err);
        });
      }
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  const handleNotificationClick = (notification) => {
    markAsReadMutation.mutate(notification.id);
    
    // Navigate based on link type
    switch (notification.link_type) {
      case 'book':
        navigate(createPageUrl("MyLibrary"));
        break;
      case 'profile':
        navigate(createPageUrl("Friends"));
        break;
      case 'shared_reading':
        navigate(createPageUrl("SharedReadings"));
        break;
      default:
        break;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" style={{ color: 'var(--deep-pink)' }} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold text-white flex items-center justify-center animate-pulse"
                  style={{ backgroundColor: 'var(--deep-pink)' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="end">
        <div className="space-y-1">
          <h3 className="font-bold text-lg mb-3" style={{ color: 'var(--dark-text)' }}>
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </h3>
          
          {notifications.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--warm-pink)' }}>
              Aucune notification
            </p>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="w-full p-3 rounded-lg text-left transition-all hover:shadow-md"
                style={{ 
                  backgroundColor: notification.is_read ? 'white' : 'var(--cream)',
                  border: notification.is_read ? '1px solid var(--beige)' : '2px solid var(--soft-pink)'
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm mb-1" style={{ color: 'var(--dark-text)' }}>
                      {notification.title}
                    </p>
                    <p className="text-xs mb-2" style={{ color: 'var(--warm-pink)' }}>
                      {notification.message}
                    </p>
                    <p className="text-xs opacity-60">
                      {formatDistanceToNow(new Date(notification.created_date), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                         style={{ backgroundColor: 'var(--deep-pink)' }} />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}