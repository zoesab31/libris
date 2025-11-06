
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Music, Calendar, Plus, Trash2, AlertTriangle, Upload, Loader2, BookOpen, X, MessageSquare, Edit } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import GenreTagInput from "./GenreTagInput";

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
      
      // Calculate sum of R, G, B components
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      
      // Calculate average R, G, B
      r = Math.floor(r / pixelCount);
      g = Math.floor(g / pixelCount);
      b = Math.floor(b / pixelCount);
      
      resolve(`rgb(${r}, ${g}, ${b})`);
    };
    
    img.onerror = () => resolve(null);
  });
};

const STATUSES = ["Lu", "En cours", "À lire", "Abandonné", "Mes envies"];

export default function BookDetailsDialog({ userBook, book, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [editedData, setEditedData] = useState(userBook);
  const [uploading, setUploading] = useState(false);
  const [editingCover, setEditingCover] = useState(false);
  const [newCoverUrl, setNewCoverUrl] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [newComment, setNewComment] = useState({
    comment: "",
    page_number: "",
    chapter: "",
    mood: "😊",
    is_spoiler: false,
    photo_url: "",
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const saveButtonRef = useRef(null);
  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const [newAuthor, setNewAuthor] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);

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

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', userBook.id],
    queryFn: () => base44.entities.ReadingComment.filter({ user_book_id: userBook.id }, '-created_date'),
  });

  const updateUserBookMutation = useMutation({
    mutationFn: (data) => base44.entities.UserBook.update(userBook.id, data),
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['recentComments'] });
      queryClient.invalidateQueries({ queryKey: ['friendsBooks'] });
      queryClient.invalidateQueries({ queryKey: ['friendsFinishedBooks'] });
      
      // Force refetch immediately
      await queryClient.refetchQueries({ queryKey: ['myBooks'] });
      
      toast.success("✅ Modifications enregistrées !");

      const oldStatus = userBook.status;
      const newStatus = variables.status;
      
      // Award points for Lu status OR Abandonné >50%
      const shouldAwardPoints = 
        (oldStatus !== "Lu" && newStatus === "Lu") || 
        (oldStatus !== "Abandonné" && newStatus === "Abandonné" && 
         (variables.abandon_percentage >= 50 || 
          (variables.abandon_page && book?.page_count && variables.abandon_page >= book.page_count / 2)));

      if (shouldAwardPoints && user) {
        awardPointsForLuStatusMutation.mutate();
        
        // Notify friends when book is finished or abandoned >50%
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

  const updateBookTagsMutation = useMutation({
    mutationFn: async (tags) => {
      return base44.entities.Book.update(book.id, { tags });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("✅ Tags du livre mis à jour !");
    },
    onError: (error) => {
      console.error("Error updating book tags:", error);
      toast.error("Erreur lors de la mise à jour des tags.");
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
    onError: (error) => {
      console.error("Error awarding points for 'Lu' status:", error);
      toast.error("Erreur lors de l'attribution des points.");
    }
  });

  const updateBookCoverMutation = useMutation({
    mutationFn: async (newCoverUrl) => {
      await base44.entities.Book.update(book.id, { cover_url: newCoverUrl });
      
      // Extract and update color for virtual library
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
    onError: (error) => {
        console.error("Error updating book cover:", error);
        toast.error("Erreur lors de la mise à jour de la couverture.");
    }
  });

  // New mutation for author editing
  const updateBookAuthorMutation = useMutation({
    mutationFn: (newAuthor) => base44.entities.Book.update(book.id, { author: newAuthor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] }); // Invalidate myBooks to reflect author change on user books
      toast.success("Auteur modifié !");
      setIsEditingAuthor(false);
    },
    onError: (error) => {
      console.error("Error updating book author:", error);
      toast.error("Erreur lors de la modification de l'auteur.");
    }
  });

  const deleteUserBookMutation = useMutation({
    mutationFn: () => base44.entities.UserBook.delete(userBook.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("✅ Livre supprimé !");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error deleting user book:", error);
      toast.error("Erreur lors de la suppression du livre.");
    }
  });

  const createCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      return base44.entities.ReadingComment.create({
        ...commentData,
        user_book_id: userBook.id,
        book_id: book.id,
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['comments', userBook.id] });
      queryClient.invalidateQueries({ queryKey: ['recentComments'] });
      toast.success("✅ Commentaire ajouté !");
      setNewComment({ comment: "", page_number: "", chapter: "", mood: "😊", is_spoiler: false, photo_url: "" });
      awardPointsForCommentMutation.mutate();
      
      // Notify friends about new comment
      if (user) {
        const friends = await base44.entities.Friendship.filter({ 
          created_by: user.email, 
          status: "Acceptée" 
        });
        
        const notificationPromises = friends.map(friend =>
          base44.entities.Notification.create({
            type: "friend_comment",
            title: "Nouveau commentaire",
            message: `${user.display_name || user.full_name || 'Une amie'} a commenté "${book?.title}"`,
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
      console.error("Error adding comment:", error);
      toast.error("Erreur lors de l'ajout du commentaire.");
    }
  });

  const awardPointsForCommentMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not loaded, cannot award points.");
      const existingPoints = await base44.entities.ReadingPoints.filter({ created_by: user.email });
      if (existingPoints.length > 0) {
        await base44.entities.ReadingPoints.update(existingPoints[0].id, {
          total_points: (existingPoints[0].total_points || 0) + 5
        });
      } else {
        await base44.entities.ReadingPoints.create({ total_points: 5, points_spent: 0, created_by: user.email });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingPoints'] });
      toast.success("+5 points 🌟");
    },
    onError: (error) => {
      console.error("Error awarding points for comment:", error);
      toast.error("Erreur lors de l'attribution des points de commentaire.");
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id) => base44.entities.ReadingComment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', userBook.id] });
      queryClient.invalidateQueries({ queryKey: ['recentComments'] });
      toast.success("Commentaire supprimé");
    },
    onError: (error) => {
      console.error("Error deleting comment:", error);
      toast.error("Erreur lors de la suppression du commentaire.");
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setNewComment({ ...newComment, photo_url: result.file_url });
      toast.success("Photo uploadée !");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Erreur lors de l'upload de l'image.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setNewComment({ ...newComment, photo_url: "" });
  };

  const toggleServicePress = () => {
    const currentTags = book.tags || [];
    const hasTag = currentTags.includes("Service Press");
    
    const newTags = hasTag 
      ? currentTags.filter(t => t !== "Service Press")
      : [...currentTags, "Service Press"];
    
    updateBookTagsMutation.mutate(newTags);
  };

  // New function to start author editing
  const startEditingAuthor = () => {
    setNewAuthor(book?.author || "");
    setIsEditingAuthor(true);
  };

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

  if (!book) return null;

  const isServicePress = book.tags?.includes("Service Press");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-white">
        <DialogHeader className="px-6 py-4 border-b border-neutral-200 bg-white flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-3xl font-bold" style={{ color: 'var(--dark-text)' }}>
                {book?.title}
              </DialogTitle>
              {isEditingAuthor ? (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="Nom de l'auteur"
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => updateBookAuthorMutation.mutate(newAuthor)}
                    disabled={!newAuthor || updateBookAuthorMutation.isPending}
                    style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))', color: 'white' }}
                  >
                    Enregistrer
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingAuthor(false)}
                  >
                    Annuler
                  </Button>
                </div>
              ) : (
                <p className="text-lg flex items-center gap-2 mt-2" style={{ color: 'var(--warm-pink)' }}>
                  {book?.author}
                  <button
                    onClick={startEditingAuthor}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Modifier l'auteur"
                  >
                    <Edit className="w-4 h-4" style={{ color: 'var(--deep-pink)' }} />
                  </button>
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden bg-white">
          <TabsList className="flex-shrink-0 bg-neutral-50 p-1 grid grid-cols-3 border-b border-neutral-200">
            <TabsTrigger value="details" className="text-neutral-900 data-[state=active]:bg-white data-[state=active]:text-rose-600">
              Détails
            </TabsTrigger>
            <TabsTrigger value="synopsis" className="text-neutral-900 data-[state=active]:bg-white data-[state=active]:text-rose-600">
              Synopsis
            </TabsTrigger>
            <TabsTrigger value="comments" className="text-neutral-900 data-[state=active]:bg-white data-[state=active]:text-rose-600">
              Commentaires ({comments.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto bg-white">
            <div className="p-6 bg-white">
              <TabsContent value="details">
                <div className="space-y-4 py-4 bg-white">
                  {userBook.status === "À lire" && (
                    <div className="p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md bg-white"
                         style={{ 
                           backgroundColor: isServicePress ? 'var(--soft-pink)' : 'var(--cream)',
                           borderColor: isServicePress ? 'var(--deep-pink)' : 'var(--beige)'
                         }}
                         onClick={toggleServicePress}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📬</span>
                          <div>
                            <p className="font-bold" style={{ color: isServicePress ? 'white' : 'var(--dark-text)' }}>
                              Service Press
                            </p>
                            <p className="text-xs" style={{ color: isServicePress ? 'white' : 'var(--warm-pink)' }}>
                              Marquer ce livre comme prioritaire
                            </p>
                          </div>
                        </div>
                        <div className={`w-12 h-6 rounded-full transition-all ${
                          isServicePress ? 'bg-white' : 'bg-gray-300'
                        }`}>
                          <div className={`w-6 h-6 rounded-full shadow-md transition-all ${
                            isServicePress ? 'translate-x-6 bg-pink-600' : 'translate-x-0 bg-white'
                          }`} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Cover section */}
                    <div className="md:w-64 flex-shrink-0">
                      {editingCover ? (
                        <div className="space-y-3">
                          <div className="w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg"
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
                                      Upload en cours...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-2" />
                                      Uploader une image
                                    </>
                                  )}
                                </span>
                              </Button>
                            </label>

                            <div className="flex gap-2">
                              <Button
                                onClick={() => updateBookCoverMutation.mutate(newCoverUrl)}
                                disabled={!newCoverUrl || updateBookCoverMutation.isPending}
                                className="flex-1"
                                style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))', color: 'white' }}
                              >
                                Enregistrer
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEditingCover(false);
                                  setNewCoverUrl("");
                                }}
                              >
                                Annuler
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="relative group">
                            <div className="w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg"
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
                                       transition-opacity flex items-center justify-center rounded-xl"
                            >
                              <Edit className="w-8 h-8 text-white" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-4">
                      {/* Genres personnalisés */}
                      <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                        <Label className="text-sm font-bold mb-2 block" style={{ color: 'var(--dark-text)' }}>
                          🏷️ Genres
                        </Label>
                        <GenreTagInput
                          value={book.custom_genres || []}
                          onChange={(genres) => updateBookMutation.mutate({ custom_genres: genres })}
                        />
                      </div>

                      {/* Format du livre (tags) */}
                      <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                        <Label className="text-sm font-bold mb-2 block" style={{ color: 'var(--dark-text)' }}>
                          📚 Format
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                              className={`p-2 rounded-lg text-sm font-medium transition-all ${
                                (book.tags || []).includes(tag) ? 'shadow-md scale-105' : 'hover:shadow-md'
                              }`}
                              style={{
                                backgroundColor: (book.tags || []).includes(tag) ? 'var(--soft-pink)' : 'white',
                                color: (book.tags || []).includes(tag) ? 'white' : 'var(--dark-text)',
                                border: '2px solid',
                                borderColor: (book.tags || []).includes(tag) ? 'var(--deep-pink)' : 'var(--beige)'
                              }}
                            >
                              {tag === "Audio" && "🎧 "}
                              {tag === "Numérique" && "📱 "}
                              {tag === "Broché" && "📕 "}
                              {tag === "Relié" && "📘 "}
                              {tag === "Poche" && "📙 "}
                              {tag === "Wattpad" && "🌟 "}
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="status">Statut</Label>
                        <Select 
                          value={editedData.status} 
                          onValueChange={(value) => setEditedData({...editedData, status: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {editedData.status === "Abandonné" && (
                        <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: 'var(--cream)' }}>
                          <Label className="text-sm font-bold" style={{ color: 'var(--dark-text)' }}>
                            📖 Où avez-vous abandonné ?
                          </Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="abandon-page" className="text-xs">Page d'abandon</Label>
                              <Input
                                id="abandon-page"
                                type="number"
                                value={editedData.abandon_page || ''}
                                onChange={(e) => setEditedData({...editedData, abandon_page: parseInt(e.target.value) || undefined})}
                                placeholder="150"
                              />
                            </div>
                            <div>
                              <Label htmlFor="abandon-percentage" className="text-xs">
                                % d'avancement
                              </Label>
                              <Input
                                id="abandon-percentage"
                                type="number"
                                min="0"
                                max="100"
                                value={editedData.abandon_percentage || ''}
                                onChange={(e) => setEditedData({...editedData, abandon_percentage: parseInt(e.target.value) || undefined})}
                                placeholder="50"
                              />
                            </div>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--warm-brown)' }}>
                            💡 Si vous avez abandonné après 50%, le livre comptera dans votre objectif annuel
                          </p>
                        </div>
                      )}

                      {customShelves.length > 0 && (
                        <div>
                          <Label htmlFor="shelf">Étagère personnalisée</Label>
                          <Select 
                            value={editedData.custom_shelf || ""} 
                            onValueChange={(value) => setEditedData({...editedData, custom_shelf: value || undefined})}
                          >
                            <SelectTrigger>
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

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="rating">Note (sur 5)</Label>
                          <Input
                            id="rating"
                            type="number"
                            min="0"
                            max="5"
                            step="0.5"
                            value={editedData.rating || ""}
                            onChange={(e) => setEditedData({...editedData, rating: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="character">Personnage préféré</Label>
                          <Input
                            id="character"
                            value={editedData.favorite_character || ""}
                            onChange={(e) => setEditedData({...editedData, favorite_character: e.target.value})}
                            placeholder="Book boyfriend..."
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-white" 
                           style={{ backgroundColor: 'var(--cream)' }}>
                        <Label htmlFor="shared">Lecture commune</Label>
                        <Switch
                          id="shared"
                          checked={editedData.is_shared_reading}
                          onCheckedChange={(checked) => setEditedData({...editedData, is_shared_reading: checked})}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="review">Mon avis</Label>
                    <Textarea
                      id="review"
                      value={editedData.review || ""}
                      onChange={(e) => setEditedData({...editedData, review: e.target.value})}
                      placeholder="Qu'avez-vous pensé de ce livre ?"
                      rows={4}
                    />
                  </div>

                  {/* Music */}
                  <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                    <Label className="text-sm font-bold mb-2 block" style={{ color: 'var(--dark-text)' }}>
                      🎵 Musique associée
                    </Label>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs" style={{ color: 'var(--dark-text)' }}>Titre</Label>
                        <Input
                          value={editedData.music || ""}
                          onChange={(e) => setEditedData({...editedData, music: e.target.value})}
                          placeholder="Titre de la chanson"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs" style={{ color: 'var(--dark-text)' }}>Artiste</Label>
                        <Input
                          value={editedData.music_artist || ""}
                          onChange={(e) => setEditedData({...editedData, music_artist: e.target.value})}
                          placeholder="Nom de l'artiste"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs" style={{ color: 'var(--dark-text)' }}>Lien (YouTube, Spotify, Deezer)</Label>
                        <Input
                          value={editedData.music_link || ""}
                          onChange={(e) => setEditedData({...editedData, music_link: e.target.value})}
                          placeholder="https://..."
                          className="text-sm"
                        />
                        {editedData.music_link && (
                          <a 
                            href={editedData.music_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs mt-1 inline-flex items-center gap-1 hover:underline"
                            style={{ color: 'var(--deep-pink)' }}
                          >
                            🔗 Ouvrir le lien
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl space-y-3 bg-white" style={{ backgroundColor: 'var(--cream)' }}>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Dates de lecture (pour le défi annuel)
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start" className="text-xs">Date de début</Label>
                        <Input
                          id="start"
                          type="date"
                          value={editedData.start_date || ""}
                          onChange={(e) => setEditedData({...editedData, start_date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end" className="text-xs">Date de fin</Label>
                        <Input
                          id="end"
                          type="date"
                          value={editedData.end_date || ""}
                          onChange={(e) => setEditedData({...editedData, end_date: e.target.value})}
                        />
                      </div>
                    </div>
                    {editedData.status === "Lu" && !editedData.end_date && (
                      <p className="text-xs" style={{ color: 'var(--warm-brown)' }}>
                        ⚠️ Ajoutez une date de fin pour que ce livre compte dans votre objectif annuel
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => deleteUserBookMutation.mutate()}
                      disabled={deleteUserBookMutation.isPending}
                      className="text-white font-medium border-0"
                      style={{ background: 'linear-gradient(135deg, #FF1744, #F50057)' }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                    <Button
                      ref={saveButtonRef}
                      onClick={() => {
                        // Include ALL data including music fields
                        updateUserBookMutation.mutate({
                          ...editedData,
                          rating: editedData.rating ? parseFloat(editedData.rating) : undefined,
                        });
                      }}
                      disabled={updateUserBookMutation.isPending}
                      className="text-white font-medium relative"
                      style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                    >
                      {updateUserBookMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        "Enregistrer"
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="synopsis">
                <div className="space-y-4 py-4 bg-white">
                  {book.synopsis ? (
                    <p className="leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--dark-text)' }}>
                      {book.synopsis}
                    </p>
                  ) : (
                    <p className="text-center py-8" style={{ color: 'var(--warm-pink)' }}>
                      Aucun synopsis disponible
                    </p>
                  )}
                  {book.genre && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                        Genre :
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm font-medium"
                            style={{ backgroundColor: 'var(--soft-pink)', color: 'white' }}>
                        {book.genre}
                      </span>
                    </div>
                  )}

                  {book.page_count && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                        Nombre de pages :
                      </span>
                      <span className="text-sm font-bold" style={{ color: 'var(--deep-pink)' }}>
                        {book.page_count}
                      </span>
                    </div>
                  )}

                  {book.publication_year && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                        Année de publication :
                      </span>
                      <span className="text-sm font-bold" style={{ color: 'var(--deep-pink)' }}>
                        {book.publication_year}
                      </span>
                    </div>
                  )}

                  {book.tags && book.tags.length > 0 && (
                    <div>
                      <span className="text-sm font-medium mb-2 block" style={{ color: 'var(--dark-text)' }}>
                        Tags :
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {book.tags.map((tag, idx) => (
                          <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium"
                                style={{ backgroundColor: 'var(--beige)', color: 'var(--dark-text)' }}>
                            {tag === "Service Press" && "📬 "}
                            {tag === "Audio" && "🎧 "}
                            {tag === "Numérique" && "📱 "}
                            {tag === "Broché" && "📕 "}
                            {tag === "Relié" && "📘 "}
                            {tag === "Poche" && "📙 "}
                            {tag === "Wattpad" && "🌟 "}
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="comments">
                <div className="space-y-4 py-4 bg-white">
                  <div className="p-4 rounded-xl space-y-4 bg-white" style={{ backgroundColor: 'var(--cream)' }}>
                    <h3 className="font-semibold text-lg" style={{ color: 'var(--deep-brown)' }}>
                      ✍️ Ajouter un commentaire
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="page">Page / %</Label>
                        <Input
                          id="page"
                          type="text"
                          value={newComment.page_number}
                          onChange={(e) => setNewComment({...newComment, page_number: e.target.value})}
                          placeholder="Ex: 150 ou 50%"
                        />
                      </div>
                      <div>
                        <Label htmlFor="chapter">Chapitre</Label>
                        <Input
                          id="chapter"
                          value={newComment.chapter}
                          onChange={(e) => setNewComment({...newComment, chapter: e.target.value})}
                          placeholder="Ex: Ch. 5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mood">Humeur</Label>
                        <Select 
                          value={newComment.mood} 
                          onValueChange={(value) => setNewComment({...newComment, mood: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["😊", "😍", "😢", "😱", "🤔", "😡", "🥰", "📖", "💔", "🔥"].map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="comment">Votre commentaire, théorie, impression...</Label>
                      <Textarea
                        id="comment"
                        value={newComment.comment}
                        onChange={(e) => setNewComment({...newComment, comment: e.target.value})}
                        placeholder="Partagez vos pensées, vos théories, vos émotions..."
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    <div>
                      <Label>Photo du moment</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newComment.photo_url}
                          onChange={(e) => setNewComment({...newComment, photo_url: e.target.value})}
                          placeholder="URL de la photo..."
                          className="flex-1"
                        />
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoUpload}
                            className="hidden"
                            disabled={uploadingPhoto}
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            disabled={uploadingPhoto}
                            className="w-24"
                            asChild
                          >
                            <span>
                              {uploadingPhoto ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Upload
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Photo
                                </>
                              )}
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>

                    {newComment.photo_url && (
                      <div className="relative rounded-xl overflow-hidden">
                        <img 
                          src={newComment.photo_url} 
                          alt="Preview" 
                          className="w-full h-64 object-cover" 
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={handleRemovePhoto}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="spoiler"
                          checked={newComment.is_spoiler}
                          onCheckedChange={(checked) => setNewComment({...newComment, is_spoiler: checked})}
                        />
                        <Label htmlFor="spoiler" className="text-sm cursor-pointer flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          Contient des spoilers
                        </Label>
                      </div>
                      <Button
                        onClick={() => createCommentMutation.mutate(newComment)}
                        disabled={(!newComment.comment.trim() && !newComment.photo_url) || createCommentMutation.isPending}
                        className="text-white font-medium"
                        style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                      >
                        {createCommentMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Envoi...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Ajouter
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {comments.length > 0 ? (
                      comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-4 rounded-xl border transition-all hover:shadow-md bg-white"
                          style={{ 
                            borderColor: 'var(--beige)'
                          }}
                        >
                          {comment.photo_url && (
                            <div className="mb-3 rounded-lg overflow-hidden cursor-pointer"
                                 onClick={() => window.open(comment.photo_url, '_blank')}>
                              <img 
                                src={comment.photo_url} 
                                alt="Moment de lecture" 
                                className="w-full h-48 object-cover hover:scale-105 transition-transform" 
                              />
                            </div>
                          )}
                          
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-3xl">{comment.mood || '📖'}</span>
                              <div>
                                <p className="text-sm font-bold" style={{ color: 'var(--deep-pink)' }}>
                                  {comment.chapter ? comment.chapter : comment.page_number ? `Page ${comment.page_number}` : 'Commentaire'}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                                  {format(new Date(comment.created_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {comment.is_spoiler && (
                                <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                                      style={{ backgroundColor: 'var(--rose-gold)', color: 'var(--dark-text)' }}>
                                  <AlertTriangle className="w-3 h-3" />
                                  Spoiler
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteCommentMutation.mutate(comment.id)}
                                className="hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--dark-text)' }}>
                            {comment.comment}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 rounded-xl bg-white" style={{ backgroundColor: 'var(--cream)' }}>
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                        <p className="text-lg font-medium mb-2" style={{ color: 'var(--dark-text)' }}>
                          Aucun commentaire pour ce livre
                        </p>
                        <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                          Partagez vos impressions, théories et émotions !
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
