
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Music as MusicIcon, Sparkles, Plus, BookOpen, Search, Upload, Link as LinkIcon, Check, X } from "lucide-react";
import { toast } from "sonner";

const GENRES = ["Romance", "Fantasy", "Thriller", "Policier", "Science-Fiction", "Contemporain",
                "Historique", "Young Adult", "New Adult", "Dystopie", "Paranormal", "Autre"];

const STATUSES = ["Lu", "En cours", "À lire", "Abandonné", "Mes envies"];

export default function AddBookDialog({ open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("search");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState([]); // Changed to array for multi-selection
  const [customCoverUrl, setCustomCoverUrl] = useState("");
  const [uploadedCoverFile, setUploadedCoverFile] = useState(null);
  const [uploadedCoverPreview, setUploadedCoverPreview] = useState(null);

  const [step, setStep] = useState(1);
  const [bookData, setBookData] = useState({
    title: "",
    author: "",
    cover_url: "",
    genre: "",
    page_count: "",
    synopsis: "",
    tags: [],
  });
  const [userBookData, setUserBookData] = useState({
    status: "À lire",
    rating: "",
    review: "",
    music: "",
    music_artist: "",
    is_shared_reading: false,
    start_date: "",
    end_date: "",
  });

  // Debounced search with Google Books API - IMPROVED IMAGE QUALITY
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=12&langRestrict=fr`
        );
        const data = await response.json();

        if (data.items) {
          const books = data.items.map(item => {
            // Get highest quality image available
            let coverUrl = "";
            if (item.volumeInfo.imageLinks) {
              // Priority: extraLarge > large > medium > thumbnail > smallThumbnail
              coverUrl = item.volumeInfo.imageLinks.extraLarge ||
                        item.volumeInfo.imageLinks.large ||
                        item.volumeInfo.imageLinks.medium ||
                        item.volumeInfo.imageLinks.thumbnail ||
                        item.volumeInfo.imageLinks.smallThumbnail ||
                        "";

              // Force HTTPS and increase zoom level for better quality
              if (coverUrl) {
                coverUrl = coverUrl.replace('http:', 'https:');
                // Increase zoom level if it's a Google Books image URL
                if (coverUrl.includes('books.google.com')) {
                    coverUrl = coverUrl.replace(/zoom=\d+/, 'zoom=3');
                    // If no zoom parameter, add it
                    if (!coverUrl.includes('zoom=')) {
                        coverUrl += coverUrl.includes('?') ? '&zoom=3' : '?zoom=3';
                    }
                }
              }
            }

            return {
              id: item.id,
              title: item.volumeInfo.title || "Titre inconnu",
              authors: item.volumeInfo.authors || ["Auteur inconnu"],
              author: (item.volumeInfo.authors || ["Auteur inconnu"]).join(", "),
              publishedDate: item.volumeInfo.publishedDate || "",
              year: item.volumeInfo.publishedDate ? new Date(item.volumeInfo.publishedDate).getFullYear() : null,
              pageCount: item.volumeInfo.pageCount || null,
              description: item.volumeInfo.description || "",
              coverUrl: coverUrl,
              categories: item.volumeInfo.categories || [],
              isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier || ""
            };
          });
          setSearchResults(books);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Erreur de recherche:", error);
        toast.error("Erreur lors de la recherche");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle file upload for custom cover
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedCoverPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Get final cover URL for preview
  const getFinalCoverUrl = (book) => {
    if (selectedBooks.length === 1 && selectedBooks[0].id === book.id) {
      if (uploadedCoverPreview) return uploadedCoverPreview;
      if (customCoverUrl) return customCoverUrl;
    }
    return book.coverUrl;
  };

  // Toggle book selection (for multi-select)
  const toggleBookSelection = (book) => {
    setSelectedBooks(prev => {
      const isSelected = prev.some(b => b.id === book.id);
      if (isSelected) {
        return prev.filter(b => b.id !== book.id);
      } else {
        return [...prev, book];
      }
    });
  };

  // Create books from search (supports multiple books)
  const createFromSearch = async () => {
    if (selectedBooks.length === 0) return;

    try {
      let successCount = 0;

      for (const selectedBook of selectedBooks) {
        let finalCoverUrl = selectedBook.coverUrl;

        // Upload file if provided (only for single selection)
        if (selectedBooks.length === 1 && uploadedCoverFile) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadedCoverFile });
          finalCoverUrl = file_url;
        } else if (selectedBooks.length === 1 && customCoverUrl) {
          finalCoverUrl = customCoverUrl;
        }

        // Map categories to genre
        let genre = "Autre";
        if (selectedBook.categories.length > 0) {
          const category = selectedBook.categories[0].toLowerCase();
          if (category.includes("fiction") || category.includes("roman")) genre = "Romance";
          else if (category.includes("fantasy") || category.includes("fantastique")) genre = "Fantasy";
          else if (category.includes("thriller")) genre = "Thriller";
          else if (category.includes("young adult") || category.includes("jeunesse")) genre = "Young Adult";
          else if (category.includes("science fiction")) genre = "Science-Fiction";
          else if (category.includes("historique")) genre = "Historique";
        }
        if (!GENRES.includes(genre)) {
          genre = "Autre";
        }

        const createdBook = await base44.entities.Book.create({
          title: selectedBook.title,
          author: selectedBook.author,
          cover_url: finalCoverUrl,
          page_count: selectedBook.pageCount,
          publication_year: selectedBook.year,
          synopsis: selectedBook.description,
          isbn: selectedBook.isbn,
          genre: genre,
        });

        await base44.entities.UserBook.create({
          book_id: createdBook.id,
          status: "À lire",
        });

        successCount++;
      }

      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });

      toast.success(`✅ ${successCount} livre${successCount > 1 ? 's' : ''} ajouté${successCount > 1 ? 's' : ''} à votre bibliothèque !`);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout des livres:", error);
      toast.error("Erreur lors de l'ajout des livres");
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const book = await base44.entities.Book.create({
        ...bookData,
        page_count: bookData.page_count ? parseInt(bookData.page_count, 10) : undefined,
      });
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
    onError: (error) => {
      console.error("Error creating book manually:", error);
      toast.error("Erreur lors de l'ajout du livre. Veuillez réessayer.");
    }
  });

  const resetForm = () => {
    setStep(1);
    setActiveTab("search");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedBooks([]); // Updated
    setCustomCoverUrl("");
    setUploadedCoverFile(null);
    setUploadedCoverPreview(null);
    setBookData({ title: "", author: "", cover_url: "", genre: "", page_count: "", synopsis: "", tags: [] });
    setUserBookData({ status: "À lire", rating: "", review: "", music: "", music_artist: "", is_shared_reading: false, start_date: "", end_date: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" style={{ color: 'var(--dark-text)' }}>
            📚 Ajouter un livre
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          if (value === "manual") setStep(1);
        }}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="search" className="font-medium">
              <Search className="w-4 h-4 mr-2" />
              Recherche en ligne
            </TabsTrigger>
            <TabsTrigger value="manual" className="font-medium">
              <BookOpen className="w-4 h-4 mr-2" />
              Ajout manuel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ color: 'var(--warm-pink)' }} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un livre par titre ou auteur..."
                className="pl-12 py-6 text-lg border-2"
                style={{ borderColor: 'var(--soft-pink)' }}
              />
            </div>

            {/* Selected books summary */}
            {selectedBooks.length > 0 && (
              <div className="p-4 rounded-xl border-2"
                   style={{ backgroundColor: 'var(--cream)', borderColor: 'var(--soft-pink)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold" style={{ color: 'var(--dark-text)' }}>
                    📚 {selectedBooks.length} livre{selectedBooks.length > 1 ? 's' : ''} sélectionné{selectedBooks.length > 1 ? 's' : ''}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBooks([])}
                    className="text-xs"
                    style={{ color: 'var(--warm-pink)' }}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Tout désélectionner
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedBooks.map((book) => (
                    <div
                      key={book.id}
                      className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                      style={{ backgroundColor: 'white', color: 'var(--dark-text)', border: '1px solid var(--beige)' }}
                    >
                      <Check className="w-3 h-3" style={{ color: 'var(--deep-pink)' }} />
                      <span className="max-w-[200px] truncate">{book.title}</span>
                      <button
                        onClick={() => toggleBookSelection(book)}
                        className="hover:opacity-70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left: Search Results */}
              <div className="lg:col-span-2 space-y-3">
                {isSearching && (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--deep-pink)' }} />
                  </div>
                )}

                {!isSearching && searchQuery && searchResults.length === 0 && (
                  <div className="text-center p-8" style={{ color: 'var(--warm-pink)' }}>
                    Aucun résultat trouvé pour "{searchQuery}"
                  </div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                    {searchResults.map((book) => {
                      const isSelected = selectedBooks.some(b => b.id === book.id);

                      return (
                        <button
                          key={book.id}
                          onClick={() => toggleBookSelection(book)}
                          className={`w-full flex gap-4 p-4 rounded-xl transition-all hover:shadow-lg text-left relative ${
                            isSelected ? 'shadow-xl' : 'shadow-md'
                          }`}
                          style={{
                            backgroundColor: 'white',
                            borderWidth: '2px',
                            borderStyle: 'solid',
                            borderColor: isSelected ? 'var(--deep-pink)' : 'transparent'
                          }}
                        >
                          {/* Checkbox */}
                          <div className="flex-shrink-0 pt-1">
                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${
                              isSelected ? 'bg-gradient-to-br from-pink-500 to-pink-600' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>

                          {/* Book Cover - HIGH QUALITY, NO FOLD EFFECT */}
                          <div className="w-16 h-24 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                               style={{ backgroundColor: 'var(--beige)' }}>
                            {book.coverUrl ? (
                              <img
                                src={book.coverUrl}
                                alt={book.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  // Fallback to placeholder if image fails to load
                                  e.target.src = 'https://placehold.co/120x180/FFE1F0/FF1493?text=?';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-6 h-6" style={{ color: 'var(--warm-pink)' }} />
                              </div>
                            )}
                          </div>

                          {/* Book Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm mb-1 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                              {book.title}
                            </h4>
                            <p className="text-xs mb-1" style={{ color: 'var(--warm-pink)' }}>
                              {book.author}
                            </p>
                            <div className="flex gap-2 text-xs" style={{ color: 'var(--dark-text)' }}>
                              {book.year && <span>📅 {book.year}</span>}
                              {book.pageCount && <span>📄 {book.pageCount} pages</span>}
                            </div>
                          </div>

                          {/* Selected Badge */}
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: Preview / Actions */}
              <div className="lg:col-span-1">
                {selectedBooks.length > 0 ? (
                  <div className="sticky top-0 p-6 rounded-xl shadow-lg"
                       style={{ backgroundColor: 'white', borderWidth: '2px', borderStyle: 'solid', borderColor: 'var(--soft-pink)' }}>
                    <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                      {selectedBooks.length === 1 ? '📖 Aperçu' : `📚 ${selectedBooks.length} livres`}
                    </h3>

                    {selectedBooks.length === 1 ? (
                      <>
                        {/* Single book preview with customization */}
                        <div className="w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg mb-4"
                             style={{ backgroundColor: 'var(--beige)' }}>
                          {getFinalCoverUrl(selectedBooks[0]) ? (
                            <img
                              src={getFinalCoverUrl(selectedBooks[0])}
                              alt={selectedBooks[0].title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = 'https://placehold.co/300x450/FFE1F0/FF1493?text=?';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="w-16 h-16" style={{ color: 'var(--warm-pink)' }} />
                            </div>
                          )}
                        </div>

                        <h4 className="font-bold mb-2 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                          {selectedBooks[0].title}
                        </h4>
                        <p className="text-sm mb-1" style={{ color: 'var(--warm-pink)' }}>
                          {selectedBooks[0].author}
                        </p>
                        <p className="text-xs mb-4" style={{ color: 'var(--dark-text)' }}>
                          {selectedBooks[0].year && `${selectedBooks[0].year} • `}
                          {selectedBooks[0].pageCount && `${selectedBooks[0].pageCount} pages`}
                        </p>

                        {/* Custom Cover Options */}
                        <div className="space-y-3 mb-4 pt-4 border-t" style={{ borderColor: 'var(--beige)' }}>
                          <Label className="text-xs font-bold" style={{ color: 'var(--dark-text)' }}>
                            🎨 Personnaliser la couverture
                          </Label>

                          <div>
                            <Label htmlFor="cover-url" className="text-xs flex items-center gap-1 mb-1">
                              <LinkIcon className="w-3 h-3" />
                              URL de la couverture
                            </Label>
                            <Input
                              id="cover-url"
                              value={customCoverUrl}
                              onChange={(e) => {
                                setCustomCoverUrl(e.target.value);
                                setUploadedCoverFile(null);
                                setUploadedCoverPreview(null);
                              }}
                              placeholder="https://..."
                              className="text-xs"
                            />
                          </div>

                          <div>
                            <Label htmlFor="cover-upload" className="text-xs flex items-center gap-1 mb-1">
                              <Upload className="w-3 h-3" />
                              Importer une image
                            </Label>
                            <Input
                              id="cover-upload"
                              type="file"
                              accept="image/png,image/jpeg,image/jpg"
                              onChange={handleFileUpload}
                              className="text-xs"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Multiple books preview */}
                        <div className="grid grid-cols-3 gap-2 mb-4 max-h-[300px] overflow-y-auto">
                          {selectedBooks.map((book) => (
                            <div key={book.id} className="relative">
                              <div className="w-full aspect-[2/3] rounded-lg overflow-hidden shadow-md"
                                   style={{ backgroundColor: 'var(--beige)' }}>
                                {book.coverUrl ? (
                                  <img
                                    src={book.coverUrl}
                                    alt={book.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.src = 'https://placehold.co/120x180/FFE1F0/FF1493?text=?';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <BookOpen className="w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <Button
                      onClick={createFromSearch}
                      className="w-full text-white font-medium"
                      style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                      disabled={selectedBooks.length === 0}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter {selectedBooks.length > 1 ? `les ${selectedBooks.length} livres` : 'ce livre'}
                    </Button>
                  </div>
                ) : (
                  <div className="sticky top-0 p-8 rounded-xl text-center"
                       style={{ backgroundColor: 'var(--cream)' }}>
                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: 'var(--warm-pink)' }} />
                    <p className="text-sm" style={{ color: 'var(--dark-text)' }}>
                      Sélectionnez un ou plusieurs livres pour continuer
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <DialogTitle className="text-xl mb-4" style={{ color: 'var(--deep-brown)' }}>
              {step === 1 ? "📚 Informations du livre" : "✨ Vos impressions sur le livre"}
            </DialogTitle>
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
                  <Label>Tags</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {["Service Press", "Audio", "Numérique", "Broché", "Relié", "Poche", "Wattpad"].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const currentTags = bookData.tags || [];
                          if (currentTags.includes(tag)) {
                            setBookData({...bookData, tags: currentTags.filter(t => t !== tag)});
                          } else {
                            setBookData({...bookData, tags: [...currentTags, tag]});
                          }
                        }}
                        className={`p-2 rounded-lg text-sm font-medium transition-all ${
                          (bookData.tags || []).includes(tag)
                            ? 'shadow-md scale-105'
                            : 'hover:shadow-md'
                        }`}
                        style={{
                          backgroundColor: (bookData.tags || []).includes(tag) ? 'var(--soft-pink)' : 'white',
                          color: (bookData.tags || []).includes(tag) ? 'white' : 'var(--dark-text)',
                          border: '2px solid',
                          borderColor: (bookData.tags || []).includes(tag) ? 'var(--deep-pink)' : 'var(--beige)'
                        }}
                      >
                        {tag === "Service Press" && "📬 "}
                        {tag === "Audio" && "🎧 "}
                        {tag === "Numérique" && "📱 "}
                        {tag === "Broché" && "📕 "}
                        {tag === "Relié" && "📘 "}
                        {tag === "Poche" && "📙 "}
                        {tag === "Wattpad" && "🌟 "}
                        {tag}
                      </button>
                    ))}
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

                <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: 'var(--cream)' }}>
                  <Label className="text-sm font-medium">📅 Dates de lecture (important pour le défi annuel !)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="start" className="text-xs">Date de début</Label>
                      <Input
                        id="start"
                        type="date"
                        value={userBookData.start_date}
                        onChange={(e) => setUserBookData({...userBookData, start_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end" className="text-xs">Date de fin</Label>
                      <Input
                        id="end"
                        type="date"
                        value={userBookData.end_date}
                        onChange={(e) => setUserBookData({...userBookData, end_date: e.target.value})}
                      />
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--warm-brown)' }}>
                    💡 La date de fin détermine dans quelle année ce livre comptera pour votre objectif
                  </p>
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
                    disabled={createMutation.isPending || !bookData.title || !bookData.author}
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
