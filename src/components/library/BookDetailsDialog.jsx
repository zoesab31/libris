import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  Music,
  Calendar,
  Trash2,
  Upload,
  Loader2,
  BookOpen,
  X,
  Edit,
  Heart,
  Users,
  Globe,
  Save,
  ArrowLeft,
  Sparkles,
  FileText,
  Tag,
  Info,
  Plus,
  Play,
  Layers,
  Search,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import GenreTagInput from "./GenreTagInput";
import CommentSection from "./CommentSection";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STATUSES = ["Lu", "En cours", "À lire", "Abandonné", "Wishlist"];
const LANGUAGES = ["Français", "Anglais", "Espagnol", "Italien", "Allemand", "Portugais", "Japonais", "Coréen", "Chinois", "Autre"];

const LANGUAGE_FLAGS = {
  "Français": "🇫🇷",
  "Anglais": "🇬🇧",
  "Espagnol": "🇪🇸",
  "Italien": "🇮🇹",
  "Allemand": "🇩🇪",
  "Portugais": "🇵🇹",
  "Japonais": "🇯🇵",
  "Coréen": "🇰🇷",
  "Chinois": "🇨🇳",
  "Autre": "🌍"
};

// Helper function to extract dominant color from image
const getDominantColor = (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let r = 0, g = 0, b = 0;
      const pixelCount = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }

      r = Math.floor(r / pixelCount);
      g = Math.floor(g / pixelCount);
      b = Math.floor(b / pixelCount);

      resolve(`rgb(${r}, ${g}, ${b})`);
    };

    img.onerror = () => resolve(null);
  });
};

