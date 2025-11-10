import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// Helper to convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationSetup({ user }) {
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    // Check current notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Check if service worker is registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        
        // Check if already subscribed
        reg.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      toast.error("Votre navigateur ne supporte pas les notifications");
      return null;
    }

    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('Service Worker registered:', reg);
      await navigator.serviceWorker.ready;
      
      setRegistration(reg);
      return reg;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      toast.error("Erreur lors de l'installation du service worker");
      return null;
    }
  };

  const subscribeToPush = async () => {
    setIsLoading(true);

    try {
      // 1. Request notification permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        toast.error("Permission refusée. Activez les notifications dans les paramètres de votre navigateur.");
        setIsLoading(false);
        return;
      }

      // 2. Register service worker if not already registered
      let reg = registration;
      if (!reg) {
        reg = await registerServiceWorker();
        if (!reg) {
          setIsLoading(false);
          return;
        }
      }

      // 3. Subscribe to push notifications
      // Note: You'll need to generate VAPID keys and store the public key
      // For now, using userVisibleOnly without applicationServerKey (limited functionality)
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // applicationServerKey: urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY_HERE')
      });

      console.log('Push subscription:', subscription);

      // 4. Save subscription to your backend
      // In a real implementation, you'd send this to your server
      // For Base44, you could store it in User entity or a new PushSubscription entity
      await base44.auth.updateMe({
        push_subscription: JSON.stringify(subscription.toJSON()),
        push_enabled: true
      });

      setIsSubscribed(true);
      toast.success("🔔 Notifications activées ! Vous recevrez des alertes pour vos messages.");

    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error("Erreur lors de l'activation des notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsLoading(true);

    try {
      if (!registration) {
        setIsLoading(false);
        return;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        
        // Update user settings
        await base44.auth.updateMe({
          push_subscription: null,
          push_enabled: false
        });

        setIsSubscribed(false);
        toast.success("Notifications désactivées");
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error("Erreur lors de la désactivation");
    } finally {
      setIsLoading(false);
    }
  };

  const showTestNotification = () => {
    if (permission === 'granted' && registration) {
      registration.showNotification('🎉 Test - Nos Livres', {
        body: 'Les notifications fonctionnent parfaitement !',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'test-notification',
        vibrate: [200, 100, 200],
        data: {
          url: '/Chat'
        }
      });
    }
  };

  // Don't show on non-supporting browsers
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
               style={{ backgroundColor: isSubscribed ? '#10B981' : '#FF69B4' }}>
            {isSubscribed ? <Bell className="w-5 h-5 text-white" /> : <BellOff className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1">
            <h3 className="font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
              Notifications Push
            </h3>
            <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
              {isSubscribed 
                ? "✅ Vous recevez les notifications même quand l'app est fermée" 
                : "Activez pour recevoir des alertes en temps réel"}
            </p>
          </div>
        </div>

        {permission === 'denied' && (
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
            <p className="text-sm font-medium text-red-800">
              ⚠️ Les notifications sont bloquées. Autorisez-les dans les paramètres de votre navigateur.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {!isSubscribed ? (
            <Button
              onClick={subscribeToPush}
              disabled={isLoading || permission === 'denied'}
              className="flex-1 text-white"
              style={{ background: 'linear-gradient(135deg, #FF69B4, #FFB6C8)' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activation...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Activer les notifications
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={showTestNotification}
                variant="outline"
                className="flex-1"
              >
                🎉 Tester
              </Button>
              <Button
                onClick={unsubscribeFromPush}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BellOff className="w-4 h-4 mr-2" />
                )}
                Désactiver
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Instructions for PWA installation */}
      {permission === 'granted' && !isSubscribed && (
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#E0E7FF' }}>
          <h4 className="font-bold mb-2 text-sm" style={{ color: '#4C1D95' }}>
            📱 Pour une meilleure expérience
          </h4>
          <p className="text-xs" style={{ color: '#5B21B6' }}>
            Installez l'app sur votre écran d'accueil pour recevoir les notifications même quand le navigateur est fermé !
          </p>
          <p className="text-xs mt-2" style={{ color: '#5B21B6' }}>
            <strong>iOS :</strong> Safari → Partager → Sur l'écran d'accueil<br/>
            <strong>Android :</strong> Menu → Installer l'application
          </p>
        </div>
      )}
    </div>
  );
}