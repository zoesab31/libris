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
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, Music as MusicIcon, Sparkles, Plus, BookOpen, Search, Upload, Link as LinkIcon, Check, X, Camera } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import BarcodeScanner from "./BarcodeScanner";

// Helper function to extract dominant color from image
const getDominantColor = (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Required for loading images from other origins onto canvas
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      // Scale down image for faster processing
      const scaleFactor = 0.1;
      canvas.width = img.width * scaleFactor;
      canvas.height = img.height * scaleFactor;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      try {
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
      } catch (e) {
        // Handle security error for cross-origin images without CORS headers
        console.error("Error getting image data (likely CORS):", e);
        resolve('#FFB3D9'); // Fallback color
      }
    };

    img.onerror = () => {
      console.log("Image failed to load, using fallback color");
      resolve('#FFB3D9'); // Fallback color
    };
  });
};

const GENRES = ["Romance", "Romantasy", "Dark Romance", "Fantasy", "Thriller", "Policier", "Science-Fiction", "Contemporain",
                "Historique", "Young Adult", "New Adult", "Dystopie", "Paranormal", "Autre"];

const STATUSES = ["Lu", "En cours", "À lire", "Abandonné", "Wishlist"];
const LANGUAGES = ["Français", "Anglais", "Espagnol", "Italien", "Allemand", "Autre"];

