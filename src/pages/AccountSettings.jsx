import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Save, Upload, Loader2, Trash2, AlertTriangle, Trophy, Shield } from "lucide-react";
import { toast } from "sonner";
import ImageCropper from "@/components/profile/ImageCropper";
import BadgeDisplay from "@/components/badges/BadgeDisplay";

export default function AccountSettings() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
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

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const email = user?.email;
      const userId = user?.id;
      
      if (!email || !userId) {
        throw new Error("User email or ID is missing, cannot delete account data.");
      }

      // Supprimer toutes les données de l'utilisateur
      const userBooks = await base44.entities.UserBook.filter({ created_by: email });
      await Promise.all(userBooks.map(ub => base44.entities.UserBook.delete(ub.id)));
      
      const friendships = await base44.entities.Friendship.filter({ created_by: email });
      await Promise.all(friendships.map(f => base44.entities.Friendship.delete(f.id)));
      
      const sharedReadings = await base44.entities.SharedReading.filter({ created_by: email });
      await Promise.all(sharedReadings.map(sr => base44.entities.SharedReading.delete(sr.id)));
      
      const chatMessages = await base44.entities.ChatMessage.filter({ sender_email: email });
      await Promise.all(chatMessages.map(msg => base44.entities.ChatMessage.delete(msg.id)));
      
      const chatRooms = await base44.entities.ChatRoom.filter({ created_by: email });
      await Promise.all(chatRooms.map(room => base44.entities.ChatRoom.delete(room.id)));
      
      const quotes = await base44.entities.Quote.filter({ created_by: email });
      await Promise.all(quotes.map(q => base44.entities.Quote.delete(q.id)));
      
      const comments = await base44.entities.ReadingComment.filter({ created_by: email });
      await Promise.all(comments.map(c => base44.entities.ReadingComment.delete(c.id)));
      
      const notifications = await base44.entities.Notification.filter({ created_by: email });
      await Promise.all(notifications.map(n => base44.entities.Notification.delete(n.id)));
      
      const readingGoals = await base44.entities.ReadingGoal.filter({ created_by: email });
      await Promise.all(readingGoals.map(rg => base44.entities.ReadingGoal.delete(rg.id)));
      
      const bookSeries = await base44.entities.BookSeries.filter({ created_by: email });
      await Promise.all(bookSeries.map(bs => base44.entities.BookSeries.delete(bs.id)));
      
      const customShelves = await base44.entities.CustomShelf.filter({ created_by: email });
      await Promise.all(customShelves.map(cs => base44.entities.CustomShelf.delete(cs.id)));
      
      const bingoChallenges = await base44.entities.BingoChallenge.filter({ created_by: email });
      await Promise.all(bingoChallenges.map(bc => base44.entities.BingoChallenge.delete(bc.id)));
      
      const bookBoyfriends = await base44.entities.BookBoyfriend.filter({ created_by: email });
      await Promise.all(bookBoyfriends.map(bb => base44.entities.BookBoyfriend.delete(bb.id)));
      
      const fanArts = await base44.entities.FanArt.filter({ created_by: email });
      await Promise.all(fanArts.map(fa => base44.entities.FanArt.delete(fa.id)));
      
      const nailInspos = await base44.entities.NailInspo.filter({ created_by: email });
      await Promise.all(nailInspos.map(ni => base44.entities.NailInspo.delete(ni.id)));
      
      const readingLocations = await base44.entities.ReadingLocation.filter({ created_by: email });
      await Promise.all(readingLocations.map(rl => base44.entities.ReadingLocation.delete(rl.id)));
      
      const bookOfTheYear = await base44.entities.BookOfTheYear.filter({ created_by: email });
      await Promise.all(bookOfTheYear.map(boty => base44.entities.BookOfTheYear.delete(boty.id)));
      
      const readingLists = await base44.entities.ReadingList.filter({ created_by: email });
      await Promise.all(readingLists.map(rl => base44.entities.ReadingList.delete(rl.id)));
      
      const sharedReadingWishlists = await base44.entities.SharedReadingWishlist.filter({ created_by: email });
      await Promise.all(sharedReadingWishlists.map(srw => base44.entities.SharedReadingWishlist.delete(srw.id)));
      
      await base44.entities.User.delete(userId);
    },
    onSuccess: () => {
      toast.success("Compte supprimé avec succès");
      setTimeout(() => {
        base44.auth.logout();
        window.location.href = '/'; 
      }, 1000);
    },
    onError: (error) => {
      console.error("Error deleting account:", error);
      toast.error("Erreur lors de la suppression du compte: " + error.message);
    }
  });

  const handleDeleteAccount = () => {
    if (deleteConfirmText.toLowerCase() === "supprimer mon compte") {
      deleteAccountMutation.mutate();
    } else {
      toast.error("Veuillez taper exactement 'supprimer mon compte'");
    }
  };



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

          {/* Badges Section */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                <Trophy className="w-5 h-5" style={{ color: '#FFD700' }} />
                Mes badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BadgeDisplay user={user} />
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

          {/* Privacy Policy */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                <Shield className="w-5 h-5" style={{ color: '#FF1493' }} />
                Politique de confidentialité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4" style={{ color: '#4B5563' }}>
                Découvrez comment nous protégeons vos données et respectons votre vie privée.
              </p>
              <Button
                onClick={() => setShowPrivacyPolicy(true)}
                className="text-white"
                style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
              >
                Lire la politique de confidentialité
              </Button>
            </CardContent>
          </Card>

          {/* Delete Account - DANGER ZONE */}
          <Card className="border-0 shadow-lg" style={{ borderLeft: '4px solid #DC2626' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Zone dangereuse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#FEE2E2' }}>
                <p className="text-sm font-medium text-red-800 mb-2">
                  ⚠️ Attention : Cette action est irréversible !
                </p>
                <p className="text-xs text-red-700">
                  La suppression de votre compte entraînera la perte définitive de toutes vos données :
                </p>
                <ul className="text-xs text-red-700 mt-2 ml-4 list-disc space-y-1">
                  <li>Tous vos livres et lectures</li>
                  <li>Vos amitiés et messages</li>
                  <li>Vos citations et commentaires</li>
                  <li>Vos étagères personnalisées</li>
                  <li>Vos objectifs de lecture</li>
                  <li>Tous vos autres contenus</li>
                </ul>
              </div>

              {!showDeleteConfirm ? (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="outline"
                  className="w-full border-red-600 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer mon compte
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-red-700 font-medium">
                      Pour confirmer, tapez : <span className="font-bold">supprimer mon compte</span>
                    </Label>
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="supprimer mon compte"
                      className="mt-2 border-red-300 focus:border-red-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleDeleteAccount}
                      disabled={deleteAccountMutation.isPending || deleteConfirmText.toLowerCase() !== "supprimer mon compte"}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
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
                  </div>

                  <p className="text-xs text-center text-red-600 font-medium">
                    ⚠️ Cette action ne peut pas être annulée
                  </p>
                </div>
              )}
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

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacyPolicy} onOpenChange={setShowPrivacyPolicy}>
        <DialogContent className="max-h-[80vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--dark-text)' }}>Politique de Confidentialité</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm" style={{ color: '#4B5563' }}>
            <section>
              <h3 className="font-bold mb-2" style={{ color: 'var(--dark-text)' }}>1. Introduction</h3>
              <p>
                Nos Livres s'engage à protéger votre vie privée. Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos données personnelles.
              </p>
            </section>

            <section>
              <h3 className="font-bold mb-2" style={{ color: 'var(--dark-text)' }}>2. Données que nous collectons</h3>
              <ul className="list-disc ml-5 space-y-1">
                <li>Informations de profil : nom, email, photo de profil</li>
                <li>Données de lecture : livres lus, notes, évaluations, commentaires</li>
                <li>Contenu social : amies, messages, activités partagées</li>
                <li>Localisation : lieux où vous lisez (optionnel)</li>
                <li>Préférences : thème, paramètres de confidentialité</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold mb-2" style={{ color: 'var(--dark-text)' }}>3. Utilisation de vos données</h3>
              <p>Nous utilisons vos données pour :</p>
              <ul className="list-disc ml-5 space-y-1 mt-2">
                <li>Fournir et améliorer nos services</li>
                <li>Personnaliser votre expérience</li>
                <li>Créer des recommandations de livres</li>
                <li>Permettre les fonctionnalités sociales</li>
                <li>Assurer la sécurité de la plateforme</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold mb-2" style={{ color: 'var(--dark-text)' }}>4. Partage de données</h3>
              <p>
                Vos données ne sont partagées qu'avec vos amies sur la plateforme. Les administrateurs peuvent accéder à des données techniques pour gérer le service. Nous ne vendons jamais vos données à des tiers.
              </p>
            </section>

            <section>
              <h3 className="font-bold mb-2" style={{ color: 'var(--dark-text)' }}>5. Sécurité des données</h3>
              <p>
                Nous utilisons le chiffrement et les meilleures pratiques de sécurité pour protéger vos informations personnelles contre les accès non autorisés.
              </p>
            </section>

            <section>
              <h3 className="font-bold mb-2" style={{ color: 'var(--dark-text)' }}>6. Vos droits</h3>
              <p>Vous avez le droit de :</p>
              <ul className="list-disc ml-5 space-y-1 mt-2">
                <li>Accéder à vos données personnelles</li>
                <li>Modifier vos informations de profil</li>
                <li>Supprimer votre compte et vos données</li>
                <li>Contrôler vos paramètres de confidentialité</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold mb-2" style={{ color: 'var(--dark-text)' }}>7. Conservation des données</h3>
              <p>
                Vos données sont conservées tant que votre compte est actif. Vous pouvez supprimer votre compte à tout moment, ce qui entraînera l'effacement de toutes vos données.
              </p>
            </section>

            <section>
              <h3 className="font-bold mb-2" style={{ color: 'var(--dark-text)' }}>8. Modifications de cette politique</h3>
              <p>
                Nous pouvons mettre à jour cette politique de confidentialité de temps en temps. Les modifications seront affichées sur cette page.
              </p>
            </section>

            <section>
              <h3 className="font-bold mb-2" style={{ color: 'var(--dark-text)' }}>9. Contact</h3>
              <p>
                Si vous avez des questions concernant cette politique de confidentialité ou vos données, veuillez nous contacter via l'adresse email associée à votre compte.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}