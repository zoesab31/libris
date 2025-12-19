import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Image as ImageIcon, X, Eye, EyeOff, Trash2, Lock, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const MOODS = [
  { emoji: "😊", label: "Content" },
  { emoji: "😍", label: "Adoré" },
  { emoji: "😢", label: "Triste" },
  { emoji: "😱", label: "Choqué" },
  { emoji: "🤔", label: "Pensif" },
  { emoji: "😡", label: "En colère" },
  { emoji: "🥰", label: "Amour" }
];

export default function CommentSection({ bookId, userBookId, existingComments = [], friendsUserBooks = [], myFriends = [], allUsers = [], currentUserBook = null }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState({
    comment: "",
    chapter: "",
    page_number: "",
    mood: "",
    is_spoiler: false,
    spoiler_visibility: "immediate",
    spoiler_chapter: "",
    photos: []
  });
  const [photoPreview, setPhotoPreview] = useState([]);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [revealedSpoilers, setRevealedSpoilers] = useState(new Set());

  const createCommentMutation = useMutation({
    mutationFn: async () => {
      let photoUrls = [];
      if (uploadedPhotos.length > 0) {
        try {
          for (const photo of uploadedPhotos) {
            const result = await base44.integrations.Core.UploadFile({ file: photo });
            photoUrls.push(result.file_url);
          }
        } catch (error) {
          console.error("Error uploading photos:", error);
          toast.error("Erreur lors de l'upload des photos");
          throw error;
        }
      }

      return await base44.entities.ReadingComment.create({
        comment: comment.comment,
        chapter: comment.chapter || undefined,
        page_number: comment.page_number ? parseInt(comment.page_number) : undefined,
        mood: comment.mood || undefined,
        is_spoiler: comment.is_spoiler,
        spoiler_visibility: comment.is_spoiler ? comment.spoiler_visibility : undefined,
        spoiler_chapter: (comment.is_spoiler && comment.spoiler_visibility === "after_chapter") ? comment.spoiler_chapter : undefined,
        book_id: bookId,
        user_book_id: userBookId,
        photos: photoUrls.length > 0 ? photoUrls : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentComments'] });
      queryClient.invalidateQueries({ queryKey: ['readingComments'] });
      queryClient.invalidateQueries({ queryKey: ['bookComments', bookId] });
      toast.success("✅ Commentaire ajouté !");
      setComment({ comment: "", chapter: "", page_number: "", mood: "", is_spoiler: false, spoiler_visibility: "immediate", spoiler_chapter: "", photos: [] });
      setPhotoPreview([]);
      setUploadedPhotos([]);
    },
    onError: (error) => {
      console.error("Error creating comment:", error);
      toast.error("Erreur lors de la publication du commentaire");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => base44.entities.ReadingComment.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentComments'] });
      queryClient.invalidateQueries({ queryKey: ['readingComments'] });
      queryClient.invalidateQueries({ queryKey: ['bookComments', bookId] });
      toast.success("🗑️ Commentaire supprimé !");
    },
  });

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadedPhotos(prev => [...prev, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotoPreview(prev => prev.filter((_, i) => i !== index));
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSpoiler = (commentId) => {
    const confirmed = window.confirm("⚠️ Avez-vous lu le livre ? Ce commentaire contient des spoilers.");
    
    if (confirmed) {
      setRevealedSpoilers(prev => {
        const newSet = new Set(prev);
        newSet.add(commentId);
        return newSet;
      });
    }
  };

  // Helper function to check if comment should be visible
  const isCommentVisible = (c) => {
    if (!c.is_spoiler || c.spoiler_visibility === "immediate") return true;
    
    if (c.spoiler_visibility === "after_finish") {
      return currentUserBook?.status === "Lu";
    }
    
    if (c.spoiler_visibility === "after_chapter" && c.spoiler_chapter) {
      if (!currentUserBook?.chapter) return false;
      // Simple string comparison - could be improved with chapter parsing
      return currentUserBook.chapter >= c.spoiler_chapter;
    }
    
    return false;
  };

  return (
    <div className="space-y-6">
      {/* New Comment Form - IMPROVED CONTRAST */}
      <div className="p-6 rounded-xl border-2 shadow-md" 
           style={{ backgroundColor: 'white', borderColor: 'var(--beige)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
          💭 Ajouter un commentaire
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="chapter" className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                Chapitre
              </Label>
              <Input
                id="chapter"
                value={comment.chapter}
                onChange={(e) => setComment({...comment, chapter: e.target.value})}
                placeholder="Chapitre 5"
                className="border-2"
                style={{ borderColor: 'var(--beige)', backgroundColor: 'white' }}
              />
            </div>
            <div>
              <Label htmlFor="page" className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                Page
              </Label>
              <Input
                id="page"
                type="number"
                value={comment.page_number}
                onChange={(e) => setComment({...comment, page_number: e.target.value})}
                placeholder="42"
                className="border-2"
                style={{ borderColor: 'var(--beige)', backgroundColor: 'white' }}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="comment" className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
              Votre commentaire
            </Label>
            <Textarea
            id="comment"
            value={comment.comment}
            onChange={(e) => setComment({...comment, comment: e.target.value})}
            placeholder="Vos impressions, théories, émotions..."
            rows={4}
            className="resize-none border-2"
            style={{ borderColor: 'var(--beige)', backgroundColor: 'white' }}
            />
          </div>

          <div>
            <Label className="text-sm mb-2 block font-medium" style={{ color: 'var(--dark-text)' }}>
              Humeur
            </Label>
            <div className="flex gap-2 flex-wrap">
              {MOODS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setComment({...comment, mood: emoji})}
                  className={`px-4 py-2 rounded-lg text-2xl transition-all border-2 ${
                    comment.mood === emoji ? 'scale-110 shadow-lg' : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: comment.mood === emoji ? 'var(--soft-pink)' : 'white',
                    borderColor: comment.mood === emoji ? 'var(--deep-pink)' : 'var(--beige)'
                  }}
                  title={label}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Photo upload - FIXED */}
          <div>
            <Label className="text-sm mb-2 block font-medium" style={{ color: 'var(--dark-text)' }}>
              Photos
            </Label>
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-all hover:shadow-md border-2"
                     style={{ backgroundColor: 'white', borderColor: 'var(--beige)', color: 'var(--dark-text)' }}>
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Galerie</span>
                </div>
              </label>
              
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-all hover:shadow-md border-2"
                     style={{ backgroundColor: 'white', borderColor: 'var(--beige)', color: 'var(--dark-text)' }}>
                  <Camera className="w-5 h-5" />
                  <span className="text-sm font-medium">Photo</span>
                </div>
              </label>
            </div>

            {/* Photo previews */}
            {photoPreview.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {photoPreview.map((preview, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-lg shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: 'var(--deep-pink)' }}
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t-2" style={{ borderColor: 'var(--beige)' }}>
            <div className="flex items-center gap-2">
              <Switch
                id="spoiler"
                checked={comment.is_spoiler}
                onCheckedChange={(checked) => setComment({...comment, is_spoiler: checked})}
              />
              <Label htmlFor="spoiler" className="text-sm cursor-pointer font-medium" style={{ color: 'var(--dark-text)' }}>
                Contient des spoilers
              </Label>
            </div>

            {comment.is_spoiler && (
              <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: '#FFF3E0' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4" style={{ color: '#F57C00' }} />
                  <p className="text-sm font-bold" style={{ color: '#E65100' }}>
                    Quand cette note sera-t-elle visible ?
                  </p>
                </div>

                <Select
                  value={comment.spoiler_visibility}
                  onValueChange={(value) => setComment({...comment, spoiler_visibility: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span>Visible immédiatement</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="after_chapter">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        <span>Après un chapitre spécifique</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="after_finish">
                      <div className="flex items-center gap-2">
                        <EyeOff className="w-4 h-4" />
                        <span>Uniquement après avoir fini</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {comment.spoiler_visibility === "after_chapter" && (
                  <div>
                    <Label className="text-xs mb-1 block" style={{ color: '#E65100' }}>
                      Visible après le chapitre :
                    </Label>
                    <Input
                      value={comment.spoiler_chapter}
                      onChange={(e) => setComment({...comment, spoiler_chapter: e.target.value})}
                      placeholder="Ex: Chapitre 15, Partie 3..."
                      className="border-orange-300"
                    />
                  </div>
                )}

                <p className="text-xs" style={{ color: '#F57C00' }}>
                  💡 La note sera automatiquement révélée quand vous atteindrez le seuil défini
                </p>
              </div>
            )}

            <Button
              onClick={() => createCommentMutation.mutate()}
              disabled={!comment.comment || createCommentMutation.isPending}
              className="w-full text-white font-medium shadow-md"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
            >
              {createCommentMutation.isPending ? "Ajout..." : "Publier"}
            </Button>
          </div>
        </div>
      </div>

      {/* Existing Comments */}
      {existingComments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--dark-text)' }}>
            💬 Vos commentaires ({existingComments.length})
          </h3>
          
          {existingComments.map((c) => {
            const isSpoilerRevealed = revealedSpoilers.has(c.id);
            const commentVisible = isCommentVisible(c);

            return (
              <div
                key={c.id}
                className="p-4 rounded-xl border-2 shadow-md"
                style={{ backgroundColor: 'white', borderColor: 'var(--beige)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {!c.is_spoiler && c.mood && <span className="text-2xl">{c.mood}</span>}
                    <div>
                      {c.chapter && (
                        <p className="text-sm font-bold" style={{ color: 'var(--dark-text)' }}>
                          {c.chapter}
                        </p>
                      )}
                      {c.page_number && (
                        <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                          Page {c.page_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.is_spoiler && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium" 
                            style={{ backgroundColor: '#FFE6E6', color: '#DC2626' }}>
                        ⚠️ Spoiler
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm("Êtes-vous sûre de vouloir supprimer ce commentaire ?")) {
                          deleteCommentMutation.mutate(c.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      disabled={deleteCommentMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {c.is_spoiler && !isSpoilerRevealed && !commentVisible ? (
                  <div>
                    <div className="p-6 rounded-lg text-center border-2" 
                         style={{ backgroundColor: '#FFF5F5', borderColor: '#FEE2E2' }}>
                      <Lock className="w-8 h-8 mx-auto mb-2 text-red-600" />
                      <p className="text-base font-bold mb-1" style={{ color: '#DC2626' }}>
                        📝 Note masquée — spoiler
                      </p>
                      <p className="text-sm mb-2" style={{ color: '#991B1B' }}>
                        {c.spoiler_visibility === "after_finish" && "Visible après avoir terminé le livre"}
                        {c.spoiler_visibility === "after_chapter" && `Visible après ${c.spoiler_chapter}`}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleSpoiler(c.id)}
                        className="text-xs text-red-700 hover:text-red-900"
                      >
                        Révéler quand même (spoiler)
                      </Button>
                    </div>
                    {/* Photos masquées aussi */}
                    {c.photos && c.photos.length > 0 && (
                      <div className="mt-3 p-4 rounded-lg text-center" 
                           style={{ backgroundColor: '#FFF5F5' }}>
                        <p className="text-xs font-medium" style={{ color: '#DC2626' }}>
                          📷 {c.photos.length} photo{c.photos.length > 1 ? 's' : ''} masquée{c.photos.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {c.is_spoiler && isSpoilerRevealed && c.mood && (
                      <div className="mb-2">
                        <span className="text-2xl">{c.mood}</span>
                      </div>
                    )}
                    <p className="text-sm mb-3" style={{ color: 'var(--dark-text)' }}>
                      {c.comment}
                    </p>

                    {/* Photos */}
                    {c.photos && c.photos.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {c.photos.map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`Photo ${idx + 1}`}
                            className="w-24 h-24 object-cover rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(photo, '_blank')}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}