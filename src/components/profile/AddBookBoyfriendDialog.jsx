import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, Upload, Search, BookOpen, Crop } from "lucide-react";
import ImageCropper from "@/components/profile/ImageCropper";
import { toast } from "sonner";

export default function AddBookBoyfriendDialog({ open, onOpenChange, books, existingCharacters, editingCharacter = null }) {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState(null);
  const [uploading, setUploading] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [characterData, setCharacterData] = useState({
    character_name: "",
    book_id: "",
    rank: existingCharacters.length + 1,
    gender: "male",
    why_i_love_him: "",
    best_quote: "",
    image_url: "",
  });

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Initialize form with editing data
  useEffect(() => {
    if (editingCharacter) {
      setCharacterData({
        character_name: editingCharacter.character_name || "",
        book_id: editingCharacter.book_id || "",
        rank: editingCharacter.rank || 1,
        gender: editingCharacter.gender || "male",
        why_i_love_him: editingCharacter.why_i_love_him || "",
        best_quote: editingCharacter.best_quote || "",
        image_url: editingCharacter.image_url || "",
      });
      // Set search query to book title if editing
      if (editingCharacter.book_id) {
        const book = allBooks.find(b => b.id === editingCharacter.book_id);
        if (book) {
          setSearchQuery(book.title);
        }
      }
    } else {
      setCharacterData({
        character_name: "",
        book_id: "",
        rank: existingCharacters.length + 1,
        gender: "male",
        why_i_love_him: "",
        best_quote: "",
        image_url: ""
      });
      setSearchQuery("");
    }
  }, [editingCharacter, open]);

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooksForCharacters'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user && open,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
    enabled: open,
  });

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase().trim();
    
    // Get books from my library
    const myBookIds = myBooks.map(ub => ub.book_id);
    const myLibraryBooks = allBooks.filter(book => myBookIds.includes(book.id));
    
    // Filter by search query
    return myLibraryBooks
      .filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
      )
      .slice(0, 10); // Limit to 10 results
  }, [searchQuery, myBooks, allBooks]);

  const selectedBook = allBooks.find(b => b.id === characterData.book_id);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingCharacter) {
        return base44.entities.BookBoyfriend.update(editingCharacter.id, data);
      } else {
        return base44.entities.BookBoyfriend.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookBoyfriends'] });
      toast.success(editingCharacter ? "Personnage modifié !" : "Personnage ajouté !");
      onOpenChange(false);
      setCharacterData({
        character_name: "",
        book_id: "",
        rank: existingCharacters.length + 1,
        gender: "male",
        why_i_love_him: "",
        best_quote: "",
        image_url: ""
      });
      setSearchQuery("");
      setShowSuggestions(false);
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setCropImageUrl(localUrl);
    e.target.value = "";
  };

  const handleCropComplete = async (blob) => {
    setCropImageUrl(null);
    setUploading(true);
    try {
      const file = new File([blob], "character.jpg", { type: "image/jpeg" });
      const result = await base44.integrations.Core.UploadFile({ file });
      setCharacterData(prev => ({ ...prev, image_url: result.file_url }));
      toast.success("Image uploadée !");
    } catch (error) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const selectBook = (book) => {
    setCharacterData({ ...characterData, book_id: book.id });
    setSearchQuery(book.title);
    setShowSuggestions(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--deep-brown)' }}>
            💕 {editingCharacter ? "Modifier" : "Ajouter"} un personnage préféré
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Nom du personnage *</Label>
            <Input
              id="name"
              value={characterData.character_name}
              onChange={(e) => setCharacterData({...characterData, character_name: e.target.value})}
              placeholder="Ex: Rhysand, Feyre..."
            />
          </div>

          {/* Book Selection with Search */}
          <div>
            <Label htmlFor="bookSearch">Livre *</Label>
            <div className="relative">
              <Input
                id="bookSearch"
                value={showSuggestions ? searchQuery : (selectedBook?.title || searchQuery)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                  if (!e.target.value) {
                    setCharacterData({...characterData, book_id: ""});
                  }
                }}
                onFocus={() => {
                  setShowSuggestions(true);
                  if (selectedBook) {
                    setSearchQuery(selectedBook.title);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder="Rechercher un livre de votre bibliothèque..."
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              {/* Autocomplete dropdown */}
              {showSuggestions && searchQuery.length >= 2 && filteredBooks.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border-2 max-h-64 overflow-y-auto"
                     style={{ borderColor: 'var(--beige)' }}>
                  {filteredBooks.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectBook(book);
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-pink-50 transition-colors text-left"
                    >
                      <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} 
                               className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-6 h-6" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1" 
                           style={{ color: 'var(--dark-text)' }}>
                          {book.title}
                        </p>
                        <p className="text-xs line-clamp-1" 
                           style={{ color: 'var(--warm-pink)' }}>
                          {book.author}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedBook && (
              <div className="mt-2 flex items-center gap-2 p-2 rounded-lg" 
                   style={{ backgroundColor: 'var(--cream)' }}>
                <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0"
                     style={{ backgroundColor: 'var(--beige)' }}>
                  {selectedBook.cover_url ? (
                    <img src={selectedBook.cover_url} alt={selectedBook.title} 
                         className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold line-clamp-1" style={{ color: 'var(--dark-text)' }}>
                    {selectedBook.title}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                    {selectedBook.author}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gender">Genre</Label>
              <Select value={characterData.gender} onValueChange={(value) => setCharacterData({...characterData, gender: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculin</SelectItem>
                  <SelectItem value="female">Féminin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rank">Classement (1 = préféré) *</Label>
              <Input
                id="rank"
                type="number"
                min="1"
                value={characterData.rank}
                onChange={(e) => setCharacterData({...characterData, rank: parseInt(e.target.value)})}
              />
            </div>
          </div>

          <div>
            <Label>Photo du personnage</Label>
            <div className="flex gap-3">
              <Input
                value={characterData.image_url}
                onChange={(e) => setCharacterData({...characterData, image_url: e.target.value})}
                placeholder="URL de l'image ou..."
              />
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button type="button" variant="outline" disabled={uploading} asChild>
                  <span>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {cropImageUrl && (
            <div className="rounded-xl border-2 p-4" style={{ borderColor: 'var(--beige)' }}>
              <p className="text-sm font-medium mb-3 text-center" style={{ color: 'var(--dark-text)' }}>
                Recadre l'image comme tu le souhaites
              </p>
              <ImageCropper
                imageUrl={cropImageUrl}
                aspectRatio="portrait"
                onCropComplete={handleCropComplete}
                onCancel={() => setCropImageUrl(null)}
              />
            </div>
          )}

          {characterData.image_url && !cropImageUrl && (
            <div className="rounded-xl overflow-hidden relative group">
              <img src={characterData.image_url} alt="Preview" className="w-full h-64 object-cover" />
              <button
                type="button"
                onClick={() => setCropImageUrl(characterData.image_url)}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium gap-2 text-sm"
              >
                <Crop className="w-4 h-4" /> Recadrer
              </button>
            </div>
          )}

          <div>
            <Label htmlFor="why">Pourquoi vous l'adorez</Label>
            <Textarea
              id="why"
              value={characterData.why_i_love_him}
              onChange={(e) => setCharacterData({...characterData, why_i_love_him: e.target.value})}
              placeholder="Ce qui vous fait craquer chez ce personnage..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="quote">Citation préférée</Label>
            <Textarea
              id="quote"
              value={characterData.best_quote}
              onChange={(e) => setCharacterData({...characterData, best_quote: e.target.value})}
              placeholder="Une citation mémorable du personnage..."
              rows={3}
            />
          </div>

          <Button
            onClick={() => saveMutation.mutate(characterData)}
            disabled={!characterData.character_name || !characterData.book_id || saveMutation.isPending}
            className="w-full font-medium py-6"
            style={{ background: 'linear-gradient(135deg, var(--rose-gold), var(--gold))', color: '#000000' }}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {editingCharacter ? "Modification..." : "Ajout en cours..."}
              </>
            ) : (
              editingCharacter ? "Modifier le personnage" : "Ajouter le personnage"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}