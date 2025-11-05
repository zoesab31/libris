import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";

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
  const [customGenre, setCustomGenre] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const toggleGenre = (genre) => {
    if (value.includes(genre)) {
      onChange(value.filter(g => g !== genre));
    } else {
      onChange([...value, genre]);
    }
  };

  const addCustomGenre = () => {
    if (customGenre.trim() && !value.includes(customGenre.trim())) {
      onChange([...value, customGenre.trim()]);
      setCustomGenre("");
      setShowCustomInput(false);
    }
  };

  const removeGenre = (genre) => {
    onChange(value.filter(g => g !== genre));
  };

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

      {/* Predefined genres */}
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
            onKeyPress={(e) => e.key === 'Enter' && addCustomGenre()}
            className="flex-1"
          />
          <Button
            onClick={addCustomGenre}
            disabled={!customGenre.trim()}
            style={{ background: 'var(--deep-pink)', color: 'white' }}
          >
            Ajouter
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setShowCustomInput(false);
              setCustomGenre("");
            }}
          >
            Annuler
          </Button>
        </div>
      )}
    </div>
  );
}