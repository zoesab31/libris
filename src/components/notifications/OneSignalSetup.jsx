import { useEffect } from 'react';

/**
 * OneSignal Configuration for Nos Livres
 * 
 * INSTRUCTIONS DE CONFIGURATION :
 * 
 * 1. Créer un compte sur https://onesignal.com (gratuit)
 * 
 * 2. Créer une nouvelle app :
 *    - Name: "Nos Livres"
 *    - Platform: Web Push
 *    - Choose Web configuration
 * 
 * 3. Configuration du site :
 *    - Site Name: "Nos Livres"
 *    - Site URL: https://votre-domaine.com (votre URL Base44)
 *    - Auto Resubscribe: ON
 *    - Default Notification Icon: URL de votre icône
 * 
 * 4. Récupérer votre App ID :
 *    - Settings → Keys & IDs → OneSignal App ID
 *    - Remplacer 'YOUR_ONESIGNAL_APP_ID' ci-dessous
 * 
 * 5. Configuration Safari (optionnel mais recommandé) :
 *    - Settings → Apple Safari → Configure
 *    - Suivre les instructions pour obtenir le certificat
 * 
 * 6. Test :
 *    - OneSignal Dashboard → Messages → New Push
 *    - Envoyer un message test à tous les abonnés
 */

// ⚠️ IMPORTANT : Remplacez par votre App ID OneSignal
const ONESIGNAL_APP_ID = 'YOUR_ONESIGNAL_APP_ID'; // Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

export default function OneSignalSetup({ user }) {
  useEffect(() => {
    // Ne pas initialiser si déjà fait ou si pas d'App ID
    if (typeof window === 'undefined' || !window.OneSignal || ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID') {
      return;
    }

    // Initialiser OneSignal
    window.OneSignal = window.OneSignal || [];
    
    window.OneSignal.push(function() {
      window.OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        safari_web_id: 'web.onesignal.auto.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // Optionnel
        notifyButton: {
          enable: false, // On utilise notre propre UI
        },
        allowLocalhostAsSecureOrigin: true, // Pour le développement local
        autoResubscribe: true,
        autoRegister: false, // On demande la permission manuellement
        serviceWorkerParam: {
          scope: '/'
        },
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        
        // Callbacks
        notificationClickHandlerMatch: 'origin',
        notificationClickHandlerAction: 'navigate',
        
        // Apparence des notifications
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: "push",
                autoPrompt: false, // On contrôle quand afficher
                text: {
                  actionMessage: "Nous aimerions vous envoyer des notifications pour vos nouveaux messages 💌",
                  acceptButton: "Autoriser",
                  cancelButton: "Non merci"
                }
              }
            ]
          }
        },
        
        welcomeNotification: {
          disable: true // On envoie notre propre notification de bienvenue
        }
      });

      // Associer l'utilisateur à l'abonnement
      if (user?.email) {
        window.OneSignal.setExternalUserId(user.email);
        
        // Tags supplémentaires pour le ciblage
        window.OneSignal.sendTags({
          userId: user.email,
          userName: user.display_name || user.full_name || '',
          role: user.role || 'user'
        });
      }

      // Listener pour les changements de statut
      window.OneSignal.on('subscriptionChange', function(isSubscribed) {
        console.log('[OneSignal] Subscription status changed:', isSubscribed);
        
        if (isSubscribed) {
          // Notification de bienvenue personnalisée
          console.log('[OneSignal] User is now subscribed!');
        }
      });

      // Listener pour les clics sur notifications
      window.OneSignal.on('notificationDisplay', function(event) {
        console.log('[OneSignal] Notification displayed:', event);
      });
    });

    return () => {
      // Cleanup si nécessaire
    };
  }, [user]);

  return null; // Ce composant ne rend rien, il initialise juste OneSignal
}

/**
 * HELPER FUNCTIONS pour envoyer des notifications depuis votre code
 * 
 * Utilisez ces fonctions dans votre Chat.jsx ou ailleurs
 */

/**
 * Envoyer une notification via OneSignal API
 * 
 * @param {Object} params
 * @param {string[]} params.userEmails - Liste des emails des destinataires
 * @param {string} params.title - Titre de la notification
 * @param {string} params.message - Contenu de la notification
 * @param {string} params.url - URL à ouvrir au clic
 * @param {string} params.icon - URL de l'icône (optionnel)
 */
export async function sendOneSignalNotification({ userEmails, title, message, url, icon }) {
  // ⚠️ IMPORTANT : Cette fonction nécessite votre REST API Key
  // Pour des raisons de sécurité, NE METTEZ PAS la clé API ici
  // Utilisez plutôt :
  // 1. Une fonction Backend (Cloud Function, etc.)
  // 2. OneSignal Dashboard pour envoyer manuellement
  // 3. Un webhook depuis votre backend
  
  const ONESIGNAL_REST_API_KEY = 'YOUR_REST_API_KEY'; // ⚠️ NE PAS METTRE ICI - UTILISER UN BACKEND
  
  if (ONESIGNAL_REST_API_KEY === 'YOUR_REST_API_KEY') {
    console.warn('[OneSignal] REST API Key not configured. Cannot send notification.');
    return;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: userEmails, // Utilise les emails comme external IDs
        headings: { en: title },
        contents: { en: message },
        url: url,
        web_url: url,
        chrome_web_icon: icon || '/icon-192.png',
        firefox_icon: icon || '/icon-192.png',
        chrome_web_badge: '/icon-192.png',
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        android_channel_id: 'nos-livres-chat',
        priority: 10
      })
    });

    const data = await response.json();
    console.log('[OneSignal] Notification sent:', data);
    return data;
  } catch (error) {
    console.error('[OneSignal] Error sending notification:', error);
    throw error;
  }
}

/**
 * Alternative : Utiliser la fonction OneSignal sendSelfNotification
 * (Fonctionne uniquement pour l'utilisateur actuel, utile pour les tests)
 */
export function sendTestNotification(title, message, url) {
  if (typeof window !== 'undefined' && window.OneSignal) {
    window.OneSignal.push(function() {
      window.OneSignal.sendSelfNotification(
        title,
        message,
        url,
        '/icon-192.png',
        { url: url },
        [{ id: 'open-chat', text: 'Ouvrir', icon: '/icon-192.png' }]
      );
    });
  }
}