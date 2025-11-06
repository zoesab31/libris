import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const PREDEFINED_GENRES = [
  "Romantasy",
  "Fantasy",
  "Romance",
  "Dark Romance",
  "Contemporary Romance",
  "Thriller",
  "Horror",
  "Science-Fiction",
  "Dystopie",
  "Young Adult",
  "New Adult",
  "Paranormal",
  "Historique",
  "Policier",
];

export default function GenreTagInput({ value = [], onChange }) {
  const queryClient = useQueryClient();
  const [customGenre, setCustomGenre] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Fetch user's custom genres
  const { data: customGenres = [] } = useQuery({
    queryKey: ['customGenres'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        return base44.entities.CustomGenre.filter({ created_by: user.email }, 'order');
      } catch {
        return [];
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Create custom genre mutation
  const createGenreMutation = useMutation({
    mutationFn: async (genreName) => {
      const maxOrder = customGenres.length > 0 
        ? Math.max(...customGenres.map(g => g.order || 0))
        : 0;
      
      return base44.entities.CustomGenre.create({
        name: genreName,
        order: maxOrder + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customGenres'] });
      toast.success("Genre ajouté !");
    },
    onError: (error) => {
      console.error("Error creating genre:", error);
      toast.error("Erreur lors de l'ajout du genre");
    }
  });

  // Delete custom genre mutation
  const deleteGenreMutation = useMutation({
    mutationFn: (genreId) => base44.entities.CustomGenre.delete(genreId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customGenres'] });
      toast.success("Genre supprimé de la liste globale");
    },
    onError: (error) => {
      console.error("Error deleting genre:", error);
      toast.error("Erreur lors de la suppression");
    }
  });

  const toggleGenre = (genre) => {
    if (value.includes(genre)) {
      onChange(value.filter(g => g !== genre));
    } else {
      onChange([...value, genre]);
    }
  };

  const addCustomGenre = async () => {
    if (isAdding || !customGenre.trim()) return;
    
    const trimmedGenre = customGenre.trim();
    
    // Check if already exists in predefined or custom
    const allGenres = [...PREDEFINED_GENRES, ...customGenres.map(g => g.name)];
    if (allGenres.includes(trimmedGenre)) {
      toast.error("Ce genre existe déjà !");
      setCustomGenre("");
      return;
    }

    setIsAdding(true);
    
    try {
      // Add to book's genres
      if (!value.includes(trimmedGenre)) {
        onChange([...value, trimmedGenre]);
      }
      
      // Save to global custom genres
      await createGenreMutation.mutateAsync(trimmedGenre);
      
      setCustomGenre("");
      setShowCustomInput(false);
    } catch (error) {
      console.error("Error adding genre:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const removeGenre = (genre) => {
    onChange(value.filter(g => g !== genre));
  };

  const deleteGenreFromList = (genre, e) => {
    e.stopPropagation();
    
    // Find the genre in customGenres
    const genreToDelete = customGenres.find(g => g.name === genre.name);
    if (!genreToDelete) return;
    
    // Remove from current book's selection if present
    if (value.includes(genre.name)) {
      onChange(value.filter(g => g !== genre.name));
    }
    
    // Delete from global list
    deleteGenreMutation.mutate(genreToDelete.id);
  };

  // Combine predefined and custom genres
  const allGenreOptions = [
    ...PREDEFINED_GENRES,
    ...customGenres.map(g => g.name)
  ];

  return (
    <div className="space-y-3">
      {/* Selected genres */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((genre) => (
            <div
              key={genre}
              className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: 'var(--soft-pink)', color: 'white' }}
            >
              <span>{genre}</span>
              <button onClick={() => removeGenre(genre)} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* All available genres */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {PREDEFINED_GENRES.map((genre) => (
          <button
            key={genre}
            onClick={() => toggleGenre(genre)}
            className={`p-2 rounded-lg text-sm font-medium transition-all ${
              value.includes(genre) ? 'shadow-md scale-105' : 'hover:shadow-md'
            }`}
            style={{
              backgroundColor: value.includes(genre) ? 'var(--soft-pink)' : 'white',
              color: value.includes(genre) ? 'white' : 'var(--dark-text)',
              border: '2px solid',
              borderColor: value.includes(genre) ? 'var(--deep-pink)' : 'var(--beige)'
            }}
          >
            {genre}
          </button>
        ))}

        {/* Custom genres with delete option */}
        {customGenres.map((genre) => (
          <div
            key={genre.id}
            className="relative group"
          >
            <button
              onClick={() => toggleGenre(genre.name)}
              className={`w-full p-2 pr-8 rounded-lg text-sm font-medium transition-all ${
                value.includes(genre.name) ? 'shadow-md scale-105' : 'hover:shadow-md'
              }`}
              style={{
                backgroundColor: value.includes(genre.name) ? 'var(--soft-pink)' : 'white',
                color: value.includes(genre.name) ? 'white' : 'var(--dark-text)',
                border: '2px solid',
                borderColor: value.includes(genre.name) ? 'var(--deep-pink)' : 'var(--beige)'
              }}
            >
              {genre.name}
            </button>
            <button
              onClick={(e) => deleteGenreFromList(genre, e)}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: 'var(--deep-pink)'
              }}
              title="Supprimer de la liste"
              disabled={deleteGenreMutation.isPending}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add custom genre */}
      {!showCustomInput ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCustomInput(true)}
          className="w-full"
          style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un genre personnalisé
        </Button>
      ) : (
        <div className="flex gap-2">
          <Input
            value={customGenre}
            onChange={(e) => setCustomGenre(e.target.value)}
            placeholder="Ex: Urban Fantasy"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isAdding) {
                e.preventDefault();
                addCustomGenre();
              }
            }}
            className="flex-1"
            disabled={isAdding}
          />
          <Button
            onClick={addCustomGenre}
            disabled={!customGenre.trim() || isAdding}
            style={{ background: 'var(--deep-pink)', color: 'white' }}
          >
            {isAdding ? "..." : "Ajouter"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setShowCustomInput(false);
              setCustomGenre("");
            }}
            disabled={isAdding}
          >
            Annuler
          </Button>
        </div>
      )}
    </div>
  );
}