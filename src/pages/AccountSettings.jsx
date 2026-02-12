import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Trophy } from "lucide-react";
import { User, Save, Upload, Loader2, Moon, Sun, Trash2, AlertTriangle, Palette, Lightbulb, Send } from "lucide-react";
import { toast } from "sonner";
import ImageCropper from "@/components/profile/ImageCropper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import BadgeDisplay from "@/components/badges/BadgeDisplay";

export default function AccountSettings() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [suggestionTitle, setSuggestionTitle] = useState("");
  const [suggestionDescription, setSuggestionDescription] = useState("");
  const [suggestionCategory, setSuggestionCategory] = useState("nouvelle_fonctionnalité");
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

  const sendSuggestionMutation = useMutation({
    mutationFn: async (data) => {
      const suggestion = await base44.entities.Suggestion.create(data);
      
      // Notify all admins
      const allUsers = await base44.entities.User.list();
      const admins = allUsers.filter(u => u.role === 'admin');
      
      await Promise.all(
        admins.map(admin => 
          base44.entities.Notification.create({
            type: "system",
            title: `💡 Nouvelle suggestion`,
            message: `${user?.display_name || user?.full_name} : ${data.title}`,
            link_type: "suggestion",
            link_id: suggestion.id,
            created_by: admin.email,
            is_read: false
          })
        )
      );
    },
    onSuccess: () => {
      toast.success("✅ Suggestion envoyée aux admins !");
      setSuggestionTitle("");
      setSuggestionDescription("");
      setSuggestionCategory("nouvelle_fonctionnalité");
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi de la suggestion");
    }
  });

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

          {/* Suggestions */}
          {user?.role !== 'admin' && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                  <Lightbulb className="w-5 h-5" style={{ color: '#F59E0B' }} />
                  Suggérer une amélioration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                  Vous avez une idée pour améliorer l'application ? Partagez-la avec les admins !
                </p>
                
                <div>
                  <Label>Titre de la suggestion</Label>
                  <Input
                    value={suggestionTitle}
                    onChange={(e) => setSuggestionTitle(e.target.value)}
                    placeholder="Ex: Ajouter un système de notation par étoiles"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={suggestionDescription}
                    onChange={(e) => setSuggestionDescription(e.target.value)}
                    placeholder="Décrivez votre idée en détail..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Catégorie</Label>
                  <Select value={suggestionCategory} onValueChange={setSuggestionCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nouvelle_fonctionnalité">🆕 Nouvelle fonctionnalité</SelectItem>
                      <SelectItem value="amélioration">✨ Amélioration</SelectItem>
                      <SelectItem value="bug">🐛 Bug à corriger</SelectItem>
                      <SelectItem value="contenu">📚 Contenu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => {
                    if (!suggestionTitle.trim() || !suggestionDescription.trim()) {
                      toast.error("Veuillez remplir tous les champs");
                      return;
                    }
                    sendSuggestionMutation.mutate({
                      title: suggestionTitle,
                      description: suggestionDescription,
                      category: suggestionCategory
                    });
                  }}
                  disabled={sendSuggestionMutation.isPending || !suggestionTitle.trim() || !suggestionDescription.trim()}
                  className="w-full text-white"
                  style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                >
                  {sendSuggestionMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer ma suggestion
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

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
    </div>
  );
}