import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2, ExternalLink, Shield } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function PushNotificationSetup({ user }) {
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [oneSignalReady, setOneSignalReady] = useState(false);

  // 🔒 SÉCURITÉ : Vérifier si l'utilisateur est admin
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    // Ne charger que pour les admins
    if (!isAdmin) return;

    // Vérifier si OneSignal est chargé
    const checkOneSignalReady = () => {
      if (typeof window !== 'undefined' && window.OneSignal) {
        setOneSignalReady(true);
        checkOneSignalStatus();
      } else {
        // Réessayer après un court délai
        setTimeout(checkOneSignalReady, 500);
      }
    };

    checkOneSignalReady();

    // Check native notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, [isAdmin]);

  const checkOneSignalStatus = () => {
    if (!window.OneSignal) return;

    window.OneSignal.push(function() {
      // Check if user is subscribed
      window.OneSignal.isPushNotificationsEnabled(function(isEnabled) {
        setIsSubscribed(isEnabled);
        
        if (isEnabled) {
          // Get player ID
          window.OneSignal.getUserId(function(userId) {
            setPlayerId(userId);
            console.log('[OneSignal] Player ID:', userId);
          });
        }
      });

      // Check notification permission
      window.OneSignal.getNotificationPermission(function(permission) {
        setPermission(permission);
      });
    });
  };

  const subscribeToOneSignal = async () => {
    // 🔒 SÉCURITÉ : Bloquer si non-admin
    if (!isAdmin) {
      toast.error("🔒 Les notifications push sont réservées aux administrateurs");
      return;
    }

    setIsLoading(true);

    try {
      if (typeof window === 'undefined' || !window.OneSignal) {
        toast.error("OneSignal n'est pas chargé. Rechargez la page.");
        setIsLoading(false);
        return;
      }

      // Show OneSignal prompt
      window.OneSignal.push(function() {
        window.OneSignal.showSlidedownPrompt().then(function() {
          console.log('[OneSignal] Prompt shown');
        });
      });

      // Wait a bit for user action
      await new Promise(resolve => setTimeout(resolve, 500));

      // Register for push
      window.OneSignal.push(function() {
        window.OneSignal.registerForPushNotifications({
          modalPrompt: true
        });
      });

      // Wait for subscription
      window.OneSignal.push(function() {
        window.OneSignal.on('subscriptionChange', function(isSubscribed) {
          console.log('[OneSignal] Subscription changed:', isSubscribed);
          
          if (isSubscribed) {
            setIsSubscribed(true);
            
            // Get player ID and save to user
            window.OneSignal.getUserId(function(userId) {
              setPlayerId(userId);
              console.log('[OneSignal] Player ID:', userId);
              
              // Save to user profile
              base44.auth.updateMe({
                onesignal_player_id: userId,
                push_enabled: true
              }).then(() => {
                toast.success("🔔 Notifications activées ! Vous recevrez des alertes pour vos messages.");
                
                // Send test notification
                window.OneSignal.sendSelfNotification(
                  "🎉 Notifications activées !",
                  "Vous recevrez maintenant des alertes pour vos nouveaux messages 💌",
                  window.location.origin + '/Chat',
                  '/icon-192.png'
                );
              }).catch(err => {
                console.error('[OneSignal] Error saving player ID:', err);
              });
            });
          }
        });
      });

    } catch (error) {
      console.error('[OneSignal] Error subscribing:', error);
      toast.error("Erreur lors de l'activation des notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromOneSignal = async () => {
    setIsLoading(true);

    try {
      if (typeof window !== 'undefined' && window.OneSignal) {
        window.OneSignal.push(function() {
          window.OneSignal.setSubscription(false);
          
          // Update user profile
          base44.auth.updateMe({
            onesignal_player_id: null,
            push_enabled: false
          }).then(() => {
            setIsSubscribed(false);
            setPlayerId(null);
            toast.success("Notifications désactivées");
          });
        });
      }
    } catch (error) {
      console.error('[OneSignal] Error unsubscribing:', error);
      toast.error("Erreur lors de la désactivation");
    } finally {
      setIsLoading(false);
    }
  };

  const showTestNotification = () => {
    if (typeof window !== 'undefined' && window.OneSignal && isSubscribed) {
      window.OneSignal.push(function() {
        window.OneSignal.sendSelfNotification(
          "🎉 Test - Nos Livres",
          "Les notifications fonctionnent parfaitement ! 💌",
          window.location.origin + '/Chat',
          '/icon-192.png',
          { url: '/Chat' },
          [{ id: 'open-chat', text: 'Ouvrir le chat', icon: '/icon-192.png' }]
        );
      });
      toast.success("Notification de test envoyée !");
    }
  };

  // 🔒 SÉCURITÉ : Afficher message pour les non-admins
  if (!isAdmin) {
    return (
      <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFF3E0' }}>
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 flex-shrink-0" style={{ color: '#F57C00' }} />
          <div className="flex-1">
            <h3 className="font-bold mb-1" style={{ color: '#E65100' }}>
              🔒 Notifications Push réservées aux administrateurs
            </h3>
            <p className="text-sm" style={{ color: '#F57C00' }}>
              Les notifications push OneSignal sont disponibles uniquement pour les comptes administrateurs.
              Vous continuez à recevoir les notifications in-app (badge rouge et cloche) normalement.
            </p>
            <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
              <p className="text-xs font-medium" style={{ color: '#E65100' }}>
                ✅ <strong>Actif pour vous :</strong> Badge messages, notifications in-app, marquage automatique comme lu
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Afficher un loader pendant le chargement de OneSignal
  if (!oneSignalReady) {
    return (
      <div className="p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--cream)' }}>
        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: 'var(--deep-pink)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
          Chargement de OneSignal...
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--warm-pink)' }}>
          Si ce message persiste, rechargez la page
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Badge Admin */}
      <div className="p-3 rounded-xl" style={{ backgroundColor: '#E0F2FE' }}>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: '#0369A1' }} />
          <p className="text-sm font-medium" style={{ color: '#0369A1' }}>
            ✨ <strong>Accès administrateur</strong> - Notifications push disponibles
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
               style={{ backgroundColor: isSubscribed ? '#10B981' : '#FF69B4' }}>
            {isSubscribed ? <Bell className="w-5 h-5 text-white" /> : <BellOff className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1">
            <h3 className="font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
              Notifications Push (OneSignal)
            </h3>
            <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
              {isSubscribed 
                ? "✅ Vous recevez les notifications même quand l'app est fermée" 
                : "Activez pour recevoir des alertes en temps réel"}
            </p>
            {playerId && (
              <p className="text-xs mt-1 font-mono" style={{ color: 'var(--warm-brown)' }}>
                ID: {playerId.substring(0, 8)}...
              </p>
            )}
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
              onClick={subscribeToOneSignal}
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
                onClick={unsubscribeFromOneSignal}
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

      {/* OneSignal Status */}
      {isSubscribed && (
        <div className="p-3 rounded-xl" style={{ backgroundColor: '#D1FAE5' }}>
          <p className="text-xs font-medium text-green-800">
            ✅ Connecté à OneSignal • Les notifications fonctionnent !
          </p>
        </div>
      )}
    </div>
  );
}