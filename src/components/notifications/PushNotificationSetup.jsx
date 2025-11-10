import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2, Shield, ExternalLink, Info } from "lucide-react";
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

    // Vérifier si OneSignal est chargé avec la nouvelle API v16
    const checkOneSignalReady = async () => {
      if (typeof window !== 'undefined' && window.OneSignal && window.OneSignal.User) {
        console.log('[OneSignal] OneSignal v16 detected');
        setOneSignalReady(true);
        await checkOneSignalStatus();
      } else {
        console.log('[OneSignal] Waiting for OneSignal to load...');
        // Réessayer après un court délai
        setTimeout(checkOneSignalReady, 500);
      }
    };

    checkOneSignalReady();

    // Check native notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
      console.log('[OneSignal] Browser permission:', Notification.permission);
    }
  }, [isAdmin]);

  const checkOneSignalStatus = async () => {
    if (!window.OneSignal || !window.OneSignal.User) return;

    try {
      // Check if user is subscribed (nouvelle API v16)
      const isPushEnabled = window.OneSignal.User.PushSubscription.optedIn;
      setIsSubscribed(isPushEnabled);
      console.log('[OneSignal] Subscription status:', isPushEnabled);
      
      if (isPushEnabled) {
        // Get player ID (nouvelle API v16)
        const subscriptionId = window.OneSignal.User.PushSubscription.id;
        if (subscriptionId) {
          setPlayerId(subscriptionId);
          console.log('[OneSignal] Player ID:', subscriptionId);
        }
      }

      // Check notification permission
      if ('Notification' in window) {
        const currentPermission = Notification.permission;
        setPermission(currentPermission);
        console.log('[OneSignal] Permission updated:', currentPermission);
      }
    } catch (error) {
      console.error('[OneSignal] Error checking status:', error);
    }
  };

  const subscribeToOneSignal = async () => {
    // 🔒 SÉCURITÉ : Bloquer si non-admin
    if (!isAdmin) {
      toast.error("🔒 Les notifications push sont réservées aux administrateurs");
      return;
    }

    setIsLoading(true);

    try {
      if (typeof window === 'undefined' || !window.OneSignal || !window.OneSignal.User) {
        toast.error("OneSignal n'est pas chargé. Rechargez la page.");
        setIsLoading(false);
        return;
      }

      console.log('[OneSignal] Requesting notification permission...');
      console.log('[OneSignal] Current permission:', Notification.permission);

      // Vérifier si les notifications sont bloquées
      if (Notification.permission === 'denied') {
        toast.error("⚠️ Les notifications sont bloquées ! Suivez les instructions ci-dessous pour les débloquer.", {
          duration: 5000
        });
        setIsLoading(false);
        return;
      }

      // Nouvelle API v16 : Demander la permission
      const permission = await window.OneSignal.Notifications.requestPermission();
      console.log('[OneSignal] Permission result:', permission);

      if (permission) {
        // S'abonner aux notifications push
        await window.OneSignal.User.PushSubscription.optIn();
        console.log('[OneSignal] User opted in successfully');

        // Associer l'utilisateur avec login (nouvelle API v16)
        if (user?.email) {
          await window.OneSignal.login(user.email);
          console.log('[OneSignal] User logged in:', user.email);

          // Ajouter des tags (nouvelle API v16)
          await window.OneSignal.User.addTags({
            userName: user.display_name || user.full_name || '',
            role: user.role || 'admin',
            isAdmin: 'true'
          });
          console.log('[OneSignal] Tags added');
        }

        // Récupérer l'ID d'abonnement
        const subscriptionId = window.OneSignal.User.PushSubscription.id;
        if (subscriptionId) {
          setPlayerId(subscriptionId);
          console.log('[OneSignal] Subscription ID:', subscriptionId);

          // Sauvegarder dans le profil utilisateur
          try {
            await base44.auth.updateMe({
              onesignal_player_id: subscriptionId,
              push_enabled: true
            });
            console.log('[OneSignal] Profile updated with player ID');
          } catch (error) {
            console.error('[OneSignal] Error saving player ID:', error);
          }
        }

        setIsSubscribed(true);
        setPermission('granted');
        toast.success("🔔 Notifications activées ! Vous recevrez des alertes pour vos messages.", {
          duration: 5000
        });
      } else {
        toast.error("Permission refusée. Veuillez autoriser les notifications.", {
          duration: 5000
        });
        setPermission('denied');
      }
    } catch (error) {
      console.error('[OneSignal] Error subscribing:', error);
      toast.error("Erreur lors de l'activation : " + error.message);
    } finally {
      setIsLoading(false);
      // Recheck status
      await checkOneSignalStatus();
    }
  };

  const unsubscribeFromOneSignal = async () => {
    setIsLoading(true);

    try {
      if (typeof window !== 'undefined' && window.OneSignal && window.OneSignal.User) {
        // Nouvelle API v16 : Se désabonner
        await window.OneSignal.User.PushSubscription.optOut();
        console.log('[OneSignal] User opted out');

        // Logout de OneSignal
        if (user?.email) {
          await window.OneSignal.logout();
          console.log('[OneSignal] User logged out');
        }

        // Update user profile
        try {
          await base44.auth.updateMe({
            onesignal_player_id: null,
            push_enabled: false
          });
        } catch (error) {
          console.error('[OneSignal] Error updating profile:', error);
        }

        setIsSubscribed(false);
        setPlayerId(null);
        toast.success("Notifications désactivées");
      }
    } catch (error) {
      console.error('[OneSignal] Error unsubscribing:', error);
      toast.error("Erreur lors de la désactivation");
    } finally {
      setIsLoading(false);
    }
  };

  const showTestNotification = async () => {
    if (typeof window !== 'undefined' && window.OneSignal && isSubscribed) {
      try {
        // En v16, il faut utiliser l'API REST ou les notifications via le dashboard
        // sendSelfNotification n'existe plus
        toast.success("Pour tester, envoyez-vous un message dans le chat !");
        console.log('[OneSignal] Test notifications should be sent via API or Dashboard');
      } catch (error) {
        console.error('[OneSignal] Error sending test:', error);
      }
    }
  };

  // Détecter le navigateur pour les instructions
  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      return {
        name: 'Chrome',
        steps: [
          "1. Cliquez sur l'icône 🔒 ou ⓘ à gauche de l'URL",
          "2. Cliquez sur 'Paramètres du site'",
          "3. Trouvez 'Notifications' et sélectionnez 'Autoriser'",
          "4. Rechargez cette page (F5)"
        ],
        icon: '🔒'
      };
    } else if (userAgent.includes('firefox')) {
      return {
        name: 'Firefox',
        steps: [
          "1. Cliquez sur l'icône 🔒 à gauche de l'URL",
          "2. Cliquez sur la flèche à côté de 'Notifications bloquées'",
          "3. Sélectionnez 'Autoriser'",
          "4. Rechargez cette page (F5)"
        ],
        icon: '🔒'
      };
    } else if (userAgent.includes('safari')) {
      return {
        name: 'Safari',
        steps: [
          "1. Ouvrez Safari → Réglages → Sites web",
          "2. Cliquez sur 'Notifications'",
          "3. Trouvez ce site et sélectionnez 'Autoriser'",
          "4. Rechargez cette page (F5)"
        ],
        icon: '⚙️'
      };
    } else if (userAgent.includes('edg')) {
      return {
        name: 'Edge',
        steps: [
          "1. Cliquez sur l'icône 🔒 à gauche de l'URL",
          "2. Cliquez sur 'Autorisations pour ce site'",
          "3. Trouvez 'Notifications' et sélectionnez 'Autoriser'",
          "4. Rechargez cette page (F5)"
        ],
        icon: '🔒'
      };
    } else {
      return {
        name: 'votre navigateur',
        steps: [
          "1. Cliquez sur l'icône à gauche de l'URL",
          "2. Cherchez les paramètres de notifications",
          "3. Autorisez les notifications pour ce site",
          "4. Rechargez cette page (F5)"
        ],
        icon: '🔒'
      };
    }
  };

  const browserInstructions = getBrowserInstructions();

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

        {/* Guide détaillé pour débloquer les notifications */}
        {permission === 'denied' && (
          <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: '#FEE2E2', border: '2px solid #FCA5A5' }}>
            <div className="flex items-start gap-3 mb-3">
              <Info className="w-5 h-5 flex-shrink-0 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-800 mb-2">
                  ⚠️ Les notifications sont bloquées dans {browserInstructions.name}
                </p>
                <p className="text-xs text-red-700 mb-3">
                  Suivez ces étapes pour les débloquer :
                </p>
              </div>
            </div>
            
            <div className="space-y-2 ml-8">
              {browserInstructions.steps.map((step, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-red-600 font-mono text-xs">▸</span>
                  <p className="text-xs text-red-800 flex-1">{step}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-red-300">
              <p className="text-xs text-red-700 font-medium">
                💡 <strong>Astuce :</strong> Cherchez l'icône {browserInstructions.icon} à gauche de l'URL dans la barre d'adresse
              </p>
            </div>
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
                💬 Tester dans le Chat
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
            ✅ Connecté à OneSignal v16 • Les notifications fonctionnent !
          </p>
        </div>
      )}
    </div>
  );
}