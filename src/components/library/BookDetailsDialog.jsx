
import React, { useState } from 'react';
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
import { Star, Music, Calendar, MessageSquare, Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUSES = ["Lu", "En cours", "À lire", "Abandonné", "Mes envies"];

export default function BookDetailsDialog({ userBook, book, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [editedData, setEditedData] = useState(userBook);
  const [newComment, setNewComment] = useState({
    comment: "",
    page_number: "",
    mood: "😊",
    is_spoiler: false,
  });

  const { data: customShelves = [] } = useQuery({
    queryKey: ['customShelves'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.CustomShelf.filter({ created_by: user.email });
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', userBook.id],
    queryFn: () => base44.entities.ReadingComment.filter({ user_book_id: userBook.id }, '-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.UserBook.update(userBook.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['readingGoal'] }); // Added this line
      toast.success("Livre mis à jour !");
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (data) => base44.entities.ReadingComment.create({
      ...data,
      user_book_id: userBook.id,
      book_id: book.id,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', userBook.id] });
      queryClient.invalidateQueries({ queryKey: ['recentComments'] });
      setNewComment({ comment: "", page_number: "", mood: "😊", is_spoiler: false });
      toast.success("Commentaire ajouté !");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id) => base44.entities.ReadingComment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', userBook.id] });
      toast.success("Commentaire supprimé");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      ...editedData,
      rating: editedData.rating ? parseFloat(editedData.rating) : undefined,
    });
  };

  if (!book) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--deep-brown)' }}>
            {book.title}
          </DialogTitle>
          <p style={{ color: 'var(--warm-brown)' }}>par {book.author}</p>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="comments">
              Commentaires ({comments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 py-4">
            <div className="flex gap-6">
              <div className="w-40 h-60 rounded-xl overflow-hidden shadow-lg flex-shrink-0"
                   style={{ backgroundColor: 'var(--beige)' }}>
                {book.cover_url ? (
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Star className="w-12 h-12" style={{ color: 'var(--warm-brown)' }} />
                  </div>
                )}
              </div>

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

            {/* Start of new/modified "Dates de lecture" section */}
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
            {/* End of new/modified "Dates de lecture" section */}

            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="w-full text-white font-medium"
              style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}
            >
              Enregistrer les modifications
            </Button>
          </TabsContent>

          <TabsContent value="comments" className="space-y-4 py-4">
            <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: 'var(--cream)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--deep-brown)' }}>
                Ajouter un commentaire
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="page">Page / %</Label>
                  <Input
                    id="page"
                    type="number"
                    value={newComment.page_number}
                    onChange={(e) => setNewComment({...newComment, page_number: e.target.value})}
                    placeholder="Ex: 150"
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
                      {["😊", "😍", "😢", "😱", "🤔", "😡", "🥰"].map(m => (
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
                  placeholder="Partagez vos pensées..."
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="spoiler"
                    checked={newComment.is_spoiler}
                    onCheckedChange={(checked) => setNewComment({...newComment, is_spoiler: checked})}
                  />
                  <Label htmlFor="spoiler" className="text-sm cursor-pointer">
                    Contient des spoilers
                  </Label>
                </div>
                <Button
                  onClick={() => addCommentMutation.mutate(newComment)}
                  disabled={!newComment.comment || addCommentMutation.isPending}
                  size="sm"
                  className="text-white"
                  style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-4 rounded-xl border"
                    style={{ 
                      backgroundColor: 'white',
                      borderColor: 'var(--beige)'
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{comment.mood}</span>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--deep-brown)' }}>
                            Page {comment.page_number || '?'}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--soft-brown)' }}>
                            {format(new Date(comment.created_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {comment.is_spoiler && (
                          <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                                style={{ backgroundColor: 'var(--rose-gold)', color: 'var(--deep-brown)' }}>
                            <AlertTriangle className="w-3 h-3" />
                            Spoiler
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--deep-brown)' }}>
                      {comment.comment}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--warm-brown)' }}>
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  Aucun commentaire pour ce livre
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
