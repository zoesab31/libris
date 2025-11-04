
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Upload, Loader2, ArrowLeft, CheckCircle2, Trash2, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ImageCropper from "@/components/profile/ImageCropper";

export default function AccountSettings() {
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    display_name: "",
    profile_picture: "",
    theme: "light",
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setProfileData({
        full_name: u.full_name || "",
        display_name: u.display_name || "",
        profile_picture: u.profile_picture || "",
        theme: u.theme || "light",
      });
    }).catch(() => {});
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (blob) => {
    setUploading(true);
    setShowCropper(false);
    
    try {
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      const result = await base44.integrations.Core.UploadFile({ file });
      setProfileData({ ...profileData, profile_picture: result.file_url });
      toast.success("Photo recadrée et uploadée !");
    } catch (error) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
      setSelectedImage(null);
    }
  };

  const updateMutation = useMutation({
    mutationFn: () => base44.auth.updateMe(profileData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setShowSuccess(true);
      toast.success("✅ Profil mis à jour !");
      setTimeout(() => setShowSuccess(false), 2000);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      // Delete all user data
      const myBooks = await base44.entities.UserBook.filter({ created_by: user.email });
      const myComments = await base44.entities.ReadingComment.filter({ created_by: user.email });
      const myShelves = await base44.entities.CustomShelf.filter({ created_by: user.email });
      const myCharacters = await base44.entities.BookBoyfriend.filter({ created_by: user.email });
      const myGoals = await base44.entities.ReadingGoal.filter({ created_by: user.email });
      const myQuotes = await base44.entities.Quote.filter({ created_by: user.email });
      const myFanArts = await base44.entities.FanArt.filter({ created_by: user.email });
      const myNailInspos = await base44.entities.NailInspo.filter({ created_by: user.email });
      const myLocations = await base44.entities.ReadingLocation.filter({ created_by: user.email });
      const mySharedReadings = await base44.entities.SharedReading.filter({ created_by: user.email });
      const myFriendships = await base44.entities.Friendship.filter({ created_by: user.email });
      const myNotifications = await base44.entities.Notification.filter({ created_by: user.email });
      const myPoints = await base44.entities.ReadingPoints.filter({ created_by: user.email });
      const myBingos = await base44.entities.BingoChallenge.filter({ created_by: user.email });
      
      // Delete all in parallel
      await Promise.all([
        ...myBooks.map(b => base44.entities.UserBook.delete(b.id)),
        ...myComments.map(c => base44.entities.ReadingComment.delete(c.id)),
        ...myShelves.map(s => base44.entities.CustomShelf.delete(s.id)),
        ...myCharacters.map(c => base44.entities.BookBoyfriend.delete(c.id)),
        ...myGoals.map(g => base44.entities.ReadingGoal.delete(g.id)),
        ...myQuotes.map(q => base44.entities.Quote.delete(q.id)),
        ...myFanArts.map(f => base44.entities.FanArt.delete(f.id)),
        ...myNailInspos.map(n => base44.entities.NailInspo.delete(n.id)),
        ...myLocations.map(l => base44.entities.ReadingLocation.delete(l.id)),
        ...mySharedReadings.map(s => base44.entities.SharedReading.delete(s.id)),
        ...myFriendships.map(f => base44.entities.Friendship.delete(f.id)),
        ...myNotifications.map(n => base44.entities.Notification.delete(n.id)),
        ...myPoints.map(p => base44.entities.ReadingPoints.delete(p.id)),
        ...myBingos.map(b => base44.entities.BingoChallenge.delete(b.id)),
      ]);

      // Logout
      base44.auth.logout();
    },
    onSuccess: () => {
      toast.success("Compte supprimé avec succès");
      navigate("/");
    },
    onError: (error) => {
      console.error("Error deleting account:", error);
      toast.error("Erreur lors de la suppression du compte");
    }
  });

  if (!user) return null;

  const previewName = profileData.display_name || profileData.full_name?.split(' ')[0] || 'Lectrice';

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

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
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
                  onChange={handleFileSelect}
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
              <Label htmlFor="display_name">Nom d'affichage (Dashboard)</Label>
              <Input
                id="display_name"
                value={profileData.display_name}
                onChange={(e) => setProfileData({...profileData, display_name: e.target.value})}
                placeholder="Ex: Zoé, Clara, Marie..."
                className="text-lg"
              />
              <p className="text-xs mt-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--cream)', color: 'var(--dark-text)' }}>
                👀 Aperçu : "Bonjour <strong>{previewName}</strong> 📚"
              </p>
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

            {/* Theme selector */}
            <div>
              <Label htmlFor="theme">Thème de l'application</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setProfileData({...profileData, theme: "light"})}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    profileData.theme === "light" 
                      ? 'border-pink-500 bg-pink-50' 
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">☀️</div>
                    <p className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
                      Clair
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--warm-pink)' }}>
                      Thème lumineux
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setProfileData({...profileData, theme: "dark"})}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    profileData.theme === "dark" 
                      ? 'border-pink-500 bg-pink-50' 
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">🌙</div>
                    <p className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
                      Sombre
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--warm-pink)' }}>
                      Thème nuit
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="w-full text-white font-medium py-6 relative"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
            >
              {showSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2 animate-pulse" />
                  Enregistré !
                </>
              ) : updateMutation.isPending ? (
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

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-red-600">Zone dangereuse</h2>
          </div>
          <p className="text-sm mb-4 text-gray-600">
            La suppression de votre compte est irréversible. Toutes vos données seront définitivement supprimées.
          </p>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer mon compte
          </Button>
        </div>
      </div>

      {/* Image Cropper Dialog */}
      <Dialog open={showCropper} onOpenChange={setShowCropper}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recadrer votre photo</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <ImageCropper
              imageUrl={selectedImage}
              onCropComplete={handleCropComplete}
              onCancel={() => {
                setShowCropper(false);
                setSelectedImage(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              Confirmer la suppression du compte
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-4">
              <p className="font-semibold">Cette action est irréversible !</p>
              <p>Toutes vos données seront supprimées :</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Tous vos livres et commentaires</li>
                <li>Vos étagères personnalisées</li>
                <li>Vos personnages préférés</li>
                <li>Vos citations et fan arts</li>
                <li>Vos lectures communes</li>
                <li>Vos amitiés et notifications</li>
              </ul>
              <div className="pt-4">
                <Label htmlFor="confirm">
                  Tapez <strong>SUPPRIMER</strong> pour confirmer
                </Label>
                <Input
                  id="confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="mt-2"
                />
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmText("");
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteConfirmText !== "SUPPRIMER" || deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
