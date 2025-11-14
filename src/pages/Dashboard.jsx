
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, TrendingUp, Users, Star, Plus, Music, Heart, MessageCircle, Quote as QuoteIcon, Map, Trophy, Palette, Library, Target, ArrowRight, Calendar, User, Bell, X, FileText, BookmarkCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ReadingGoalManager from "../components/dashboard/ReadingGoalManager";
import TopFriendsWidget from "../components/dashboard/TopFriendsWidget";

// Helper component for Book Details Dialog
const BookDetailsDialog = ({ userBook, book, open, onOpenChange }) => {
  if (!userBook || !book) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-lg p-6">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4 mb-4">
          <DialogTitle className="text-xl font-bold" style={{ color: '#2D3748' }}>Détails du livre</DialogTitle>
          <button onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-shrink-0 w-24 h-36 rounded-lg overflow-hidden shadow-md">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <BookOpen className="w-8 h-8 text-gray-500" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1" style={{ color: '#2D3748' }}>{book.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{book.author}</p>
            {userBook.status && (
              <p className="text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2"
                 style={{
                   backgroundColor: userBook.status === "En cours" ? '#FFE4EC' :
                                    userBook.status === "Lu" ? '#E6FFFA' :
                                    userBook.status === "À lire" ? '#F0E6FF' : '#FFD9D9',
                   color: userBook.status === "En cours" ? '#FF69B4' :
                          userBook.status === "Lu" ? '#38B2AC' :
                          userBook.status === "À lire" ? '#9B59B6' : '#DC2626'
                 }}>
                {userBook.status}
              </p>
            )}
            {userBook.start_date && (
              <p className="text-sm text-gray-500">Début: {format(new Date(userBook.start_date), 'dd MMMM yyyy', { locale: fr })}</p>
            )}
            {userBook.end_date && (
              <p className="text-sm text-gray-500">Fin: {format(new Date(userBook.end_date), 'dd MMMM yyyy', { locale: fr })}</p>
            )}
            {userBook.current_page && book.page_count && (
              <p className="text-sm text-gray-500">Page actuelle: {userBook.current_page} / {book.page_count}</p>
            )}
            {userBook.rating && (
              <div className="flex items-center gap-1 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4"
                        style={{
                          fill: i < userBook.rating ? '#FFD700' : 'none',
                          stroke: '#FFD700'
                        }} />
                ))}
              </div>
            )}
          </div>
        </div>
        {userBook.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="font-bold text-sm mb-2" style={{ color: '#2D3748' }}>Notes:</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{userBook.notes}</p>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Link to={createPageUrl("MyLibrary")}>
            <Button style={{ background: 'linear-gradient(135deg, #FF69B4, #FFB6C8)' }}>Modifier</Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Individual Stats Card - Restored to match exact design from image
const StatsCard = ({ icon: Icon, value, label, iconBgColor, onClick }) => (
  <div
    onClick={onClick}
    className="stats-card cursor-pointer"
    style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '20px 24px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '8px',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }}
  >
    {/* Icon in colored square */}
    <div
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        backgroundColor: iconBgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon className="w-6 h-6" style={{ color: 'white' }} />
    </div>

    {/* Label */}
    <p className="text-sm" style={{ color: '#6B7280' }}>
      {label}
    </p>

    {/* Value */}
    <div className="text-2xl font-bold" style={{ color: '#111827' }}>
      {value}
    </div>
  </div>
);

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBookForDetails, setSelectedBookForDetails] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['recentComments'],
    queryFn: () => base44.entities.ReadingComment.list('-created_date', 5),
  });

  const { data: readingGoal } = useQuery({
    queryKey: ['readingGoal', selectedYear],
    queryFn: async () => {
      const goals = await base44.entities.ReadingGoal.filter({
        created_by: user?.email,
        year: selectedYear
      });
      return goals[0] || null;
    },
    enabled: !!user,
  });

  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ created_by: user?.email, status: "Acceptée" }),
    enabled: !!user,
  });

  const { data: friendsBooks = [] } = useQuery({
    queryKey: ['friendsBooks'],
    queryFn: async () => {
      const friendsEmails = myFriends.map(f => f.friend_email);
      if (friendsEmails.length === 0) return [];

      const allFriendsBooks = await Promise.all(
        friendsEmails.map(email =>
          base44.entities.UserBook.filter({ created_by: email })
        )
      );

      return allFriendsBooks.flat();
    },
    enabled: myFriends.length > 0,
  });

  const { data: allSharedReadings = [] } = useQuery({
    queryKey: ['sharedReadings'],
    queryFn: () => base44.entities.SharedReading.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allQuotes = [] } = useQuery({
    queryKey: ['allQuotes'],
    queryFn: () => base44.entities.Quote.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const currentlyReading = myBooks.filter(b => b.status === "En cours");
  const toReadCount = myBooks.filter(b => b.status === "À lire").length;

  // Calculate average reading duration for any user
  const calculateAvgReadingDays = (userEmail) => {
    const userBooks = friendsBooks.filter(fb => fb.created_by === userEmail);
    const completedBooks = userBooks.filter(b =>
      b.status === "Lu" && b.start_date && b.end_date
    );

    if (completedBooks.length === 0) return 14; // Default 14 days if no data

    const totalDays = completedBooks.reduce((sum, book) => {
      const start = new Date(book.start_date);
      const end = new Date(book.end_date);
      const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      return sum + Math.max(days, 1); // At least 1 day
    }, 0);

    return Math.round(totalDays / completedBooks.length);
  };

  // Calculate average reading duration for current user
  const avgReadingDays = React.useMemo(() => {
    const completedBooks = myBooks.filter(b =>
      b.status === "Lu" && b.start_date && b.end_date
    );

    if (completedBooks.length === 0) return 14; // Default 14 days if no data

    const totalDays = completedBooks.reduce((sum, book) => {
      const start = new Date(book.start_date);
      const end = new Date(book.end_date);
      const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      return sum + Math.max(days, 1); // At least 1 day
    }, 0);

    return Math.round(totalDays / completedBooks.length);
  }, [myBooks]);

  // Calculate time-based progress for a book
  const getTimeBasedProgress = (userBook, userAvgDays = avgReadingDays) => {
    if (!userBook.start_date) return 0;

    const book = allBooks.find(b => b.id === userBook.book_id);
    const start = new Date(userBook.start_date);
    const now = new Date();
    const daysReading = Math.floor((now - start) / (1000 * 60 * 60 * 24));

    // If current_page is set and book has page_count, use hybrid approach
    if (userBook.current_page && book?.page_count) {
      const manualProgress = (userBook.current_page / book.page_count) * 100;

      // Calculate when the page was last updated
      const lastUpdate = new Date(userBook.updated_date || userBook.start_date);
      const daysSinceUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));

      // Calculate remaining pages and estimated days to finish
      const pagesRemaining = book.page_count - userBook.current_page;
      const pagesPerDay = book.page_count / userAvgDays; // Average pages per day
      // Avoid division by zero if pagesPerDay is 0 or very small, or if userAvgDays is 0
      const estimatedDaysRemaining = (pagesPerDay > 0) ? (pagesRemaining / pagesPerDay) : Infinity;

      // Add time-based progression since last update
      const additionalProgress = (daysSinceUpdate > 0 && estimatedDaysRemaining > 0 && estimatedDaysRemaining !== Infinity)
        ? (daysSinceUpdate / estimatedDaysRemaining) * (100 - manualProgress)
        : 0;

      const totalProgress = manualProgress + additionalProgress;
      return Math.min(Math.round(totalProgress), 95); // Max 95% until finished
    }

    // Otherwise, use pure time-based estimation
    const progress = Math.min((daysReading / userAvgDays) * 100, 95);
    return Math.round(progress);
  };

  const abandonedBookCounts = (userBook) => {
    if (userBook.status !== "Abandonné") return false;
    if (userBook.abandon_percentage && userBook.abandon_percentage >= 50) return true;
    if (userBook.abandon_page) {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (book && book.page_count && userBook.abandon_page >= book.page_count / 2) {
        return true;
      }
    }
    return false;
  };

  const getEffectiveDate = (userBook) => {
    if (userBook.status === "Lu" && userBook.end_date) {
      return userBook.end_date;
    }
    if (userBook.status === "Abandonné" && abandonedBookCounts(userBook)) {
      return userBook.end_date || userBook.updated_date;
    }
    return null;
  };

  const booksReadThisYear = myBooks.filter(b => {
    const effectiveDate = getEffectiveDate(b);
    if (!effectiveDate) return false;
    const year = new Date(effectiveDate).getFullYear();
    return year === selectedYear;
  }).length;

  const totalPagesThisYear = myBooks
    .filter(b => {
      const effectiveDate = getEffectiveDate(b);
      if (!effectiveDate) return false;
      const year = new Date(effectiveDate).getFullYear();
      return year === selectedYear;
    })
    .reduce((sum, userBook) => {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (!book) return sum;
      if (userBook.status === "Lu") {
        return sum + (book.page_count || 0);
      }
      return sum;
    }, 0);

  // Count ALL shared readings (not just active ones)
  const sharedReadingsCount = allSharedReadings.length;

  const displayName = user?.display_name || user?.full_name?.split(' ')[0] || 'Lectrice';

  const recentActivity = React.useMemo(() => {
    const myActivity = myBooks
      .filter(b => b.status === "Lu" && b.end_date)
      .map(b => ({
        userBook: b,
        userName: displayName,
        userEmail: user?.email,
        isFriend: false
      }));

    const friendsActivity = friendsBooks
      .filter(b => b.status === "Lu" && b.end_date)
      .map(b => {
        const friend = myFriends.find(f => f.friend_email === b.created_by);
        return {
          userBook: b,
          userName: friend?.friend_name?.split(' ')[0] || friend?.friend_email,
          userEmail: b.created_by,
          isFriend: true
        };
      });

    return [...myActivity, ...friendsActivity]
      .sort((a, b) => new Date(b.userBook.end_date) - new Date(a.userBook.end_date))
      .slice(0, 8);
  }, [myBooks, friendsBooks, myFriends, displayName, user]);

  const randomQuote = allQuotes.length > 0 ? allQuotes[Math.floor(Math.random() * allQuotes.length)] : null;
  const quoteBook = randomQuote ? allBooks.find(b => b.id === randomQuote.book_id) : null;

  // Collect all music with book info and select random ones
  const randomMusicSelection = React.useMemo(() => {
    const allMusicWithBooks = [];

    myBooks.forEach(userBook => {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (!book) return;

      // New format: music_playlist
      if (userBook.music_playlist && userBook.music_playlist.length > 0) {
        userBook.music_playlist.forEach(music => {
          allMusicWithBooks.push({
            ...music,
            book,
            userBook
          });
        });
      }

      // Old format: music + music_link
      if (userBook.music && userBook.music_link) {
        allMusicWithBooks.push({
          title: userBook.music,
          artist: userBook.music_artist || "",
          link: userBook.music_link,
          book,
          userBook
        });
      }
    });

    // Shuffle and take 3 random music
    const shuffled = allMusicWithBooks.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }, [myBooks, allBooks]);

  // Count total music entries
  const totalMusicCount = myBooks.reduce((count, book) => {
    if (book.music_playlist && book.music_playlist.length > 0) {
      return count + book.music_playlist.length;
    }
    if (book.music && book.music_link) {
      return count + 1;
    }
    return count;
  }, 0);

  const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);

  // Quick access items
  const quickAccessItems = [
    { name: "Bibliothèque", icon: Library, color: '#FFE4EC', iconColor: '#FF69B4', url: "MyLibrary" },
    { name: "Lectures communes", icon: Users, color: '#F0E6FF', iconColor: '#9B59B6', url: "SharedReadings" },
    { name: "Mes Amies", icon: Heart, color: '#FFE8D9', iconColor: '#FF9F7F', url: "Friends" },
    { name: "Tournoi", icon: Trophy, color: '#FFF9E6', iconColor: '#FFD700', url: "BookTournament" },
    { name: "Maps", icon: Map, color: '#E8F4F8', iconColor: '#4299E1', url: "Maps" },
    { name: "Citations", icon: QuoteIcon, color: '#E6FFFA', iconColor: '#38B2AC', url: "Quotes" }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');

        body {
          font-family: 'Poppins', sans-serif;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .hover-lift:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 24px rgba(255, 105, 180, 0.15);
        }

        .stats-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
        }

        .quick-action:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        /* Hide scrollbar but keep functionality */
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }

        /* Smooth scroll snap */
        .scroll-snap-x {
          scroll-snap-type: x mandatory;
          scroll-behavior: smooth;
        }
        
        .scroll-snap-start {
          scroll-snap-align: start;
        }
      `}</style>

      {/* Header */}
      <div className="px-4 md:px-12 py-4 md:py-6 sticky top-0 z-10" style={{ backgroundColor: '#FFF7FA' }}>
        <div className="max-w-[1600px] mx-auto">
          {/* Mobile Header */}
          <div className="flex flex-col gap-3 md:hidden">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#2D3748' }}>
                Bonjour {displayName} 🌷
              </h1>
              <p className="text-sm" style={{ color: '#A0AEC0' }}>
                Bienvenue dans ton univers littéraire
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="flex-1 px-3 py-2 rounded-xl border-0 font-medium shadow-md text-sm"
                style={{ backgroundColor: 'white', color: '#2D3748' }}
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <Link to={createPageUrl("MyLibrary")}>
                <Button
                  size="sm"
                  className="shadow-md text-white font-medium rounded-xl whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg, #FF69B4, #FFB6C8)' }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: '#2D3748' }}>
                  Bonjour {displayName} 🌷
                </h1>
                <p className="text-lg" style={{ color: '#A0AEC0' }}>
                  Bienvenue dans ton univers littéraire
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 rounded-xl border-0 font-medium shadow-md"
                  style={{ backgroundColor: 'white', color: '#2D3748' }}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                <Link to={createPageUrl("MyLibrary")}>
                  <Button
                    className="shadow-md text-white font-medium px-6 rounded-xl hover-lift"
                    style={{ background: 'linear-gradient(135deg, #FF69B4, #FFB6C8)' }}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Ajouter un livre
                  </Button>
                </Link>

                <Link to={createPageUrl("Statistics")}>
                  <Button
                    variant="outline"
                    className="shadow-md font-medium px-6 rounded-xl hover-lift"
                    style={{ borderColor: '#E6B3E8', color: '#9B59B6' }}
                  >
                    📈 Voir mes stats
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Cards - 4 separate white cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard
              icon={BookOpen}
              value={booksReadThisYear}
              label="Livres lus"
              iconBgColor="#FFB6D9"
              onClick={() => navigate(createPageUrl("MyLibrary"))}
            />
            <StatsCard
              icon={TrendingUp}
              value={totalPagesThisYear.toLocaleString()}
              label="Pages lues"
              iconBgColor="#E6B3FF"
              onClick={() => navigate(createPageUrl("Statistics"))}
            />
            <StatsCard
              icon={Users}
              value={sharedReadingsCount}
              label="Lectures communes"
              iconBgColor="#86EFAC"
              onClick={() => navigate(createPageUrl("SharedReadings"))}
            />
            <StatsCard
              icon={Star}
              value={toReadCount}
              label="À lire"
              iconBgColor="#FFE699"
              onClick={() => navigate(createPageUrl("MyLibrary"))}
            />
          </div>

          {/* Reading Goal */}
          <div className="mb-8">
            <ReadingGoalManager year={selectedYear} compact={false} />
          </div>

        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 md:px-12 py-4 md:py-8">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column (2/3 on desktop, full width on mobile) */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">

                  {/* Lectures en cours */}
                  <Card className="shadow-lg border-0 rounded-2xl md:rounded-3xl overflow-hidden">
                    <CardContent className="p-4 md:p-6">
                      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2" style={{ color: '#2D3748' }}>
                        📖 Lectures en cours
                      </h2>
                      <div className="space-y-3 md:space-y-4">
                        {currentlyReading.length > 0 || friendsBooks.filter(b => b.status === "En cours").length > 0 ? (
                          <>
                            {currentlyReading.slice(0, 3).map((userBook) => {
                              const book = allBooks.find(b => b.id === userBook.book_id);
                              if (!book) return null;
                              const daysReading = userBook.start_date
                                ? Math.floor((new Date() - new Date(userBook.start_date)) / (1000 * 60 * 60 * 24))
                                : 0;
                              const progress = getTimeBasedProgress(userBook);
                              
                              return (
                                <div key={userBook.id}
                                     className="flex gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl hover-lift cursor-pointer"
                                     style={{ backgroundColor: '#FFF7FA' }}
                                     onClick={() => setSelectedBookForDetails(userBook)}>
                                  <div className="relative flex-shrink-0">
                                    <div className="w-16 h-24 md:w-24 md:h-36 rounded-lg md:rounded-xl overflow-hidden shadow-lg"
                                         style={{ backgroundColor: '#FFE4EC' }}>
                                      {book.cover_url && (
                                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                      )}
                                    </div>
                                    <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs font-bold text-white shadow-lg"
                                          style={{ backgroundColor: '#FF69B4' }}>
                                      En cours
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm md:text-lg mb-1 line-clamp-2" style={{ color: '#2D3748' }}>
                                      {book.title}
                                    </h3>
                                    <p className="text-xs md:text-sm mb-2" style={{ color: '#A0AEC0' }}>
                                      {book.author}
                                    </p>
                                    {userBook.start_date && (
                                      <p className="text-xs mb-2 md:mb-3" style={{ color: '#9B59B6' }}>
                                        {format(new Date(userBook.start_date), 'dd/MM/yyyy', { locale: fr })} • Jour {daysReading}
                                      </p>
                                    )}
                                    <div className="relative">
                                      <div className="w-full h-1.5 md:h-2 rounded-full" style={{ backgroundColor: '#FFE4EC' }}>
                                        <div className="h-full rounded-full transition-all duration-500"
                                             style={{
                                               width: `${progress}%`,
                                               background: 'linear-gradient(90deg, #FF69B4, #FFB6C8)'
                                             }} />
                                      </div>
                                      <p className="text-xs mt-1" style={{ color: '#FF69B4' }}>
                                        {userBook.current_page && book.page_count
                                          ? `📖 Page ${userBook.current_page}/${book.page_count} • ${progress}%`
                                          : `⏱️ ~${progress}% (estimation temporelle)`
                                        }
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {friendsBooks.filter(b => b.status === "En cours").slice(0, 2).map((userBook) => {
                              const book = allBooks.find(b => b.id === userBook.book_id);
                              const friend = myFriends.find(f => f.friend_email === userBook.created_by);
                              if (!book || !friend) return null;
                              
                              // Calculate friend's average reading days and progress
                              const friendAvgDays = calculateAvgReadingDays(userBook.created_by);
                              const daysReading = userBook.start_date
                                ? Math.floor((new Date() - new Date(userBook.start_date)) / (1000 * 60 * 60 * 24))
                                : 0;
                              const progress = getTimeBasedProgress(userBook, friendAvgDays);
                              
                              return (
                                <div key={userBook.id}
                                     className="flex gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl hover-lift"
                                     style={{ backgroundColor: '#F0E6FF' }}>
                                  <div className="relative flex-shrink-0">
                                    <div className="w-16 h-24 md:w-24 md:h-36 rounded-lg md:rounded-xl overflow-hidden shadow-lg"
                                         style={{ backgroundColor: '#E6B3E8' }}>
                                      {book.cover_url && (
                                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                      )}
                                    </div>
                                    <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs font-bold text-white shadow-lg"
                                          style={{ backgroundColor: '#9B59B6' }}>
                                      {friend.friend_name?.split(' ')[0]}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm md:text-lg mb-1 line-clamp-2" style={{ color: '#2D3748' }}>
                                      {book.title}
                                    </h3>
                                    <p className="text-xs md:text-sm mb-2" style={{ color: '#A0AEC0' }}>
                                      {book.author}
                                    </p>
                                    {userBook.start_date && (
                                      <>
                                        <p className="text-xs mb-2 md:mb-3" style={{ color: '#9B59B6' }}>
                                          {format(new Date(userBook.start_date), 'dd/MM/yyyy', { locale: fr })} • Jour {daysReading}
                                        </p>
                                        <div className="relative">
                                          <div className="w-full h-1.5 md:h-2 rounded-full" style={{ backgroundColor: '#E6B3E8' }}>
                                            <div className="h-full rounded-full transition-all duration-500"
                                                 style={{
                                                   width: `${progress}%`,
                                                   background: 'linear-gradient(90deg, #9B59B6, #B794F6)'
                                                 }} />
                                          </div>
                                          <p className="text-xs mt-1" style={{ color: '#9B59B6' }}>
                                            {userBook.current_page && book.page_count
                                              ? `📖 Page ${userBook.current_page}/${book.page_count} • ${progress}%`
                                              : `⏱️ ~${progress}% (estimation temporelle)`
                                            }
                                          </p>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        ) : (
                          <div className="text-center py-8 md:py-12">
                            <BookOpen className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 opacity-20" style={{ color: '#FF69B4' }} />
                            <p className="text-sm md:text-base" style={{ color: '#A0AEC0' }}>Aucune lecture en cours</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

            {/* Activité récente */}
            <Card className="shadow-lg border-0 rounded-2xl md:rounded-3xl overflow-hidden">
              <CardContent className="p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2" style={{ color: '#2D3748' }}>
                  🕓 Activité récente
                </h2>
                <div className="space-y-3 md:space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity) => {
                      const book = allBooks.find(b => b.id === activity.userBook.book_id);
                      if (!book) return null;

                      return (
                        <div key={`${activity.userEmail}-${activity.userBook.id}`}
                             className="flex items-start gap-3 pb-3 border-b last:border-0"
                             style={{ borderColor: '#F7FAFC' }}>
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                               style={{ backgroundColor: activity.isFriend ? '#F0E6FF' : '#FFE4EC' }}>
                            <BookOpen className="w-4 h-4 md:w-5 md:h-5"
                                     style={{ color: activity.isFriend ? '#9B59B6' : '#FF69B4' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium mb-1 text-sm md:text-base" style={{ color: '#2D3748' }}>
                              <span className="font-bold"
                                    style={{ color: activity.isFriend ? '#9B59B6' : '#FF69B4' }}>
                                {activity.userName}
                              </span> a terminé {book.title}
                            </p>
                            {activity.userBook.rating && (
                              <div className="flex items-center gap-1 mb-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className="w-3 h-3 md:w-4 md:h-4"
                                        style={{
                                          fill: i < activity.userBook.rating ? '#FFD700' : 'none',
                                          stroke: '#FFD700'
                                        }} />
                                ))}
                              </div>
                            )}
                            <p className="text-xs" style={{ color: '#A0AEC0' }}>
                              {format(new Date(activity.userBook.end_date), 'dd MMM yyyy', { locale: fr })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 md:py-8">
                      <p className="text-sm md:text-base" style={{ color: '#A0AEC0' }}>Aucune activité récente</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (1/3 on desktop, full width on mobile) */}
          <div className="space-y-4 md:space-y-6">
            {/* NEW: Top Friends Widget - compact version above quick access */}
            <div className="hidden md:block">
              <TopFriendsWidget user={user} compact={true} />
            </div>

            {/* Mobile - Playlist + Quick Access combined */}
            <div className="md:hidden">
              <h2 className="text-lg font-bold mb-3 px-1" style={{ color: '#2D3748' }}>
                ⚡ Accès rapide
              </h2>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar scroll-snap-x pb-2">
                {randomMusicSelection.length > 0 && randomMusicSelection.slice(0, 2).map((musicItem, idx) => (
                  <Link key={idx} to={createPageUrl("MusicPlaylist")} className="flex-shrink-0 w-[160px] scroll-snap-start">
                    <div className="relative rounded-2xl overflow-hidden h-full"
                         style={{ background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)' }}>
                      {musicItem.book.cover_url && (
                        <div className="absolute inset-0 opacity-20">
                          <img src={musicItem.book.cover_url} alt=""
                               className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="relative p-4">
                        <div className="text-xl mb-2">🎵</div>
                        <p className="font-bold text-sm text-white mb-1 line-clamp-2">
                          {musicItem.title}
                        </p>
                        <p className="text-xs text-white text-opacity-90 mb-2 line-clamp-1">
                          {musicItem.artist}
                        </p>
                        <p className="text-xs text-white text-opacity-80 line-clamp-1">
                          📖 {musicItem.book.title}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}

                {quickAccessItems.map((item) => (
                  <Link key={item.name} to={createPageUrl(item.url)} className="flex-shrink-0 w-[120px] scroll-snap-start">
                    <button
                      className="w-full p-4 rounded-2xl text-center transition-all quick-action h-full"
                      style={{ backgroundColor: item.color }}>
                      <item.icon className="w-6 h-6 mx-auto mb-2" style={{ color: item.iconColor }} />
                      <p className="text-xs font-medium leading-tight" style={{ color: '#2D3748' }}>{item.name}</p>
                    </button>
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop - Playlist littéraire with random music */}
            {randomMusicSelection.length > 0 && (
              <Card className="hidden md:block shadow-lg border-0 rounded-3xl overflow-hidden">
                <Link to={createPageUrl("MusicPlaylist")}>
                  <CardContent className="p-6 cursor-pointer hover:opacity-90 transition-opacity"
                               style={{ background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)' }}>
                    <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                      🎵 Ma Playlist Littéraire
                    </h2>
                    <div className="space-y-3">
                      {randomMusicSelection.map((musicItem, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-3">
                          {/* Book cover */}
                          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-lg"
                               style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
                            {musicItem.book.cover_url ? (
                              <img src={musicItem.book.cover_url} alt={musicItem.book.title}
                                   className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Music className="w-6 h-6 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Music info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-white line-clamp-1">
                              {musicItem.title}
                            </p>
                            <p className="text-xs text-white text-opacity-90 line-clamp-1">
                              {musicItem.artist}
                            </p>
                            <p className="text-xs text-white text-opacity-70 line-clamp-1">
                              📖 {musicItem.book.title}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full mt-4 bg-white text-purple-600 hover:bg-opacity-90">
                      🎵 Voir mes {totalMusicCount} musiques
                    </Button>
                  </CardContent>
                </Link>
              </Card>
            )}

            {/* Desktop - Accès rapide */}
            <Card className="hidden md:block shadow-lg border-0 rounded-3xl overflow-hidden">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#2D3748' }}>
                  ⚡ Accès rapide
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {quickAccessItems.map((item) => (
                    <Link key={item.name} to={createPageUrl(item.url)}>
                      <button className="w-full p-4 rounded-2xl text-center transition-all quick-action"
                              style={{ backgroundColor: item.color }}>
                        <item.icon className="w-6 h-6 mx-auto mb-2" style={{ color: item.iconColor }} />
                        <p className="text-sm font-medium" style={{ color: '#2D3748' }}>{item.name}</p>
                      </button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Citation & humeur du jour */}
            <Card className="shadow-lg border-0 rounded-2xl md:rounded-3xl overflow-hidden">
              <CardContent className="p-6 md:p-6 text-center" style={{ background: 'linear-gradient(135deg, #E0E7FF, #FCE7F3)' }}>
                <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4" style={{ color: '#2D3748' }}>
                  💭 Citation du jour
                </h2>
                {randomQuote && quoteBook ? (
                  <>
                    <p className="text-base md:text-lg italic mb-3 md:mb-4 leading-relaxed" style={{ color: '#2D3748' }}>
                      "{randomQuote.quote_text}"
                    </p>
                    <p className="text-sm font-medium" style={{ color: '#9B59B6' }}>
                      — {quoteBook.title}
                    </p>
                  </>
                ) : (
                  <p className="text-base md:text-lg italic" style={{ color: '#A0AEC0' }}>
                    "Lire, c'est vivre mille vies avant de mourir."
                  </p>
                )}
                <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                  <p className="text-sm font-medium" style={{ color: '#2D3748' }}>
                    🌤️ Humeur du jour : Paisible et inspirée ✨
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Book Details Dialog */}
      {selectedBookForDetails && (
        <BookDetailsDialog
          userBook={selectedBookForDetails}
          book={allBooks.find(b => b.id === selectedBookForDetails.book_id)}
          open={!!selectedBookForDetails}
          onOpenChange={(open) => !open && setSelectedBookForDetails(null)}
        />
      )}
    </div>
  );
}
