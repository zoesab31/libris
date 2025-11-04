import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Image as ImageIcon, X, Eye, EyeOff } from "lucide-react";
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

export default function CommentSection({ bookId, userBookId, existingComments = [] }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState({
    comment: "",
    chapter: "",
    page_number: "",
    mood: "",
    is_spoiler: false,
    photos: []
  });
  const [photoPreview, setPhotoPreview] = useState([]);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [revealedSpoilers, setRevealedSpoilers] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Autosave on unmount or when leaving
  useEffect(() => {
    return () => {
      if (comment.comment.trim()) {
        handleAutoSave();
      }
    };
  }, [comment]);

  const handleAutoSave = async () => {
    if (!comment.comment.trim() || isSaving) return;
    
    setIsSaving(true);
    try {
      await createCommentMutation.mutateAsync();
      toast.success("💾 Sauvegardé automatiquement");
    } catch (error) {
      toast.error("Erreur de sauvegarde, réessai...");
      setTimeout(() => handleAutoSave(), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const createCommentMutation = useMutation({
    mutationFn: async (data) => {
      let photoUrls = [];
      if (uploadedPhotos.length > 0) {
        for (const photo of uploadedPhotos) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
          photoUrls.push(file_url);
        }
      }

      await base44.entities.ReadingComment.create({
        ...data,
        book_id: bookId,
        user_book_id: userBookId,
        photos: photoUrls.length > 0 ? photoUrls : undefined,
        page_number: data.page_number ? parseInt(data.page_number) : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentComments'] });
      queryClient.invalidateQueries({ queryKey: ['bookComments', bookId] });
      toast.success("✅ Commentaire ajouté !");
      setComment({ comment: "", chapter: "", page_number: "", mood: "", is_spoiler: false, photos: [] });
      setPhotoPreview([]);
      setUploadedPhotos([]);
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
    setRevealedSpoilers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
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
                onBlur={handleAutoSave}
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
                onBlur={handleAutoSave}
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
              onBlur={handleAutoSave}
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

          <div className="flex items-center justify-between pt-4 border-t-2" style={{ borderColor: 'var(--beige)' }}>
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

            <Button
              onClick={() => createCommentMutation.mutate(comment)}
              disabled={!comment.comment || createCommentMutation.isPending}
              className="text-white font-medium shadow-md"
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
            
            return (
              <div
                key={c.id}
                className="p-4 rounded-xl border-2 shadow-md"
                style={{ backgroundColor: 'white', borderColor: 'var(--beige)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {c.mood && <span className="text-2xl">{c.mood}</span>}
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
                  {c.is_spoiler && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleSpoiler(c.id)}
                      className="text-xs font-medium"
                      style={{ color: 'var(--deep-pink)' }}
                    >
                      {isSpoilerRevealed ? (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Masquer
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Révéler spoiler
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {c.is_spoiler && !isSpoilerRevealed ? (
                  <div className="p-4 rounded-lg text-center border-2" 
                       style={{ backgroundColor: 'var(--cream)', borderColor: 'var(--beige)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--warm-pink)' }}>
                      ⚠️ Contenu masqué (spoiler)
                    </p>
                  </div>
                ) : (
                  <>
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