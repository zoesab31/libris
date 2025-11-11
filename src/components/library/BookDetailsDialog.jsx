
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Search // Added Search icon
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import GenreTagInput from "./GenreTagInput";
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

export default function BookDetailsDialog({ userBook, book, open, onOpenChange }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-br from-pink-50 via-white to-purple-50">
          <style>{`
            .focus-glow:focus {
              box-shadow: 0 0 0 3px rgba(255, 105, 180, 0.2);
              border-color: var(--warm-pink);
            }
            .section-divider {
              border-bottom: 2px solid;
              border-image: linear-gradient(90deg, var(--warm-pink), var(--lavender)) 1;
              margin-bottom: 1.5rem;
              padding-bottom: 0.5rem;
            }
          `}</style>

          {/* HEADER - Couverture + Infos principales */}
          <div className="p-8 bg-white/80 backdrop-blur-sm border-b-2 border-pink-200">
            <div className="flex gap-8 items-start">
              {/* Couverture avec badge langue */}
              <div className="relative flex-shrink-0">
                {editingCover ? (
                  <div className="space-y-3 w-48">
                    <div className="w-48 h-72 rounded-2xl overflow-hidden shadow-2xl"
                         style={{ backgroundColor: 'var(--beige)' }}>
                      {newCoverUrl ? (
                        <img src={newCoverUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : book?.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
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
                    <div className="absolute -top-3 -left-3 z-10 px-3 py-1 rounded-full shadow-lg text-2xl bg-white border-2 border-pink-200">
                      {LANGUAGE_FLAGS[editedData.reading_language || "Français"]}
                    </div>
                    <div className="relative group w-48">
                      <div className="w-48 h-72 rounded-2xl overflow-hidden shadow-2xl transform transition-transform duration-300 group-hover:scale-105"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book?.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingCover(true)}
                        className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100
                                  transition-opacity flex items-center justify-center rounded-2xl"
                      >
                        <Edit className="w-8 h-8 text-white" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Infos principales */}
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                    {book.title}
                  </h1>

                  {isEditingAuthor ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newAuthor}
                        onChange={(e) => setNewAuthor(e.target.value)}
                        placeholder="Nom de l'auteur"
                        className="focus-glow"
                      />
                      <Button
                        size="sm"
                        onClick={() => updateBookAuthorMutation.mutate(newAuthor)}
                        className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                      >
                        ✓
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingAuthor(false)}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={startEditingAuthor}
                      className="text-xl flex items-center gap-2 hover:underline transition-all"
                      style={{ color: 'var(--warm-pink)' }}
                    >
                      par {book.author}
                      <Edit className="w-4 h-4 opacity-50 hover:opacity-100" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className={`px-4 py-2 rounded-full font-semibold text-sm border-2 ${statusColors[editedData.status]}`}>
                    {editedData.status}
                  </div>

                  <Select
                    value={editedData.reading_language || "Français"}
                    onValueChange={(value) => setEditedData({...editedData, reading_language: value})}
                  >
                    <SelectTrigger className="w-48 focus-glow">
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
                  <Label className="text-sm font-semibold mb-2 block" style={{ color: 'var(--dark-text)' }}>
                    Statut du livre
                  </Label>
                  <Select
                    value={editedData.status}
                    onValueChange={(value) => setEditedData({...editedData, status: value})}
                  >
                    <SelectTrigger className="focus-glow">
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

          {/* CORPS PRINCIPAL - 2 colonnes */}
          <div className="p-8 grid md:grid-cols-2 gap-6">
            {/* COLONNE GAUCHE */}
            <div className="space-y-6">
              {/* Card: Genres & Tags */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
                <h3 className="flex items-center gap-2 text-lg font-bold mb-4 section-divider" style={{ color: 'var(--dark-text)' }}>
                  <Tag className="w-5 h-5" />
                  Genres personnalisés
                </h3>
                <GenreTagInput
                  value={book.custom_genres || []}
                  onChange={(genres) => updateBookMutation.mutate({ custom_genres: genres })}
                />
              </div>

              {/* Card: Format */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
                <h3 className="flex items-center gap-2 text-lg font-bold mb-4 section-divider" style={{ color: 'var(--dark-text)' }}>
                  <FileText className="w-5 h-5" />
                  Format de lecture
                </h3>
                <div className="grid grid-cols-3 gap-3">
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
                      className={`p-3 rounded-xl text-sm font-medium transition-all hover:scale-105 ${
                        (book.tags || []).includes(tag)
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                          : 'bg-pink-50 text-pink-800 border-2 border-pink-200'
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

              {/* Card: Personnage préféré */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
                <h3 className="flex items-center gap-2 text-lg font-bold mb-4 section-divider" style={{ color: 'var(--dark-text)' }}>
                  <Heart className="w-5 h-5" />
                  Personnage préféré
                </h3>
                <Input
                  value={editedData.favorite_character || ""}
                  onChange={(e) => setEditedData({...editedData, favorite_character: e.target.value})}
                  placeholder="Votre book boyfriend/girlfriend..."
                  className="focus-glow"
                />
              </div>

              {/* Card: Ajouter à une saga */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
                <h3 className="flex items-center gap-2 text-lg font-bold mb-4 section-divider" style={{ color: 'var(--dark-text)' }}>
                  <Layers className="w-5 h-5" />
                  Saga
                </h3>

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
                      className="w-full"
                    >
                      Changer de saga
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowSeriesDialog(true)}
                    className="w-full text-white"
                    style={{ background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)' }}
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Ajouter à une saga
                  </Button>
                )}
              </div>
            </div>

            {/* COLONNE DROITE */}
            <div className="space-y-6">
              {/* Card: Lecture */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
                <h3 className="flex items-center gap-2 text-lg font-bold mb-4 section-divider" style={{ color: 'var(--dark-text)' }}>
                  <Sparkles className="w-5 h-5" />
                  Ma lecture
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

              {/* Music Section - Updated for series sync */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
                <h3 className="flex items-center gap-2 text-lg font-bold mb-4 section-divider" style={{ color: 'var(--dark-text)' }}>
                  <Music className="w-5 h-5" />
                  Playlist musicale ({editedData.music_playlist.length})
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
          </div>

          {/* SECTION INFÉRIEURE */}
          <div className="p-8 space-y-6 bg-white/50">
            {/* Avis */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
              <h3 className="flex items-center gap-2 text-lg font-bold mb-4 section-divider" style={{ color: 'var(--dark-text)' }}>
                💭 Mon avis
              </h3>
              <Textarea
                value={editedData.review || ""}
                onChange={(e) => setEditedData({...editedData, review: e.target.value})}
                placeholder="Qu'avez-vous pensé de ce livre ? Vos impressions, vos coups de cœur, vos déceptions..."
                rows={5}
                className="focus-glow resize-none"
              />
            </div>

            {/* Infos techniques */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 shadow-lg border-2 border-pink-100">
              <h3 className="flex items-center gap-2 text-lg font-bold mb-4 section-divider" style={{ color: 'var(--dark-text)' }}>
                <Info className="w-5 h-5" />
                Informations techniques
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {book.page_count && (
                  <div className="text-center p-3 bg-white rounded-xl shadow">
                    <p className="text-2xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                      {book.page_count}
                    </p>
                    <p className="text-sm text-gray-600">pages</p>
                  </div>
                )}
                {book.publication_year && (
                  <div className="text-center p-3 bg-white rounded-xl shadow">
                    <p className="text-2xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                      {book.publication_year}
                    </p>
                    <p className="text-sm text-gray-600">année</p>
                  </div>
                )}
                {book.genre && (
                  <div className="text-center p-3 bg-white rounded-xl shadow">
                    <p className="text-lg font-bold" style={{ color: 'var(--deep-pink)' }}>
                      {book.genre}
                    </p>
                    <p className="text-sm text-gray-600">genre</p>
                  </div>
                )}
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-center gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="px-8 py-6 text-lg font-medium hover:scale-105 transition-transform"
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
                className="px-8 py-6 text-lg font-medium hover:scale-105 transition-transform"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Supprimer
              </Button>

              <Button
                onClick={handleSave}
                disabled={updateUserBookMutation.isPending}
                className="px-8 py-6 text-lg font-medium bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:scale-105 transition-transform shadow-lg"
              >
                {updateUserBookMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    💾 Enregistrer
                  </>
                )}
              </Button>
            </div>
          </div>
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