export default function AddBookDialog({ open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("search");
  const [scannedBook, setScannedBook] = useState(null);
  const [scannedStatus, setScannedStatus] = useState("À lire");
  const [loadingScannedBook, setLoadingScannedBook] = useState(false);

  // Search tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState([]); // Changed to array for multiple selection
  const [defaultStatus, setDefaultStatus] = useState("À lire"); // Status for all selected books
  const [individualStatuses, setIndividualStatuses] = useState({}); // Individual status overrides

  // Manual tab state
  const [step, setStep] = useState(1);
  const [bookData, setBookData] = useState({
    title: "",
    author: "",
    cover_url: "",
    genre: "",
    language: "Français",
    page_count: "",
    synopsis: "",
    tags: [],
    isbn: "",
    publication_year: ""
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
    abandon_page: "",
    abandon_percentage: "",
    music_link: "",
    favorite_character: ""
  });

  const [uploadingCover, setUploadingCover] = useState(false); // New state for manual cover upload

  // Query for custom genres
  const { data: customGenresData = [] } = useQuery({
    queryKey: ['customGenres', user?.email], // Add user.email to queryKey to refetch if user changes
    queryFn: async () => {
      if (!user?.email) return [];
      const result = await base44.entities.CustomGenre.filter({ created_by: user.email }, 'order');
      return result || [];
    },
    enabled: !!user?.email && open && activeTab === 'manual',
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  });

  // Create a list of available genres (custom genres + default ones if no custom genres)
  const availableGenres = customGenresData.length > 0
    ? customGenresData.map(g => g.name)
    : GENRES;

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
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=20&orderBy=relevance`
        );
        const data = await response.json();

        if (data.items) {
          const books = data.items
            .filter(item => {
              // Exclude items without proper book info
              const info = item.volumeInfo;
              if (!info.title) return false;
              // Exclude very old publications (before 1900) unless it's a classic search
              const year = info.publishedDate ? parseInt(info.publishedDate) : null;
              if (year && year < 1900) return false;
              // Exclude items with no cover and no author
              if (!info.authors && !info.imageLinks) return false;
              return true;
            })
            .map(item => {
              let coverUrl = "";
              if (item.volumeInfo.imageLinks) {
                coverUrl = item.volumeInfo.imageLinks.extraLarge ||
                          item.volumeInfo.imageLinks.large ||
                          item.volumeInfo.imageLinks.medium ||
                          item.volumeInfo.imageLinks.thumbnail ||
                          item.volumeInfo.imageLinks.smallThumbnail || "";
                if (coverUrl) {
                  coverUrl = coverUrl.replace('http:', 'https:');
                  if (coverUrl.includes('books.google.com')) {
                    coverUrl = coverUrl.replace(/zoom=\d+/, 'zoom=3');
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
                year: item.volumeInfo.publishedDate ? parseInt(item.volumeInfo.publishedDate) : null,
                pageCount: item.volumeInfo.pageCount || null,
                description: item.volumeInfo.description || "",
                coverUrl: coverUrl,
                categories: item.volumeInfo.categories || [],
                isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier || ""
              };
            })
            .slice(0, 12);
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

  // Placeholder mutation for awarding points
  const awardPointsForLuStatusMutation = useMutation({
    mutationFn: async () => {
      // This is a placeholder. A real implementation would interact with your backend
      // to award points to the user.
      console.log("Awarding points for 'Lu' status (placeholder)");
      // Example: await base44.integrations.User.awardPoints({ userId: user.id, points: 10 });
    },
    onError: (error) => {
      console.error("Error awarding points:", error);
      toast.error("Erreur lors de l'attribution des points.");
    }
  });

  // Toggle book selection (for multiple selection in search tab)
  const toggleBookSelection = (book) => {
    setSelectedBooks(prev => {
      if (prev.find(b => b.id === book.id)) {
        // Remove book
        setIndividualStatuses(current => {
          const newStatuses = { ...current };
          delete newStatuses[book.id];
          return newStatuses;
        });
        return prev.filter(b => b.id !== book.id);
      } else {
        // Add book
        return [...prev, book];
      }
    });
  };

  // Mutation for adding multiple UserBook entries from search results
  const addBooksMutation = useMutation({
    mutationFn: async ({ books, statuses }) => {
      const addedBookIds = [];
      for (const book of books) {
        let finalCoverUrl = book.coverUrl;
        // In a multi-selection scenario, custom covers for individual books are less practical.
        // We will stick to the cover URL from Google Books or a default.

        let coverColor = '#FFB3D9'; // Default color
        if (finalCoverUrl) {
          try {
            coverColor = await getDominantColor(finalCoverUrl);
          } catch (error) {
            console.log(`Could not extract color for book ${book.title}, using default`, error);
          }
        }

        // Map categories to genre
        let genre = "Autre";
        if (book.categories && book.categories.length > 0) {
          const category = book.categories[0].toLowerCase();
          if (category.includes("fiction") || category.includes("roman")) genre = "Romance";
          else if (category.includes("fantasy") || category.includes("fantastique")) genre = "Fantasy";
          else if (category.includes("thriller")) genre = "Thriller";
          else if (category.includes("young adult") || category.includes("jeunesse")) genre = "Young Adult";
          else if (category.includes("science fiction")) genre = "Science-Fiction";
          else if (category.includes("historique")) genre = "Historique";
        }
        if (!GENRES.includes(genre)) { // This still uses the hardcoded GENRES for mapping Google Books categories
          genre = "Autre";
        }

        // Create the Book entity first
        const createdBook = await base44.entities.Book.create({
          title: book.title,
          author: book.author,
          cover_url: finalCoverUrl,
          page_count: book.pageCount,
          publication_year: book.year,
          synopsis: book.description,
          isbn: book.isbn,
          genre: genre,
        });

        // Then create the UserBook entry
        const bookStatus = statuses[book.id] || defaultStatus;
        await base44.entities.UserBook.create({
          book_id: createdBook.id,
          status: bookStatus,
          book_color: coverColor,
          // created_by: user.id // Assuming user ID is available, if needed
        });
        addedBookIds.push(createdBook.id);

        if (user && bookStatus === "Lu") {
          await awardPointsForLuStatusMutation.mutateAsync();
        }
      }
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      
      toast.success(`✨ ${selectedBooks.length} livre${selectedBooks.length > 1 ? 's' : ''} ajouté${selectedBooks.length > 1 ? 's' : ''} !`, {
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
          color: 'white',
          fontWeight: 'bold'
        }
      });
      
      setSelectedBooks([]);
      setSearchQuery("");
      setDefaultStatus("À lire");
      setIndividualStatuses({});
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error adding books from search:", error);
      toast.error("Erreur lors de l'ajout des livres à votre bibliothèque.");
    }
  });


  const createMutation = useMutation({
    mutationFn: async () => {
      let coverColor = '#FFB3D9'; // Default color
      
      // Extract dominant color from cover if available
      if (bookData.cover_url) {
        try {
          coverColor = await getDominantColor(bookData.cover_url);
        } catch (error) {
          console.log("Could not extract color, using default", error);
        }
      }
      
      const createdBook = await base44.entities.Book.create({
        ...bookData,
        page_count: bookData.page_count ? parseInt(bookData.page_count, 10) : undefined,
        publication_year: bookData.publication_year ? parseInt(bookData.publication_year, 10) : undefined, // Ensure year is parsed
      });

      await base44.entities.UserBook.create({
        book_id: createdBook.id,
        status: userBookData.status,
        rating: userBookData.rating ? parseFloat(userBookData.rating) : undefined,
        review: userBookData.review,
        music: userBookData.music,
        music_artist: userBookData.music_artist,
        is_shared_reading: userBookData.is_shared_reading,
        start_date: userBookData.start_date || undefined,
        end_date: userBookData.end_date || undefined,
        abandon_page: userBookData.abandon_page ? parseInt(userBookData.abandon_page, 10) : undefined,
        abandon_percentage: userBookData.abandon_percentage ? parseInt(userBookData.abandon_percentage, 10) : undefined,
        book_color: coverColor, // Set the extracted color
        music_link: userBookData.music_link || undefined, // Include new field
        favorite_character: userBookData.favorite_character || undefined, // Include new field
      });
      return createdBook; // Return the created book
    },
    onSuccess: async () => { // Changed to async to potentially await awardPoints mutation
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      
      if (user && userBookData.status === "Lu") { // Using existing user and userBookData state
        await awardPointsForLuStatusMutation.mutateAsync();
      }
      
      toast.success("✅ Livre ajouté à votre bibliothèque !");
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating book manually:", error);
      toast.error("Erreur lors de l'ajout du livre. Veuillez réessayer.");
    }
  });

  const handleBarcodeScanned = async (isbn) => {
    setLoadingScannedBook(true);
    try {
      // Try multiple APIs to find the book
      let book = null;

      // 1. Try Google Books API first
      try {
        const googleResponse = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
        );
        const googleData = await googleResponse.json();

        if (googleData.items && googleData.items.length > 0) {
          const item = googleData.items[0];
          let coverUrl = "";
          if (item.volumeInfo.imageLinks) {
            coverUrl = item.volumeInfo.imageLinks.extraLarge ||
                      item.volumeInfo.imageLinks.large ||
                      item.volumeInfo.imageLinks.medium ||
                      item.volumeInfo.imageLinks.thumbnail ||
                      item.volumeInfo.imageLinks.smallThumbnail || "";
            if (coverUrl) {
              coverUrl = coverUrl.replace('http:', 'https:');
              if (coverUrl.includes('books.google.com')) {
                coverUrl = coverUrl.replace(/zoom=\d+/, 'zoom=3');
                if (!coverUrl.includes('zoom=')) {
                  coverUrl += coverUrl.includes('?') ? '&zoom=3' : '?zoom=3';
                }
              }
            }
          }

          book = {
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
            isbn: isbn
          };
        }
      } catch (err) {
        console.log("Google Books API failed, trying alternatives...");
      }

      // 2. If Google Books fails, try Open Library API
      if (!book) {
        try {
          const openLibResponse = await fetch(
            `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
          );
          const openLibData = await openLibResponse.json();
          const bookData = openLibData[`ISBN:${isbn}`];

          if (bookData) {
            book = {
              id: isbn,
              title: bookData.title || "Titre inconnu",
              author: bookData.authors ? bookData.authors.map(a => a.name).join(", ") : "Auteur inconnu",
              year: bookData.publish_date ? new Date(bookData.publish_date).getFullYear() : null,
              pageCount: bookData.number_of_pages || null,
              description: bookData.notes || bookData.subtitle || "",
              coverUrl: bookData.cover?.large || bookData.cover?.medium || "",
              categories: bookData.subjects ? bookData.subjects.map(s => s.name) : [],
              isbn: isbn
            };
          }
        } catch (err) {
          console.log("Open Library API failed");
        }
      }

      if (book) {
        setScannedBook(book);
        setScannedStatus("À lire");
        toast.success("📚 Livre trouvé !");
      } else {
        toast.error("Aucun livre trouvé pour cet ISBN. Essayez avec la recherche manuelle.");
        setScannedBook(null);
        setActiveTab("search");
      }
    } catch (error) {
      console.error("Error fetching book by ISBN:", error);
      toast.error("Erreur lors de la recherche du livre");
      setScannedBook(null);
    } finally {
      setLoadingScannedBook(false);
    }
  };

  const handleAddScannedBook = async () => {
    if (!scannedBook) return;

    try {
      let finalCoverUrl = scannedBook.coverUrl;
      let coverColor = '#FFB3D9';
      
      if (finalCoverUrl) {
        try {
          coverColor = await getDominantColor(finalCoverUrl);
        } catch (error) {
          console.log(`Could not extract color, using default`, error);
        }
      }

      let genre = "Autre";
      if (scannedBook.categories && scannedBook.categories.length > 0) {
        const category = scannedBook.categories[0].toLowerCase();
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
        title: scannedBook.title,
        author: scannedBook.author,
        cover_url: finalCoverUrl,
        page_count: scannedBook.pageCount,
        publication_year: scannedBook.year,
        synopsis: scannedBook.description,
        isbn: scannedBook.isbn,
        genre: genre,
      });

      await base44.entities.UserBook.create({
        book_id: createdBook.id,
        status: scannedStatus,
        book_color: coverColor,
      });

      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      
      toast.success("✨ Livre ajouté à votre bibliothèque !");
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error adding scanned book:", error);
      toast.error("Erreur lors de l'ajout du livre");
    }
  };

  const resetForm = () => {
    setStep(1);
    setActiveTab("search");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedBooks([]);
    setDefaultStatus("À lire");
    setIndividualStatuses({});
    setScannedBook(null);
    setLoadingScannedBook(false);
    setBookData({
      title: "",
      author: "",
      cover_url: "",
      genre: "",
      language: "Français",
      page_count: "",
      synopsis: "",
      tags: [],
      isbn: "",
      publication_year: ""
    });
    setUserBookData({
      status: "À lire",
      rating: "",
      review: "",
      music: "",
      music_artist: "",
      is_shared_reading: false,
      start_date: "",
      end_date: "",
      abandon_page: "",
      abandon_percentage: "",
      music_link: "",
      favorite_character: "",
    });
    setUploadingCover(false);
  };

  const handleManualCoverUpload = async (e) => { // Renamed to avoid clash with handleFileUpload for search tab
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setBookData({ ...bookData, cover_url: result.file_url });
      toast.success("Couverture uploadée !");
    } catch (error) {
      console.error("Error uploading cover:", error);
      toast.error("Erreur lors de l'upload de la couverture");
    } finally {
      setUploadingCover(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-3xl border-0 shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #FFF8FC 0%, #FEF3F9 100%)' }}>
        
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: 'rgba(255,105,180,0.15)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold" style={{ color: '#2D1F3F' }}>Ajouter un livre</h2>
              <p className="text-xs" style={{ color: '#A78BBA' }}>Recherche, scan ou ajout manuel</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.7)' }}>
            {[
              { value: 'search', icon: <Search className="w-3.5 h-3.5" />, label: 'Rechercher' },
              { value: 'manual', icon: <Plus className="w-3.5 h-3.5" />, label: 'Manuel' },
              { value: 'scan', icon: <Camera className="w-3.5 h-3.5" />, label: 'Scanner' },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: activeTab === tab.value ? 'linear-gradient(135deg, #FF1493, #FF69B4)' : 'transparent',
                  color: activeTab === tab.value ? 'white' : '#A78BBA',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4">

          {/* ── SEARCH TAB ── */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#FF69B4' }} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Titre, auteur, ISBN..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm font-medium outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    border: '2px solid',
                    borderColor: searchQuery ? '#FF69B4' : 'rgba(255,105,180,0.2)',
                    color: '#2D1F3F',
                  }}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4" style={{ color: '#A78BBA' }} />
                  </button>
                )}
              </div>

              {/* Loading */}
              {isSearching && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#FF1493' }} />
                </div>
              )}

              {/* Empty state */}
              {!isSearching && searchQuery && searchResults.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-sm font-medium" style={{ color: '#A78BBA' }}>Aucun résultat pour « {searchQuery} »</p>
                </div>
              )}

              {/* No search yet */}
              {!searchQuery && (
                <div className="text-center py-10">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: '#FF1493' }} />
                  <p className="text-sm" style={{ color: '#A78BBA' }}>Tape le titre ou l'auteur pour commencer</p>
                </div>
              )}

              {/* Results */}
              {!isSearching && searchResults.length > 0 && (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {searchResults.map((book) => {
                    const isSelected = !!selectedBooks.find(b => b.id === book.id);
                    return (
                      <button
                        key={book.id}
                        onClick={() => toggleBookSelection(book)}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
                        style={{
                          background: isSelected ? 'linear-gradient(135deg, #FDF2FE, #FDE8F8)' : 'rgba(255,255,255,0.8)',
                          border: '2px solid',
                          borderColor: isSelected ? '#E91E63' : 'rgba(255,105,180,0.1)',
                        }}
                      >
                        {/* Cover */}
                        <div className="w-12 h-17 rounded-xl overflow-hidden flex-shrink-0 shadow-sm" style={{ width: 44, height: 62 }}>
                          {book.coverUrl ? (
                            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover"
                              onError={(e) => { e.target.src = 'https://placehold.co/88x124/FFE1F0/FF1493?text=?'; }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: '#FFE9F0' }}>
                              <BookOpen className="w-4 h-4" style={{ color: '#FF69B4' }} />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm line-clamp-1" style={{ color: '#2D1F3F' }}>{book.title}</p>
                          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#FF69B4' }}>{book.author}</p>
                          <div className="flex gap-2 mt-1">
                            {book.year && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#F3E5F5', color: '#9C27B0' }}>{book.year}</span>}
                            {book.pageCount && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#FCE4EC', color: '#E91E63' }}>{book.pageCount} p.</span>}
                          </div>
                        </div>

                        {/* Check */}
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: isSelected ? 'linear-gradient(135deg,#FF1493,#FF69B4)' : 'rgba(255,105,180,0.1)' }}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selected books bar */}
              {selectedBooks.length > 0 && (
                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.9)', border: '2px solid rgba(255,105,180,0.2)' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold" style={{ color: '#2D1F3F' }}>
                      📖 {selectedBooks.length} livre{selectedBooks.length > 1 ? 's' : ''} sélectionné{selectedBooks.length > 1 ? 's' : ''}
                    </p>
                    <button onClick={() => setSelectedBooks([])} className="text-xs" style={{ color: '#A78BBA' }}>Tout effacer</button>
                  </div>

                  {/* Status selector */}
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: '#A78BBA' }}>Statut</p>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUSES.map(s => (
                        <button key={s} onClick={() => setDefaultStatus(s)}
                          className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                          style={{
                            background: defaultStatus === s ? 'linear-gradient(135deg,#FF1493,#FF69B4)' : '#F3E5F5',
                            color: defaultStatus === s ? 'white' : '#9B3EC8',
                          }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => addBooksMutation.mutate({ books: selectedBooks, statuses: individualStatuses })}
                    disabled={addBooksMutation.isPending}
                    className="w-full py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}
                  >
                    {addBooksMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Ajout en cours...</>
                    ) : (
                      <><Plus className="w-4 h-4" /> Ajouter {selectedBooks.length} livre{selectedBooks.length > 1 ? 's' : ''}</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}



          {/* ── SCAN TAB ── */}
          {activeTab === 'scan' && <div className="space-y-4">
            <BarcodeScanner onScanSuccess={handleBarcodeScanned} />

            {loadingScannedBook && (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}

            {scannedBook && (
              <div className="flex flex-col items-center gap-5">
                <div className="rounded-xl overflow-hidden shadow-2xl" style={{ width: 220, height: 330, backgroundColor: 'var(--beige)' }}>
                  {scannedBook.coverUrl && (
                    <img src={scannedBook.coverUrl} alt="Couverture" className="w-full h-full object-cover" />
                  )}
                </div>

                <div className="w-full max-w-xs">
                  <Label className="text-sm font-bold mb-2 block" style={{ color: 'var(--dark-text)' }}>
                    Statut
                  </Label>
                  <Select value={scannedStatus} onValueChange={setScannedStatus}>
                    <SelectTrigger className="w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddScannedBook} className="bg-[#ff4d87] text-white">Ajouter</Button>
                  <Button variant="outline" onClick={() => setScannedBook(null)}>Rescanner</Button>
                </div>
              </div>
            )}

            {!loadingScannedBook && !scannedBook && (
              <div className="text-center py-6">
                <p className="text-sm" style={{ color: '#A78BBA' }}>Scannez un code-barres pour afficher le livre détecté.</p>
              </div>
            )}
          </div>}

          {/* ── MANUAL TAB ── */}
          {activeTab === 'manual' && <div className="space-y-4">
            <p className="text-sm font-bold" style={{ color: '#FF1493' }}>
              {step === 1 ? "📚 Informations du livre" : "✨ Vos impressions"}
            </p>
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
                        {availableGenres.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="language">Langue</Label>
                    <Select value={bookData.language} onValueChange={(value) => setBookData({...bookData, language: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Langue" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                  <Label htmlFor="cover">Couverture du livre</Label>
                  <div className="flex gap-3 items-start">
                    <div className="flex-1">
                      <Input
                        id="cover"
                        value={bookData.cover_url}
                        onChange={(e) => setBookData({...bookData, cover_url: e.target.value})}
                        placeholder="URL de la couverture ou..."
                      />
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleManualCoverUpload}
                        className="hidden"
                        disabled={uploadingCover}
                      />
                      <Button type="button" variant="outline" disabled={uploadingCover}>
                        {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#000000' }} /> : <Upload className="w-4 h-4" style={{ color: '#000000' }} />}
                      </Button>
                    </label>
                  </div>
                  {bookData.cover_url && (
                    <div className="mt-3 relative w-32">
                      <img 
                        src={bookData.cover_url} 
                        alt="Aperçu" 
                        className="w-32 h-48 object-cover rounded-lg shadow-md"
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/120x180/FFE1F0/FF1493?text=?'; // Fallback if image fails
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setBookData({...bookData, cover_url: ""})}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
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
                  className="w-full font-medium py-6"
                  style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))', color: '#000000' }}
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

                {userBookData.status === "Abandonné" && (
                  <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: 'var(--cream)' }}>
                    <Label className="text-sm font-bold" style={{ color: 'var(--dark-text)' }}>
                      📖 Où avez-vous abandonné ?
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="abandon-page" className="text-xs">Page d'abandon</Label>
                        <Input
                          id="abandon-page"
                          type="number"
                          value={userBookData.abandon_page || ''}
                          onChange={(e) => setUserBookData({...userBookData, abandon_page: e.target.value})}
                          placeholder="150"
                        />
                      </div>
                      <div>
                        <Label htmlFor="abandon-percentage" className="text-xs">Portion lue (%)</Label>
                        <Input
                          id="abandon-percentage"
                          type="number"
                          min="0"
                          max="100"
                          value={userBookData.abandon_percentage || ''}
                          onChange={(e) => setUserBookData({...userBookData, abandon_percentage: e.target.value})}
                          placeholder="50"
                        />
                      </div>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--warm-brown)' }}>
                      💡 Si vous avez abandonné après 50%, le livre comptera dans votre objectif annuel
                    </p>
                  </div>
                )}

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
                    className="flex-1 font-medium py-6"
                    style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))', color: '#000000' }}
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