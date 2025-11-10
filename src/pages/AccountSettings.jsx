import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { User, Save, Upload, Loader2, Moon, Sun, Bell } from "lucide-react";
import { toast } from "sonner";
import ImageCropper from "@/components/profile/ImageCropper";
import PushNotificationSetup from "@/components/notifications/PushNotificationSetup";

export default function AccountSettings() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setDisplayName(u.display_name || "");
    }).catch(() => {});
  }, []);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success("Profil mis à jour !");
      base44.auth.me().then(setUser);
    },
  });

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCroppedImage = async (croppedImageUrl) => {
    try {
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], "profile.jpg", { type: "image/jpeg" });
      
      const result = await base44.integrations.Core.UploadFile({ file });
      await updateProfileMutation.mutateAsync({ profile_picture: result.file_url });
      
      setShowCropper(false);
      setSelectedImage(null);
    } catch (error) {
      console.error("Error uploading cropped image:", error);
      toast.error("Erreur lors de l'upload de l'image");
    }
  };

  const toggleTheme = () => {
    const newTheme = user?.theme === 'dark' ? 'light' : 'dark';
    updateProfileMutation.mutate({ theme: newTheme });
  };

  const isDark = user?.theme === 'dark';

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
               style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
            <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--dark-text)' }}>
              Paramètres du compte
            </h1>
            <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
              Personnalisez votre profil
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Picture */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle style={{ color: 'var(--dark-text)' }}>Photo de profil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full overflow-hidden"
                     style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
                  {user?.profile_picture ? (
                    <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                      {user?.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label htmlFor="profile-picture" className="cursor-pointer">
                    <input
                      id="profile-picture"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <Button asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Changer la photo
                      </span>
                    </Button>
                  </label>
                  <p className="text-sm mt-2" style={{ color: 'var(--warm-pink)' }}>
                    JPG, PNG ou GIF • Max 5MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Name */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle style={{ color: 'var(--dark-text)' }}>Nom d'affichage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nom affiché sur votre profil</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Votre nom"
                />
              </div>
              <Button
                onClick={() => updateProfileMutation.mutate({ display_name: displayName })}
                disabled={updateProfileMutation.isPending || !displayName.trim()}
                className="text-white"
                style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Theme Toggle */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle style={{ color: 'var(--dark-text)' }}>Thème de l'application</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  <div>
                    <p className="font-medium" style={{ color: 'var(--dark-text)' }}>
                      Mode {isDark ? 'sombre' : 'clair'}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                      {isDark ? 'Parfait pour lire le soir' : 'Interface lumineuse et colorée'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                  disabled={updateProfileMutation.isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* Push Notifications Setup */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PushNotificationSetup user={user} />
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle style={{ color: 'var(--dark-text)' }}>Informations du compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Email</Label>
                <p className="text-sm font-medium" style={{ color: 'var(--warm-pink)' }}>
                  {user?.email}
                </p>
              </div>
              <div>
                <Label>Rôle</Label>
                <p className="text-sm font-medium" style={{ color: 'var(--warm-pink)' }}>
                  {user?.role === 'admin' ? '👑 Administrateur' : '👤 Utilisateur'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showCropper && selectedImage && (
        <ImageCropper
          imageUrl={selectedImage}
          onCropComplete={handleCroppedImage}
          onCancel={() => {
            setShowCropper(false);
            setSelectedImage(null);
          }}
        />
      )}
    </div>
  );
}