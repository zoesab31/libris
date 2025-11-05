
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
  const audioContextRef = useRef(null);

  // Initialize audio on mount
  useEffect(() => {
    // Create AudioContext on user interaction
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
    };
    
    document.addEventListener('click', initAudio, { once: true });
    return () => document.removeEventListener('click', initAudio);
  }, []);

  const { data: allNotifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.filter({ 
      created_by: user?.email 
    }, '-created_date', 50),
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Filter out notifications where from_user equals current user email
  // This prevents showing notifications for actions the user did themselves
  const notifications = allNotifications.filter(n => 
    !n.from_user || n.from_user !== user?.email
  );

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => 
      base44.entities.Notification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      const updatePromises = unreadNotifications.map(n => 
        base44.entities.Notification.update(n.id, { is_read: true })
      );
      await Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Play notification sound
  const playNotificationSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      // Pleasant notification sound
      oscillator.frequency.setValueAtTime(800, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, context.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.3);

      // Second beep
      setTimeout(() => {
        const osc2 = context.createOscillator();
        const gain2 = context.createGain();
        
        osc2.connect(gain2);
        gain2.connect(context.destination);
        
        osc2.frequency.setValueAtTime(600, context.currentTime);
        gain2.gain.setValueAtTime(0.2, context.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
        
        osc2.start(context.currentTime);
        osc2.stop(context.currentTime + 0.2);
      }, 150);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  // Detect new notifications and play sound
  useEffect(() => {
    if (unreadCount > prevCountRef.current && prevCountRef.current > 0) {
      playNotificationSound();
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  const handleNotificationClick = (notification) => {
    markAsReadMutation.mutate(notification.id);
    
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

  const handleOpenChange = (open) => {
    if (open && unreadCount > 0) {
      // Mark all notifications as read when opening the popover
      markAllAsReadMutation.mutate();
    }
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
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
            Notifications
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
                  backgroundColor: 'white',
                  border: '1px solid var(--beige)'
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
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
