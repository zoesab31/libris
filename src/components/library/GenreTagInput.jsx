import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const SUGGESTED_GENRES = [
  "Fantasy", "Romantasy", "Dark Romance", "Romance", "Thriller", 
  "Science-Fiction", "Horreur", "Contemporain", "Historique", 
  "Jeunesse", "Dystopie", "Aventure", "Comédie romantique",
  "Fantasy urbaine", "Paranormal", "Steampunk", "High Fantasy"
];

export default function GenreTagInput({ value = [], onChange }) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    // Filter suggestions based on input
    if (val.length > 0) {
      const filtered = SUGGESTED_GENRES.filter(genre =>
        genre.toLowerCase().includes(val.toLowerCase()) && !value.includes(genre)
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const addTag = (tag) => {
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
      setInputValue("");
      setSuggestions([]);
    }
  };

  const removeTag = (tagToRemove) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ajouter des tags/genres (Fantasy, Romantasy...)"
          className="w-full"
        />
        
        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border-2 max-h-48 overflow-y-auto"
               style={{ borderColor: 'var(--beige)' }}>
            {suggestions.map((genre) => (
              <button
                key={genre}
                onClick={() => addTag(genre)}
                className="w-full text-left px-4 py-2 hover:bg-opacity-50 transition-colors text-sm"
                style={{ 
                  backgroundColor: 'transparent',
                  color: 'var(--dark-text)'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--cream)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                {genre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge
              key={tag}
              className="px-3 py-1 text-sm font-medium flex items-center gap-2"
              style={{ 
                backgroundColor: 'var(--soft-pink)',
                color: 'white'
              }}
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Quick add popular genres */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_GENRES.filter(g => !value.includes(g)).slice(0, 8).map((genre) => (
          <button
            key={genre}
            onClick={() => addTag(genre)}
            className="px-2 py-1 rounded-lg text-xs font-medium transition-all hover:shadow-md"
            style={{
              backgroundColor: 'var(--cream)',
              color: 'var(--dark-text)',
              border: '1px solid var(--beige)'
            }}
          >
            + {genre}
          </button>
        ))}
      </div>
    </div>
  );
}