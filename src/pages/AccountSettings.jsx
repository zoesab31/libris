import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Upload, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function AccountSettings() {
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    profile_picture: "",
  });
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setProfileData({
        full_name: u.full_name || "",
        profile_picture: u.profile_picture || "",
      });
    }).catch(() => {});
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setProfileData({ ...profileData, profile_picture: result.file_url });
      toast.success("Photo uploadée !");
    } catch (error) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: () => base44.auth.updateMe(profileData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success("Profil mis à jour !");
    },
  });

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-2xl mx-auto">
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
               style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
            <User className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
              Paramètres du compte
            </h1>
            <p className="text-lg font-medium" style={{ color: 'var(--deep-pink)' }}>
              Gérez votre profil
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full overflow-hidden shadow-lg"
                   style={{ backgroundColor: 'var(--beige)' }}>
                {profileData.profile_picture ? (
                  <img src={profileData.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-white"
                       style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
                    {user.full_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button variant="outline" disabled={uploading} asChild>
                  <span>
                    {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Changer la photo
                  </span>
                </Button>
              </label>
            </div>

            <div>
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                value={profileData.full_name}
                onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                placeholder="Votre nom"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="opacity-50"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--deep-pink)' }}>
                L'email ne peut pas être modifié
              </p>
            </div>

            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="w-full text-white font-medium py-6"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer les modifications"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}