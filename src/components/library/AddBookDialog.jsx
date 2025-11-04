
import React, { useState } from 'react';
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
import { Loader2, Music as MusicIcon, Sparkles, Plus, BookOpen, Edit } from "lucide-react";
import { toast } from "sonner";

const GENRES = ["Romance", "Fantasy", "Thriller", "Policier", "Science-Fiction", "Contemporain",
                "Historique", "Young Adult", "New Adult", "Dystopie", "Paranormal", "Autre"];

const STATUSES = ["Lu", "En cours", "À lire", "Abandonné", "Mes envies"];

export default function AddBookDialog({ open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [aiResults, setAiResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingCover, setEditingCover] = useState(null);

  const [step, setStep] = useState(1);
  const [bookData, setBookData] = useState({
    title: "",
    author: "",
    cover_url: "",
    genre: "",
    page_count: "",
    synopsis: "",
    tags: [], // Added tags
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

  // Function to search books using AI with MUCH better cover URL fetching
  const searchBooks = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es un expert en recherche de livres et couvertures. Recherche: "${searchQuery}".

IMPÉRATIF - Pour chaque livre, tu DOIS trouver une URL de couverture VALIDE et ACCESSIBLE :

1. PRIORITÉ 1 - OpenLibrary (le plus fiable) :
   Format: https://covers.openlibrary.org/b/isbn/[ISBN]-L.jpg
   OU: https://covers.openlibrary.org/b/olid/[OLID]-L.jpg

2. PRIORITÉ 2 - Google Books API :
   Cherche l'image via l'API Google Books et retourne l'URL HTTPS complète

3. PRIORITÉ 3 - Autres sources fiables :
   - Amazon Images (format HTTPS)
   - Goodreads covers
   - Babelio covers

RÈGLES STRICTES :
- TOUJOURS privilégier une vraie URL plutôt que de laisser vide
- Vérifier que l'URL commence par "https://"
- Utiliser "-L.jpg" pour OpenLibrary (grande taille)
- Si tu as un ISBN, TOUJOURS l'utiliser
- Retourne 6-8 suggestions pertinentes

Pour chaque livre, fournis :
- Titre exact
- Auteur complet
- ISBN (si connu)
- Résumé bref (2-3 lignes)
- Genre précis
- Année de publication
- cover_url (URL VALIDE ET ACCESSIBLE - ne JAMAIS laisser vide si le livre existe)`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            books: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  author: { type: "string" },
                  synopsis: { type: "string" },
                  genre: { type: "string" },
                  publication_year: { type: "number" },
                  cover_url: { type: "string" },
                  isbn: { type: "string" }
                },
                required: ["title", "author", "synopsis", "genre", "cover_url"]
              }
            }
          },
          required: ["books"]
        }
      });

      setAiResults(result.books || []);
    } catch (error) {
      console.error("Error searching books with AI:", error);
      toast.error("Erreur lors de la recherche de livres. Veuillez réessayer.");
    } finally {
      setIsSearching(false);
    }
  };

  // Function to create a book from AI search result
  const createFromAI = async (book) => {
    try {
      const createdBook = await base44.entities.Book.create({
        title: book.title,
        author: book.author,
        synopsis: book.synopsis,
        genre: book.genre,
        // publication_year: book.publication_year,
        cover_url: book.cover_url,
      });
      await base44.entities.UserBook.create({
        book_id: createdBook.id,
        status: "À lire",
      });

      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("Livre ajouté à votre bibliothèque !");
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error creating book from AI result:", error);
      toast.error("Erreur lors de l'ajout du livre. Veuillez réessayer.");
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
    setActiveTab("discover");
    setSearchQuery("");
    setAiResults([]);
    setEditingCover(null);
    setBookData({ title: "", author: "", cover_url: "", genre: "", page_count: "", synopsis: "", tags: [] });
    setUserBookData({ status: "À lire", rating: "", review: "", music: "", music_artist: "", is_shared_reading: false, start_date: "", end_date: "" });
  };

  // Function to handle image error
  const handleImageError = (idx) => {
    const updated = [...aiResults];
    updated[idx].cover_url = ""; // Clear broken URL
    setAiResults(updated);
  };

  // Function to update cover URL for AI results inline
  const updateCoverUrl = (index, newUrl) => {
    const updated = [...aiResults];
    updated[index].cover_url = newUrl;
    setAiResults(updated);
    setEditingCover(null);
    toast.success("Couverture mise à jour !");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
            <TabsTrigger value="discover" className="font-medium">
              <Sparkles className="w-4 h-4 mr-2" />
              Découvrir avec l'IA
            </TabsTrigger>
            <TabsTrigger value="manual" className="font-medium">
              <BookOpen className="w-4 h-4 mr-2" />
              Ajout manuel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-4">
            <div className="flex gap-3">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchBooks()}
                placeholder="Romance fantasy, thriller..."
                className="flex-1 border-2"
                style={{ borderColor: 'var(--soft-pink)' }}
              />
              <Button
                onClick={searchBooks}
                disabled={isSearching}
                style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))', color: 'white' }}>
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isSearching ? "Recherche..." : "Rechercher"}
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto">
              {aiResults.map((book, idx) => (
                <div key={idx} className="p-4 rounded-xl border-2 transition-all hover:shadow-lg flex flex-col"
                     style={{ backgroundColor: 'white', borderColor: 'var(--soft-pink)' }}>
                  <div className="flex gap-3 mb-3 flex-grow">
                    <div className="relative group flex-shrink-0">
                      <div className="w-20 h-28 rounded-lg overflow-hidden shadow-md"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(idx)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-8 h-8" style={{ color: 'var(--deep-pink)' }} />
                          </div>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute -top-1 -right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setEditingCover(idx)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      {editingCover === idx && (
                        <div className="absolute inset-0 bg-black/90 p-1 flex flex-col gap-1 rounded-lg z-10">
                          <Input
                            placeholder="URL couverture"
                            defaultValue={book.cover_url}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                updateCoverUrl(idx, e.currentTarget.value);
                              }
                            }}
                            className="text-xs h-6 bg-white text-black"
                          />
                          <Button size="sm" className="h-5 text-xs bg-white text-black hover:bg-gray-100" onClick={() => updateCoverUrl(idx, document.querySelector(`input[placeholder='URL couverture']`).value)}>OK</Button>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm line-clamp-2 mb-1" style={{ color: 'var(--dark-text)' }}>
                        {book.title}
                      </h4>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--deep-pink)' }}>
                        {book.author}
                      </p>
                      <p className="text-xs line-clamp-3" style={{ color: 'var(--dark-text)' }}>
                        {book.synopsis}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => createFromAI(book)}
                    className="w-full text-white text-sm mt-auto"
                    style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
              ))}
              {aiResults.length === 0 && searchQuery.trim() && !isSearching && (
                <p className="col-span-full text-center text-gray-500">
                  Aucun résultat trouvé pour "{searchQuery}".
                </p>
              )}
              {isSearching && (
                <div className="col-span-full flex justify-center items-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" style={{ color: 'var(--deep-pink)' }} />
                  <span style={{ color: 'var(--deep-pink)' }}>Recherche en cours...</span>
                </div>
              )}
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
                  <Label htmlFor="tags">Tags (optionnel)</Label>
                  <Select
                    value={bookData.tags?.[0] || ""}
                    onValueChange={(value) => setBookData({...bookData, tags: value ? [value] : []})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Aucun</SelectItem>
                      <SelectItem value="Service Press">📬 Service Press</SelectItem>
                      <SelectItem value="Audio">🎧 Audio</SelectItem>
                      <SelectItem value="Numérique">📱 Numérique</SelectItem>
                      <SelectItem value="Broché">📕 Broché</SelectItem>
                      <SelectItem value="Relié">📘 Relié</SelectItem>
                      <SelectItem value="Poche">📙 Poche</SelectItem>
                      <SelectItem value="Wattpad">🌟 Wattpad</SelectItem>
                    </SelectContent>
                  </Select>
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
