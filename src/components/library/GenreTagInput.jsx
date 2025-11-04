import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import clsx from "clsx";

const DEFAULT_SUGGESTED = [
  "Fantasy", "Romantasy", "Dark Romance", "Romance", "Thriller",
  "Science-Fiction", "Horreur", "Contemporain", "Historique",
  "Jeunesse", "Dystopie", "Aventure", "Comédie romantique",
  "Fantasy urbaine", "Paranormal", "Steampunk", "High Fantasy"
];

// Util: Title Case FR light (respecte accents, apostrophes, tirets)
function titleCase(str: string) {
  return str
    .toLowerCase()
    .split(/\s+|-/g)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .replace(/\s+'/g, " '"); // évite les espaces chelous avant apostrophes
}

// Normalisation configurable
function normalizeTag(raw: string, mode: "title" | "lower" | "none" = "title") {
  const t = raw.trim().replace(/\s{2,}/g, " ");
  if (!t) return "";
  if (mode === "lower") return t.toLowerCase();
  if (mode === "none") return t;
  return titleCase(t);
}

type Props = {
  value?: string[];                 // tags affichés (ex: ["Romance", "Fantasy"])
  onChange: (next: string[]) => void;
  suggested?: string[];
  maxTags?: number;
  maxSuggestions?: number;
  allowNew?: boolean;
  normalize?: "title" | "lower" | "none";
  placeholder?: string;
  className?: string;
};

export default function GenreTagInput({
  value = [],
  onChange,
  suggested = DEFAULT_SUGGESTED,
  maxTags = Infinity,
  maxSuggestions = 6,
  allowNew = true,
  normalize = "title",
  placeholder = "Ajouter des tags/genres…",
  className,
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Set insensible à la casse pour éviter doublons
  const existingCanon = useMemo(
    () => new Set(value.map(v => v.toLowerCase())),
    [value]
  );

  // Suggestions filtrées
  const suggestions = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) {
      return suggested
        .filter(g => !existingCanon.has(g.toLowerCase()))
        .slice(0, maxSuggestions);
    }
    return suggested
      .filter(
        g => g.toLowerCase().includes(q) && !existingCanon.has(g.toLowerCase())
      )
      .slice(0, maxSuggestions);
  }, [inputValue, suggested, existingCanon, maxSuggestions]);

  // Ajout d'un tag (normalisé, sans doublon)
  function addTag(raw: string) {
    if (value.length >= maxTags) return;
    const tag = normalizeTag(raw, normalize);
    if (!tag) return;
    const canon = tag.toLowerCase();
    if (existingCanon.has(canon)) return;
    onChange([...value, tag]);
    setInputValue("");
    setOpen(false);
    setActiveIndex(-1);
  }

  // Suppression
  function removeTag(t: string) {
    onChange(value.filter(v => v !== t));
  }

  // Touche clavier
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex(i => {
        const next = (i + 1) % Math.max(suggestions.length, 1);
        return suggestions.length ? next : -1;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex(i => {
        const next =
          (i - 1 + Math.max(suggestions.length, 1)) %
          Math.max(suggestions.length, 1);
        return suggestions.length ? next : -1;
      });
    } else if (e.key === "Enter") {
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        addTag(suggestions[activeIndex]);
      } else if (allowNew && inputValue.trim()) {
        e.preventDefault();
        addTag(inputValue);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    } else if (e.key === "Backspace" && !inputValue) {
      // supprimer dernier tag si champ vide
      if (value.length > 0) {
        removeTag(value[value.length - 1]);
      }
    } else if (e.key === "," || e.key === ";") {
      // ajout rapide quand on tape une virgule / point-virgule
      if (allowNew && inputValue.trim()) {
        e.preventDefault();
        addTag(inputValue);
      }
    }
  }

  // Coller plusieurs tags "a, b; c"
  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (text && /[,;]\s*/.test(text)) {
      e.preventDefault();
      const parts = text.split(/[,;]\s*/).map(s => normalizeTag(s, normalize));
      const toAdd: string[] = [];
      for (const p of parts) {
        if (!p) continue;
        const canon = p.toLowerCase();
        if (!existingCanon.has(canon) && !toAdd.map(x=>x.toLowerCase()).includes(canon)) {
          toAdd.push(p);
        }
      }
      if (toAdd.length) onChange([...value, ...toAdd].slice(0, maxTags));
      setInputValue("");
      setOpen(false);
    }
  }

  // Blur: si texte présent → ajouter
  function onBlurAdd() {
    if (allowNew && inputValue.trim()) {
      addTag(inputValue);
    } else {
      setOpen(false);
    }
  }

  // Click outside pour fermer
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className={clsx("space-y-3", className)} ref={rootRef}>
      {/* Zone d'entrée */}
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={onKeyDown}
          onBlur={onBlurAdd}
          onPaste={onPaste}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="genre-suggest-list"
          className="w-full"
        />

        {/* Suggestions */}
        {open && suggestions.length > 0 && (
          <ul
            id="genre-suggest-list"
            role="listbox"
            ref={listRef}
            className="absolute z-20 w-full mt-1 max-h-56 overflow-auto rounded-lg border bg-white shadow-md"
          >
            {suggestions.map((g, i) => (
              <li key={g} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(-1)}
                  onClick={() => addTag(g)}
                  className={clsx(
                    "w-full text-left px-3 py-2 text-sm",
                    i === activeIndex ? "bg-rose-50" : "hover:bg-rose-50"
                  )}
                >
                  {g}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tags sélectionnés */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <Badge
              key={tag}
              className="px-3 py-1 text-sm font-medium flex items-center gap-2 bg-rose-500 text-white"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="opacity-90 hover:opacity-70 focus:outline-none"
                aria-label={`Retirer ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Ajout rapide (suggestions populaires) */}
      <div className="flex flex-wrap gap-2">
        {suggested
          .filter(g => !existingCanon.has(g.toLowerCase()))
          .slice(0, 8)
          .map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => addTag(g)}
              className="px-2 py-1 rounded-lg text-xs font-medium border hover:shadow-sm bg-rose-50 border-rose-100 text-rose-900"
            >
              + {g}
            </button>
          ))}
      </div>
    </div>
  );
}
