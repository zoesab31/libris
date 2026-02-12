import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { toast } from "sonner";

export default function EditProfileDialog({ open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const [bio, setBio] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState([]);
  const [readingJournal, setReadingJournal] = useState("");
  const [favoriteQuote, setFavoriteQuote] = useState("");
  const [readingPersonality, setReadingPersonality] = useState("");
  const [newGenre, setNewGenre] = useState("");

  useEffect(() => {
    if (user) {
      setBio(user.bio || "");
      setFavoriteGenres(user.favorite_genres || []);
      setReadingJournal(user.reading_journal || "");
      setFavoriteQuote(user.favorite_quote || "");
      setReadingPersonality(user.reading_personality || "");
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success("Profil mis à jour !");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      bio,
      favorite_genres: favoriteGenres,
      reading_journal: readingJournal,
      favorite_quote: favoriteQuote,
      reading_personality: readingPersonality
    });
  };

  const addGenre = () => {
    if (newGenre && !favoriteGenres.includes(newGenre)) {
      setFavoriteGenres([...favoriteGenres, newGenre]);
      setNewGenre("");
    }
  };

  const removeGenre = (genre) => {
    setFavoriteGenres(favoriteGenres.filter(g => g !== genre));
  };

  const commonGenres = ["Romance", "Fantasy", "Thriller", "Policier", "Science-Fiction", 
                        "Contemporain", "Historique", "Young Adult", "New Adult", "Dystopie", 
                        "Paranormal", "Dark Romance", "Romantasy"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--dark-text)' }}>Modifier mon profil</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label style={{ color: 'var(--dark-text)' }}>Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              placeholder="Parle-nous de toi... Tes livres préférés, tes auteurs favoris..."
              rows={4}
              className="mt-2"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--warm-pink)' }}>
              {bio.length}/500 caractères
            </p>
          </div>

          <div>
            <Label style={{ color: 'var(--dark-text)' }}>Genres favoris</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newGenre}
                onChange={(e) => setNewGenre(e.target.value)}
                placeholder="Ajouter un genre"
                list="genre-suggestions"
              />
              <datalist id="genre-suggestions">
                {commonGenres.map(genre => (
                  <option key={genre} value={genre} />
                ))}
              </datalist>
              <Button type="button" onClick={addGenre}>Ajouter</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {favoriteGenres.map(genre => (
                <div key={genre} className="px-3 py-1 rounded-full flex items-center gap-2"
                     style={{ backgroundColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                  <span className="text-sm font-medium">{genre}</span>
                  <button type="button" onClick={() => removeGenre(genre)}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label style={{ color: 'var(--dark-text)' }}>Type de lectrice</Label>
            <Select value={readingPersonality} onValueChange={setReadingPersonality}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choisis ton type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Marathonienne">📚 Marathonienne - Je dévore les livres</SelectItem>
                <SelectItem value="Papillonne">🦋 Papillonne - Je passe d'un livre à l'autre</SelectItem>
                <SelectItem value="Sélective">⭐ Sélective - Je choisis avec soin</SelectItem>
                <SelectItem value="Exploratrice">🌍 Exploratrice - J'aime découvrir</SelectItem>
                <SelectItem value="Nostalgique">💝 Nostalgique - Je relis mes favoris</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label style={{ color: 'var(--dark-text)' }}>Citation préférée</Label>
            <Textarea
              value={favoriteQuote}
              onChange={(e) => setFavoriteQuote(e.target.value)}
              placeholder="Ta citation qui te représente..."
              rows={2}
              className="mt-2"
            />
          </div>

          <div>
            <Label style={{ color: 'var(--dark-text)' }}>Lectures pour me connaître</Label>
            <Textarea
              value={readingJournal}
              onChange={(e) => setReadingJournal(e.target.value)}
              placeholder="Parle de tes livres qui t'ont marquée, tes coups de cœur, ce qui te définit en tant que lectrice..."
              rows={6}
              className="mt-2"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="text-white"
                    style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}