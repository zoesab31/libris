import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2, Trash2, Heart } from "lucide-react";
import { toast } from "sonner";

export default function AddFavoriteCoupleDialog({ open, onOpenChange, books, existingCouples, editingCouple }) {
  const queryClient = useQueryClient();
  const [coupleData, setCoupleData] = useState({
    couple_name: "",
    character1_name: "",
    character2_name: "",
    book_id: "",
    rank: existingCouples.length + 1,
    why_i_love_them: "",
    best_moment: "",
    image_url: ""
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (editingCouple) {
      setCoupleData(editingCouple);
    } else {
      setCoupleData({
        couple_name: "",
        character1_name: "",
        character2_name: "",
        book_id: "",
        rank: existingCouples.length + 1,
        why_i_love_them: "",
        best_moment: "",
        image_url: ""
      });
    }
  }, [editingCouple, existingCouples.length, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingCouple) {
        await base44.entities.FavoriteCouple.update(editingCouple.id, coupleData);
      } else {
        await base44.entities.FavoriteCouple.create(coupleData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteCouples'] });
      toast.success(editingCouple ? "✅ Couple modifié !" : "✅ Couple ajouté !");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erreur lors de l'enregistrement");
      console.error(error);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.FavoriteCouple.delete(editingCouple.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteCouples'] });
      toast.success("🗑️ Couple supprimé !");
      onOpenChange(false);
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setCoupleData({ ...coupleData, image_url: result.file_url });
      toast.success("✅ Image uploadée !");
    } catch (error) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingImage(false);
    }
  };

  // Auto-generate couple name
  useEffect(() => {
    if (coupleData.character1_name && coupleData.character2_name) {
      setCoupleData(prev => ({
        ...prev,
        couple_name: `${prev.character1_name} & ${prev.character2_name}`
      }));
    }
  }, [coupleData.character1_name, coupleData.character2_name]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
            <Heart className="w-6 h-6" style={{ color: 'var(--deep-pink)' }} />
            {editingCouple ? "Modifier le couple" : "Ajouter un couple préféré"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Personnage 1 *</Label>
              <Input
                value={coupleData.character1_name}
                onChange={(e) => setCoupleData({ ...coupleData, character1_name: e.target.value })}
                placeholder="Ex: Feyre"
              />
            </div>
            <div>
              <Label>Personnage 2 *</Label>
              <Input
                value={coupleData.character2_name}
                onChange={(e) => setCoupleData({ ...coupleData, character2_name: e.target.value })}
                placeholder="Ex: Rhysand"
              />
            </div>
          </div>

          <div>
            <Label>Nom du couple (auto-généré)</Label>
            <Input
              value={coupleData.couple_name}
              onChange={(e) => setCoupleData({ ...coupleData, couple_name: e.target.value })}
              placeholder="Ex: Feyre & Rhysand"
            />
          </div>

          <div>
            <Label>Livre *</Label>
            <Select
              value={coupleData.book_id}
              onValueChange={(value) => setCoupleData({ ...coupleData, book_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un livre" />
              </SelectTrigger>
              <SelectContent>
                {books.map(book => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Rang (1 = préféré)</Label>
            <Input
              type="number"
              min="1"
              value={coupleData.rank}
              onChange={(e) => setCoupleData({ ...coupleData, rank: parseInt(e.target.value) })}
            />
          </div>

          <div>
            <Label>Pourquoi je les adore</Label>
            <Textarea
              value={coupleData.why_i_love_them}
              onChange={(e) => setCoupleData({ ...coupleData, why_i_love_them: e.target.value })}
              placeholder="Leur chimie, leur histoire..."
              rows={4}
            />
          </div>

          <div>
            <Label>Meilleur moment</Label>
            <Textarea
              value={coupleData.best_moment}
              onChange={(e) => setCoupleData({ ...coupleData, best_moment: e.target.value })}
              placeholder="Leur scène préférée ensemble..."
              rows={3}
            />
          </div>

          <div>
            <Label>Image URL</Label>
            <Input
              value={coupleData.image_url}
              onChange={(e) => setCoupleData({ ...coupleData, image_url: e.target.value })}
              placeholder="https://..."
            />
            <div className="mt-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingImage}
                  asChild
                >
                  <span>
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Upload...
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
            </div>
            {coupleData.image_url && (
              <img src={coupleData.image_url} alt="Preview" className="mt-3 w-full h-48 object-cover rounded-xl" />
            )}
          </div>

          <div className="flex gap-3 pt-4">
            {editingCouple && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (window.confirm("Êtes-vous sûre de vouloir supprimer ce couple ?")) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            )}
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!coupleData.character1_name || !coupleData.character2_name || !coupleData.book_id || saveMutation.isPending}
              className="flex-1 text-white"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--soft-pink))' }}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                editingCouple ? "💾 Modifier" : "➕ Ajouter"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}