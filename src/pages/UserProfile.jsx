import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, MessageCircle, Users, BookOpen, Quote, Image, Heart, Loader2, Palette, UsersRound, Music, Sparkles, TrendingUp, Trophy, Map } from "lucide-react";
import { createPageUrl } from "@/utils";
import { BarChart as RechartsBarChart, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar, Pie } from 'recharts';
import FriendBookDialog from "../components/library/FriendBookDialog";
import FourBooksSection from "../components/profile/FourBooksSection";

const COLORS = ['#FF0080', '#FF1493', '#FF69B4', '#FFB6C8', '#E6B3E8', '#FFCCCB'];

export default function UserProfile() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("mypage");
  const [libraryView, setLibraryView] = useState("shelves"); // "shelves", "read", "toread", "wishlist", "abandoned", "history", "pal"
  const [selectedShelf, setSelectedShelf] = useState(null);
  const [expandedYears, setExpandedYears] = useState({});
  const [selectedPAL, setSelectedPAL] = useState(null);
  const [selectedFriendBook, setSelectedFriendBook] = useState(null); // NEW
  
  const urlParams = new URLSearchParams(window.location.search);
  const userEmail = urlParams.get('userEmail') || urlParams.get('email');

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userEmail) {
      navigate(createPageUrl("Friends"));
    }
  }, [userEmail, navigate]);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const profileUser = allUsers.find(u => u.email === userEmail);

  const { data: friendName } = useQuery({
    queryKey: ['friendName', userEmail],
    queryFn: async () => {
      if (!currentUser) return null;
      const friendships = await base44.entities.Friendship.filter({ 
        created_by: currentUser.email,
        friend_email: userEmail,
        status: "Acceptée"
      });
      return friendships[0]?.friend_name || userEmail?.split('@')[0] || 'Amie';
    },
    enabled: !!currentUser && !!userEmail,
  });

  const { data: userBooks = [] } = useQuery({
    queryKey: ['userBooks', userEmail],
    queryFn: () => base44.entities.UserBook.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: userCustomShelves = [] } = useQuery({
    queryKey: ['userCustomShelves', userEmail],
    queryFn: () => base44.entities.CustomShelf.filter({ created_by: userEmail }),
    enabled: !!userEmail && activeTab === 'library' && libraryView === 'shelves',
  });

  const { data: userQuotes = [] } = useQuery({
    queryKey: ['userQuotes', userEmail],
    queryFn: () => base44.entities.Quote.filter({ created_by: userEmail }, '-created_date'),
    enabled: !!userEmail && activeTab === 'quotes',
  });

  const { data: userFanArts = [] } = useQuery({
    queryKey: ['userFanArts', userEmail],
    queryFn: () => base44.entities.FanArt.filter({ created_by: userEmail }),
    enabled: !!userEmail && activeTab === 'fanart',
  });

  const { data: userNailInspos = [] } = useQuery({
    queryKey: ['userNailInspos', userEmail],
    queryFn: () => base44.entities.NailInspo.filter({ created_by: userEmail }, '-created_date'),
    enabled: !!userEmail && activeTab === 'nailinspo',
  });

  const { data: userCharacters = [] } = useQuery({
    queryKey: ['userCharacters', userEmail],
    queryFn: () => base44.entities.BookBoyfriend.filter({ created_by: userEmail }, 'rank'),
    enabled: !!userEmail && activeTab === 'characters',
  });

  const { data: userBooksWithMusic = [] } = useQuery({
    queryKey: ['userBooksWithMusic', userEmail],
    queryFn: async () => {
      const books = await base44.entities.UserBook.filter({ created_by: userEmail });
      return books.filter(b => b.music && b.music_link);
    },
    enabled: !!userEmail && activeTab === 'music',
  });

  const { data: userSeries = [] } = useQuery({
    queryKey: ['userSeries', userEmail],
    queryFn: () => base44.entities.BookSeries.filter({ created_by: userEmail }),
    enabled: !!userEmail && activeTab === 'series',
  });

  const { data: userBingoChallenges = [] } = useQuery({
    queryKey: ['userBingoChallenges', userEmail],
    queryFn: () => base44.entities.BingoChallenge.filter({ 
      created_by: userEmail,
      year: new Date().getFullYear()
    }),
    enabled: !!userEmail && activeTab === 'bingo',
  });

  const { data: userLocations = [] } = useQuery({
    queryKey: ['userLocations', userEmail],
    queryFn: () => base44.entities.ReadingLocation.filter({ created_by: userEmail }, '-date'),
    enabled: !!userEmail && activeTab === 'map',
  });

  const { data: userPALs = [] } = useQuery({
    queryKey: ['userPALs', userEmail],
    queryFn: () => base44.entities.ReadingList.filter({ created_by: userEmail }),
    enabled: !!userEmail && activeTab === 'library' && libraryView === 'pal',
  });

  const readBooks = userBooks.filter(b => b.status === "Lu");
  const toReadBooks = userBooks.filter(b => b.status === "À lire");
  const wishlistBooks = userBooks.filter(b => b.status === "Wishlist");
  const abandonedBooks = userBooks.filter(b => b.status === "Abandonné");

  // Helper function to check if abandoned book counts (>50%)
  const abandonedBookCounts = (userBook) => {
    if (userBook.status !== "Abandonné") return false;
    if (userBook.abandon_percentage >= 50) return true;
    if (userBook.abandon_page) {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (book && book.page_count && userBook.abandon_page >= book.page_count / 2) {
        return true;
      }
    }
    return false;
  };

  // Get effective date for history
  const getEffectiveDate = (userBook) => {
    if (userBook.status === "Lu" && userBook.end_date) {
      return userBook.end_date;
    }
    if (userBook.status === "Abandonné" && abandonedBookCounts(userBook)) {
      return userBook.end_date || userBook.updated_date; // Use end_date if available, else updated_date for abandoned
    }
    return null;
  };

  // Organize books by year/month for history
  const readBooksByYearMonth = useMemo(() => {
    const booksToOrganize = userBooks.filter(b => {
      const effectiveDate = getEffectiveDate(b);
      return effectiveDate !== null;
    });
    
    const organized = {};
    booksToOrganize.forEach(userBook => {
      const effectiveDate = getEffectiveDate(userBook);
      if (!effectiveDate) return;

      const dateObj = new Date(effectiveDate);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1; // getMonth() is 0-indexed

      if (!organized[year]) organized[year] = {};
      if (!organized[year][month]) organized[year][month] = [];
      organized[year][month].push(userBook);
    });

    return organized;
  }, [userBooks, allBooks]);

  const years = Object.keys(readBooksByYearMonth).sort((a, b) => b - a);
  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  // Group PALs by year
  const palsByYear = useMemo(() => {
    const grouped = {};
    userPALs.forEach(pal => {
      const year = pal.year || new Date().getFullYear();
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(pal);
    });
    
    Object.keys(grouped).forEach(year => {
      grouped[year].sort((a, b) => (b.month || 0) - (a.month || 0));
    });
    
    return grouped;
  }, [userPALs]);

  const palYears = Object.keys(palsByYear).sort((a, b) => b - a);

  // Calculate PAL progress
  const calculatePALProgress = (pal) => {
    if (!pal.book_ids || pal.book_ids.length === 0) {
      return { total: 0, completed: 0, percentage: 0 };
    }

    const total = pal.book_ids.length;
    const completed = userBooks.filter(ub => 
      pal.book_ids.includes(ub.book_id) && ub.status === "Lu"
    ).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percentage };
  };

  const totalPages = readBooks.reduce((sum, ub) => {
    const book = allBooks.find(b => b.id === ub.book_id);
    return sum + (book?.page_count || 0);
  }, 0);

  // Stats calculations for stats tab
  const currentYear = new Date().getFullYear();
  const booksThisYear = useMemo(() => {
    return userBooks.filter(b => {
      if (b.status === "Lu" && b.end_date) {
        return new Date(b.end_date).getFullYear() === currentYear;
      }
      return false;
    });
  }, [userBooks, currentYear]);

  const genreStats = useMemo(() => {
    const stats = {};
    booksThisYear.forEach(userBook => {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (!book) return;

      const genres = book.custom_genres && book.custom_genres.length > 0
        ? book.custom_genres
        : ['Non classé'];

      genres.forEach(genre => {
        stats[genre] = (stats[genre] || 0) + 1;
      });
    });

    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [booksThisYear, allBooks]);

  const booksPerMonth = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      name: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][i],
      count: 0
    }));

    booksThisYear.forEach(userBook => {
      if (userBook.end_date) {
        const month = new Date(userBook.end_date).getMonth();
        months[month].count++;
      }
    });

    return months;
  }, [booksThisYear]);

  const avgRating = useMemo(() => {
    const rated = booksThisYear.filter(b => b.rating);
    if (rated.length === 0) return 0;
    const sum = rated.reduce((acc, b) => acc + b.rating, 0);
    return (sum / rated.length).toFixed(1);
  }, [booksThisYear]);

  const handleChat = () => {
    navigate(createPageUrl("Chat"));
  };

  // NEW: Function to handle book click
  const handleBookClick = (userBook) => {
    setSelectedFriendBook(userBook);
  };

  if (!userEmail) {
    return null;
  }

  if (!friendName || !profileUser) {
    return (
      <div className="p-8 text-center" style={{ backgroundColor: 'var(--cream)', minHeight: '100vh' }}>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="w-16 h-16 animate-spin" 
               style={{ color: 'var(--deep-pink)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--warm-pink)' }}>
            Chargement du profil...
          </p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.email === userEmail;
  const accentColor = 'var(--deep-pink)';
  const displayName = friendName || profileUser.display_name || profileUser.full_name || userEmail?.split('@')[0] || 'Amie';

  const completedChallenges = userBingoChallenges.filter(c => c.is_completed).length;

  // Library view filtering
  const getLibraryBooks = () => {
    if (libraryView === "shelves") {
      return selectedShelf 
        ? userBooks.filter(ub => ub.custom_shelf === selectedShelf.name)
        : userBooks; // When "shelves" is selected but no specific shelf, show all books
    }
    if (libraryView === "read") return readBooks;
    if (libraryView === "toread") return toReadBooks;
    if (libraryView === "wishlist") return wishlistBooks;
    if (libraryView === "abandoned") return abandonedBooks;
    // For "history" and "pal" views, books are rendered differently, so no need to return a simple list here.
    return []; 
  };

  const libraryBooks = getLibraryBooks();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <style>{`
        /* Mobile filter pills responsive styles */
        @media (max-width: 767px) {
          .library-filters-mobile {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 12px;
            padding: 0 16px;
          }
          
          .library-filters-mobile button {
            flex: 0 0 auto;
            min-width: fit-content;
            margin: 0;
            padding: 12px 20px !important;
            font-size: 15px !important;
            font-weight: 600 !important;
            white-space: nowrap;
          }
        }
      `}</style>

      {/* Simple header with back button */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
        <Button variant="ghost" onClick={() => navigate(-1)} style={{ color: 'var(--deep-pink)' }}>
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour
        </Button>
      </div>

      {/* Profile info */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pb-8">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center mb-8">
          {/* Large profile picture */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white bg-white mx-auto md:mx-0 shadow-xl">
            {profileUser.profile_picture ? (
              <img 
                src={profileUser.profile_picture} 
                alt={displayName} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl md:text-6xl font-bold text-white"
                   style={{ backgroundColor: accentColor }}>
                {displayName[0]?.toUpperCase() || 'A'}
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              {displayName}
            </h1>
            <p className="text-lg mb-4" style={{ color: 'var(--warm-pink)' }}>
              {userEmail}
            </p>

            {!isOwnProfile && (
              <div className="flex gap-3 justify-center md:justify-start flex-wrap">
                <Button
                  onClick={handleChat}
                  className="text-white font-medium px-6 py-3"
                  style={{ backgroundColor: accentColor }}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Chat
                </Button>
                <Button 
                  variant="outline" 
                  className="px-6 py-3"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  <Users className="w-5 h-5 mr-2" />
                  Amie
                </Button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-8 mx-auto md:mx-0">
            <div className="text-center">
              <p className="text-4xl md:text-3xl font-bold" style={{ color: accentColor }}>
                {readBooks.length}
              </p>
              <p className="text-base md:text-sm font-medium" style={{ color: 'var(--warm-pink)' }}>
                Livres lus
              </p>
            </div>
            <div className="text-center">
              <p className="text-4xl md:text-3xl font-bold" style={{ color: accentColor }}>
                {totalPages.toLocaleString()}
              </p>
              <p className="text-base md:text-sm font-medium" style={{ color: 'var(--warm-pink)' }}>
                Pages lues
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white shadow-sm p-1 rounded-xl border-0 mb-8 flex-wrap gap-2 h-auto">
            <TabsTrigger 
              value="mypage" 
              className="rounded-lg font-bold px-4 py-2 text-sm md:text-base"
              style={activeTab === "mypage" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <Heart className="w-5 h-5 mr-2" />
              Ma Page
            </TabsTrigger>
            <TabsTrigger 
              value="library" 
              className="rounded-lg font-bold px-4 py-2 text-sm md:text-base"
              style={activeTab === "library" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Bibliothèque
            </TabsTrigger>
            <TabsTrigger 
              value="series" 
              className="rounded-lg font-bold px-4 py-2 text-sm md:text-base"
              style={activeTab === "series" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Sagas
            </TabsTrigger>
            <TabsTrigger 
              value="quotes" 
              className="rounded-lg font-bold px-4 py-2 text-sm md:text-base"
              style={activeTab === "quotes" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <Quote className="w-5 h-5 mr-2" />
              Citations
            </TabsTrigger>
            <TabsTrigger 
              value="bingo" 
              className="rounded-lg font-bold px-4 py-2 text-sm md:text-base"
              style={activeTab === "bingo" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Bingo
            </TabsTrigger>
            <TabsTrigger 
              value="stats" 
              className="rounded-lg font-bold px-4 py-2 text-sm md:text-base"
              style={activeTab === "stats" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              Stats
            </TabsTrigger>
            <TabsTrigger 
              value="tournament" 
              className="rounded-lg font-bold px-4 py-2 text-sm md:text-base"
              style={activeTab === "tournament" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <Trophy className="w-5 h-5 mr-2" />
              Tournoi
            </TabsTrigger>
            <TabsTrigger 
              value="nailinspo" 
              className="rounded-lg font-bold px-4 py-2 text-sm md:text-base"
              style={activeTab === "nailinspo" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <Palette className="w-5 h-5 mr-2" />
              Ongles
            </TabsTrigger>
            <TabsTrigger 
              value="characters" 
              className="rounded-lg font-bold px-4 py-2 text-sm md:text-base"
              style={activeTab === "characters" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <Heart className="w-5 h-5 mr-2" />
              Personnages
            </TabsTrigger>
            <TabsTrigger 
              value="music" 
              className="rounded-lg font-bold px-4 py-2 text-sm md:text-base"
              style={activeTab === "music" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <Music className="w-5 h-5 mr-2" />
              Playlist
            </TabsTrigger>
            <TabsTrigger 
              value="fanart" 
              className="rounded-lg font-bold px-4 py-2 text-sm md:text-base"
              style={activeTab === "fanart" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <Image className="w-5 h-5 mr-2" />
              Fan Art
            </TabsTrigger>
            <TabsTrigger 
              value="map" 
              className="rounded-lg font-bold px-4 py-2 text-sm md:text-base"
              style={activeTab === "map" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <Map className="w-5 h-5 mr-2" />
              Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mypage">
            <div className="space-y-6">
              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>Bio</h3>
                  {profileUser.bio ? (
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--warm-pink)' }}>{profileUser.bio}</p>
                  ) : (
                    <p className="text-sm italic" style={{ color: 'var(--warm-pink)' }}>Pas de bio pour le moment.</p>
                  )}
                </CardContent>
              </Card>

              <FourBooksSection
                title="📚 En 4 livres pour la connaître"
                description="Ces livres la définissent en tant que lectrice"
                bookIds={profileUser.books_to_know_me || []}
                allBooks={allBooks}
                isOwnProfile={false}
              />

              <FourBooksSection
                title="⭐ Ses 4 coups de cœur de l'année"
                description="Ses lectures préférées de cette année"
                bookIds={profileUser.favorite_books_2024 || []}
                allBooks={allBooks}
                isOwnProfile={false}
              />
            </div>
          </TabsContent>

          <TabsContent value="library">
            {/* Library sub-navigation - MOBILE OPTIMIZED WITH LARGER TOUCH TARGETS */}
            <div className="mb-6 library-filters-mobile">
              <button
                onClick={() => {
                  setLibraryView("shelves");
                  setSelectedShelf(null);
                  setSelectedPAL(null);
                }}
                className="rounded-full font-semibold transition-all"
                style={{
                  backgroundColor: libraryView === "shelves" && !selectedShelf ? accentColor : 'white',
                  color: libraryView === "shelves" && !selectedShelf ? 'white' : accentColor,
                  border: `2px solid ${accentColor}`,
                  padding: '12px 20px',
                  fontSize: '15px',
                  whiteSpace: 'nowrap'
                }}
              >
                📚 Étagères perso ({userCustomShelves.length})
              </button>
              <button
                onClick={() => {
                  setLibraryView("read");
                  setSelectedShelf(null);
                  setSelectedPAL(null);
                }}
                className="rounded-full font-semibold transition-all"
                style={{
                  backgroundColor: libraryView === "read" ? accentColor : 'white',
                  color: libraryView === "read" ? 'white' : accentColor,
                  border: `2px solid ${accentColor}`,
                  padding: '12px 20px',
                  fontSize: '15px',
                  whiteSpace: 'nowrap'
                }}
              >
                ✅ Lus ({readBooks.length})
              </button>
              <button
                onClick={() => {
                  setLibraryView("toread");
                  setSelectedShelf(null);
                  setSelectedPAL(null);
                }}
                className="rounded-full font-semibold transition-all"
                style={{
                  backgroundColor: libraryView === "toread" ? accentColor : 'white',
                  color: libraryView === "toread" ? 'white' : accentColor,
                  border: `2px solid ${accentColor}`,
                  padding: '12px 20px',
                  fontSize: '15px',
                  whiteSpace: 'nowrap'
                }}
              >
                📖 À lire ({toReadBooks.length})
              </button>
              <button
                onClick={() => {
                  setLibraryView("wishlist");
                  setSelectedShelf(null);
                  setSelectedPAL(null);
                }}
                className="rounded-full font-semibold transition-all"
                style={{
                  backgroundColor: libraryView === "wishlist" ? accentColor : 'white',
                  color: libraryView === "wishlist" ? 'white' : accentColor,
                  border: `2px solid ${accentColor}`,
                  padding: '12px 20px',
                  fontSize: '15px',
                  whiteSpace: 'nowrap'
                }}
              >
                💭 Wishlist ({wishlistBooks.length})
              </button>
              <button
                onClick={() => {
                  setLibraryView("abandoned");
                  setSelectedShelf(null);
                  setSelectedPAL(null);
                }}
                className="rounded-full font-semibold transition-all"
                style={{
                  backgroundColor: libraryView === "abandoned" ? accentColor : 'white',
                  color: libraryView === "abandoned" ? 'white' : accentColor,
                  border: `2px solid ${accentColor}`,
                  padding: '12px 20px',
                  fontSize: '15px',
                  whiteSpace: 'nowrap'
                }}
              >
                💀 Abandonnés ({abandonedBooks.length})
              </button>
              <button
                onClick={() => {
                  setLibraryView("history");
                  setSelectedShelf(null);
                  setSelectedPAL(null);
                }}
                className="rounded-full font-semibold transition-all"
                style={{
                  backgroundColor: libraryView === "history" ? accentColor : 'white',
                  color: libraryView === "history" ? 'white' : accentColor,
                  border: `2px solid ${accentColor}`,
                  padding: '12px 20px',
                  fontSize: '15px',
                  whiteSpace: 'nowrap'
                }}
              >
                📅 Historique ({years.reduce((sum, year) => sum + Object.values(readBooksByYearMonth[year] || {}).reduce((s, books) => s + books.length, 0), 0)})
              </button>
              <button
                onClick={() => {
                  setLibraryView("pal");
                  setSelectedShelf(null);
                  setSelectedPAL(null);
                }}
                className="rounded-full font-semibold transition-all"
                style={{
                  backgroundColor: libraryView === "pal" && !selectedPAL ? accentColor : 'white',
                  color: libraryView === "pal" && !selectedPAL ? 'white' : accentColor,
                  border: `2px solid ${accentColor}`,
                  padding: '12px 20px',
                  fontSize: '15px',
                  whiteSpace: 'nowrap'
                }}
              >
                📚 PAL ({userPALs.length})
              </button>
            </div>

            {/* Shelves view */}
            {libraryView === "shelves" && !selectedShelf && (
              <div>
                {userCustomShelves.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                    {userCustomShelves.map(shelf => {
                      const shelfBooks = userBooks.filter(b => b.custom_shelf === shelf.name);
                      const avgRating = shelfBooks.filter(b => b.rating).length > 0
                        ? shelfBooks.filter(b => b.rating).reduce((sum, b) => sum + b.rating, 0) / shelfBooks.filter(b => b.rating).length
                        : 0;

                      return (
                        <div
                          key={shelf.id}
                          onClick={() => setSelectedShelf(shelf)}
                          className="cursor-pointer p-6 rounded-xl shadow-lg transition-all hover:shadow-2xl hover:-translate-y-2"
                          style={{ backgroundColor: 'white', border: '2px solid var(--beige)' }}
                        >
                          <div className="text-center">
                            <span className="text-5xl mb-3 block">{shelf.icon}</span>
                            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                              {shelf.name}
                            </h3>
                            <p className="text-sm font-medium mb-2" style={{ color: 'var(--warm-pink)' }}>
                              {shelfBooks.length} livre{shelfBooks.length > 1 ? 's' : ''}
                            </p>
                            {avgRating > 0 && (
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-lg">⭐</span>
                                <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                                  {avgRating.toFixed(1)}/5
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                    <p style={{ color: 'var(--warm-pink)' }}>Aucune étagère personnalisée</p>
                  </div>
                )}

                {/* All books below shelves */}
                <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                  Tous les livres ({userBooks.length})
                </h3>
                <div className="grid md:grid-cols-4 gap-4">
                  {userBooks.map(ub => {
                    const book = allBooks.find(b => b.id === ub.book_id);
                    if (!book) return null;
                    return (
                      <Card 
                        key={ub.id} 
                        className="overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => handleBookClick(ub)}
                      >
                        <div className="aspect-[2/3] relative">
                          {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"
                                 style={{ backgroundColor: 'var(--beige)' }}>
                              <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                            <p className="text-white font-bold mb-2 book-title-display line-clamp-2">
                              {book.title}
                            </p>
                            <span className="text-xs px-2 py-1 rounded-full"
                                  style={{ backgroundColor: accentColor, color: 'white' }}>
                              {ub.status}
                            </span>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Shelf detail view */}
            {libraryView === "shelves" && selectedShelf && (
              <div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedShelf(null)}
                  className="mb-4"
                  style={{ color: accentColor }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour aux étagères
                </Button>
                <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--dark-text)' }}>
                  {selectedShelf.icon} {selectedShelf.name}
                </h2>
                <div className="grid md:grid-cols-4 gap-4">
                  {libraryBooks.map(ub => {
                    const book = allBooks.find(b => b.id === ub.book_id);
                    if (!book) return null;
                    return (
                      <Card 
                        key={ub.id} 
                        className="overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => handleBookClick(ub)}
                      >
                        <div className="aspect-[2/3] relative">
                          {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"
                                 style={{ backgroundColor: 'var(--beige)' }}>
                              <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                            <p className="text-white font-bold mb-2 book-title-display line-clamp-2">
                              {book.title}
                            </p>
                            <span className="text-xs px-2 py-1 rounded-full"
                                  style={{ backgroundColor: accentColor, color: 'white' }}>
                              {ub.status}
                            </span>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* History view */}
            {libraryView === "history" && (
              <div className="space-y-6">
                {years.map(year => {
                  const yearData = readBooksByYearMonth[year];
                  const months = Object.keys(yearData).sort((a, b) => b - a);
                  const isExpanded = expandedYears[year];

                  return (
                    <div key={year} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }))}
                        className="w-full p-6 flex items-center justify-between hover:bg-opacity-50 transition-colors"
                        style={{ backgroundColor: 'var(--cream)' }}
                      >
                        <div>
                          <h2 className="text-2xl font-bold text-left" style={{ color: 'var(--dark-text)' }}>
                            {year}
                          </h2>
                          <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                            {months.reduce((sum, m) => sum + yearData[m].length, 0)} livre{months.reduce((sum, m) => sum + yearData[m].length, 0) > 1 ? 's' : ''}
                          </p>
                        </div>
                        <span style={{ color: accentColor }}>{isExpanded ? '▲' : '▼'}</span>
                      </button>

                      {isExpanded && (
                        <div className="p-6 space-y-8">
                          {months.map(month => (
                            <div key={month}>
                              <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                                {monthNames[month - 1]}
                              </h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {yearData[month].map(ub => {
                                  const book = allBooks.find(b => b.id === ub.book_id);
                                  if (!book) return null;
                                  const isDNF = ub.status === "Abandonné";
                                  return (
                                    <Card 
                                      key={ub.id} 
                                      className="overflow-hidden hover:shadow-lg transition-all relative cursor-pointer"
                                      onClick={() => handleBookClick(ub)}
                                    >
                                      {isDNF && (
                                        <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black flex items-center justify-center z-10">
                                          <span className="text-lg">💀</span>
                                        </div>
                                      )}
                                      <div className="aspect-[2/3] relative">
                                        {book.cover_url ? (
                                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center"
                                               style={{ backgroundColor: 'var(--beige)' }}>
                                            <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                                          </div>
                                        )}
                                      </div>
                                      <div className="p-2">
                                        <p className="font-bold text-sm line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                                          {book.title}
                                        </p>
                                        {ub.rating && (
                                          <p className="text-xs mt-1" style={{ color: 'var(--gold)' }}>
                                            ⭐ {ub.rating}/5
                                          </p>
                                        )}
                                      </div>
                                    </Card>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {years.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                    <p style={{ color: 'var(--warm-pink)' }}>Aucune lecture terminée ou abandonnée pour l'historique.</p>
                  </div>
                )}
              </div>
            )}

            {/* PAL view */}
            {libraryView === "pal" && !selectedPAL && (
              <div className="space-y-6">
                {palYears.map(year => (
                  <div key={year} className="bg-white rounded-2xl shadow-lg overflow-hidden p-6">
                    <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                      PAL {year}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {palsByYear[year].map(pal => {
                        const palBooksToReadCount = userBooks.filter(ub => 
                          pal.book_ids?.includes(ub.book_id) && ub.status === "À lire"
                        ).length;
                        const progress = calculatePALProgress(pal);

                        return (
                          <div
                            key={pal.id}
                            onClick={() => setSelectedPAL(pal)}
                            className="cursor-pointer p-6 rounded-xl shadow-lg transition-all hover:shadow-2xl hover:-translate-y-2"
                            style={{ backgroundColor: 'white', border: '2px solid var(--beige)' }}
                          >
                            <div className="text-center">
                              <span className="text-4xl mb-3 block">{pal.icon}</span>
                              <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                                {pal.name}
                              </h3>
                              {pal.month && (
                                <p className="text-xs mb-2" style={{ color: 'var(--warm-brown)' }}>
                                  {monthNames[pal.month - 1]} {pal.year}
                                </p>
                              )}
                              {progress.total > 0 && (
                                <div className="mt-3 space-y-2">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="text-xs font-medium" style={{ color: 'var(--warm-pink)' }}>
                                      {palBooksToReadCount} à lire
                                    </span>
                                    <span style={{ color: 'var(--warm-pink)' }}>•</span>
                                    <span className="text-xs font-bold" style={{ color: accentColor }}>
                                      {progress.completed}/{progress.total} lus
                                    </span>
                                  </div>
                                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--beige)' }}>
                                    <div 
                                      className="h-full rounded-full transition-all"
                                      style={{ 
                                        width: `${progress.percentage}%`,
                                        backgroundColor: accentColor
                                      }}
                                    />
                                  </div>
                                  {progress.percentage > 0 && (
                                    <p className="text-xs font-bold" style={{ color: accentColor }}>
                                      {progress.percentage}% complété
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {palYears.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                    <p style={{ color: 'var(--warm-pink)' }}>Aucune PAL créée</p>
                  </div>
                )}
              </div>
            )}

            {/* PAL detail view */}
            {libraryView === "pal" && selectedPAL && (
              <div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedPAL(null)}
                  className="mb-4"
                  style={{ color: accentColor }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour aux PAL
                </Button>
                <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--dark-text)' }}>
                  {selectedPAL.icon} {selectedPAL.name}
                </h2>
                {(() => {
                  const progress = calculatePALProgress(selectedPAL);
                  return progress.total > 0 && (
                    <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'white' }}>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-2">
                            <span style={{ color: 'var(--dark-text)' }}>{progress.completed}/{progress.total} lus</span>
                            <span style={{ color: accentColor }}>{progress.percentage}%</span>
                          </div>
                          <div className="w-full h-3 rounded-full" style={{ backgroundColor: 'var(--beige)' }}>
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${progress.percentage}%`,
                                backgroundColor: accentColor
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div className="grid md:grid-cols-4 gap-4">
                  {userBooks.filter(ub => 
                    selectedPAL.book_ids?.includes(ub.book_id) && ub.status === "À lire"
                  ).map(ub => {
                    const book = allBooks.find(b => b.id === ub.book_id);
                    if (!book) return null;
                    return (
                      <Card 
                        key={ub.id} 
                        className="overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => handleBookClick(ub)}
                      >
                        <div className="aspect-[2/3] relative">
                          {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"
                                 style={{ backgroundColor: 'var(--beige)' }}>
                              <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                            <p className="text-white font-bold mb-2 book-title-display line-clamp-2">
                              {book.title}
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Other simple views (read, toread, wishlist, abandoned) */}
            {["read", "toread", "wishlist", "abandoned"].includes(libraryView) && (
              <div className="grid md:grid-cols-4 gap-4">
                {libraryBooks.map(ub => {
                  const book = allBooks.find(b => b.id === ub.book_id);
                  if (!book) return null;
                  return (
                    <Card 
                      key={ub.id} 
                      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => handleBookClick(ub)}
                    >
                      <div className="aspect-[2/3] relative">
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"
                               style={{ backgroundColor: 'var(--beige)' }}>
                            <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                          <p className="text-white font-bold mb-2 book-title-display line-clamp-2">
                            {book.title}
                          </p>
                          {ub.rating && (
                            <p className="text-xs text-white">⭐ {ub.rating}/5</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {libraryBooks.length === 0 && !["shelves", "history", "pal"].includes(libraryView) && (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>Aucun livre dans cette catégorie</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="series">
            <div className="grid md:grid-cols-3 gap-4">
              {userSeries.map(series => {
                const completedBooks = series.books_read?.length || 0;
                const totalBooks = series.total_books || 0;
                const progress = totalBooks > 0 ? (completedBooks / totalBooks) * 100 : 0;

                return (
                  <Card key={series.id} className="p-6 bg-white hover:shadow-lg transition-all">
                    <div className="flex items-start gap-4">
                      {series.cover_url && (
                        <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0" 
                             style={{ backgroundColor: 'var(--beige)' }}>
                          <img src={series.cover_url} alt={series.series_name} 
                               className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--dark-text)' }}>
                          {series.series_name}
                        </h3>
                        <p className="text-sm mb-2" style={{ color: 'var(--warm-pink)' }}>
                          {series.author}
                        </p>
                        <div className="mb-2">
                          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--warm-brown)' }}>
                            <span>{completedBooks} / {totalBooks} livres</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--beige)' }}>
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${progress}%`,
                                backgroundColor: accentColor
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            {userSeries.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>Aucune série</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="quotes">
            <div className="space-y-4">
              {userQuotes.map(quote => {
                const book = allBooks.find(b => b.id === quote.book_id);
                return (
                  <Card key={quote.id} className="p-6 bg-white">
                    <CardContent>
                      <p className="text-lg italic mb-4" style={{ color: 'var(--dark-text)' }}>
                        "{quote.quote_text}"
                      </p>
                      <p className="text-sm font-medium" style={{ color: accentColor }}>
                        — {book?.title || 'Livre inconnu'}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {userQuotes.length === 0 && (
              <div className="text-center py-12">
                <Quote className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>Aucune citation</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bingo">
            <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
              {userBingoChallenges.map((challenge, index) => (
                <div
                  key={challenge.id}
                  className="aspect-square rounded-xl p-2 flex flex-col items-center justify-center text-center transition-all"
                  style={{
                    backgroundColor: challenge.is_completed ? 'var(--gold)' : 'white',
                    border: '2px solid var(--beige)',
                    color: challenge.is_completed ? 'white' : 'var(--dark-text)'
                  }}
                >
                  <p className="text-xs font-bold line-clamp-3">
                    {challenge.title}
                  </p>
                  {challenge.is_completed && (
                    <Sparkles className="w-4 h-4 mt-1" />
                  )}
                </div>
              ))}
            </div>
            {userBingoChallenges.length > 0 && (
              <div className="mt-6 text-center">
                <p className="text-lg font-bold" style={{ color: 'var(--dark-text)' }}>
                  {completedChallenges} / {userBingoChallenges.length} défis complétés
                </p>
              </div>
            )}
            {userBingoChallenges.length === 0 && (
              <div className="text-center py-12">
                <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>Aucun bingo pour cette année</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <p className="text-sm mb-2" style={{ color: 'var(--warm-brown)' }}>Livres lus ({currentYear})</p>
                  <p className="text-3xl font-bold" style={{ color: accentColor }}>
                    {booksThisYear.length}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <p className="text-sm mb-2" style={{ color: 'var(--warm-brown)' }}>Note moyenne</p>
                  <p className="text-3xl font-bold" style={{ color: 'var(--gold)' }}>
                    {avgRating} / 5
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="font-bold mb-4" style={{ color: 'var(--dark-text)' }}>Livres par mois</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsBarChart data={booksPerMonth}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill={accentColor} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="font-bold mb-4" style={{ color: 'var(--dark-text)' }}>Répartition par genre</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={genreStats}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={(entry) => entry.value >= 2 ? `${entry.name} ${(entry.value / booksThisYear.length * 100).toFixed(0)}%` : null}
                      >
                        {genreStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tournament">
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
              <p style={{ color: 'var(--warm-pink)' }}>Tournois à venir...</p>
            </div>
          </TabsContent>

          <TabsContent value="nailinspo">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {userNailInspos.map((inspo) => {
                const book = inspo.book_id ? allBooks.find(b => b.id === inspo.book_id) : null;
                
                return (
                  <div key={inspo.id} className="group relative rounded-xl overflow-hidden shadow-lg 
                                         transition-all hover:shadow-2xl hover:-translate-y-1">
                    <div className="aspect-square relative">
                      <img 
                        src={inspo.image_url} 
                        alt={inspo.title || "Nail inspo"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent 
                                   opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        {inspo.title && (
                          <p className="font-medium text-sm mb-1">{inspo.title}</p>
                        )}
                        {inspo.colors && (
                          <p className="text-xs mb-1">🎨 {inspo.colors}</p>
                        )}
                        {book && (
                          <p className="text-xs">📚 {book.title}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {userNailInspos.length === 0 && (
              <div className="text-center py-12">
                <Palette className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>Aucune inspiration ongles</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="characters">
            <div className="space-y-4">
              {userCharacters.map(char => {
                const book = allBooks.find(b => b.id === char.book_id);
                return (
                  <Card key={char.id} className="p-6 bg-white">
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                             style={{ backgroundColor: accentColor }}>
                          #{char.rank}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold" style={{ color: 'var(--dark-text)' }}>
                            {char.character_name}
                          </h3>
                          <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                            {book?.title || 'Livre inconnu'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {userCharacters.length === 0 && (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>Aucun personnage préféré</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="music">
            <div className="space-y-4">
              {userBooksWithMusic.map(userBook => {
                const book = allBooks.find(b => b.id === userBook.book_id);
                const platform = userBook.music_link?.includes('youtube') || userBook.music_link?.includes('youtu.be') 
                  ? 'youtube' 
                  : userBook.music_link?.includes('spotify') 
                  ? 'spotify' 
                  : userBook.music_link?.includes('deezer')
                  ? 'deezer'
                  : 'other';
                
                const platformInfo = {
                  youtube: { icon: '🎥', color: '#FF0000', name: 'YouTube' },
                  spotify: { icon: '🎵', color: '#1DB954', name: 'Spotify' },
                  deezer: { icon: '🎶', color: '#FF6600', name: 'Deezer' },
                  other: { icon: '🔗', color: accentColor, name: 'Lien' }
                };

                const info = platformInfo[platform];

                return (
                  <Card key={userBook.id} className="p-6 bg-white">
                    <div className="flex gap-4">
                      <div className="w-20 h-28 rounded-lg overflow-hidden flex-shrink-0"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book?.cover_url && (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                              🎵 {userBook.music}
                            </h3>
                            <p className="text-sm mb-1" style={{ color: 'var(--warm-pink)' }}>
                              par {userBook.music_artist}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--dark-text)' }}>
                              📚 {book?.title}
                            </p>
                          </div>
                          <a 
                            href={userBook.music_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline" style={{ borderColor: info.color, color: info.color }}>
                              {info.icon} Ouvrir
                            </Button>
                          </a>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full font-medium inline-block"
                              style={{ backgroundColor: info.color, color: 'white' }}>
                          {info.name}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            {userBooksWithMusic.length === 0 && (
              <div className="text-center py-12">
                <Music className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>Aucune musique associée</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="fanart">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {userFanArts.map((fanart) => {
                const book = fanart.book_id ? allBooks.find(b => b.id === fanart.book_id) : null;
                
                return (
                  <div key={fanart.id} className="group relative rounded-xl overflow-hidden shadow-lg 
                                         transition-all hover:shadow-2xl hover:-translate-y-1">
                    <div className="aspect-square relative">
                      <img 
                        src={fanart.image_url} 
                        alt={fanart.artist_name || "Fan art"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent 
                                   opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        {fanart.folder_path && (
                          <p className="font-medium text-sm mb-1">📁 {fanart.folder_path}</p>
                        )}
                        {fanart.artist_name && (
                          <p className="text-xs mb-1">🎨 {fanart.artist_name}</p>
                        )}
                        {book && (
                          <p className="text-xs">📚 {book.title}</p>
                        )}
                        {fanart.note && (
                          <p className="text-xs mt-1 line-clamp-2">💭 {fanart.note}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {userFanArts.length === 0 && (
              <div className="text-center py-12">
                <Image className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>Aucun fan art</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="map">
            <div className="grid md:grid-cols-3 gap-4">
              {userLocations.map(location => {
                const book = location.book_id ? allBooks.find(b => b.id === location.book_id) : null;
                
                return (
                  <Card key={location.id} className="overflow-hidden hover:shadow-lg transition-all">
                    {location.photo_url && (
                      <img src={location.photo_url} alt={location.location_name} 
                           className="w-full h-48 object-cover" />
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--dark-text)' }}>
                        📍 {location.location_name}
                      </h3>
                      <p className="text-sm mb-2" style={{ color: 'var(--warm-pink)' }}>
                        {location.category}
                      </p>
                      {book && (
                        <p className="text-sm" style={{ color: 'var(--warm-brown)' }}>
                          📚 {book.title}
                        </p>
                      )}
                      {location.date && (
                        <p className="text-xs mt-2" style={{ color: 'var(--warm-brown)' }}>
                          {new Date(location.date).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {userLocations.length === 0 && (
              <div className="text-center py-12">
                <Map className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>Aucun lieu de lecture</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* NEW: Friend Book Dialog */}
      {selectedFriendBook && (
        <FriendBookDialog
          friendUserBook={selectedFriendBook}
          book={allBooks.find(b => b.id === selectedFriendBook.book_id)}
          friendName={friendName}
          friendUser={profileUser}
          open={!!selectedFriendBook}
          onOpenChange={(open) => !open && setSelectedFriendBook(null)}
        />
      )}
    </div>
  );
}