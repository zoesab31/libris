import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Music as MusicIcon } from "lucide-react";
import { toast } from "sonner";

const GENRES = ["Romance", "Fantasy", "Thriller", "Policier", "Science-Fiction", "Contemporain", 
                "Historique", "Young Adult", "New Adult", "Dystopie", "Paranormal", "Autre"];

const STATUSES = ["Lu", "En cours", "À lire", "Abandonné", "Mes envies"];

export default function AddBookDialog({ open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [bookData, setBookData] = useState({
    title: "",
    author: "",
    cover_url: "",
    genre: "",
    page_count: "",
    synopsis: "",
  });
  const [userBookData, setUserBookData] = useState({
    status: "À lire",
    rating: "",
    review: "",
    music: "",
    music_artist: "",
    is_shared_reading: false,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const book = await base44.entities.Book.create(bookData);
      await base44.entities.UserBook.create({
        ...userBookData,
        book_id: book.id,
        rating: userBookData.rating ? parseFloat(userBookData.rating) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("Livre ajouté à votre bibliothèque !");
      onOpenChange(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setStep(1);
    setBookData({ title: "", author: "", cover_url: "", genre: "", page_count: "", synopsis: "" });
    setUserBookData({ status: "À lire", rating: "", review: "", music: "", music_artist: "", is_shared_reading: false });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--deep-brown)' }}>
            {step === 1 ? "📚 Informations du livre" : "✨ Vos impressions"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={bookData.title}
                onChange={(e) => setBookData({...bookData, title: e.target.value})}
                placeholder="Le titre du livre"
              />
            </div>

            <div>
              <Label htmlFor="author">Auteur *</Label>
              <Input
                id="author"
                value={bookData.author}
                onChange={(e) => setBookData({...bookData, author: e.target.value})}
                placeholder="Nom de l'auteur"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="genre">Genre</Label>
                <Select value={bookData.genre} onValueChange={(value) => setBookData({...bookData, genre: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="pages">Nombre de pages</Label>
                <Input
                  id="pages"
                  type="number"
                  value={bookData.page_count}
                  onChange={(e) => setBookData({...bookData, page_count: e.target.value})}
                  placeholder="300"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cover">URL de la couverture</Label>
              <Input
                id="cover"
                value={bookData.cover_url}
                onChange={(e) => setBookData({...bookData, cover_url: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label htmlFor="synopsis">Résumé</Label>
              <Textarea
                id="synopsis"
                value={bookData.synopsis}
                onChange={(e) => setBookData({...bookData, synopsis: e.target.value})}
                placeholder="Un bref résumé du livre..."
                rows={4}
              />
            </div>

            <Button 
              onClick={() => setStep(2)}
              disabled={!bookData.title || !bookData.author}
              className="w-full text-white font-medium"
              style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}
            >
              Suivant
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="status">Statut</Label>
              <Select value={userBookData.status} onValueChange={(value) => setUserBookData({...userBookData, status: value})}>
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

            {(userBookData.status === "Lu" || userBookData.status === "En cours") && (
              <>
                <div>
                  <Label htmlFor="rating">Note (sur 5)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="0"
                    max="5"
                    step="0.5"
                    value={userBookData.rating}
                    onChange={(e) => setUserBookData({...userBookData, rating: e.target.value})}
                    placeholder="4.5"
                  />
                </div>

                <div>
                  <Label htmlFor="review">Mon avis</Label>
                  <Textarea
                    id="review"
                    value={userBookData.review}
                    onChange={(e) => setUserBookData({...userBookData, review: e.target.value})}
                    placeholder="Qu'avez-vous pensé de ce livre ?"
                    rows={4}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MusicIcon className="w-4 h-4" />
                Musique associée
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={userBookData.music}
                  onChange={(e) => setUserBookData({...userBookData, music: e.target.value})}
                  placeholder="Titre de la chanson"
                />
                <Input
                  value={userBookData.music_artist}
                  onChange={(e) => setUserBookData({...userBookData, music_artist: e.target.value})}
                  placeholder="Artiste"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg" 
                 style={{ backgroundColor: 'var(--cream)' }}>
              <Label htmlFor="shared" className="cursor-pointer">
                Lecture commune
              </Label>
              <Switch
                id="shared"
                checked={userBookData.is_shared_reading}
                onCheckedChange={(checked) => setUserBookData({...userBookData, is_shared_reading: checked})}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Retour
              </Button>
              <Button 
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="flex-1 text-white font-medium"
                style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Ajout...
                  </>
                ) : (
                  "Ajouter à ma bibliothèque"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}