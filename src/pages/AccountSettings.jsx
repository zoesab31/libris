import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { User, Save, Upload, Loader2, Trash2, AlertTriangle, Trophy, Heart, Users, Plus } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImageCropper from "@/components/profile/ImageCropper";
import BadgeDisplay from "@/components/badges/BadgeDisplay";
import AddBookBoyfriendDialog from "@/components/profile/AddBookBoyfriendDialog";
import BookBoyfriendCard from "@/components/profile/BookBoyfriendCard";
import AddFavoriteCoupleDialog from "@/components/profile/AddFavoriteCoupleDialog";
import FavoriteCoupleCard from "@/components/profile/FavoriteCoupleCard";

export default function AccountSettings() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddCoupleDialog, setShowAddCoupleDialog] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [editingCouple, setEditingCouple] = useState(null);
  const [selectedTab, setSelectedTab] = useState("male");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setDisplayName(u.display_name || "");
    }).catch(() => {});
  }, []);

  const { data: bookBoyfriends = [] } = useQuery({
    queryKey: ['bookBoyfriends'],
    queryFn: () => base44.entities.BookBoyfriend.filter({ created_by: user?.email }, 'rank'),
    enabled: !!user,
  });

  const { data: favoriteCouples = [] } = useQuery({
    queryKey: ['favoriteCouples'],
    queryFn: () => base44.entities.FavoriteCouple.filter({ created_by: user?.email }, 'rank'),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const maleCharacters = bookBoyfriends.filter(bf => !bf.gender || bf.gender === 'male');
  const femaleCharacters = bookBoyfriends.filter(bf => bf.gender === 'female');

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

  const handleEdit = (character) => {
    setEditingCharacter(character);
    setShowAddDialog(true);
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingCharacter(null);
  };

  const handleEditCouple = (couple) => {
    setEditingCouple(couple);
    setShowAddCoupleDialog(true);
  };

  const handleCloseCoupleDialog = () => {
    setShowAddCoupleDialog(false);
    setEditingCouple(null);
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

          {/* Favorite Characters Section */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between" style={{ color: 'var(--dark-text)' }}>
                <span className="flex items-center gap-2">
                  <Heart className="w-5 h-5" style={{ color: 'var(--soft-pink)' }} />
                  Mes personnages préférés
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="bg-white shadow-md p-2 rounded-xl border-0 mb-6 grid grid-cols-3 w-full">
                  <TabsTrigger 
                    value="male" 
                    className="rounded-lg font-semibold text-sm"
                  >
                    <User className="w-4 h-4 mr-1 inline" />
                    Masculins ({maleCharacters.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="female" 
                    className="rounded-lg font-semibold text-sm"
                  >
                    <User className="w-4 h-4 mr-1 inline" />
                    Féminins ({femaleCharacters.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="couples" 
                    className="rounded-lg font-semibold text-sm"
                  >
                    <Users className="w-4 h-4 mr-1 inline" />
                    Couples ({favoriteCouples.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="male">
                  {maleCharacters.length > 0 ? (
                    <div className="grid gap-4">
                      {maleCharacters.map((char) => {
                        const book = allBooks.find(b => b.id === char.book_id);
                        return (
                          <BookBoyfriendCard 
                            key={char.id} 
                            character={char} 
                            book={book}
                            onEdit={handleEdit}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--soft-pink)' }} />
                      <p className="text-sm mb-4" style={{ color: 'var(--warm-pink)' }}>
                        Aucun personnage masculin
                      </p>
                      <Button 
                        onClick={() => setShowAddDialog(true)}
                        size="sm"
                        style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                        className="text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="female">
                  {femaleCharacters.length > 0 ? (
                    <div className="grid gap-4">
                      {femaleCharacters.map((char) => {
                        const book = allBooks.find(b => b.id === char.book_id);
                        return (
                          <BookBoyfriendCard 
                            key={char.id} 
                            character={char} 
                            book={book}
                            onEdit={handleEdit}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--soft-pink)' }} />
                      <p className="text-sm mb-4" style={{ color: 'var(--warm-pink)' }}>
                        Aucun personnage féminin
                      </p>
                      <Button 
                        onClick={() => setShowAddDialog(true)}
                        size="sm"
                        style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                        className="text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="couples">
                  {favoriteCouples.length > 0 ? (
                    <div className="grid gap-4">
                      {favoriteCouples.map((couple) => {
                        const book = allBooks.find(b => b.id === couple.book_id);
                        return (
                          <FavoriteCoupleCard 
                            key={couple.id} 
                            couple={couple} 
                            book={book}
                            onEdit={handleEditCouple}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--soft-pink)' }} />
                      <p className="text-sm mb-4" style={{ color: 'var(--warm-pink)' }}>
                        Aucun couple préféré
                      </p>
                      <Button 
                        onClick={() => setShowAddCoupleDialog(true)}
                        size="sm"
                        style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                        className="text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="mt-4 flex gap-2">
                <Button 
                  onClick={() => selectedTab === "couples" ? setShowAddCoupleDialog(true) : setShowAddDialog(true)}
                  className="w-full text-white"
                  style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {selectedTab === "couples" ? "Ajouter un couple" : "Ajouter un personnage"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Delete Account - DANGER ZONE */}
          <Card className="border-0 shadow-lg" style={{ borderLeft: '4px solid #DC2626' }}>
...
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

      <AddBookBoyfriendDialog 
        open={showAddDialog}
        onOpenChange={handleCloseDialog}
        books={allBooks}
        existingCharacters={bookBoyfriends}
        editingCharacter={editingCharacter}
      />

      <AddFavoriteCoupleDialog 
        open={showAddCoupleDialog}
        onOpenChange={handleCloseCoupleDialog}
        books={allBooks}
        existingCouples={favoriteCouples}
        editingCouple={editingCouple}
      />
    </div>
  );
}