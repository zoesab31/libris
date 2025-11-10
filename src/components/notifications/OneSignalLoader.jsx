import { useEffect } from 'react';

/**
 * Charge OneSignal dynamiquement dans l'app
 * Utile si public/index.html n'est pas utilisé par Base44
 */
export default function OneSignalLoader() {
  useEffect(() => {
    // Vérifier si déjà chargé
    if (window.OneSignal) {
      console.log('[OneSignal] Already loaded');
      return;
    }

    console.log('[OneSignal] Loading script dynamically...');

    // Créer et injecter le script OneSignal
    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.async = true;
    script.onload = () => {
      console.log('[OneSignal] Script loaded successfully');
      
      // Initialiser OneSignal
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({
          appId: "6a28ef87-f515-4193-8df1-529268523ebb",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: false,
          },
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: "push",
                  autoPrompt: false,
                  text: {
                    actionMessage: "Recevez des notifications pour vos nouveaux messages 💌",
                    acceptButton: "Autoriser",
                    cancelButton: "Plus tard"
                  }
                }
              ]
            }
          },
          welcomeNotification: {
            disable: true,
          }
        });
        console.log('[OneSignal] Initialized successfully');
      });
    };
    script.onerror = () => {
      console.error('[OneSignal] Failed to load script');
    };

    document.head.appendChild(script);

    // Cleanup
    return () => {
      // Ne pas retirer le script car il peut être utilisé ailleurs
    };
  }, []);

  return null;
}