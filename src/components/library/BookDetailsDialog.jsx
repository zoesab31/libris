import React, { useState, useRef } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Star, 
  Music, 
  Calendar, 
  Trash2, 
  Upload, 
  Loader2, 
  BookOpen, 
  X, 
  Edit,
  Heart,
  Users,
  Globe,
  Save,
  ArrowLeft,
  Sparkles,
  FileText,
  Tag,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import GenreTagInput from "./GenreTagInput";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STATUSES = ["Lu", "En cours", "À lire", "Abandonné", "Wishlist"];
const LANGUAGES = ["Français", "Anglais", "Espagnol", "Italien", "Allemand", "Portugais", "Japonais", "Coréen", "Chinois", "Autre"];

const LANGUAGE_FLAGS = {
  "Français": "🇫🇷",
  "Anglais": "🇬🇧",
  "Espagnol": "🇪🇸",
  "Italien": "🇮🇹",
  "Allemand": "🇩🇪",
  "Portugais": "🇵🇹",
  "Japonais": "🇯🇵",
  "Coréen": "🇰🇷",
  "Chinois": "🇨🇳",
  "Autre": "🌍"
};

// Helper function to extract dominant color from image
const getDominantColor = (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let r = 0, g = 0, b = 0;
      const pixelCount = data.length / 4;
      
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      
      r = Math.floor(r / pixelCount);
      g = Math.floor(g / pixelCount);
      b = Math.floor(b / pixelCount);
      
      resolve(`rgb(${r}, ${g}, ${b})`);
    };
    
    img.onerror = () => resolve(null);
  });
};

