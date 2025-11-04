
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Music, Calendar, Plus, Trash2, AlertTriangle, Upload, Loader2, BookOpen, X, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUSES = ["Lu", "En cours", "À lire", "Abandonné", "Mes envies"];

export default function BookDetailsDialog({ userBook, book, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [editedData, setEditedData] = useState(userBook);
  const [uploading, setUploading] = useState(false); // This state is for cover upload
  const [editingCover, setEditingCover] = useState(false);
  const [newCoverUrl, setNewCoverUrl] = useState("");
  const [activeTab, setActiveTab] = useState("details"); // New state for active tab
  const [newComment, setNewComment] = useState({
    comment: "",
    page_number: "",
    chapter: "",
    mood: "😊",
    is_spoiler: false,
    photo_url: "",
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false); // This state is for comment photo upload

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: customShelves = [] } = useQuery({
    queryKey: ['customShelves'],
    queryFn: async () => {
      if (!user) return []; // Ensure user is loaded
      return base44.entities.CustomShelf.filter({ created_by: user.email });
    },
    enabled: !!user, // Only run query if user is available
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', userBook.id],
    queryFn: () => base44.entities.ReadingComment.filter({ user_book_id: userBook.id }, '-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const oldStatus = userBook.status;
      const newStatus = data.status;
      
      // Update the UserBook
      await base44.entities.UserBook.update(userBook.id, data);
      
      // Also update the Book entity tags if they changed
      if (data.tags !== undefined) {
        await base44.entities.Book.update(book.id, { tags: data.tags });
      }
      
      // Award points when marking as "Lu"
      if (oldStatus !== "Lu" && newStatus === "Lu" && user) {
        const existingPoints = await base44.entities.ReadingPoints.filter({ created_by: user.email });
        if (existingPoints.length > 0) {
          await base44.entities.ReadingPoints.update(existingPoints[0].id, {
            total_points: (existingPoints[0].total_points || 0) + 50
          });
        } else {
          await base44.entities.ReadingPoints.create({ total_points: 50, points_spent: 0, created_by: user.email });
        }
        toast.success("Livre marqué comme lu ! +50 points 🌟");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['readingGoal'] });
      queryClient.invalidateQueries({ queryKey: ['readingPoints'] });
      toast.success("Livre mis à jour !");
    },
  });

  const updateBookCoverMutation = useMutation({
    mutationFn: (coverUrl) => base44.entities.Book.update(book.id, { cover_url: coverUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] }); // Invalidate myBooks as it might display book details
      setEditingCover(false);
      setNewCoverUrl("");
      toast.success("Couverture mise à jour !");
    },
    onError: (error) => {
        console.error("Error updating book cover:", error);
        toast.error("Erreur lors de la mise à jour de la couverture.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("User not loaded, cannot delete associated data.");
      }
      
      // Get all bingo challenges that reference this book
      const relatedChallenges = await base44.entities.BingoChallenge.filter({ book_id: book.id, created_by: user.email });
      
      // Uncomplete challenges that used this book and remove points
      for (const challenge of relatedChallenges) {
        if (challenge.is_completed) {
          // Remove 20 points for each completed challenge
          const existingPoints = await base44.entities.ReadingPoints.filter({ created_by: user.email });
          if (existingPoints.length > 0) {
            await base44.entities.ReadingPoints.update(existingPoints[0].id, {
              total_points: Math.max(0, (existingPoints[0].total_points || 0) - 20)
            });
          }
        }
        // Uncomplete the challenge
        await base44.entities.BingoChallenge.update(challenge.id, {
          is_completed: false,
          book_id: undefined,
          completed_date: undefined
        });
      }
      
      // Delete user book
      await base44.entities.UserBook.delete(userBook.id);
      
      // Delete all comments related to this user book
      const relatedComments = await base44.entities.ReadingComment.filter({ user_book_id: userBook.id });
      await Promise.all(relatedComments.map(c => base44.entities.ReadingComment.delete(c.id)));
      
      // Delete book boyfriends related to this book (and created by the user)
      const relatedBFs = await base44.entities.BookBoyfriend.filter({ book_id: book.id, created_by: user.email });
      await Promise.all(relatedBFs.map(bf => base44.entities.BookBoyfriend.delete(bf.id)));
      
      // Delete quotes related to this book (and created by the user)
      const relatedQuotes = await base44.entities.Quote.filter({ book_id: book.id, created_by: user.email });
      await Promise.all(relatedQuotes.map(q => base44.entities.Quote.delete(q.id)));
      
      // Delete fan arts related to this book (and created by the user)
      const relatedFanArts = await base44.entities.FanArt.filter({ book_id: book.id, created_by: user.email });
      await Promise.all(relatedFanArts.map(fa => base44.entities.FanArt.delete(fa.id)));
      
      // Delete nail inspo related to this book (and created by the user)
      const relatedNailInspo = await base44.entities.NailInspo.filter({ book_id: book.id, created_by: user.email });
      await Promise.all(relatedNailInspo.map(ni => base44.entities.NailInspo.delete(ni.id)));
      
      // Delete reading locations related to this book (and created by the user)
      const relatedLocations = await base44.entities.ReadingLocation.filter({ book_id: book.id, created_by: user.email });
      await Promise.all(relatedLocations.map(loc => base44.entities.ReadingLocation.delete(loc.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['bingoChallenges'] });
      queryClient.invalidateQueries({ queryKey: ['readingPoints'] });
      queryClient.invalidateQueries({ queryKey: ['bookBoyfriends'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['fanArts'] });
      queryClient.invalidateQueries({ queryKey: ['nailInspos'] });
      queryClient.invalidateQueries({ queryKey: ['readingLocations'] });
      queryClient.invalidateQueries({ queryKey: ['recentComments'] });
      queryClient.invalidateQueries({ queryKey: ['comments', userBook.id] });
      toast.success("Livre supprimé et défis bingo réinitialisés");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error deleting book and associated data:", error);
      toast.error("Erreur lors de la suppression du livre.");
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.ReadingComment.create({
        ...data,
        user_book_id: userBook.id,
        book_id: book.id,
      });
      
      // Award 5 points for adding a comment
      if (user) {
        const existingPoints = await base44.entities.ReadingPoints.filter({ created_by: user.email });
        if (existingPoints.length > 0) {
          await base44.entities.ReadingPoints.update(existingPoints[0].id, {
            total_points: (existingPoints[0].total_points || 0) + 5
          });
        } else {
          await base44.entities.ReadingPoints.create({ total_points: 5, points_spent: 0, created_by: user.email });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', userBook.id] });
      queryClient.invalidateQueries({ queryKey: ['recentComments'] });
      queryClient.invalidateQueries({ queryKey: ['readingPoints'] });
      setNewComment({ comment: "", page_number: "", chapter: "", mood: "😊", is_spoiler: false, photo_url: "" });
      toast.success("Commentaire ajouté ! +5 points 🌟");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id) => base44.entities.ReadingComment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', userBook.id] });
      toast.success("Commentaire supprimé");
    },
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
    
    updateMutation.mutate({
      ...editedData,
      tags: newTags,
      rating: editedData.rating ? parseFloat(editedData.rating) : undefined,
    });
  };

  if (!book) return null;

  const isServicePress = book.tags?.includes("Service Press");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white border border-neutral-200 rounded-2xl shadow-2xl">
        {/* Header - fond blanc pur */}
        <DialogHeader className="px-6 py-4 border-b border-neutral-200 bg-white flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-neutral-900">
                {book.title}
              </DialogTitle>
              <p className="text-sm text-neutral-500 mt-1">par {book.author}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs - fond neutre clair */}
        <div className="flex gap-2 px-6 pt-4 bg-neutral-50 border-b border-neutral-200 flex-shrink-0">
          {[
            { id: "details", label: "Détails" },
            { id: "synopsis", label: "Synopsis" },
            { id: "comments", label: `Commentaires (${comments.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-t-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-rose-600 border-t border-x border-neutral-200 -mb-px'
                  : 'bg-transparent text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body - scroll avec fond blanc */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="p-6">
            {activeTab === "details" && (
              <div className="space-y-4 py-4 bg-white"> {/* Original className from TabsContent */}
                {userBook.status === "À lire" && (
                  <div className="p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md"
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

                <div className="flex gap-6">
                  <div className="relative">
                    <div className="w-40 h-60 rounded-xl overflow-hidden shadow-lg flex-shrink-0"
                         style={{ backgroundColor: 'var(--beige)' }}>
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Star className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute bottom-2 left-1/2 -translate-x-1/2"
                      onClick={() => setEditingCover(!editingCover)}
                    >
                      Changer la couverture
                    </Button>
                  </div>

                  {editingCover && (
                    <div className="flex-1 space-y-3 p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                      <Label>Nouvelle URL de couverture</Label>
                      <Input
                        value={newCoverUrl}
                        onChange={(e) => setNewCoverUrl(e.target.value)}
                        placeholder="https://..."
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingCover(false);
                            setNewCoverUrl("");
                          }}
                        >
                          Annuler
                        </Button>
                        <Button
                          onClick={() => updateBookCoverMutation.mutate(newCoverUrl)}
                          disabled={!newCoverUrl || updateBookCoverMutation.isPending}
                          className="text-white"
                          style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--soft-pink))' }}
                        >
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  )}

                  {!editingCover && (
                    <div className="flex-1 space-y-4">
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
                              <SelectItem value={null}>Aucune</SelectItem> {/* Changed to empty string for consistent UI with placeholder */}
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

                      <div className="flex items-center justify-between p-3 rounded-lg" 
                           style={{ backgroundColor: 'var(--cream)' }}>
                        <Label htmlFor="shared">Lecture commune</Label>
                        <Switch
                          id="shared"
                          checked={editedData.is_shared_reading}
                          onCheckedChange={(checked) => setEditedData({...editedData, is_shared_reading: checked})}
                        />
                      </div>
                    </div>
                  )}
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

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Musique associée
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={editedData.music || ""}
                      onChange={(e) => setEditedData({...editedData, music: e.target.value})}
                      placeholder="Titre"
                    />
                    <Input
                      value={editedData.music_artist || ""}
                      onChange={(e) => setEditedData({...editedData, music_artist: e.target.value})}
                      placeholder="Artiste"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: 'var(--cream)' }}>
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
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="text-white font-medium border-0"
                    style={{ background: 'linear-gradient(135deg, #FF1744, #F50057)' }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                  <Button
                    onClick={() => updateMutation.mutate({
                      ...editedData,
                      rating: editedData.rating ? parseFloat(editedData.rating) : undefined,
                    })}
                    disabled={updateMutation.isPending}
                    className="text-white font-medium"
                    style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                  >
                    Enregistrer
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "synopsis" && (
              <div className="space-y-4 py-4 bg-white"> {/* Original className from TabsContent */}
                <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                  {book.synopsis ? (
                    <div>
                      <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                        📖 Synopsis
                      </h3>
                      <p className="text-base leading-relaxed" style={{ color: 'var(--dark-text)' }}>
                        {book.synopsis}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                      <p className="text-lg font-medium" style={{ color: 'var(--dark-text)' }}>
                        Aucun synopsis disponible
                      </p>
                      <p className="text-sm mt-2" style={{ color: 'var(--warm-pink)' }}>
                        Modifiez le livre pour ajouter un synopsis
                      </p>
                    </div>
                  )}
                </div>

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
            )}

            {activeTab === "comments" && (
              <div className="space-y-4 py-4 bg-white"> {/* Original className from TabsContent */}
                <div className="p-4 rounded-xl space-y-4" style={{ backgroundColor: 'var(--cream)' }}>
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
                      onClick={() => addCommentMutation.mutate(newComment)}
                      disabled={(!newComment.comment.trim() && !newComment.photo_url) || addCommentMutation.isPending}
                      className="text-white font-medium"
                      style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                    >
                      {addCommentMutation.isPending ? (
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
                        className="p-4 rounded-xl border transition-all hover:shadow-md"
                        style={{ 
                          backgroundColor: 'white',
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
                    <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
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
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
