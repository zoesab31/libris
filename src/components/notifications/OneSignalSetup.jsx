import { useEffect } from 'react';

/**
 * OneSignal Configuration for Nos Livres (v16)
 * 
 * ✅ CONFIGURATION ACTIVÉE !
 * App ID: 6a28ef87-f515-4193-8df1-529268523ebb
 * 
 * 🔒 SÉCURITÉ : Seuls les administrateurs peuvent utiliser OneSignal
 */

// ✅ App ID configuré
const ONESIGNAL_APP_ID = '6a28ef87-f515-4193-8df1-529268523ebb';

export default function OneSignalSetup({ user }) {
  useEffect(() => {
    // 🔒 SÉCURITÉ : Ne pas initialiser OneSignal pour les non-admins
    if (!user || user.role !== 'admin') {
      console.log('[OneSignal] User is not admin, skipping initialization');
      return;
    }

    // Ne pas initialiser si déjà fait
    if (typeof window === 'undefined' || !window.OneSignal) {
      return;
    }

    console.log('[OneSignal] Initializing for admin user:', user.email);

    // Associer l'utilisateur à l'abonnement (nouvelle API v16)
    const setupUserData = async () => {
      try {
        if (user?.email && window.OneSignal && window.OneSignal.User) {
          // Login l'utilisateur (nouvelle API v16)
          await window.OneSignal.login(user.email);
          console.log('[OneSignal] User logged in:', user.email);
          
          // Ajouter des tags (nouvelle API v16)
          await window.OneSignal.User.addTags({
            userId: user.email,
            userName: user.display_name || user.full_name || '',
            role: user.role || 'admin',
            isAdmin: 'true' // Tag spécial pour les admins
          });
          console.log('[OneSignal] Tags added for admin');

          // Listener pour les changements de statut (nouvelle API v16)
          window.OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
            console.log('[OneSignal] Admin subscription status changed:', event);
            
            if (event.current.optedIn) {
              console.log('[OneSignal] Admin user is now subscribed!');
              console.log('[OneSignal] Subscription ID:', event.current.id);
            }
          });

          // Listener pour les notifications
          window.OneSignal.Notifications.addEventListener('click', (event) => {
            console.log('[OneSignal] Notification clicked:', event);
            // Le lien de la notification sera automatiquement ouvert
          });
        }
      } catch (error) {
        console.error('[OneSignal] Error setting up user data:', error);
      }
    };

    // Attendre que OneSignal soit complètement chargé
    if (window.OneSignal && window.OneSignal.User) {
      setupUserData();
    } else {
      // Attendre que OneSignal se charge
      const checkReady = setInterval(() => {
        if (window.OneSignal && window.OneSignal.User) {
          clearInterval(checkReady);
          setupUserData();
        }
      }, 500);

      // Cleanup
      return () => clearInterval(checkReady);
    }
  }, [user]);

  return null;
}

/**
 * DOCUMENTATION OneSignal v16 API
 * 
 * 🔒 SÉCURITÉ : Ces fonctions ne doivent être appelées que par des admins
 */

/**
 * Envoyer une notification via OneSignal REST API
 * 
 * ⚠️ IMPORTANT : Cette fonction nécessite votre REST API Key
 * À utiliser depuis un backend ou webhook sécurisé
 * 
 * @param {Object} params
 * @param {string[]} params.userEmails - Liste des emails des destinataires (admins uniquement)
 * @param {string} params.title - Titre de la notification
 * @param {string} params.message - Contenu de la notification
 * @param {string} params.url - URL à ouvrir au clic
 * @param {string} params.icon - URL de l'icône (optionnel)
 */
export async function sendOneSignalNotification({ userEmails, title, message, url, icon }) {
  // ⚠️ NE PAS UTILISER DIRECTEMENT - Nécessite REST API Key
  // Cette fonction est documentée pour référence
  // Utilisez un webhook Zapier/Make ou une Cloud Function à la place
  
  console.warn('[OneSignal] sendOneSignalNotification should be called from a secure backend, not from frontend');
  
  const ONESIGNAL_REST_API_KEY = 'YOUR_REST_API_KEY'; // ⚠️ NE JAMAIS METTRE ICI
  
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
        include_aliases: {
          external_id: userEmails // v16 utilise des aliases
        },
        target_channel: 'push',
        headings: { en: title },
        contents: { en: message },
        url: url,
        web_url: url,
        chrome_web_icon: icon || '/icon-192.png',
        firefox_icon: icon || '/icon-192.png',
        chrome_web_badge: '/icon-192.png',
        priority: 10,
        // 🔒 SÉCURITÉ : Cibler uniquement les admins
        filters: [
          { field: "tag", key: "isAdmin", relation: "=", value: "true" }
        ]
      })
    });

    const data = await response.json();
    console.log('[OneSignal] Notification sent to admins:', data);
    return data;
  } catch (error) {
    console.error('[OneSignal] Error sending notification:', error);
    throw error;
  }
}

/**
 * EXEMPLE D'UTILISATION dans votre code (pages/Chat.jsx)
 * 
 * Quand un message est envoyé, créez une notification :
 */
export function createChatNotification(senderName, message, chatId) {
  // Cette fonction sera appelée depuis votre backend ou webhook
  return {
    app_id: ONESIGNAL_APP_ID,
    // Cible : tous les admins sauf l'expéditeur
    filters: [
      { field: "tag", key: "isAdmin", relation: "=", value: "true" }
    ],
    headings: { en: `💌 ${senderName}` },
    contents: { en: message.length > 50 ? message.substring(0, 50) + '...' : message },
    url: `${window.location.origin}/Chat`,
    web_url: `${window.location.origin}/Chat`,
    chrome_web_icon: '/icon-192.png',
    priority: 10
  };
}