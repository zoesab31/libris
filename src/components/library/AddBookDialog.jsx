
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Music as MusicIcon, Sparkles, Plus, BookOpen, Search, Upload, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

const GENRES = ["Romance", "Fantasy", "Thriller", "Policier", "Science-Fiction", "Contemporain",
                "Historique", "Young Adult", "New Adult", "Dystopie", "Paranormal", "Autre"];

const STATUSES = ["Lu", "En cours", "À lire", "Abandonné", "Mes envies"];

export default function AddBookDialog({ open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("search"); // Changed initial tab from "discover" to "search"

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
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

  // Debounced search with Google Books API
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
          const books = data.items.map(item => ({
            id: item.id,
            title: item.volumeInfo.title || "Titre inconnu",
            authors: item.volumeInfo.authors || ["Auteur inconnu"],
            author: (item.volumeInfo.authors || ["Auteur inconnu"]).join(", "),
            publishedDate: item.volumeInfo.publishedDate || "",
            year: item.volumeInfo.publishedDate ? new Date(item.volumeInfo.publishedDate).getFullYear() : null,
            pageCount: item.volumeInfo.pageCount || null,
            description: item.volumeInfo.description || "",
            coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') ||
                      item.volumeInfo.imageLinks?.smallThumbnail?.replace('http:', 'https:') || "",
            categories: item.volumeInfo.categories || [],
            isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier || "" // Get first ISBN if available
          }));
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

  // Get final cover URL (priority: uploaded file > custom URL > API cover)
  const getFinalCoverUrl = () => {
    if (uploadedCoverPreview) return uploadedCoverPreview;
    if (customCoverUrl) return customCoverUrl;
    if (selectedBook?.coverUrl) return selectedBook.coverUrl;
    return "";
  };

  // Create book from search results
  const createFromSearch = async () => {
    if (!selectedBook) return;

    try {
      let finalCoverUrl = customCoverUrl || selectedBook.coverUrl;

      // Upload file if provided
      if (uploadedCoverFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadedCoverFile });
        finalCoverUrl = file_url;
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
      // Ensure genre is one of the predefined GENRES, default to 'Autre' if not found
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

      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("Livre ajouté à votre bibliothèque !");
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur lors de l'ajout du livre:", error);
      toast.error("Erreur lors de l'ajout du livre");
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const book = await base44.entities.Book.create({
        ...bookData,
        // page_count might be string, convert to number if needed for backend schema
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
    setActiveTab("search"); // Reset to search tab
    setSearchQuery("");
    setSearchResults([]);
    setSelectedBook(null);
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
          // Reset manual form step when switching tabs
          if (value === "manual") {
            setStep(1);
          }
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
                    {searchResults.map((book) => (
                      <button
                        key={book.id}
                        onClick={() => {
                          setSelectedBook(book);
                          setCustomCoverUrl(""); // Reset custom URL when a new book is selected
                          setUploadedCoverFile(null); // Reset uploaded file
                          setUploadedCoverPreview(null); // Reset uploaded preview
                        }}
                        className={`w-full flex gap-4 p-4 rounded-xl transition-all hover:shadow-lg text-left ${
                          selectedBook?.id === book.id ? 'shadow-lg' : 'shadow-md'
                        }`}
                        style={{
                          backgroundColor: 'white',
                          borderWidth: '2px',
                          borderStyle: 'solid',
                          borderColor: selectedBook?.id === book.id ? 'var(--deep-pink)' : 'transparent'
                        }}
                      >
                        <div className="w-16 h-24 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                             style={{ backgroundColor: 'var(--beige)' }}>
                          {book.coverUrl ? (
                            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="w-6 h-6" style={{ color: 'var(--warm-pink)' }} />
                            </div>
                          )}
                        </div>
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
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Selected Book Preview */}
              <div className="lg:col-span-1">
                {selectedBook ? (
                  <div className="sticky top-0 p-6 rounded-xl shadow-lg"
                       style={{ backgroundColor: 'white', borderWidth: '2px', borderStyle: 'solid', borderColor: 'var(--soft-pink)' }}>
                    <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                      📖 Aperçu
                    </h3>

                    <div className="w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg mb-4"
                         style={{ backgroundColor: 'var(--beige)' }}>
                      {getFinalCoverUrl() ? (
                        <img src={getFinalCoverUrl()} alt={selectedBook.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-16 h-16" style={{ color: 'var(--warm-pink)' }} />
                        </div>
                      )}
                    </div>

                    <h4 className="font-bold mb-2 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                      {selectedBook.title}
                    </h4>
                    <p className="text-sm mb-1" style={{ color: 'var(--warm-pink)' }}>
                      {selectedBook.author}
                    </p>
                    <p className="text-xs mb-4" style={{ color: 'var(--dark-text)' }}>
                      {selectedBook.year && `${selectedBook.year} • `}
                      {selectedBook.pageCount && `${selectedBook.pageCount} pages`}
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
                            setUploadedCoverFile(null); // Clear uploaded file if custom URL is entered
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

                    <Button
                      onClick={createFromSearch}
                      className="w-full text-white font-medium"
                      style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter ce livre
                    </Button>
                  </div>
                ) : (
                  <div className="sticky top-0 p-8 rounded-xl text-center"
                       style={{ backgroundColor: 'var(--cream)' }}>
                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" style={{ color: 'var(--warm-pink)' }} />
                    <p className="text-sm" style={{ color: 'var(--dark-text)' }}>
                      Sélectionnez un livre pour voir l'aperçu
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
