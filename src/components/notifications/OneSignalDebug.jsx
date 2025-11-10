import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";

/**
 * OneSignal Debug Tool
 * Affiche l'état complet de OneSignal pour diagnostiquer les problèmes
 */
export default function OneSignalDebug() {
  const [debugInfo, setDebugInfo] = useState({
    loading: true,
    checks: []
  });

  const runDiagnostics = async () => {
    setDebugInfo({ loading: true, checks: [] });
    const checks = [];

    // Check 1: Window object
    checks.push({
      name: "1. JavaScript chargé",
      status: typeof window !== 'undefined' ? 'success' : 'error',
      message: typeof window !== 'undefined' ? '✅ Window disponible' : '❌ Window non disponible'
    });

    // Check 2: OneSignal script loaded
    checks.push({
      name: "2. Script OneSignal",
      status: typeof window !== 'undefined' && window.OneSignal ? 'success' : 'error',
      message: typeof window !== 'undefined' && window.OneSignal 
        ? '✅ Script OneSignal chargé' 
        : '❌ Script OneSignal non chargé',
      details: typeof window !== 'undefined' && window.OneSignal 
        ? `Type: ${typeof window.OneSignal}`
        : 'Vérifiez que OneSignalLoader.jsx fonctionne'
    });

    // Check 3: OneSignal v16 API
    checks.push({
      name: "3. API OneSignal v16",
      status: typeof window !== 'undefined' && window.OneSignal && window.OneSignal.User ? 'success' : 'error',
      message: typeof window !== 'undefined' && window.OneSignal && window.OneSignal.User
        ? '✅ API v16 disponible'
        : '❌ API v16 non disponible',
      details: typeof window !== 'undefined' && window.OneSignal && window.OneSignal.User
        ? 'User, Notifications, PushSubscription présents'
        : 'Attendez que OneSignal se charge ou rechargez la page'
    });

    // Check 4: Browser support
    checks.push({
      name: "4. Support navigateur",
      status: 'Notification' in window ? 'success' : 'error',
      message: 'Notification' in window 
        ? '✅ Notifications supportées' 
        : '❌ Notifications non supportées',
      details: 'Notification' in window 
        ? `Permission: ${Notification.permission}`
        : 'Navigateur trop ancien'
    });

    // Check 5: Notification permission
    if ('Notification' in window) {
      const permission = Notification.permission;
      checks.push({
        name: "5. Permission navigateur",
        status: permission === 'granted' ? 'success' : permission === 'denied' ? 'error' : 'warning',
        message: permission === 'granted' 
          ? '✅ Permission accordée' 
          : permission === 'denied'
          ? '❌ Permission refusée'
          : '⚠️ Permission non demandée',
        details: `Status: ${permission}`
      });
    }

    // Check 6: OneSignal subscription status
    if (typeof window !== 'undefined' && window.OneSignal && window.OneSignal.User) {
      try {
        const isOptedIn = window.OneSignal.User.PushSubscription.optedIn;
        checks.push({
          name: "6. Abonnement OneSignal",
          status: isOptedIn ? 'success' : 'warning',
          message: isOptedIn 
            ? '✅ Abonné aux notifications' 
            : '⚠️ Non abonné',
          details: `optedIn: ${isOptedIn}`
        });

        // Check 7: Player ID
        const playerId = window.OneSignal.User.PushSubscription.id;
        checks.push({
          name: "7. Player ID OneSignal",
          status: playerId ? 'success' : 'warning',
          message: playerId 
            ? `✅ Player ID: ${playerId.substring(0, 8)}...` 
            : '⚠️ Pas de Player ID',
          details: playerId || 'Abonnez-vous pour obtenir un ID'
        });
      } catch (error) {
        checks.push({
          name: "6. Abonnement OneSignal",
          status: 'error',
          message: '❌ Erreur lors de la vérification',
          details: error.message
        });
      }
    }

    // Check 8: Service Worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        checks.push({
          name: "8. Service Worker",
          status: registration ? 'success' : 'warning',
          message: registration 
            ? '✅ Service Worker enregistré' 
            : '⚠️ Pas de Service Worker',
          details: registration ? `Scope: ${registration.scope}` : 'OneSignal enregistrera le SW automatiquement'
        });
      } catch (error) {
        checks.push({
          name: "8. Service Worker",
          status: 'error',
          message: '❌ Erreur Service Worker',
          details: error.message
        });
      }
    }

    // Check 9: HTTPS
    checks.push({
      name: "9. Connexion sécurisée",
      status: window.location.protocol === 'https:' || window.location.hostname === 'localhost' ? 'success' : 'error',
      message: window.location.protocol === 'https:' || window.location.hostname === 'localhost'
        ? '✅ HTTPS actif'
        : '❌ HTTPS requis',
      details: `Protocol: ${window.location.protocol}`
    });

    // Check 10: Domain
    checks.push({
      name: "10. Domaine",
      status: 'success',
      message: `✅ ${window.location.hostname}`,
      details: `Ce domaine doit être autorisé dans le dashboard OneSignal`
    });

    setDebugInfo({ loading: false, checks });
  };

  useEffect(() => {
    // Wait for OneSignal to load
    const timer = setTimeout(runDiagnostics, 2000);
    return () => clearTimeout(timer);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return '#D1FAE5';
      case 'warning':
        return '#FEF3C7';
      case 'error':
        return '#FEE2E2';
      default:
        return '#F3F4F6';
    }
  };

  const successCount = debugInfo.checks.filter(c => c.status === 'success').length;
  const errorCount = debugInfo.checks.filter(c => c.status === 'error').length;
  const warningCount = debugInfo.checks.filter(c => c.status === 'warning').length;

  return (
    <Card className="border-2 shadow-lg" style={{ borderColor: '#9B59B6' }}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            🔍 Diagnostic OneSignal
          </span>
          <Button
            onClick={runDiagnostics}
            size="sm"
            variant="outline"
            disabled={debugInfo.loading}
          >
            {debugInfo.loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="ml-2">Rafraîchir</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {debugInfo.loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#9B59B6' }} />
            <p className="text-sm text-gray-600">Diagnostic en cours...</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#D1FAE5' }}>
                <div className="text-2xl font-bold text-green-700">{successCount}</div>
                <div className="text-xs text-green-600">Réussis</div>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#FEF3C7' }}>
                <div className="text-2xl font-bold text-yellow-700">{warningCount}</div>
                <div className="text-xs text-yellow-600">Avertissements</div>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#FEE2E2' }}>
                <div className="text-2xl font-bold text-red-700">{errorCount}</div>
                <div className="text-xs text-red-600">Erreurs</div>
              </div>
            </div>

            {/* Checks list */}
            <div className="space-y-3">
              {debugInfo.checks.map((check, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl border-2"
                  style={{
                    backgroundColor: getStatusColor(check.status),
                    borderColor: check.status === 'error' ? '#FCA5A5' : 'transparent'
                  }}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(check.status)}
                    <div className="flex-1">
                      <p className="font-bold text-sm mb-1">{check.name}</p>
                      <p className="text-sm mb-1">{check.message}</p>
                      {check.details && (
                        <p className="text-xs text-gray-600 font-mono">{check.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action recommendations */}
            {errorCount > 0 && (
              <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: '#FEE2E2' }}>
                <p className="font-bold text-red-800 mb-2">⚠️ Actions recommandées :</p>
                <ul className="text-sm text-red-700 space-y-1 ml-4">
                  {debugInfo.checks.filter(c => c.status === 'error').map((check, index) => (
                    <li key={index} className="list-disc">
                      {check.name} : {check.details}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Console logs section */}
            <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: '#E0E7FF' }}>
              <p className="font-bold text-sm mb-2" style={{ color: '#4C1D95' }}>
                💡 Pour plus de détails :
              </p>
              <p className="text-xs" style={{ color: '#5B21B6' }}>
                1. Ouvrez la console (F12 → Console)<br/>
                2. Filtrez par "OneSignal"<br/>
                3. Copiez tous les messages et envoyez-les moi
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}