export default function BookDetailsDialog({ userBook, book, open, onOpenChange }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editedData, setEditedData] = useState(userBook);
  const [editingCover, setEditingCover] = useState(false);
  const [newCoverUrl, setNewCoverUrl] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const [newAuthor, setNewAuthor] = useState("");

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: customShelves = [] } = useQuery({
    queryKey: ['customShelves'],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.CustomShelf.filter({ created_by: user.email });
    },
    enabled: !!user,
  });

  const updateUserBookMutation = useMutation({
    mutationFn: (data) => base44.entities.UserBook.update(userBook.id, data),
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['recentComments'] });
      queryClient.invalidateQueries({ queryKey: ['friendsBooks'] });
      queryClient.invalidateQueries({ queryKey: ['friendsFinishedBooks'] });
      
      await queryClient.refetchQueries({ queryKey: ['myBooks'] });
      
      toast.success("✅ Modifications enregistrées !");

      const oldStatus = userBook.status;
      const newStatus = variables.status;
      
      const shouldAwardPoints = 
        (oldStatus !== "Lu" && newStatus === "Lu") || 
        (oldStatus !== "Abandonné" && newStatus === "Abandonné" && 
         (variables.abandon_percentage >= 50 || 
          (variables.abandon_page && book?.page_count && variables.abandon_page >= book.page_count / 2)));

      if (shouldAwardPoints && user) {
        awardPointsForLuStatusMutation.mutate();
        
        const friends = await base44.entities.Friendship.filter({ 
          created_by: user.email, 
          status: "Acceptée" 
        });
        
        const notificationPromises = friends.map(friend =>
          base44.entities.Notification.create({
            type: "milestone",
            title: newStatus === "Lu" ? "Livre terminé !" : "Livre abandonné",
            message: `${user.display_name || user.full_name || 'Une amie'} ${newStatus === "Lu" ? 'a terminé' : 'a abandonné'} "${book?.title}"`,
            link_type: "book",
            link_id: book.id,
            created_by: friend.friend_email,
            from_user: user.email,
          })
        );
        
        await Promise.all(notificationPromises);
      }
    },
    onError: (error) => {
      console.error("Error updating user book:", error);
      toast.error("Échec de l'enregistrement");
    }
  });

  const updateBookMutation = useMutation({
    mutationFn: (data) => base44.entities.Book.update(book.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("✅ Livre mis à jour !");
    },
    onError: (error) => {
      console.error("Error updating book:", error);
      toast.error("Échec de la mise à jour du livre.");
    }
  });

  const awardPointsForLuStatusMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not loaded, cannot award points.");
      const existingPoints = await base44.entities.ReadingPoints.filter({ created_by: user.email });
      if (existingPoints.length > 0) {
        await base44.entities.ReadingPoints.update(existingPoints[0].id, {
          total_points: (existingPoints[0].total_points || 0) + 50
        });
      } else {
        await base44.entities.ReadingPoints.create({ total_points: 50, points_spent: 0, created_by: user.email });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingGoal'] });
      queryClient.invalidateQueries({ queryKey: ['readingPoints'] });
      toast.success("Livre marqué comme lu ! +50 points 🌟");
    },
  });

  const updateBookCoverMutation = useMutation({
    mutationFn: async (newCoverUrl) => {
      await base44.entities.Book.update(book.id, { cover_url: newCoverUrl });
      
      try {
        const color = await getDominantColor(newCoverUrl);
        if (color) {
          await base44.entities.UserBook.update(userBook.id, { book_color: color });
        }
      } catch (error) {
        console.log("Could not extract color:", error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("✅ Couverture mise à jour !");
      setEditingCover(false);
      setNewCoverUrl("");
    },
  });

  const updateBookAuthorMutation = useMutation({
    mutationFn: (newAuthor) => base44.entities.Book.update(book.id, { author: newAuthor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("Auteur modifié !");
      setIsEditingAuthor(false);
    },
  });

  const deleteUserBookMutation = useMutation({
    mutationFn: async () => {
      const relatedComments = await base44.entities.ReadingComment.filter({ user_book_id: userBook.id });
      await Promise.all(relatedComments.map(c => base44.entities.ReadingComment.delete(c.id)));
      await base44.entities.UserBook.delete(userBook.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("✅ Livre supprimé !");
      onOpenChange(false);
    },
  });

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setNewCoverUrl(result.file_url);
      toast.success("Image uploadée !");
    } catch (error) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingCover(false);
    }
  };

  const startEditingAuthor = () => {
    setNewAuthor(book?.author || "");
    setIsEditingAuthor(true);
  };

  const handleSave = () => {
    updateUserBookMutation.mutate({
      ...editedData,
      rating: editedData.rating ? parseFloat(editedData.rating) : undefined,
    });
  };

  if (!book) return null;

  const statusColors = {
    "Lu": "bg-green-100 text-green-800 border-green-300",
    "En cours": "bg-blue-100 text-blue-800 border-blue-300",
    "À lire": "bg-purple-100 text-purple-800 border-purple-300",
    "Abandonné": "bg-red-100 text-red-800 border-red-300",
    "Wishlist": "bg-pink-100 text-pink-800 border-pink-300",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0 bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <style>{`
          .focus-glow:focus {
            box-shadow: 0 0 0 3px rgba(255, 105, 180, 0.2);
            border-color: var(--warm-pink);
          }
          .section-divider {
            border-bottom: 2px solid;
            border-image: linear-gradient(90deg, var(--warm-pink), var(--lavender)) 1;
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
          }
        `}</style>

        {/* HEADER - Couverture + Infos principales */}
        <div className="p-8 bg-white/80 backdrop-blur-sm border-b-2 border-pink-200">
          <div className="flex gap-8 items-start">
            {/* Couverture avec badge langue */}
            <div className="relative flex-shrink-0">
              {editingCover ? (
                <div className="space-y-3 w-48">
                  <div className="w-48 h-72 rounded-2xl overflow-hidden shadow-2xl"
                       style={{ backgroundColor: 'var(--beige)' }}>
                    {newCoverUrl ? (
                      <img src={newCoverUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : book?.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Input
                      value={newCoverUrl}
                      onChange={(e) => setNewCoverUrl(e.target.value)}
                      placeholder="URL de la nouvelle couverture"
                      className="focus-glow"
                    />
                    
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        className="hidden"
                        disabled={uploadingCover}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full" 
                        disabled={uploadingCover}
                        asChild
                      >
                        <span>
                          {uploadingCover ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Upload...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Uploader
                            </>
                          )}
                        </span>
                      </Button>
                    </label>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateBookCoverMutation.mutate(newCoverUrl)}
                        disabled={!newCoverUrl}
                        className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                      >
                        ✓ OK
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNewCoverUrl("");
                          setEditingCover(false);
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="absolute -top-3 -left-3 z-10 px-3 py-1 rounded-full shadow-lg text-2xl bg-white border-2 border-pink-200">
                    {LANGUAGE_FLAGS[editedData.reading_language || "Français"]}
                  </div>
                  <div className="relative group w-48">
                    <div className="w-48 h-72 rounded-2xl overflow-hidden shadow-2xl transform transition-transform duration-300 group-hover:scale-105"
                         style={{ backgroundColor: 'var(--beige)' }}>
                      {book?.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingCover(true)}
                      className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 
                                transition-opacity flex items-center justify-center rounded-2xl"
                    >
                      <Edit className="w-8 h-8 text-white" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Infos principales */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  {book.title}
                </h1>
                
                {isEditingAuthor ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newAuthor}
                      onChange={(e) => setNewAuthor(e.target.value)}
                      placeholder="Nom de l'auteur"
                      className="flex-1 focus-glow"
                    />
                    <Button
                      size="sm"
                      onClick={() => updateBookAuthorMutation.mutate(newAuthor)}
                      className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                    >
                      ✓
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingAuthor(false)}
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={startEditingAuthor}
                    className="text-xl flex items-center gap-2 hover:underline transition-all"
                    style={{ color: 'var(--warm-pink)' }}
                  >
                    par {book.author}
                    <Edit className="w-4 h-4 opacity-50 hover:opacity-100" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className={`px-4 py-2 rounded-full font-semibold text-sm border-2 ${statusColors[editedData.status]}`}>
                  {editedData.status}
                </div>
                
                <Select 
                  value={editedData.reading_language || "Français"} 
                  onValueChange={(value) => setEditedData({...editedData, reading_language: value})}
                >
                  <SelectTrigger className="w-48 focus-glow">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        {LANGUAGE_FLAGS[editedData.reading_language || "Français"]} {editedData.reading_language || "Français"}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang} value={lang}>
                        <div className="flex items-center gap-2">
                          <span>{LANGUAGE_FLAGS[lang]}</span>
                          <span>{lang}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block" style={{ color: 'var(--dark-text)' }}>
                  Statut du livre
                </Label>
                <Select 
                  value={editedData.status} 
                  onValueChange={(value) => setEditedData({...editedData, status: value})}
                >
                  <SelectTrigger className="focus-glow">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* CORPS PRINCIPAL - 2 colonnes */}
        <div className="p-8 grid md:grid-cols-2 gap-6">
          {/* COLONNE GAUCHE */}
          <div className="space-y-6">
            {/* Card: Genres & Tags */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
              <h3 className="flex items-center gap-2 text-lg font-bold mb-4 section-divider" style={{ color: 'var(--dark-text)' }}>
                <Tag className="w-5 h-5" />
                Genres personnalisés
              </h3>
              <GenreTagInput
                value={book.custom_genres || []}
                onChange={(genres) => updateBookMutation.mutate({ custom_genres: genres })}
              />
            </div>

            {/* Card: Format */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
              <h3 className="flex items-center gap-2 text-lg font-bold mb-4 section-divider" style={{ color: 'var(--dark-text)' }}>
                <FileText className="w-5 h-5" />
                Format de lecture
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {["Audio", "Numérique", "Broché", "Relié", "Poche", "Wattpad"].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const currentTags = book.tags || [];
                      const newTags = currentTags.includes(tag)
                        ? currentTags.filter(t => t !== tag)
                        : [...currentTags, tag];
                      updateBookMutation.mutate({ tags: newTags });
                    }}
                    className={`p-3 rounded-xl text-sm font-medium transition-all hover:scale-105 ${
                      (book.tags || []).includes(tag) 
                        ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' 
                        : 'bg-pink-50 text-pink-800 border-2 border-pink-200'
                    }`}
                  >
                    {tag === "Audio" && "🎧"}
                    {tag === "Numérique" && "📱"}
                    {tag === "Broché" && "📕"}
                    {tag === "Relié" && "📘"}
                    {tag === "Poche" && "📙"}
                    {tag === "Wattpad" && "🌟"}
                    {" "}{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Card: Personnage préféré */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
              <h3 className="flex items-center gap-2 text-lg font-bold mb-4 section-divider" style={{ color: 'var(--dark-text)' }}>
                <Heart className="w-5 h-5" />
                Personnage préféré
              </h3>
              <Input
                value={editedData.favorite_character || ""}
                onChange={(e) => setEditedData({...editedData, favorite_character: e.target.value})}
                placeholder="Votre book boyfriend/girlfriend..."
                className="focus-glow"
              />
            </div>
          </div>

          {/* COLONNE DROITE */}
          <div className="space-y-6">
            {/* Card: Lecture */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
              <h3 className="flex items-center gap-2 text-lg font-bold mb-4 section-divider" style={{ color: 'var(--dark-text)' }}>
                <Sparkles className="w-5 h-5" />
                Ma lecture
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <Star className="w-4 h-4" />
                    Note /5
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.5"
                    value={editedData.rating || ""}
                    onChange={(e) => setEditedData({...editedData, rating: e.target.value})}
                    placeholder="4.5"
                    className="focus-glow"
                  />
                </div>

                {customShelves.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Étagère personnalisée</Label>
                    <Select 
                      value={editedData.custom_shelf || ""} 
                      onValueChange={(value) => setEditedData({...editedData, custom_shelf: value || undefined})}
                    >
                      <SelectTrigger className="focus-glow">
                        <SelectValue placeholder="Aucune" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Aucune</SelectItem>
                        {customShelves.map(s => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.icon} {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-xl bg-pink-50 border-2 border-pink-200">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <Users className="w-4 h-4" />
                    Lecture commune
                  </Label>
                  <Switch
                    checked={editedData.is_shared_reading}
                    onCheckedChange={(checked) => setEditedData({...editedData, is_shared_reading: checked})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Début
                    </Label>
                    <Input
                      type="date"
                      value={editedData.start_date || ""}
                      onChange={(e) => setEditedData({...editedData, start_date: e.target.value})}
                      className="focus-glow"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Fin
                    </Label>
                    <Input
                      type="date"
                      value={editedData.end_date || ""}
                      onChange={(e) => setEditedData({...editedData, end_date: e.target.value})}
                      className="focus-glow"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Musique */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
              <h3 className="flex items-center gap-2 text-lg font-bold mb-4 section-divider" style={{ color: 'var(--dark-text)' }}>
                <Music className="w-5 h-5" />
                Musique associée
              </h3>
              <div className="space-y-3">
                <Input
                  value={editedData.music || ""}
                  onChange={(e) => setEditedData({...editedData, music: e.target.value})}
                  placeholder="Titre de la chanson"
                  className="focus-glow"
                />
                <Input
                  value={editedData.music_artist || ""}
                  onChange={(e) => setEditedData({...editedData, music_artist: e.target.value})}
                  placeholder="Nom de l'artiste"
                  className="focus-glow"
                />
                <Input
                  value={editedData.music_link || ""}
                  onChange={(e) => setEditedData({...editedData, music_link: e.target.value})}
                  placeholder="Lien YouTube, Spotify, Deezer..."
                  className="focus-glow"
                />
                {editedData.music_link && (
                  <a 
                    href={editedData.music_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium hover:scale-105 transition-transform"
                  >
                    ▶️ Écouter
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION INFÉRIEURE */}
        <div className="p-8 space-y-6 bg-white/50">
          {/* Avis */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
            <h3 className="flex items-center gap-2 text-lg font-bold mb-4 section-divider" style={{ color: 'var(--dark-text)' }}>
              💭 Mon avis
            </h3>
            <Textarea
              value={editedData.review || ""}
              onChange={(e) => setEditedData({...editedData, review: e.target.value})}
              placeholder="Qu'avez-vous pensé de ce livre ? Vos impressions, vos coups de cœur, vos déceptions..."
              rows={5}
              className="focus-glow resize-none"
            />
          </div>

          {/* Infos techniques */}
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 shadow-lg border-2 border-pink-100">
            <h3 className="flex items-center gap-2 text-lg font-bold mb-4 section-divider" style={{ color: 'var(--dark-text)' }}>
              <Info className="w-5 h-5" />
              Informations techniques
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {book.page_count && (
                <div className="text-center p-3 bg-white rounded-xl shadow">
                  <p className="text-2xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                    {book.page_count}
                  </p>
                  <p className="text-sm text-gray-600">pages</p>
                </div>
              )}
              {book.publication_year && (
                <div className="text-center p-3 bg-white rounded-xl shadow">
                  <p className="text-2xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                    {book.publication_year}
                  </p>
                  <p className="text-sm text-gray-600">année</p>
                </div>
              )}
              {book.genre && (
                <div className="text-center p-3 bg-white rounded-xl shadow">
                  <p className="text-lg font-bold" style={{ color: 'var(--deep-pink)' }}>
                    {book.genre}
                  </p>
                  <p className="text-sm text-gray-600">genre</p>
                </div>
              )}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-center gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-8 py-6 text-lg font-medium hover:scale-105 transition-transform"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour
            </Button>
            
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm(`Êtes-vous sûre de vouloir supprimer "${book.title}" ?`)) {
                  deleteUserBookMutation.mutate();
                }
              }}
              disabled={deleteUserBookMutation.isPending}
              className="px-8 py-6 text-lg font-medium hover:scale-105 transition-transform"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Supprimer
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={updateUserBookMutation.isPending}
              className="px-8 py-6 text-lg font-medium bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:scale-105 transition-transform shadow-lg"
            >
              {updateUserBookMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  💾 Enregistrer
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}