// New component for adding book to series
function AddToSeriesDialog({ open, onOpenChange, book, currentSeries, allSeries }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeriesId, setSelectedSeriesId] = useState(currentSeries?.id || ""); // Initialized with currentSeries ID
  const [creatingNew, setCreatingNew] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [newSeriesAuthor, setNewSeriesAuthor] = useState(book?.author || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  // Filter series based on search query
  const filteredSeries = useMemo(() => {
    if (!searchQuery.trim()) return allSeries;
    
    const query = searchQuery.toLowerCase();
    return allSeries.filter(series =>
      series.series_name.toLowerCase().includes(query) ||
      series.author?.toLowerCase().includes(query)
    );
  }, [allSeries, searchQuery]);

  // Get selected series info
  const selectedSeries = useMemo(() => {
    return allSeries.find(s => s.id === selectedSeriesId);
  }, [allSeries, selectedSeriesId]);

  useEffect(() => {
    if (open) { // Only reset when dialog opens
      if (currentSeries) {
        setSearchQuery(currentSeries.series_name);
        setSelectedSeriesId(currentSeries.id);
      } else {
        setSearchQuery("");
        setSelectedSeriesId("");
      }
      setCreatingNew(false);
      setNewSeriesName("");
      setNewSeriesAuthor(book?.author || "");
      setShowSuggestions(false); // Hide suggestions on dialog open
    }
  }, [open, currentSeries, book]);


  const addToSeriesMutation = useMutation({
    mutationFn: async (seriesId) => {
      if (!user) throw new Error("User not loaded.");

      // First, remove the book from its current series if it's different from the target series
      if (currentSeries && currentSeries.id !== seriesId) {
        const updateDataCurrent = {
          books_read: (currentSeries.books_read || []).filter(id => id !== book.id),
          books_in_pal: (currentSeries.books_in_pal || []).filter(id => id !== book.id),
          books_wishlist: (currentSeries.books_wishlist || []).filter(id => id !== book.id),
        };
        await base44.entities.BookSeries.update(currentSeries.id, updateDataCurrent);
      }

      // Now, add the book to the selected series
      const targetSeries = allSeries.find(s => s.id === seriesId);
      if (!targetSeries) return;

      const userBookData = await base44.entities.UserBook.filter({
        book_id: book.id,
        created_by: user.email
      });
      const userBookStatus = userBookData[0]?.status;

      let booksRead = [...(targetSeries.books_read || [])];
      let booksInPal = [...(targetSeries.books_in_pal || [])];
      let booksWishlist = [...(targetSeries.books_wishlist || [])];

      // Remove book from all lists in the target series first (to ensure it's only in one place)
      booksRead = booksRead.filter(id => id !== book.id);
      booksInPal = booksInPal.filter(id => id !== book.id);
      booksWishlist = booksWishlist.filter(id => id !== book.id);

      // Add book to the correct list based on its status
      if (userBookStatus === "Lu") {
        booksRead.push(book.id);
      } else if (userBookStatus === "À lire") {
        booksInPal.push(book.id);
      } else { // Covers "Abandonné", "Wishlist", and default
        booksWishlist.push(book.id);
      }
      
      await base44.entities.BookSeries.update(seriesId, {
        books_read: Array.from(new Set(booksRead)),
        books_in_pal: Array.from(new Set(booksInPal)),
        books_wishlist: Array.from(new Set(booksWishlist)),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookSeries'] });
      queryClient.invalidateQueries({ queryKey: ['allUserBooks'] });
      toast.success("✅ Livre ajouté à la saga !");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error adding book to series:", error);
      toast.error("Échec de l'ajout à la saga.");
    }
  });

  const createSeriesMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not loaded.");

      // If the book is currently in a series, remove it first
      if (currentSeries) {
        const updateDataCurrent = {
          books_read: (currentSeries.books_read || []).filter(id => id !== book.id),
          books_in_pal: (currentSeries.books_in_pal || []).filter(id => id !== book.id),
          books_wishlist: (currentSeries.books_wishlist || []).filter(id => id !== book.id),
        };
        await base44.entities.BookSeries.update(currentSeries.id, updateDataCurrent);
      }

      const userBookData = await base44.entities.UserBook.filter({
        book_id: book.id,
        created_by: user.email
      });
      const userBookStatus = userBookData[0]?.status;

      let booksRead = [];
      let booksInPal = [];
      let booksWishlist = [];

      if (userBookStatus === "Lu") {
        booksRead.push(book.id);
      } else if (userBookStatus === "À lire") {
        booksInPal.push(book.id);
      } else { // Covers "Abandonné", "Wishlist", and default
        booksWishlist.push(book.id);
      }

      const newSeries = {
        series_name: newSeriesName,
        author: newSeriesAuthor,
        total_books: 1, // Will be dynamically calculated later, or adjusted
        books_read: booksRead,
        books_in_pal: booksInPal,
        books_wishlist: booksWishlist,
        created_by: user.email,
      };

      await base44.entities.BookSeries.create(newSeries);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookSeries'] });
      queryClient.invalidateQueries({ queryKey: ['allUserBooks'] });
      toast.success("✅ Nouvelle saga créée !");
      setCreatingNew(false);
      setNewSeriesName("");
      setNewSeriesAuthor(book?.author || "");
      setSearchQuery("");
      setSelectedSeriesId("");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error creating series:", error);
      toast.error("Échec de la création de la saga.");
    }
  });

  const removeFromSeriesMutation = useMutation({
    mutationFn: async () => {
      if (!currentSeries) return;

      const updateData = {
        books_read: (currentSeries.books_read || []).filter(id => id !== book.id),
        books_in_pal: (currentSeries.books_in_pal || []).filter(id => id !== book.id),
        books_wishlist: (currentSeries.books_wishlist || []).filter(id => id !== book.id),
      };

      await base44.entities.BookSeries.update(currentSeries.id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookSeries'] });
      queryClient.invalidateQueries({ queryKey: ['allUserBooks'] });
      toast.success("✅ Livre retiré de la saga !");
      setSearchQuery("");
      setSelectedSeriesId("");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error removing book from series:", error);
      toast.error("Échec du retrait de la saga.");
    }
  });

  const handleSelectSeries = (series) => {
    setSelectedSeriesId(series.id);
    setSearchQuery(series.series_name);
    setShowSuggestions(false);
  };

  const handleCreateFromSearch = () => {
    setNewSeriesName(searchQuery);
    setCreatingNew(true);
    setShowSuggestions(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
            <Layers className="w-6 h-6" />
            {creatingNew ? "Créer une nouvelle saga" : "Ajouter à une saga"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!creatingNew ? (
            <>
              <div className="relative">
                <Label className="mb-2 block">Rechercher ou créer une saga</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                          style={{ color: 'var(--warm-pink)' }} />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                      if (!e.target.value.trim()) {
                        setSelectedSeriesId("");
                      } else {
                        // If user types, clear selected series if it no longer matches the search
                        if (selectedSeries && selectedSeries.series_name.toLowerCase() !== e.target.value.toLowerCase()) {
                          setSelectedSeriesId("");
                        }
                      }
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow click on suggestions
                    placeholder="Tapez le nom d'une saga..."
                    className="pl-10 focus-glow"
                  />
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && searchQuery.trim() && (
                  <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border-2 max-h-64 overflow-y-auto"
                       style={{ borderColor: 'var(--beige)' }}>
                    {filteredSeries.length > 0 ? (
                      <>
                        <div className="p-2 border-b" style={{ borderColor: 'var(--beige)' }}>
                          <p className="text-xs font-bold px-2" style={{ color: 'var(--warm-pink)' }}>
                            📚 Sagas existantes
                          </p>
                        </div>
                        {filteredSeries.map(series => (
                          <button
                            key={series.id}
                            onMouseDown={() => handleSelectSeries(series)} // Use onMouseDown to prevent blur from closing before click
                            className="w-full text-left px-4 py-3 hover:bg-pink-50 transition-colors border-b last:border-b-0"
                            style={{ borderColor: 'var(--beige)' }}
                          >
                            <p className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
                              {series.series_name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                              {series.author} • {(series.books_read?.length || 0) + (series.books_in_pal?.length || 0) + (series.books_wishlist?.length || 0)} livre{((series.books_read?.length || 0) + (series.books_in_pal?.length || 0) + (series.books_wishlist?.length || 0)) > 1 ? 's' : ''}
                            </p>
                          </button>
                        ))}
                      </>
                    ) : null}
                    
                    {/* Create new option */}
                    <button
                      onMouseDown={handleCreateFromSearch} // Use onMouseDown to prevent blur from closing before click
                      className="w-full text-left px-4 py-3 border-t-2 hover:bg-purple-50 transition-colors"
                      style={{ borderColor: 'var(--beige)' }}
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4" style={{ color: 'var(--deep-pink)' }} />
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--deep-pink)' }}>
                            Créer "{searchQuery}"
                          </p>
                          <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                            Nouvelle saga
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Selected series preview */}
              {selectedSeriesId && selectedSeries && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#E6B3E8' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-5 h-5 text-white" />
                    <span className="font-bold text-white">{selectedSeries.series_name}</span>
                  </div>
                  <p className="text-sm text-white opacity-90">
                    {selectedSeries.author} • {(selectedSeries.books_read?.length || 0) + (selectedSeries.books_in_pal?.length || 0) + (selectedSeries.books_wishlist?.length || 0)} livre{((selectedSeries.books_read?.length || 0) + (selectedSeries.books_in_pal?.length || 0) + (selectedSeries.books_wishlist?.length || 0)) > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-4">
                <Button
                  onClick={() => addToSeriesMutation.mutate(selectedSeriesId)}
                  disabled={!selectedSeriesId || addToSeriesMutation.isPending}
                  className="w-full text-white"
                  style={{ background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)' }}
                >
                  {addToSeriesMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Ajout...
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4 mr-2" />
                      Ajouter à cette saga
                    </>
                  )}
                </Button>

                {currentSeries && (
                  <Button
                    onClick={() => removeFromSeriesMutation.mutate()}
                    disabled={removeFromSeriesMutation.isPending}
                    variant="outline"
                    className="w-full text-red-600 border-red-300 hover:bg-red-50"
                  >
                    {removeFromSeriesMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Retrait...
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Retirer de "{currentSeries.series_name}"
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Nom de la saga *</Label>
                <Input
                  value={newSeriesName}
                  onChange={(e) => setNewSeriesName(e.target.value)}
                  placeholder="Ex: La Passe-Miroir, Keleana..."
                  className="focus-glow"
                />
              </div>

              <div>
                <Label>Auteur</Label>
                <Input
                  value={newSeriesAuthor}
                  onChange={(e) => setNewSeriesAuthor(e.target.value)}
                  placeholder="Auteur de la saga"
                  className="focus-glow"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => createSeriesMutation.mutate()}
                  disabled={!newSeriesName.trim() || createSeriesMutation.isPending}
                  className="flex-1 text-white"
                  style={{ background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)' }}
                >
                  {createSeriesMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Créer la saga
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setCreatingNew(false);
                    setNewSeriesName("");
                    setNewSeriesAuthor(book?.author || "");
                    setSearchQuery(selectedSeries?.series_name || ""); // Restore search query if a series was selected
                    setSelectedSeriesId(selectedSeries?.id || "");
                  }}
                  variant="outline"
                >
                  Annuler
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BookDetailsDialog({ userBook, book, open, onOpenChange, initialTab = "myinfo" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [friendsFilter, setFriendsFilter] = useState("all"); // "all" or "friends_only"

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const [editedData, setEditedData] = useState({
    status: userBook?.status || "À lire",
    rating: userBook?.rating || "",
    review: userBook?.review || "",
    current_page: userBook?.current_page || "",
    music_playlist: userBook?.music_playlist || [],
    start_date: userBook?.start_date || "",
    end_date: userBook?.end_date || "",
    abandon_page: userBook?.abandon_page || "",
    abandon_percentage: userBook?.abandon_percentage || "",
    is_shared_reading: userBook?.is_shared_reading || false,
    custom_shelf: userBook?.custom_shelf || "",
    favorite_character: userBook?.favorite_character || "",
    reading_language: userBook?.reading_language || "Français",
  });

  const [editingCover, setEditingCover] = useState(false);
  const [newCoverUrl, setNewCoverUrl] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const [newAuthor, setNewAuthor] = useState("");
  const [newMusic, setNewMusic] = useState({ title: "", artist: "", link: "" });
  const [isAddingMusic, setIsAddingMusic] = useState(false);
  const [showSeriesDialog, setShowSeriesDialog] = useState(false);

  useEffect(() => {
    if (userBook) {
      // Migrate old music format to new playlist format if needed
      let playlist = userBook.music_playlist || [];

      // If old format exists and not yet in playlist, add it
      if (userBook.music && !playlist.some(m => m.title === userBook.music)) {
        playlist = [{
          title: userBook.music,
          artist: userBook.music_artist || "",
          link: userBook.music_link || ""
        }, ...playlist];
      }

      setEditedData({
        status: userBook.status || "À lire",
        rating: userBook.rating || "",
        review: userBook.review || "",
        current_page: userBook.current_page || "",
        music_playlist: playlist,
        start_date: userBook.start_date || "",
        end_date: userBook.end_date || "",
        abandon_page: userBook.abandon_page || "",
        abandon_percentage: userBook.abandon_percentage || "",
        is_shared_reading: userBook.is_shared_reading || false,
        custom_shelf: userBook.custom_shelf || "",
        favorite_character: userBook.favorite_character || "",
        reading_language: userBook.reading_language || "Français",
      });
    }
  }, [userBook]);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  // NEW: Fetch friends
  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ 
      created_by: user?.email, 
      status: "Acceptée" 
    }),
    enabled: !!user && open,
  });

  // Fetch book comments
  const { data: bookComments = [] } = useQuery({
    queryKey: ['bookComments', book?.id],
    queryFn: () => base44.entities.ReadingComment.filter({ 
      book_id: book?.id,
      created_by: user?.email
    }, '-created_date'),
    enabled: !!book && !!user && open,
  });

  // NEW: Fetch all User entities to get profile pictures
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: open && myFriends.length > 0,
  });

  // Helper function to normalize book titles for comparison
  const normalizeTitle = (title) => {
    if (!title) return "";
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/tome|t\s*\d+|volume|vol\s*\d+/gi, '') // Remove tome/volume numbers
      .trim();
  };

  // Helper function to check if two titles are similar
  const areTitlesSimilar = (title1, title2) => {
    const norm1 = normalizeTitle(title1);
    const norm2 = normalizeTitle(title2);
    
    // Check if one contains the other or vice versa
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
    
    // Check if they have significant overlap (more than 70% of shorter title)
    const minLength = Math.min(norm1.length, norm2.length);
    if (minLength === 0) return norm1 === norm2; // Both empty or one empty
    
    let matches = 0;
    for (let i = 0; i < Math.min(norm1.length, norm2.length); i++) {
      if (norm1[i] === norm2[i]) matches++;
    }
    
    return (matches / minLength) > 0.7;
  };

  // NEW: Fetch friends' UserBooks for this specific book OR similar titles
  const { data: friendsUserBooks = [] } = useQuery({
    queryKey: ['friendsUserBooks', book?.id, book?.title],
    queryFn: async () => {
      if (!book || myFriends.length === 0) return [];
      
      console.log("🔍 DEBUG - Fetching friends books for:", book.title);
      console.log("🔍 DEBUG - Book ID:", book.id);
      console.log("🔍 DEBUG - My friends:", myFriends.map(f => ({ name: f.friend_name, email: f.friend_email })));
      
      const friendEmails = myFriends.map(f => f.friend_email);
      
      // Get ALL books from friends
      const allFriendBooks = await Promise.all(
        friendEmails.map(async (email) => {
          const books = await base44.entities.UserBook.filter({ created_by: email });
          console.log(`🔍 DEBUG - Total books for ${email}:`, books.length);
          return books;
        })
      );
      
      const flatBooks = allFriendBooks.flat();
      console.log("🔍 DEBUG - Total friend books:", flatBooks.length);
      
      // Get all book details to compare titles
      const allBooksData = await base44.entities.Book.list();
      console.log("🔍 DEBUG - Total books in database:", allBooksData.length);
      
      // Filter books with similar titles
      const matchingBooks = flatBooks.filter(userBook => {
        const friendBookData = allBooksData.find(b => b.id === userBook.book_id);
        if (!friendBookData) return false;
        
        const isSimilar = areTitlesSimilar(book.title, friendBookData.title);
        
        if (isSimilar) {
          console.log(`✅ MATCH FOUND - "${friendBookData.title}" matches "${book.title}" for user ${userBook.created_by}`);
        }
        
        return isSimilar;
      });
      
      console.log("🔍 DEBUG - Matching friend books found:", matchingBooks);
      
      return matchingBooks;
    },
    enabled: !!book && myFriends.length > 0 && open,
  });

  // NEW: Fetch custom shelves of friends
  const { data: friendsShelves = [] } = useQuery({
    queryKey: ['friendsShelves'],
    queryFn: async () => {
      if (myFriends.length === 0) return [];
      
      const friendEmails = myFriends.map(f => f.friend_email);
      const allShelves = await Promise.all(
        friendEmails.map(email => 
          base44.entities.CustomShelf.filter({ created_by: email })
        )
      );
      
      return allShelves.flat();
    },
    enabled: myFriends.length > 0 && open,
  });

  const { data: customShelves = [] } = useQuery({
    queryKey: ['customShelves'],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.CustomShelf.filter({ created_by: user.email });
    },
    enabled: !!user,
  });

  // Fetch series data to detect if this book is part of a series
  const { data: bookSeries = [] } = useQuery({
    queryKey: ['bookSeries', user?.email],
    queryFn: () => base44.entities.BookSeries.filter({ created_by: user?.email }),
    enabled: !!user && open,
  });

  // Fetch all user books to find other books in the same series
  const { data: allUserBooks = [] } = useQuery({
    queryKey: ['allUserBooks', user?.email],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user && open,
  });

  // Find series containing this book
  const currentSeries = useMemo(() => {
    if (!book || !bookSeries) return null;
    return bookSeries.find(series =>
      series.books_read?.includes(book.id) ||
      series.books_in_pal?.includes(book.id) ||
      series.books_wishlist?.includes(book.id)
    );
  }, [bookSeries, book?.id]);

  // Get all books in the same series (excluding the current one)
  const seriesBookIds = useMemo(() => {
    if (!currentSeries) return [];
    return [
      ...(currentSeries.books_read || []),
      ...(currentSeries.books_in_pal || []),
      ...(currentSeries.books_wishlist || [])
    ].filter(id => id !== book?.id);
  }, [currentSeries, book?.id]);

  // Function to sync playlists across series (adding a single music item)
  const syncPlaylistAcrossSeries = async (musicToSync) => {
    if (!currentSeries || seriesBookIds.length === 0) return;

    try {
      // Find all UserBook entries for books in this series
      const seriesUserBooks = allUserBooks.filter(ub =>
        seriesBookIds.includes(ub.book_id)
      );

      // Update each book's playlist
      const updatePromises = seriesUserBooks.map(ub => {
        const existingPlaylist = ub.music_playlist || [];
        const mergedPlaylist = [...existingPlaylist];

        // Add musicToSync if not already present
        if (!mergedPlaylist.some(m =>
              m.title === musicToSync.title &&
              m.artist === musicToSync.artist &&
              m.link === musicToSync.link
            )) {
          mergedPlaylist.push(musicToSync);
        }

        return base44.entities.UserBook.update(ub.id, {
          music_playlist: mergedPlaylist
        });
      });

      await Promise.all(updatePromises);
      toast.success(`🎵 Musique ajoutée et synchronisée avec la saga ${currentSeries.series_name}`);
    } catch (error) {
      console.error('Error syncing playlist across series:', error);
      toast.error("Erreur lors de la synchronisation de la playlist avec la saga.");
    }
  };

  // Function to remove music from all books in series
  const removeMusicFromSeries = async (musicToRemove) => {
    if (!currentSeries || seriesBookIds.length === 0) return;

    try {
      // Find all UserBook entries for books in this series
      const seriesUserBooks = allUserBooks.filter(ub =>
        seriesBookIds.includes(ub.book_id)
      );

      // Remove from each book's playlist
      const updatePromises = seriesUserBooks.map(ub => {
        const updatedPlaylist = (ub.music_playlist || []).filter(m =>
          !(m.title === musicToRemove.title &&
            m.artist === musicToRemove.artist &&
            m.link === musicToRemove.link)
        );

        return base44.entities.UserBook.update(ub.id, {
          music_playlist: updatedPlaylist
        });
      });

      await Promise.all(updatePromises);
      toast.success(`🎵 Musique retirée et synchronisée avec la saga ${currentSeries.series_name}`);
    } catch (error) {
      console.error('Error removing music from series:', error);
      toast.error("Erreur lors de la suppression de la musique de la saga.");
    }
  };

  const updateUserBookMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.UserBook.update(userBook.id, data);

      // Award points if status changed to "Lu"
      if (data.status === "Lu" && userBook.status !== "Lu" && user) {
        await awardPointsForLuStatusMutation.mutateAsync();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['allUserBooks'] }); // Invalidate all user books to reflect series sync
      toast.success("Modifications enregistrées !");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error updating user book:", error);
      toast.error("Échec de l'enregistrement");
    }
  });

  const updateBookMutation = useMutation({
    mutationFn: (data) => base44.entities.Book.update(book.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("✅ Livre mis à jour !");
    },
    onError: (error) => {
      console.error("Error updating book:", error);
      toast.error("Échec de la mise à jour du livre.");
    }
  });

  const awardPointsForLuStatusMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not loaded, cannot award points.");
      const existingPoints = await base44.entities.ReadingPoints.filter({ created_by: user.email });
      if (existingPoints.length > 0) {
        await base44.entities.ReadingPoints.update(existingPoints[0].id, {
          total_points: (existingPoints[0].total_points || 0) + 50
        });
      } else {
        await base44.entities.ReadingPoints.create({ total_points: 50, points_spent: 0, created_by: user.email });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingGoal'] });
      queryClient.invalidateQueries({ queryKey: ['readingPoints'] });
      toast.success("Livre marqué comme lu ! +50 points 🌟");
    },
  });

  const updateBookCoverMutation = useMutation({
    mutationFn: async (newCoverUrl) => {
      await base44.entities.Book.update(book.id, { cover_url: newCoverUrl });

      try {
        const color = await getDominantColor(newCoverUrl);
        if (color) {
          await base44.entities.UserBook.update(userBook.id, { book_color: color });
        }
      } catch (error) {
        console.log("Could not extract color:", error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("✅ Couverture mise à jour !");
      setEditingCover(false);
      setNewCoverUrl("");
    },
  });

  const updateBookAuthorMutation = useMutation({
    mutationFn: (newAuthor) => base44.entities.Book.update(book.id, { author: newAuthor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("Auteur modifié !");
      setIsEditingAuthor(false);
    },
  });

  const deleteUserBookMutation = useMutation({
    mutationFn: async () => {
      const relatedComments = await base44.entities.ReadingComment.filter({ user_book_id: userBook.id });
      await Promise.all(relatedComments.map(c => base44.entities.ReadingComment.delete(c.id)));
      await base44.entities.UserBook.delete(userBook.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("✅ Livre supprimé !");
      onOpenChange(false);
    },
  });

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setNewCoverUrl(result.file_url);
      toast.success("Image uploadée !");
    } catch (error) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingCover(false);
    }
  };

  const startEditingAuthor = () => {
    setNewAuthor(book?.author || "");
    setIsEditingAuthor(true);
  };

  const handleAddMusic = async () => {
    if (!newMusic.title.trim()) {
      toast.error("Le titre de la chanson est requis");
      return;
    }

    const musicToAdd = { ...newMusic };
    const updatedPlaylist = [...editedData.music_playlist, musicToAdd];

    setEditedData({
      ...editedData,
      music_playlist: updatedPlaylist
    });

    // Sync with series immediately
    if (currentSeries && seriesBookIds.length > 0) {
      await syncPlaylistAcrossSeries(musicToAdd);
      queryClient.invalidateQueries({ queryKey: ['allUserBooks'] });
    }

    setNewMusic({ title: "", artist: "", link: "" });
    setIsAddingMusic(false);
  };

  const handleRemoveMusic = async (index) => {
    const musicToRemove = editedData.music_playlist[index];

    // Remove from series first
    if (currentSeries && seriesBookIds.length > 0) {
      await removeMusicFromSeries(musicToRemove);
      queryClient.invalidateQueries({ queryKey: ['allUserBooks'] });
    }

    setEditedData({
      ...editedData,
      music_playlist: editedData.music_playlist.filter((_, i) => i !== index)
    });
  };

  const getPlatform = (link) => {
    if (!link) return null;
    if (link.includes('youtube.com') || link.includes('youtu.be')) return 'YouTube';
    if (link.includes('spotify.com')) return 'Spotify';
    if (link.includes('deezer.com')) return 'Deezer';
    if (link.includes('apple.com')) return 'Apple Music';
    return 'Lien';
  };

  const getPlatformColor = (platform) => {
    switch(platform) {
      case 'YouTube': return '#FF0000';
      case 'Spotify': return '#1DB954';
      case 'Deezer': return '#FF6600';
      case 'Apple Music': return '#FA243C';
      default: return '#9B59B6';
    }
  };

  const handleSave = async () => {
    const updates = { ...editedData };

    // Clean up empty values
    if (!updates.rating) delete updates.rating;
    if (!updates.review) delete updates.review;
    if (!updates.current_page) delete updates.current_page;
    if (!updates.start_date) delete updates.start_date;
    if (!updates.end_date) delete updates.end_date;
    if (!updates.abandon_page) delete updates.abandon_page;
    if (!updates.abandon_percentage) delete updates.abandon_percentage;
    if (!updates.custom_shelf) delete updates.custom_shelf;
    if (!updates.favorite_character) delete updates.favorite_character;

    updateUserBookMutation.mutate(updates);
  };

  if (!book) return null;

  const statusColors = {
    "Lu": "bg-green-100 text-green-800 border-green-300",
    "En cours": "bg-blue-100 text-blue-800 border-blue-300",
    "À lire": "bg-purple-100 text-purple-800 border-purple-300",
    "Abandonné": "bg-red-100 text-red-800 border-red-300",
    "Wishlist": "bg-pink-100 text-pink-800 border-pink-300",
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0 rounded-3xl">
          <style>{`
            .focus-glow:focus {
              box-shadow: 0 0 0 4px rgba(255, 20, 147, 0.3);
              border-color: #FF1493;
            }
            @keyframes slide-in {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-slide-in {
              animation: slide-in 0.3s ease-out;
            }
          `}</style>

          {/* HERO HEADER avec gradient */}
          <div className="relative overflow-hidden" 
               style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4, #FFB6C8)' }}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl" 
                   style={{ background: 'radial-gradient(circle, white, transparent)' }} />
            </div>
            
            <div className="relative p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
              {/* Couverture avec badge langue */}
              <div className="relative flex-shrink-0 mx-auto md:mx-0">
                {editingCover ? (
                  <div className="space-y-3 w-40 md:w-48">
                    <div className="w-40 h-60 md:w-48 md:h-72 rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white"
                         style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                      {newCoverUrl ? (
                        <img src={newCoverUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : book?.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Input
                        value={newCoverUrl}
                        onChange={(e) => setNewCoverUrl(e.target.value)}
                        placeholder="URL de la nouvelle couverture"
                        className="focus-glow"
                      />

                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          className="hidden"
                          disabled={uploadingCover}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={uploadingCover}
                          asChild
                        >
                          <span>
                            {uploadingCover ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Upload...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Uploader
                              </>
                            )}
                          </span>
                        </Button>
                      </label>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => updateBookCoverMutation.mutate(newCoverUrl)}
                          disabled={!newCoverUrl}
                          className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                        >
                          ✓ OK
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setNewCoverUrl("");
                            setEditingCover(false);
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="absolute -top-2 -left-2 z-10 w-12 h-12 rounded-2xl shadow-2xl text-3xl bg-white flex items-center justify-center ring-4 ring-white">
                      {LANGUAGE_FLAGS[editedData.reading_language || "Français"]}
                    </div>
                    <div className="relative group w-40 md:w-48">
                      <div className="w-40 h-60 md:w-48 md:h-72 rounded-3xl overflow-hidden shadow-2xl transform transition-all duration-300 group-hover:scale-105 ring-4 ring-white"
                           style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                        {book?.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-white" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingCover(true)}
                        className="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100
                                  transition-all flex items-center justify-center rounded-3xl"
                      >
                        <div className="text-center">
                          <Edit className="w-10 h-10 text-white mb-2 mx-auto" />
                          <p className="text-white font-bold text-sm">Modifier</p>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Infos principales */}
              <div className="flex-1 space-y-4 text-center md:text-left">
                <div>
                  <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg leading-tight">
                    {book.title}
                  </h1>

                  {isEditingAuthor ? (
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <Input
                        value={newAuthor}
                        onChange={(e) => setNewAuthor(e.target.value)}
                        placeholder="Nom de l'auteur"
                        className="max-w-xs bg-white"
                      />
                      <Button
                        size="sm"
                        onClick={() => updateBookAuthorMutation.mutate(newAuthor)}
                        className="bg-white text-pink-600 hover:bg-gray-100"
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingAuthor(false)}
                        className="text-white hover:bg-white/20"
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={startEditingAuthor}
                      className="text-lg md:text-2xl flex items-center gap-2 hover:underline transition-all text-white text-opacity-90 mx-auto md:mx-0"
                    >
                      par {book.author}
                      <Edit className="w-4 h-4 opacity-70 hover:opacity-100" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
                  <div className={`px-5 py-2.5 rounded-2xl font-bold text-base shadow-xl ${statusColors[editedData.status]}`}>
                    {editedData.status}
                  </div>

                  <Select
                    value={editedData.reading_language || "Français"}
                    onValueChange={(value) => setEditedData({...editedData, reading_language: value})}
                  >
                    <SelectTrigger className="w-52 bg-white rounded-2xl shadow-xl font-bold">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          {LANGUAGE_FLAGS[editedData.reading_language || "Français"]} {editedData.reading_language || "Français"}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(lang => (
                        <SelectItem key={lang} value={lang}>
                          <div className="flex items-center gap-2">
                            <span>{LANGUAGE_FLAGS[lang]}</span>
                            <span>{lang}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-bold mb-2 block text-white text-opacity-90">
                    Changer le statut
                  </Label>
                  <Select
                    value={editedData.status}
                    onValueChange={(value) => setEditedData({...editedData, status: value})}
                  >
                    <SelectTrigger className="bg-white rounded-2xl shadow-xl font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Tabs modernes */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 md:px-8 pt-6 pb-2 bg-gradient-to-b from-white/80 to-transparent backdrop-blur-sm">
              <TabsList className="bg-white shadow-2xl p-2 rounded-2xl border-0 w-full">
                <TabsTrigger
                  value="myinfo"
                  className="flex-1 rounded-xl font-bold data-[state=active]:text-white py-3 text-xs md:text-base transition-all"
                  style={activeTab === "myinfo" ? {
                    background: 'linear-gradient(135deg, #FF1493, #FF69B4)',
                    color: '#FFFFFF'
                  } : { color: '#2D3748' }}
                >
                  📝 Ma lecture
                </TabsTrigger>
                <TabsTrigger
                  value="bookinfo"
                  className="flex-1 rounded-xl font-bold data-[state=active]:text-white py-3 text-xs md:text-base transition-all"
                  style={activeTab === "bookinfo" ? {
                    background: 'linear-gradient(135deg, #FF1493, #FF69B4)',
                    color: '#FFFFFF'
                  } : { color: '#2D3748' }}
                >
                  📚 Le livre
                </TabsTrigger>
                <TabsTrigger
                  value="comments"
                  className="flex-1 rounded-xl font-bold data-[state=active]:text-white py-3 text-xs md:text-base transition-all"
                  style={activeTab === "comments" ? {
                    background: 'linear-gradient(135deg, #FF1493, #FF69B4)',
                    color: '#FFFFFF'
                  } : { color: '#2D3748' }}
                >
                  💬 Avis ({friendsUserBooks.length + 1})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="myinfo">
              {/* CORPS PRINCIPAL */}
              <div className="p-4 md:p-8 space-y-4 md:space-y-6 animate-slide-in">
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                  {/* Card: Note et dates */}
                  <div className="bg-white rounded-3xl p-5 md:p-6 shadow-2xl border-0">
                    <div className="h-1 rounded-full mb-4" 
                         style={{ background: 'linear-gradient(90deg, #FF1493, #FF69B4)' }} />
                    <h3 className="flex items-center gap-2 text-lg md:text-xl font-bold mb-4" style={{ color: '#2D3748' }}>
                      <Star className="w-5 h-5" style={{ color: '#FFD700' }} />
                      Note et dates
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <Label className="flex items-center gap-2 text-sm font-semibold mb-2">
                          <Star className="w-4 h-4" />
                          Note /5
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          max="5"
                          step="0.5"
                          value={editedData.rating || ""}
                          onChange={(e) => setEditedData({...editedData, rating: e.target.value})}
                          placeholder="4.5"
                          className="focus-glow"
                        />
                      </div>

                      {/* Current Page - Only show when status is "En cours" */}
                      {editedData.status === "En cours" && book?.page_count && (
                        <>
                          {/* Total Pages - Editable */}
                          <div>
                            <Label className="flex items-center gap-2 text-sm font-semibold mb-2">
                              <BookOpen className="w-4 h-4" />
                              Nombre de pages total
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              value={book.page_count || ""}
                              onChange={(e) => {
                                const newPageCount = parseInt(e.target.value);
                                if (!isNaN(newPageCount) && newPageCount > 0) {
                                  updateBookMutation.mutate({ page_count: newPageCount });
                                }
                              }}
                              placeholder="Ex: 329"
                              className="focus-glow"
                            />
                            <p className="text-xs mt-1" style={{ color: 'var(--warm-pink)' }}>
                              💡 Modifiez si le nombre réel diffère
                            </p>
                          </div>

                          {/* Current Page */}
                          <div>
                            <Label className="flex items-center gap-2 text-sm font-semibold mb-2">
                              <BookOpen className="w-4 h-4" />
                              Page actuelle (sur {book.page_count})
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              max={book.page_count}
                              value={editedData.current_page || ""}
                              onChange={(e) => setEditedData({...editedData, current_page: e.target.value})}
                              placeholder={`0 - ${book.page_count}`}
                              className="focus-glow"
                            />
                            {editedData.current_page && (
                              <div className="mt-2">
                                <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--beige)' }}>
                                  <div className="h-full rounded-full transition-all"
                                       style={{
                                         width: `${Math.min((editedData.current_page / book.page_count) * 100, 100)}%`,
                                         background: 'linear-gradient(90deg, var(--deep-pink), var(--warm-pink))'
                                       }} />
                                </div>
                                <p className="text-xs mt-1 font-bold text-center" style={{ color: 'var(--deep-pink)' }}>
                                  {Math.round((editedData.current_page / book.page_count) * 100)}% complété
                                </p>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {customShelves.length > 0 && (
                        <div>
                          <Label className="text-sm font-semibold mb-2 block">Étagère personnalisée</Label>
                          <Select
                            value={editedData.custom_shelf || ""}
                            onValueChange={(value) => setEditedData({...editedData, custom_shelf: value || undefined})}
                          >
                            <SelectTrigger className="focus-glow">
                              <SelectValue placeholder="Aucune" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>Aucune</SelectItem>
                              {customShelves.map(s => (
                                <SelectItem key={s.id} value={s.name}>
                                  {s.icon} {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="flex items-center justify-between p-3 rounded-xl bg-pink-50 border-2 border-pink-200">
                        <Label className="flex items-center gap-2 cursor-pointer">
                          <Users className="w-4 h-4" />
                          Lecture commune
                        </Label>
                        <Switch
                          checked={editedData.is_shared_reading}
                          onCheckedChange={(checked) => setEditedData({...editedData, is_shared_reading: checked})}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm font-semibold mb-2 block">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Début
                          </Label>
                          <Input
                            type="date"
                            value={editedData.start_date || ""}
                            onChange={(e) => setEditedData({...editedData, start_date: e.target.value})}
                            className="focus-glow"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-semibold mb-2 block">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Fin
                          </Label>
                          <Input
                            type="date"
                            value={editedData.end_date || ""}
                            onChange={(e) => setEditedData({...editedData, end_date: e.target.value})}
                            className="focus-glow"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card: Personnage & Saga */}
                  <div className="bg-white rounded-3xl p-5 md:p-6 shadow-2xl border-0">
                    <div className="h-1 rounded-full mb-4" 
                         style={{ background: 'linear-gradient(90deg, #FF1493, #FF69B4)' }} />
                    <h3 className="flex items-center gap-2 text-lg md:text-xl font-bold mb-4" style={{ color: '#2D3748' }}>
                      <Heart className="w-5 h-5" style={{ color: '#FF1493' }} />
                      Personnage & Saga
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-bold mb-2 block" style={{ color: '#666' }}>
                          Personnage préféré
                        </Label>
                        <Input
                          value={editedData.favorite_character || ""}
                          onChange={(e) => setEditedData({...editedData, favorite_character: e.target.value})}
                          placeholder="Votre book boyfriend/girlfriend..."
                          className="focus-glow rounded-2xl text-base"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-bold mb-2 block" style={{ color: '#666' }}>
                          Saga associée
                        </Label>
                        {currentSeries ? (
                          <div className="space-y-3">
                            <div className="p-4 rounded-xl" style={{ backgroundColor: '#E6B3E8', color: 'white' }}>
                              <div className="flex items-center gap-2 mb-2">
                                <Layers className="w-5 h-5" />
                                <span className="font-bold">{currentSeries.series_name}</span>
                              </div>
                              <p className="text-sm opacity-90">
                                {((currentSeries.books_read?.length || 0) + (currentSeries.books_in_pal?.length || 0) + (currentSeries.books_wishlist?.length || 0))} livre{((currentSeries.books_read?.length || 0) + (currentSeries.books_in_pal?.length || 0) + (currentSeries.books_wishlist?.length || 0)) > 1 ? 's' : ''}
                              </p>
                            </div>
                            <Button
                              onClick={() => setShowSeriesDialog(true)}
                              variant="outline"
                              className="w-full rounded-2xl"
                            >
                              Changer de saga
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setShowSeriesDialog(true)}
                            className="w-full text-white rounded-2xl"
                            style={{ background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)' }}
                          >
                            <Layers className="w-4 h-4 mr-2" />
                            Ajouter à une saga
                          </Button>
                        )}
                      </div>

                      {customShelves.length > 0 && (
                        <div>
                          <Label className="text-sm font-bold mb-2 block" style={{ color: '#666' }}>
                            Étagère personnalisée
                          </Label>
                          <Select
                            value={editedData.custom_shelf || ""}
                            onValueChange={(value) => setEditedData({...editedData, custom_shelf: value || undefined})}
                          >
                            <SelectTrigger className="focus-glow rounded-2xl">
                              <SelectValue placeholder="Aucune" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>Aucune</SelectItem>
                              {customShelves.map(s => (
                                <SelectItem key={s.id} value={s.name}>
                                  {s.icon} {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card: Mon avis */}
                  <div className="bg-white rounded-3xl p-5 md:p-6 shadow-2xl border-0">
                    <div className="h-1 rounded-full mb-4" 
                         style={{ background: 'linear-gradient(90deg, #FF1493, #FF69B4)' }} />
                    <h3 className="flex items-center gap-2 text-lg md:text-xl font-bold mb-4" style={{ color: '#2D3748' }}>
                      💭 Mon avis
                    </h3>
                    <Textarea
                      value={editedData.review || ""}
                      onChange={(e) => setEditedData({...editedData, review: e.target.value})}
                      placeholder="Qu'avez-vous pensé de ce livre ? Vos impressions, vos coups de cœur, vos déceptions..."
                      rows={6}
                      className="focus-glow resize-none rounded-2xl text-base"
                    />
                  </div>

                  {/* Music Section - Updated for series sync */}
                  <div className="bg-white rounded-3xl p-5 md:p-6 shadow-2xl border-0">
                    <div className="h-1 rounded-full mb-4" 
                         style={{ background: 'linear-gradient(90deg, #FF1493, #FF69B4)' }} />
                    <h3 className="flex items-center gap-2 text-lg md:text-xl font-bold mb-4" style={{ color: '#2D3748' }}>
                      <Music className="w-5 h-5" style={{ color: '#FF1493' }} />
                      Playlist ({editedData.music_playlist.length})
                      {currentSeries && (
                        <span className="text-xs px-2 py-1 rounded-full ml-auto"
                              style={{ backgroundColor: '#E6B3E8', color: 'white' }}>
                          🔗 Saga : {currentSeries.series_name}
                        </span>
                      )}
                    </h3>

                    {currentSeries && (
                      <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: '#FFF0F6' }}>
                        <p className="text-xs font-medium" style={{ color: 'var(--deep-pink)' }}>
                          💡 Cette playlist est partagée avec tous les tomes de la saga "{currentSeries.series_name}"
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Add Music Form */}
                      {isAddingMusic && (
                        <div className="p-4 rounded-xl mb-3 space-y-3" style={{ backgroundColor: 'var(--cream)' }}>
                          <Input
                            value={newMusic.title}
                            onChange={(e) => setNewMusic({ ...newMusic, title: e.target.value })}
                            placeholder="Titre de la chanson *"
                            className="focus-glow"
                          />
                          <Input
                            value={newMusic.artist}
                            onChange={(e) => setNewMusic({ ...newMusic, artist: e.target.value })}
                            placeholder="Artiste"
                            className="focus-glow"
                          />
                          <Input
                            value={newMusic.link}
                            onChange={(e) => setNewMusic({ ...newMusic, link: e.target.value })}
                            placeholder="Lien (YouTube, Spotify, Deezer...)"
                            className="focus-glow"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleAddMusic}
                              className="text-white"
                              style={{ backgroundColor: 'var(--deep-pink)' }}
                            >
                              Ajouter
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsAddingMusic(false);
                                setNewMusic({ title: "", artist: "", link: "" });
                              }}
                            >
                              Annuler
                            </Button>
                          </div>
                        </div>
                      )}

                      {!isAddingMusic && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setIsAddingMusic(true)}
                          className="w-full text-white"
                          style={{ backgroundColor: 'var(--soft-pink)' }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Ajouter une musique
                        </Button>
                      )}

                      {/* Music List */}
                      {editedData.music_playlist.length > 0 ? (
                        <div className="space-y-2 pt-2">
                          {editedData.music_playlist.map((music, index) => {
                            const platform = getPlatform(music.link);
                            const platformColor = platform ? getPlatformColor(platform) : 'var(--warm-pink)';

                            return (
                              <div key={index} className="flex items-center gap-3 p-3 rounded-xl"
                                   style={{ backgroundColor: 'var(--cream)' }}>
                                <Music className="w-5 h-5 flex-shrink-0" style={{ color: platformColor }} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
                                    {music.title}
                                  </p>
                                  {music.artist && (
                                    <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                                      {music.artist}
                                    </p>
                                  )}
                                  {platform && (
                                    <p className="text-xs mt-1" style={{ color: platformColor }}>
                                      📱 {platform}
                                    </p>
                                  )}
                                </div>
                                {music.link && (
                                  <a href={music.link} target="_blank" rel="noopener noreferrer">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="flex-shrink-0"
                                    >
                                      <Play className="w-4 h-4" />
                                    </Button>
                                  </a>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveMusic(index)}
                                  className="flex-shrink-0 text-red-500 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-center py-4" style={{ color: 'var(--warm-pink)' }}>
                          Aucune musique associée
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="bg-white/95 backdrop-blur-sm border-t-2 border-pink-100 p-4 md:p-6 rounded-2xl shadow-2xl">
                  <div className="flex flex-col md:flex-row justify-center gap-3 md:gap-4">
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      className="flex-1 md:flex-none px-6 md:px-8 py-5 md:py-6 text-base md:text-lg font-bold hover:scale-105 transition-transform rounded-2xl"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      Retour
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm(`Êtes-vous sûre de vouloir supprimer "${book.title}" ?`)) {
                          deleteUserBookMutation.mutate();
                        }
                      }}
                      disabled={deleteUserBookMutation.isPending}
                      className="flex-1 md:flex-none px-6 md:px-8 py-5 md:py-6 text-base md:text-lg font-bold hover:scale-105 transition-transform rounded-2xl shadow-xl"
                    >
                      <Trash2 className="w-5 h-5 mr-2" />
                      Supprimer
                    </Button>

                    <Button
                      onClick={handleSave}
                      disabled={updateUserBookMutation.isPending}
                      className="flex-1 md:flex-none px-6 md:px-8 py-5 md:py-6 text-base md:text-lg font-bold bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:scale-105 transition-transform shadow-2xl rounded-2xl"
                    >
                      {updateUserBookMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          Enregistrer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bookinfo">
              <div className="p-4 md:p-8 space-y-4 md:space-y-6 animate-slide-in">
                {/* Card: Genres & Tags */}
                <div className="bg-white rounded-3xl p-5 md:p-6 shadow-2xl border-0">
                  <div className="h-1 rounded-full mb-4" 
                       style={{ background: 'linear-gradient(90deg, #FF1493, #FF69B4)' }} />
                  <h3 className="flex items-center gap-2 text-lg md:text-xl font-bold mb-4" style={{ color: '#2D3748' }}>
                    <Tag className="w-5 h-5" style={{ color: '#FF1493' }} />
                    Genres personnalisés
                  </h3>
                  <GenreTagInput
                    value={book.custom_genres || []}
                    onChange={(genres) => updateBookMutation.mutate({ custom_genres: genres })}
                  />
                </div>

                {/* Card: Format */}
                <div className="bg-white rounded-3xl p-5 md:p-6 shadow-2xl border-0">
                  <div className="h-1 rounded-full mb-4" 
                       style={{ background: 'linear-gradient(90deg, #FF1493, #FF69B4)' }} />
                  <h3 className="flex items-center gap-2 text-lg md:text-xl font-bold mb-4" style={{ color: '#2D3748' }}>
                    <FileText className="w-5 h-5" style={{ color: '#FF1493' }} />
                    Format de lecture
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                    {["Audio", "Numérique", "Broché", "Relié", "Poche", "Wattpad"].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const currentTags = book.tags || [];
                          const newTags = currentTags.includes(tag)
                            ? currentTags.filter(t => t !== tag)
                            : [...currentTags, tag];
                          updateBookMutation.mutate({ tags: newTags });
                        }}
                        className={`p-3 rounded-2xl text-xs md:text-sm font-bold transition-all hover:scale-110 ${
                          (book.tags || []).includes(tag)
                            ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-xl'
                            : 'bg-pink-50 text-pink-800 border-2 border-pink-200 hover:border-pink-400'
                        }`}
                      >
                        {tag === "Audio" && "🎧"}
                        {tag === "Numérique" && "📱"}
                        {tag === "Broché" && "📕"}
                        {tag === "Relié" && "📘"}
                        {tag === "Poche" && "📙"}
                        {tag === "Wattpad" && "🌟"}
                        {" "}{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Infos techniques */}
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-3xl p-5 md:p-6 shadow-2xl border-0">
                  <div className="h-1 rounded-full mb-4" 
                       style={{ background: 'linear-gradient(90deg, #FF1493, #FF69B4)' }} />
                  <h3 className="flex items-center gap-2 text-lg md:text-xl font-bold mb-4" style={{ color: '#2D3748' }}>
                    <Info className="w-5 h-5" style={{ color: '#FF1493' }} />
                    Informations techniques
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {book.page_count && (
                      <div className="text-center p-4 bg-white rounded-2xl shadow-lg">
                        <p className="text-3xl font-bold" style={{ color: '#FF1493' }}>
                          {book.page_count}
                        </p>
                        <p className="text-sm font-medium text-gray-600">pages</p>
                      </div>
                    )}
                    {book.publication_year && (
                      <div className="text-center p-4 bg-white rounded-2xl shadow-lg">
                        <p className="text-3xl font-bold" style={{ color: '#FF1493' }}>
                          {book.publication_year}
                        </p>
                        <p className="text-sm font-medium text-gray-600">année</p>
                      </div>
                    )}
                    {book.language && (
                      <div className="text-center p-4 bg-white rounded-2xl shadow-lg">
                        <p className="text-2xl font-bold" style={{ color: '#FF1493' }}>
                          {LANGUAGE_FLAGS[book.language]} {book.language}
                        </p>
                        <p className="text-sm font-medium text-gray-600">langue</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="comments">
              <div className="p-4 md:p-8">
                {/* Filter Toggle */}
                <div className="flex gap-2 mb-6">
                  <Button
                    variant={friendsFilter === "all" ? "default" : "outline"}
                    onClick={() => setFriendsFilter("all")}
                    className="flex-1 text-sm md:text-base"
                    style={friendsFilter === "all" ? {
                      background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                      color: 'white'
                    } : {}}
                  >
                    Tous les avis
                  </Button>
                  <Button
                    variant={friendsFilter === "friends_only" ? "default" : "outline"}
                    onClick={() => setFriendsFilter("friends_only")}
                    className="flex-1 text-sm md:text-base"
                    style={friendsFilter === "friends_only" ? {
                      background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                      color: 'white'
                    } : {}}
                  >
                    Amies ({friendsUserBooks.length})
                  </Button>
                </div>

                {friendsFilter === "all" && (
                  <>
                    <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                      💬 Mes commentaires
                    </h3>
                    <CommentSection 
                      bookId={book.id}
                      userBookId={userBook.id}
                      existingComments={bookComments}
                      friendsUserBooks={friendsUserBooks}
                      myFriends={myFriends}
                      allUsers={allUsers}
                    />
                  </>
                )}

                {/* Friends Reviews Section */}
                {(friendsFilter === "all" || friendsFilter === "friends_only") && friendsUserBooks.length > 0 && (
                  <div className={friendsFilter === "all" ? "mt-8" : ""}>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                      <Users className="w-5 h-5" />
                      Avis de mes amies
                    </h3>

                    <div className="space-y-4 md:space-y-6">
                    {friendsUserBooks.map((friendBook) => {
                      const friend = myFriends.find(f => f.friend_email === friendBook.created_by);
                      const friendUser = allUsers.find(u => u.email === friendBook.created_by);
                      const friendShelf = friendsShelves.find(s => 
                        s.name === friendBook.custom_shelf && s.created_by === friendBook.created_by
                      );

                      return (
                        <div key={friendBook.id} 
                             className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
                          {/* Friend Header */}
                          <div className="flex items-start gap-4 mb-4">
                            {/* Profile Picture */}
                            <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
                                 style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
                              {friendUser?.profile_picture ? (
                                <img src={friendUser.profile_picture} 
                                     alt={friend?.friend_name || friendBook.created_by} 
                                     className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                                  {(friend?.friend_name || friendBook.created_by)?.[0]?.toUpperCase()}
                                </div>
                              )}
                            </div>

                            {/* Friend Info */}
                            <div className="flex-1">
                              <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                                {friend?.friend_name || friendBook.created_by?.split('@')[0]}
                              </h3>
                              
                              {/* Status Badge */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[friendBook.status]}`}>
                                  {friendBook.status}
                                </span>
                                
                                {/* Reading Language */}
                                {friendBook.reading_language && (
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                    {LANGUAGE_FLAGS[friendBook.reading_language]} {friendBook.reading_language}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Rating */}
                            {friendBook.rating && (
                              <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-50 to-orange-50 px-4 py-2 rounded-xl shadow-sm">
                                <Star className="w-6 h-6 fill-current" style={{ color: '#FFD700' }} />
                                <span className="text-2xl font-bold" style={{ color: '#FFD700' }}>
                                  {friendBook.rating}
                                </span>
                                <span className="text-sm text-gray-600">/5</span>
                              </div>
                            )}
                          </div>

                          {/* Custom Shelf */}
                          {friendShelf && (
                            <div className="mb-4 p-3 rounded-xl flex items-center gap-2"
                                 style={{ 
                                   backgroundColor: friendShelf.color === 'rose' ? '#FFE4EC' :
                                                   friendShelf.color === 'bleu' ? '#E6F3FF' :
                                                   friendShelf.color === 'vert' ? '#E6FFF2' :
                                                   friendShelf.color === 'violet' ? '#F0E6FF' :
                                                   friendShelf.color === 'orange' ? '#FFE8D9' :
                                                   friendShelf.color === 'rouge' ? '#FFE6E6' : '#FFE4EC'
                                 }}>
                              <span className="text-2xl">{friendShelf.icon}</span>
                              <div>
                                <p className="text-sm font-bold" style={{ color: 'var(--dark-text)' }}>
                                  Étagère : {friendShelf.name}
                                </p>
                                {friendShelf.description && (
                                  <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                                    {friendShelf.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Reading Dates */}
                          {(friendBook.start_date || friendBook.end_date) && (
                            <div className="flex items-center gap-4 mb-4 text-sm" style={{ color: 'var(--warm-pink)' }}>
                              {friendBook.start_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>Début : {format(new Date(friendBook.start_date), 'dd/MM/yyyy', { locale: fr })}</span>
                                </div>
                              )}
                              {friendBook.end_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  <span>Fin : {format(new Date(friendBook.end_date), 'dd/MM/yyyy', { locale: fr })}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Review */}
                          {friendBook.review && (
                            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                              <h4 className="font-bold mb-2 flex items-center gap-2" 
                                  style={{ color: 'var(--dark-text)' }}>
                                <Sparkles className="w-4 h-4" />
                                Avis
                              </h4>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap" 
                                 style={{ color: 'var(--dark-text)' }}>
                                {friendBook.review}
                              </p>
                            </div>
                          )}

                          {/* Favorite Character */}
                          {friendBook.favorite_character && (
                            <div className="mt-4 p-3 rounded-xl flex items-center gap-2"
                                 style={{ backgroundColor: '#FFF0F6' }}>
                              <Heart className="w-5 h-5" style={{ color: 'var(--deep-pink)' }} />
                              <p className="text-sm" style={{ color: 'var(--dark-text)' }}>
                                <span className="font-bold">Personnage préféré :</span> {friendBook.favorite_character}
                              </p>
                            </div>
                          )}

                          {/* Music Playlist */}
                          {friendBook.music_playlist && friendBook.music_playlist.length > 0 && (
                            <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: '#E6B3E8' }}>
                              <h4 className="font-bold mb-3 flex items-center gap-2 text-white">
                                <Music className="w-5 h-5" />
                                Playlist musicale ({friendBook.music_playlist.length})
                              </h4>
                              <div className="space-y-2">
                                {friendBook.music_playlist.slice(0, 3).map((music, idx) => (
                                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                                    <Music className="w-4 h-4 text-white flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-white line-clamp-1">
                                        {music.title}
                                      </p>
                                      {music.artist && (
                                        <p className="text-xs text-white/80 line-clamp-1">
                                          {music.artist}
                                        </p>
                                      )}
                                    </div>
                                    {music.link && (
                                      <a href={music.link} target="_blank" rel="noopener noreferrer">
                                        <Button size="sm" variant="ghost" className="text-white hover:bg-white/10">
                                          <Play className="w-4 h-4" />
                                        </Button>
                                      </a>
                                    )}
                                  </div>
                                ))}
                                {friendBook.music_playlist.length > 3 && (
                                  <p className="text-xs text-center text-white/80">
                                    +{friendBook.music_playlist.length - 3} autres musiques
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}

                {friendsFilter === "friends_only" && friendsUserBooks.length === 0 && (
                  <div className="text-center py-12 md:py-20">
                    <Users className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                    <h3 className="text-xl md:text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                      Aucune amie n'a lu ce livre
                    </h3>
                    <p className="text-base md:text-lg" style={{ color: 'var(--warm-pink)' }}>
                      Soyez la première !
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Series Selection Dialog */}
      <AddToSeriesDialog
        open={showSeriesDialog}
        onOpenChange={setShowSeriesDialog}
        book={book}
        currentSeries={currentSeries}
        allSeries={bookSeries}
      />
    </>
  );
}