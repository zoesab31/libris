import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Image as ImageIcon, Upload, X, Eye, EyeOff } from "lucide-react";
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

  const createCommentMutation = useMutation({
    mutationFn: async (data) => {
      // Upload photos if any
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
      toast.success("Commentaire ajouté !");
      setComment({ comment: "", chapter: "", page_number: "", mood: "", is_spoiler: false, photos: [] });
      setPhotoPreview([]);
      setUploadedPhotos([]);
    }
  });

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadedPhotos(prev => [...prev, ...files]);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to be ready
      await new Promise(resolve => video.onloadedmetadata = resolve);

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Stop stream
      stream.getTracks().forEach(track => track.stop());

      // Convert to blob
      canvas.toBlob((blob) => {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setUploadedPhotos(prev => [...prev, file]);
        setPhotoPreview(prev => [...prev, canvas.toDataURL()]);
      }, 'image/jpeg');

    } catch (error) {
      console.error('Camera error:', error);
      toast.error("Impossible d'accéder à la caméra");
    }
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
      {/* New Comment Form */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: 'white', border: '2px solid var(--beige)' }}>
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
          💭 Ajouter un commentaire
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="chapter" className="text-sm">Chapitre</Label>
              <Input
                id="chapter"
                value={comment.chapter}
                onChange={(e) => setComment({...comment, chapter: e.target.value})}
                placeholder="Chapitre 5"
              />
            </div>
            <div>
              <Label htmlFor="page" className="text-sm">Page</Label>
              <Input
                id="page"
                type="number"
                value={comment.page_number}
                onChange={(e) => setComment({...comment, page_number: e.target.value})}
                placeholder="42"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="comment" className="text-sm">Votre commentaire</Label>
            <Textarea
              id="comment"
              value={comment.comment}
              onChange={(e) => setComment({...comment, comment: e.target.value})}
              placeholder="Vos impressions, théories, émotions..."
              rows={4}
              className="resize-none"
            />
          </div>

          <div>
            <Label className="text-sm mb-2 block">Humeur</Label>
            <div className="flex gap-2 flex-wrap">
              {MOODS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  onClick={() => setComment({...comment, mood: emoji})}
                  className={`px-4 py-2 rounded-lg text-2xl transition-all ${
                    comment.mood === emoji ? 'scale-110 shadow-md' : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: comment.mood === emoji ? 'var(--soft-pink)' : 'var(--cream)',
                    border: '2px solid',
                    borderColor: comment.mood === emoji ? 'var(--deep-pink)' : 'var(--beige)'
                  }}
                  title={label}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Photo upload */}
          <div>
            <Label className="text-sm mb-2 block">Photos</Label>
            <div className="flex gap-2">
              <label className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer transition-all hover:shadow-md"
                     style={{ backgroundColor: 'var(--cream)', border: '2px dashed var(--beige)', color: 'var(--dark-text)' }}>
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Galerie</span>
                </div>
              </label>
              
              <Button
                type="button"
                onClick={handleCameraCapture}
                className="flex-1"
                variant="outline"
                style={{ borderColor: 'var(--beige)', color: 'var(--dark-text)' }}
              >
                <Camera className="w-5 h-5 mr-2" />
                Photo
              </Button>
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

          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--beige)' }}>
            <div className="flex items-center gap-2">
              <Switch
                id="spoiler"
                checked={comment.is_spoiler}
                onCheckedChange={(checked) => setComment({...comment, is_spoiler: checked})}
              />
              <Label htmlFor="spoiler" className="text-sm cursor-pointer">
                Contient des spoilers
              </Label>
            </div>

            <Button
              onClick={() => createCommentMutation.mutate(comment)}
              disabled={!comment.comment || createCommentMutation.isPending}
              className="text-white font-medium"
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
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'white', border: '2px solid var(--beige)' }}
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
                      className="text-xs"
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
                  <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--cream)' }}>
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