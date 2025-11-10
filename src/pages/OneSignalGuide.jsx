
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Circle, Copy, ExternalLink, Bell, Smartphone, Globe, Code, Shield, Lock } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const steps = [
  {
    id: 1,
    title: "Créer un compte OneSignal",
    description: "Inscrivez-vous gratuitement sur OneSignal",
    icon: Globe,
    color: "#FF69B4",
  },
  {
    id: 2,
    title: "Créer votre App Web",
    description: "Configurez votre application Web Push",
    icon: Bell,
    color: "#9B59B6",
  },
  {
    id: 3,
    title: "Récupérer votre App ID",
    description: "Copiez l'identifiant unique de votre app",
    icon: Code,
    color: "#FF6B9D",
  },
  {
    id: 4,
    title: "Configuration dans l'app",
    description: "Ajoutez le code dans votre application",
    icon: Smartphone,
    color: "#E6B3E8",
  },
];

export default function OneSignalGuide() {
  const [currentStep, setCurrentStep] = useState(1);
  const [appId, setAppId] = useState("6a28ef87-f515-4193-8df1-529268523ebb");
  const [siteUrl, setSiteUrl] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // 🔒 SÉCURITÉ : Vérifier si l'utilisateur est admin
  const isAdmin = user?.role === 'admin';

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié !");
  };

  const generateIndexHtml = () => {
    return `<!-- Ajoutez ce code dans la section <head> de votre index.html -->

<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(function(OneSignal) {
    OneSignal.init({
      appId: "${appId || 'VOTRE_APP_ID_ICI'}",
    });
  });
</script>`;
  };

  const generateSetupCode = () => {
    return `// Dans components/notifications/OneSignalSetup.jsx
// Ligne 31, remplacez :

const ONESIGNAL_APP_ID = '${appId || 'YOUR_ONESIGNAL_APP_ID'}';`;
  };

  // 🔒 Afficher message si non-admin
  if (!isAdmin) {
    return (
      <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-xl border-0">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                     style={{ backgroundColor: '#FFF3E0' }}>
                  <Shield className="w-10 h-10" style={{ color: '#F57C00' }} />
                </div>
                <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--dark-text)' }}>
                  🔒 Accès Réservé aux Administrateurs
                </h1>
                <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
                  La configuration OneSignal est disponible uniquement pour les comptes administrateurs.
                </p>
                
                <div className="p-6 rounded-xl mb-6" style={{ backgroundColor: '#E0F2FE' }}>
                  <div className="flex items-start gap-3 text-left">
                    <Lock className="w-5 h-5 flex-shrink-0 mt-1" style={{ color: '#0369A1' }} />
                    <div>
                      <h3 className="font-bold mb-2" style={{ color: '#0369A1' }}>
                        Pourquoi cette restriction ?
                      </h3>
                      <ul className="text-sm space-y-2" style={{ color: '#075985' }}>
                        <li>• <strong>Sécurité :</strong> Les notifications push nécessitent des clés API sensibles</li>
                        <li>• <strong>Contrôle :</strong> Les admins gèrent qui peut envoyer des notifications</li>
                        <li>• <strong>Configuration :</strong> Setup technique réservé aux administrateurs</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-xl" style={{ backgroundColor: '#D1FAE5' }}>
                  <h3 className="font-bold mb-2 text-green-900">
                    ✅ Ce qui fonctionne pour vous
                  </h3>
                  <ul className="text-sm space-y-2 text-left text-green-800">
                    <li>• <strong>Notifications in-app</strong> : Badge rouge et cloche</li>
                    <li>• <strong>Messages en temps réel</strong> : Mise à jour instantanée</li>
                    <li>• <strong>Marquage automatique</strong> : Messages lus automatiquement</li>
                    <li>• <strong>Deep links</strong> : Accès direct aux conversations</li>
                  </ul>
                </div>

                <p className="text-sm mt-6" style={{ color: 'var(--warm-brown)' }}>
                  Pour devenir administrateur, contactez l'administrateur principal de l'application.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Admin Badge */}
        <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: '#E0F2FE' }}>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6" style={{ color: '#0369A1' }} />
            <div>
              <p className="font-bold" style={{ color: '#0369A1' }}>
                ✨ Accès Administrateur
              </p>
              <p className="text-sm" style={{ color: '#075985' }}>
                Vous avez accès à la configuration OneSignal
              </p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
               style={{ background: 'linear-gradient(135deg, #FF69B4, #9B59B6)' }}>
            <Bell className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
              🔔 Configuration OneSignal
            </h1>
            <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
              Guide pas à pas pour activer les notifications push
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      currentStep > step.id ? 'shadow-lg' : currentStep === step.id ? 'shadow-xl scale-110' : ''
                    }`}
                    style={{
                      backgroundColor: currentStep >= step.id ? step.color : '#E0E0E0',
                      color: 'white'
                    }}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <step.icon className="w-6 h-6" />
                    )}
                  </div>
                  <p className={`text-xs text-center font-medium hidden md:block ${
                    currentStep >= step.id ? 'opacity-100' : 'opacity-50'
                  }`} style={{ color: 'var(--dark-text)' }}>
                    {step.title}
                  </p>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-1 rounded-full mx-2 mb-8"
                       style={{
                         backgroundColor: currentStep > step.id ? step.color : '#E0E0E0'
                       }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="shadow-xl border-0 mb-6">
          <CardHeader className="border-b" style={{ borderColor: 'var(--beige)' }}>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ backgroundColor: steps[currentStep - 1].color }}>
                <span className="text-white font-bold">{currentStep}</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--dark-text)' }}>
                  {steps[currentStep - 1].title}
                </h2>
                <p style={{ color: 'var(--warm-pink)' }}>
                  {steps[currentStep - 1].description}
                </p>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="p-6 rounded-xl" style={{ backgroundColor: '#FFF3F7' }}>
                  <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                    📝 Créer votre compte OneSignal
                  </h3>
                  <ol className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                           style={{ backgroundColor: '#FF69B4' }}>
                        1
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: 'var(--dark-text)' }}>
                          Allez sur <strong>onesignal.com</strong>
                        </p>
                        <a 
                          href="https://onesignal.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-2 inline-block"
                        >
                          <Button className="text-white">
                            Ouvrir OneSignal
                            <ExternalLink className="w-4 h-4 ml-2" />
                          </Button>
                        </a>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                           style={{ backgroundColor: '#FF69B4' }}>
                        2
                      </div>
                      <p className="font-medium" style={{ color: 'var(--dark-text)' }}>
                        Cliquez sur <strong>"Get Started Free"</strong>
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                           style={{ backgroundColor: '#FF69B4' }}>
                        3
                      </div>
                      <p className="font-medium" style={{ color: 'var(--dark-text)' }}>
                        Créez votre compte (Email + Mot de passe)
                      </p>
                    </li>
                  </ol>
                </div>

                <div className="p-4 rounded-xl" style={{ backgroundColor: '#E0E7FF' }}>
                  <p className="text-sm font-medium" style={{ color: '#4C1D95' }}>
                    💎 <strong>Gratuit</strong> jusqu'à 10,000 utilisateurs • Aucune carte bancaire requise
                  </p>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="p-6 rounded-xl" style={{ backgroundColor: '#F3F0FF' }}>
                  <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                    🚀 Créer votre App Web Push
                  </h3>
                  <ol className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                           style={{ backgroundColor: '#9B59B6' }}>
                        1
                      </div>
                      <p className="font-medium" style={{ color: 'var(--dark-text)' }}>
                        Dans le Dashboard OneSignal, cliquez sur <strong>"New App/Website"</strong>
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                           style={{ backgroundColor: '#9B59B6' }}>
                        2
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-2" style={{ color: 'var(--dark-text)' }}>
                          Nom de l'app : <strong>"Nos Livres"</strong>
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                           style={{ backgroundColor: '#9B59B6' }}>
                        3
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-2" style={{ color: 'var(--dark-text)' }}>
                          Sélectionnez la plateforme : <strong>Web</strong>
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                           style={{ backgroundColor: '#9B59B6' }}>
                        4
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-3" style={{ color: 'var(--dark-text)' }}>
                          Configuration du site :
                        </p>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">Site URL (votre domaine Base44)</Label>
                            <Input
                              value={siteUrl}
                              onChange={(e) => setSiteUrl(e.target.value)}
                              placeholder="https://votre-app.base44.com"
                              className="mt-1"
                            />
                          </div>
                          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--cream)' }}>
                            <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                              💡 Astuce : Vous pouvez trouver votre URL dans la barre d'adresse de votre navigateur
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="p-6 rounded-xl" style={{ backgroundColor: '#FFF3F7' }}>
                  <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                    🔑 Récupérer votre App ID
                  </h3>
                  <ol className="space-y-4 mb-6">
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                           style={{ backgroundColor: '#FF6B9D' }}>
                        1
                      </div>
                      <p className="font-medium" style={{ color: 'var(--dark-text)' }}>
                        Dans OneSignal Dashboard, allez dans <strong>Settings → Keys & IDs</strong>
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                           style={{ backgroundColor: '#FF6B9D' }}>
                        2
                      </div>
                      <p className="font-medium" style={{ color: 'var(--dark-text)' }}>
                        Copiez votre <strong>OneSignal App ID</strong>
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                           style={{ backgroundColor: '#FF6B9D' }}>
                        3
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-3" style={{ color: 'var(--dark-text)' }}>
                          Collez-le ici :
                        </p>
                        <Input
                          value={appId}
                          onChange={(e) => setAppId(e.target.value)}
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          className="font-mono"
                        />
                        {appId && (
                          <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
                            <p className="text-sm font-medium text-green-800">
                              ✅ App ID valide détecté !
                            </p>
                          </div>
                        )}
                      </div>
                    </li>
                  </ol>

                  <a 
                    href="https://app.onesignal.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button className="w-full text-white"
                            style={{ background: 'linear-gradient(135deg, #FF6B9D, #E6B3E8)' }}>
                      Ouvrir OneSignal Dashboard
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="p-6 rounded-xl" style={{ backgroundColor: '#F0E6FF' }}>
                  <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                    💻 Intégrer dans votre app
                  </h3>
                  
                  {appId ? (
                    <div className="space-y-6">
                      {/* Code pour index.html */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="font-bold">1️⃣ Script pour index.html</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(generateIndexHtml())}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copier
                          </Button>
                        </div>
                        <pre className="p-4 rounded-lg overflow-x-auto text-xs"
                             style={{ backgroundColor: '#2D3748', color: '#E2E8F0' }}>
                          <code>{generateIndexHtml()}</code>
                        </pre>
                        <p className="text-sm mt-2" style={{ color: 'var(--warm-pink)' }}>
                          📝 Ajoutez ce code dans la section <code>&lt;head&gt;</code> de votre fichier <code>public/index.html</code>
                        </p>
                      </div>

                      {/* Code pour OneSignalSetup.jsx */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="font-bold">2️⃣ Configuration dans OneSignalSetup.jsx</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(generateSetupCode())}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copier
                          </Button>
                        </div>
                        <pre className="p-4 rounded-lg overflow-x-auto text-xs"
                             style={{ backgroundColor: '#2D3748', color: '#E2E8F0' }}>
                          <code>{generateSetupCode()}</code>
                        </pre>
                        <p className="text-sm mt-2" style={{ color: 'var(--warm-pink)' }}>
                          📝 Remplacez l'App ID à la ligne 31 du fichier <code>components/notifications/OneSignalSetup.jsx</code>
                        </p>
                      </div>

                      {/* Success message */}
                      <div className="p-6 rounded-xl text-center"
                           style={{ background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' }}>
                        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
                        <h3 className="text-2xl font-bold mb-2 text-green-900">
                          🎉 Configuration terminée !
                        </h3>
                        <p className="text-sm text-green-800 mb-4">
                          Redémarrez votre app et testez les notifications dans <strong>Paramètres → Notifications</strong>
                        </p>
                        <div className="space-y-2">
                          <Button
                            onClick={() => window.location.reload()}
                            className="w-full text-white"
                            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                          >
                            🔄 Redémarrer l'app
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => window.location.href = '/AccountSettings'}
                            className="w-full"
                          >
                            ⚙️ Aller aux paramètres
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Bell className="w-20 h-20 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                      <p className="text-lg font-medium mb-2" style={{ color: 'var(--dark-text)' }}>
                        App ID requis
                      </p>
                      <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                        Retournez à l'étape 3 pour saisir votre App ID
                      </p>
                      <Button
                        onClick={() => setCurrentStep(3)}
                        className="mt-4"
                        variant="outline"
                      >
                        ← Retour à l'étape 3
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            variant="outline"
            className="px-6"
          >
            ← Précédent
          </Button>
          <Button
            onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
            disabled={currentStep === 4}
            className="px-6 text-white"
            style={{ background: 'linear-gradient(135deg, #FF69B4, #9B59B6)' }}
          >
            Suivant →
          </Button>
        </div>

        {/* Help Card */}
        <Card className="mt-8 border-0 shadow-lg">
          <CardContent className="p-6" style={{ backgroundColor: '#FFF9E6' }}>
            <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#D97706' }}>
              💡 Besoin d'aide ?
            </h3>
            <div className="space-y-2 text-sm" style={{ color: '#92400E' }}>
              <p>• 📚 <a href="https://documentation.onesignal.com/docs/web-push-quickstart" 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="underline hover:no-underline">
                Documentation OneSignal officielle
              </a></p>
              <p>• 🎥 <a href="https://www.youtube.com/results?search_query=onesignal+web+push+tutorial" 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="underline hover:no-underline">
                Tutoriels vidéo sur YouTube
              </a></p>
              <p>• 💬 Support OneSignal : Très réactif via chat dans le dashboard</p>
              <p>• 📖 Le fichier <code className="px-2 py-1 rounded bg-white">ONESIGNAL_SETUP_INSTRUCTIONS.md</code> contient tous les détails</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
