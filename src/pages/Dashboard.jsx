import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { BookOpen, TrendingUp, Users, Star, Plus, Music, Heart, MessageCircle, Quote, Trophy, Library, ArrowRight, Sparkles, Flame, Zap, Clock, Target, Edit2, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReadingGoalManager from "../components/dashboard/ReadingGoalManager";
import BookDetailsDialog from "../components/library/BookDetailsDialog";
import TopFriendsWidget from "../components/dashboard/TopFriendsWidget";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBookForDetails, setSelectedBookForDetails] = useState(null);
  const [editingBookId, setEditingBookId] = useState(null);
  const [editValues, setEditValues] = useState({ currentPage: '', totalPages: '' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
        friendsEmails.map(email => base44.entities.UserBook.filter({ created_by: email }))
      );
      return allFriendsBooks.flat();
    },
    enabled: myFriends.length > 0,
  });

  const { data: allQuotes = [] } = useQuery({
    queryKey: ['allQuotes'],
    queryFn: () => base44.entities.Quote.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const currentlyReading = myBooks.filter(b => b.status === "En cours");
  const toReadCount = myBooks.filter(b => b.status === "À lire").length;

  const { data: allProgressHistory = [] } = useQuery({
    queryKey: ['readingProgress', user?.email],
    queryFn: () => base44.entities.ReadingProgress.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  // Calculate estimated progress based on reading speed
  const getEstimatedProgress = (userBook, book) => {
    if (!userBook.current_page || !book.page_count) return null;

    // Get progress history for this book
    const bookProgress = allProgressHistory
      .filter(p => p.user_book_id === userBook.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (bookProgress.length < 2) return null;

    // Calculate average reading speed (pages per hour)
    const firstProgress = bookProgress[0];
    const lastProgress = bookProgress[bookProgress.length - 1];
    
    const pagesRead = lastProgress.page_number - firstProgress.page_number;
    const hoursPassed = (new Date(lastProgress.timestamp) - new Date(firstProgress.timestamp)) / (1000 * 60 * 60);

    if (hoursPassed <= 0 || pagesRead <= 0) return null;

    const pagesPerHour = pagesRead / hoursPassed;
    
    // Estimate current page based on time since last update
    const lastUpdateTime = new Date(lastProgress.timestamp).getTime();
    const hoursSinceLastUpdate = (Date.now() - lastUpdateTime) / (1000 * 60 * 60);
    
    // Only show estimation if at least 1 hour has passed
    if (hoursSinceLastUpdate < 1) return null;
    
    const estimatedPage = Math.round(lastProgress.page_number + (pagesPerHour * hoursSinceLastUpdate));
    const estimatedPageCapped = Math.min(estimatedPage, book.page_count);

    return {
      estimatedPage: estimatedPageCapped,
      pagesPerHour: pagesPerHour
    };
  };

  const handleStartEdit = (userBook, book) => {
    setEditingBookId(userBook.id);
    setEditValues({
      currentPage: userBook.current_page?.toString() || '',
      totalPages: book.page_count?.toString() || ''
    });
  };

  const handleSaveProgress = async (userBook, book) => {
    const currentPage = parseInt(editValues.currentPage);
    const totalPages = parseInt(editValues.totalPages);

    if (isNaN(currentPage) || currentPage < 0) {
      toast.error("Page invalide");
      return;
    }

    if (!isNaN(totalPages) && currentPage > totalPages) {
      toast.error("La page ne peut pas dépasser le total");
      return;
    }

    try {
      // Update UserBook
      await base44.entities.UserBook.update(userBook.id, {
        current_page: currentPage
      });

      // Update Book total pages if changed
      if (!isNaN(totalPages) && totalPages !== book.page_count) {
        await base44.entities.Book.update(book.id, {
          page_count: totalPages
        });
      }

      // Save progress history
      await base44.entities.ReadingProgress.create({
        user_book_id: userBook.id,
        page_number: currentPage,
        timestamp: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['readingProgress'] });
      
      toast.success("✅ Progression enregistrée !");
      setEditingBookId(null);
    } catch (error) {
      console.error("Error saving progress:", error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleCancelEdit = () => {
    setEditingBookId(null);
    setEditValues({ currentPage: '', totalPages: '' });
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
    if (userBook.status === "Lu" && userBook.end_date) return userBook.end_date;
    if (userBook.status === "Abandonné" && abandonedBookCounts(userBook)) {
      return userBook.end_date || userBook.updated_date;
    }
    return null;
  };

  const booksReadThisYear = myBooks.filter(b => {
    const effectiveDate = getEffectiveDate(b);
    if (!effectiveDate) return false;
    return new Date(effectiveDate).getFullYear() === selectedYear;
  }).length;

  const totalPagesThisYear = myBooks
    .filter(b => {
      const effectiveDate = getEffectiveDate(b);
      if (!effectiveDate) return false;
      return new Date(effectiveDate).getFullYear() === selectedYear;
    })
    .reduce((sum, userBook) => {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (!book || userBook.status !== "Lu") return sum;
      return sum + (book.page_count || 0);
    }, 0);

  const displayName = user?.display_name || user?.full_name?.split(' ')[0] || 'Lectrice';
  const randomQuote = allQuotes.length > 0 ? allQuotes[Math.floor(Math.random() * allQuotes.length)] : null;
  const quoteBook = randomQuote ? allBooks.find(b => b.id === randomQuote.book_id) : null;

  // Collect music
  const allMusicWithBooks = React.useMemo(() => {
    const musicList = [];
    myBooks.forEach(userBook => {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (!book) return;
      if (userBook.music_playlist && userBook.music_playlist.length > 0) {
        userBook.music_playlist.forEach(music => {
          musicList.push({ ...music, book, userBook });
        });
      }
    });
    return musicList.sort(() => 0.5 - Math.random()).slice(0, 3);
  }, [myBooks, allBooks]);

  const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #FFF5F8 0%, #FFE9F0 50%, #FFDCE5 100%)' }}>
      <style>{`
        .dash-card {
          transition: all 250ms ease;
        }
        .dash-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(255, 105, 180, 0.15);
        }
        .stat-bubble {
          transition: all 250ms ease;
        }
        .stat-bubble:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(255, 105, 180, 0.2);
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="relative p-6 md:p-10">
          <div className="max-w-7xl mx-auto">
            {/* Titre principal */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-5xl font-bold mb-2" 
                  style={{ color: '#FF1493' }}>
                Bonjour {displayName} ✨
              </h1>
              <p className="text-base md:text-xl" style={{ color: '#2c2c2cff' }}>
                Ton univers littéraire t'attend
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
              <div className="stat-bubble p-5 md:p-6 rounded-3xl cursor-pointer"
                   onClick={() => navigate(createPageUrl("MyLibrary"))}
                   style={{ 
                     background: 'linear-gradient(135deg, #FFE9F0 0%, #FFD6E4 100%)',
                     border: '1px solid rgba(255, 105, 180, 0.15)'
                   }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                       style={{ backgroundColor: '#FF69B4' }}>
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <Sparkles className="w-4 h-4" style={{ color: '#FFD700' }} />
                </div>
                <p className="text-3xl md:text-4xl font-bold mb-1" style={{ color: '#FF1493' }}>
                  {booksReadThisYear}
                </p>
                <p className="text-sm font-medium" style={{ color: '#2c2c2cff' }}>
                  Livres lus en {selectedYear}
                </p>
              </div>

              <div className="stat-bubble p-5 md:p-6 rounded-3xl cursor-pointer"
                   onClick={() => navigate(createPageUrl("Statistics"))}
                   style={{ 
                     background: 'linear-gradient(135deg, #FFE9F0 0%, #FFD6E4 100%)',
                     border: '1px solid rgba(255, 105, 180, 0.15)'
                   }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                       style={{ backgroundColor: '#FF1493' }}>
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <Sparkles className="w-4 h-4" style={{ color: '#FFD700' }} />
                </div>
                <p className="text-3xl md:text-4xl font-bold mb-1" style={{ color: '#FF1493' }}>
                  {totalPagesThisYear.toLocaleString()}
                </p>
                <p className="text-sm font-medium" style={{ color: '#2c2c2cff' }}>
                  Pages dévorées
                </p>
              </div>

              <div className="stat-bubble p-5 md:p-6 rounded-3xl cursor-pointer"
                   onClick={() => navigate(createPageUrl("SharedReadings"))}
                   style={{ 
                     background: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)',
                     border: '1px solid rgba(156, 39, 176, 0.15)'
                   }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                       style={{ backgroundColor: '#9C27B0' }}>
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <Sparkles className="w-4 h-4" style={{ color: '#FFD700' }} />
                </div>
                <p className="text-3xl md:text-4xl font-bold mb-1" style={{ color: '#9C27B0' }}>
                  {myFriends.length}
                </p>
                <p className="text-sm font-medium" style={{ color: '#2c2c2cff' }}>
                  Lectures communes
                </p>
              </div>

              <div className="stat-bubble p-5 md:p-6 rounded-3xl cursor-pointer"
                   onClick={() => navigate(createPageUrl("MyLibrary"))}
                   style={{ 
                     background: 'linear-gradient(135deg, #FFE9F0 0%, #FFD6E4 100%)',
                     border: '1px solid rgba(255, 105, 180, 0.15)'
                   }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                       style={{ backgroundColor: '#FFB6C8' }}>
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <Sparkles className="w-4 h-4" style={{ color: '#FFD700' }} />
                </div>
                <p className="text-3xl md:text-4xl font-bold mb-1" style={{ color: '#FF69B4' }}>
                  {toReadCount}
                </p>
                <p className="text-sm font-medium" style={{ color: '#2c2c2cff' }}>
                  Livres dans ta PAL
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-5 py-3 rounded-2xl font-semibold text-base dash-card"
                style={{ 
                  backgroundColor: 'white',
                  color: '#FF1493',
                  border: '1px solid rgba(255, 105, 180, 0.2)'
                }}
              >
                {years.map(year => (
                  <option key={year} value={year}>📅 {year}</option>
                ))}
              </select>

              <Link to={createPageUrl("MyLibrary")} className="flex-1 md:flex-none">
                <Button
                  className="w-full md:w-auto font-bold px-6 py-3 rounded-2xl text-base dash-card"
                  style={{ 
                    background: '#FF1493',
                    color: 'white'
                  }}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Ajouter un livre
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Colonne gauche */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Objectif de lecture */}
            <ReadingGoalManager year={selectedYear} compact={false} />

            {/* Lectures en cours */}
            <Card className="border-0 rounded-3xl overflow-hidden dash-card"
                  style={{ 
                    backgroundColor: 'white',
                    boxShadow: '0 4px 16px rgba(255, 105, 180, 0.08)'
                  }}>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3" style={{ color: '#2D3748' }}>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                         style={{ backgroundColor: '#FFE9F0' }}>
                      <BookOpen className="w-5 h-5" style={{ color: '#FF1493' }} />
                    </div>
                    En cours de lecture
                  </h2>
                  {currentlyReading.length > 0 && (
                    <span className="px-3 py-1 rounded-full text-sm font-bold"
                          style={{ 
                            backgroundColor: '#FFE9F0',
                            color: '#FF1493'
                          }}>
                      {currentlyReading.length}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {currentlyReading.length > 0 ? (
                    currentlyReading.slice(0, 3).map((userBook) => {
                      const book = allBooks.find(b => b.id === userBook.book_id);
                      if (!book) return null;

                      const isEditing = editingBookId === userBook.id;
                      const estimation = getEstimatedProgress(userBook, book);

                      const displayPage = isEditing 
                        ? parseInt(editValues.currentPage) || 0
                        : userBook.current_page || 0;
                      const displayTotal = isEditing
                        ? parseInt(editValues.totalPages) || book.page_count || 0
                        : book.page_count || 0;

                      const progress = displayTotal > 0
                        ? Math.round((displayPage / displayTotal) * 100)
                        : 0;

                      return (
                        <div key={userBook.id}
                             className="dash-card p-4 md:p-5 rounded-2xl"
                             style={{ backgroundColor: '#FFF5F8' }}>
                          <div className="flex gap-4">
                            <div className="relative flex-shrink-0">
                              <div className="w-20 h-28 md:w-24 md:h-36 rounded-xl overflow-hidden"
                                   style={{ 
                                     backgroundColor: '#FFE9F0',
                                     boxShadow: '0 2px 8px rgba(255, 105, 180, 0.15)'
                                   }}>
                                {book.cover_url && (
                                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base md:text-lg mb-1 line-clamp-2" style={{ color: '#2D3748' }}>
                                {book.title}
                              </h3>
                              <p className="text-sm mb-3" style={{ color: '#9CA3AF' }}>
                                {book.author}
                              </p>

                              {isEditing ? (
                                <div className="space-y-2 mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#9CA3AF' }}>Page actuelle</span>
                                    <input
                                      type="number"
                                      value={editValues.currentPage}
                                      onChange={(e) => setEditValues({ ...editValues, currentPage: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveProgress(userBook, book);
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                      className="flex-1 px-3 py-2 rounded-lg text-sm font-bold"
                                      style={{ 
                                        backgroundColor: 'white',
                                        color: '#FF1493',
                                        border: '2px solid #FF69B4'
                                      }}
                                      autoFocus
                                    />
                                    <span className="text-xl font-bold whitespace-nowrap" style={{ color: '#FF1493' }}>
                                      {progress}%
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#9CA3AF' }}>Pages totales</span>
                                    <input
                                      type="number"
                                      value={editValues.totalPages}
                                      onChange={(e) => setEditValues({ ...editValues, totalPages: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveProgress(userBook, book);
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                      className="flex-1 px-3 py-2 rounded-lg text-sm font-bold"
                                      style={{ 
                                        backgroundColor: 'white',
                                        color: '#FF1493',
                                        border: '2px solid #FF69B4'
                                      }}
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveProgress(userBook, book)}
                                      className="flex-1 text-white"
                                      style={{ backgroundColor: '#FF1493' }}
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      Valider
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleCancelEdit}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between mb-2">
                                    <button
                                      onClick={() => handleStartEdit(userBook, book)}
                                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                    >
                                      <span className="text-sm font-bold" style={{ color: '#FF1493' }}>
                                        📖 {userBook.current_page || 0} / {book.page_count || '?'} pages
                                      </span>
                                      <Edit2 className="w-3 h-3" style={{ color: '#FF69B4' }} />
                                    </button>
                                    <span className="text-base font-extrabold" style={{ color: '#FF1493' }}>
                                      {progress}%
                                    </span>
                                  </div>

                                  {estimation && (
                                    <p className="text-xs mb-2 italic" style={{ color: '#9C27B0' }}>
                                      ⏱️ Estimation : ~{estimation.estimatedPage} pages
                                    </p>
                                  )}
                                  
                                  <div className="relative h-3 rounded-full overflow-hidden"
                                       style={{ backgroundColor: '#FFE9F0' }}>
                                    <div className="h-full rounded-full relative"
                                         style={{
                                           width: `${progress}%`,
                                           background: 'linear-gradient(90deg, #FF1493, #FF69B4)',
                                           transition: 'width 500ms ease'
                                         }}>
                                      <div 
                                        className="absolute inset-0"
                                        style={{
                                          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
                                          animation: 'shimmer 2.5s ease-in-out infinite'
                                        }}
                                      />
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                           style={{ backgroundColor: '#FFE9F0' }}>
                        <BookOpen className="w-10 h-10" style={{ color: '#FF69B4' }} />
                      </div>
                      <p className="text-lg font-bold mb-2" style={{ color: '#2D3748' }}>
                        Aucune lecture en cours
                      </p>
                      <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>
                        Commencez votre prochaine aventure
                      </p>
                      <Link to={createPageUrl("MyLibrary")}>
                        <Button className="font-bold px-6 py-3 rounded-2xl dash-card"
                                style={{ backgroundColor: '#FF1493', color: 'white' }}>
                          <Plus className="w-5 h-5 mr-2" />
                          Choisir un livre
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Amies qui lisent */}
            {friendsBooks.filter(b => b.status === "En cours").length > 0 && (
              <Card className="border-0 rounded-3xl overflow-hidden dash-card"
                    style={{ 
                      backgroundColor: 'white',
                      boxShadow: '0 4px 16px rgba(156, 39, 176, 0.08)'
                    }}>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: '#2D3748' }}>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                         style={{ backgroundColor: '#F3E5F5' }}>
                      <Users className="w-5 h-5" style={{ color: '#9C27B0' }} />
                    </div>
                    Tes amies lisent
                  </h2>

                  <div className="grid md:grid-cols-2 gap-4">
                    {friendsBooks.filter(b => b.status === "En cours").slice(0, 4).map((userBook) => {
                      const book = allBooks.find(b => b.id === userBook.book_id);
                      const friend = myFriends.find(f => f.friend_email === userBook.created_by);
                      if (!book || !friend) return null;

                      const progress = userBook.current_page && book.page_count 
                        ? Math.round((userBook.current_page / book.page_count) * 100)
                        : 0;

                      return (
                        <div key={userBook.id}
                             className="dash-card p-4 rounded-2xl"
                             style={{ backgroundColor: '#F9F5FF' }}>
                          <div className="flex gap-3 mb-3">
                            <div className="w-14 h-20 rounded-xl overflow-hidden flex-shrink-0"
                                 style={{ 
                                   backgroundColor: '#F3E5F5',
                                   boxShadow: '0 2px 6px rgba(156, 39, 176, 0.1)'
                                 }}>
                              {book.cover_url && (
                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold mb-1" style={{ color: '#9C27B0' }}>
                                {friend.friend_name?.split(' ')[0]}
                              </p>
                              <h4 className="font-bold text-sm line-clamp-2 mb-1" style={{ color: '#2D3748' }}>
                                {book.title}
                              </h4>
                              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                                {book.author}
                              </p>
                            </div>
                          </div>

                          {progress > 0 && (
                            <div className="relative h-1.5 rounded-full" style={{ backgroundColor: '#F3E5F5' }}>
                              <div className="h-full rounded-full"
                                   style={{
                                     width: `${progress}%`,
                                     backgroundColor: '#9C27B0',
                                     transition: 'width 300ms ease'
                                   }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Colonne droite */}
          <div className="space-y-4 md:space-y-6">
            {/* Citation du jour */}
            <Card className="border-0 rounded-3xl overflow-hidden dash-card"
                  style={{ 
                    backgroundColor: 'white',
                    boxShadow: '0 4px 16px rgba(255, 215, 0, 0.08)'
                  }}>
              <CardContent className="p-6 md:p-8 text-center">
                <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                     style={{ backgroundColor: '#FFF9E6' }}>
                  <Quote className="w-6 h-6" style={{ color: '#FFD700' }} />
                </div>
                <h2 className="text-lg font-bold mb-4" style={{ color: '#2D3748' }}>
                  Citation du jour
                </h2>
                {randomQuote && quoteBook ? (
                  <>
                    <p className="text-sm md:text-base italic mb-3 leading-relaxed" style={{ color: '#4B5563' }}>
                      "{randomQuote.quote_text}"
                    </p>
                    <p className="text-xs font-bold" style={{ color: '#FFD700' }}>
                      — {quoteBook.title}
                    </p>
                  </>
                ) : (
                  <p className="text-base italic" style={{ color: '#9CA3AF' }}>
                    "Lire, c'est vivre mille vies avant de mourir."
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Playlist musicale */}
            {allMusicWithBooks.length > 0 && (
              <Card className="border-0 rounded-3xl overflow-hidden cursor-pointer dash-card"
                    onClick={() => navigate(createPageUrl("MusicPlaylist"))}
                    style={{ 
                      background: 'linear-gradient(135deg, #F9F5FF 0%, #FFE9F0 100%)',
                      boxShadow: '0 4px 16px rgba(233, 30, 99, 0.08)'
                    }}>
                <style>{`
                  @keyframes equalizer {
                    0%, 100% { height: 30%; }
                    50% { height: 100%; }
                  }
                  .eq-bar:nth-child(1) { animation: equalizer 0.8s ease-in-out infinite; }
                  .eq-bar:nth-child(2) { animation: equalizer 0.8s ease-in-out infinite 0.1s; }
                  .eq-bar:nth-child(3) { animation: equalizer 0.8s ease-in-out infinite 0.2s; }
                  .eq-bar:nth-child(4) { animation: equalizer 0.8s ease-in-out infinite 0.3s; }
                `}</style>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-3" style={{ color: '#2D3748' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                         style={{ backgroundColor: '#FFE9F0' }}>
                      <Music className="w-5 h-5" style={{ color: '#E91E63' }} />
                    </div>
                    <span className="flex-1">Ta Playlist</span>
                    <div className="flex items-end gap-1 h-6">
                      <div className="eq-bar w-1 rounded-full" style={{ backgroundColor: '#E91E63' }} />
                      <div className="eq-bar w-1 rounded-full" style={{ backgroundColor: '#FF69B4' }} />
                      <div className="eq-bar w-1 rounded-full" style={{ backgroundColor: '#E91E63' }} />
                      <div className="eq-bar w-1 rounded-full" style={{ backgroundColor: '#FF69B4' }} />
                    </div>
                  </h2>
                  <div className="space-y-2">
                    {allMusicWithBooks.slice(0, 3).map((musicItem, idx) => (
                      <div key={idx} className="p-3 rounded-xl flex items-center gap-3"
                           style={{ backgroundColor: 'white' }}>
                        <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0"
                             style={{ backgroundColor: '#FFE9F0' }}>
                          {musicItem.book.cover_url && (
                            <img src={musicItem.book.cover_url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm line-clamp-1" style={{ color: '#2D3748' }}>
                            {musicItem.title}
                          </p>
                          <p className="text-xs line-clamp-1" style={{ color: '#9CA3AF' }}>
                            {musicItem.artist}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-4 font-semibold rounded-xl py-3"
                          style={{ 
                            backgroundColor: '#E91E63',
                            color: 'white'
                          }}>
                    Voir toute la playlist
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Mes amies */}
            <TopFriendsWidget user={user} compact={false} />

            {/* Raccourcis */}
            <Card className="border-0 rounded-3xl overflow-hidden dash-card"
                  style={{ 
                    backgroundColor: 'white',
                    boxShadow: '0 4px 16px rgba(255, 105, 180, 0.08)'
                  }}>
              <CardContent className="p-6 md:p-8">
                <h2 className="text-lg font-bold mb-4" style={{ color: '#2D3748' }}>
                  Raccourcis
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <Link to={createPageUrl("SharedReadings")}>
                    <div className="p-4 rounded-2xl text-center dash-card cursor-pointer"
                         style={{ backgroundColor: '#FFF5F8' }}>
                      <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                           style={{ backgroundColor: '#FFE9F0' }}>
                        <Users className="w-5 h-5" style={{ color: '#FF1493' }} />
                      </div>
                      <p className="text-xs font-bold" style={{ color: '#2D3748' }}>Lectures<br/>communes</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("Quotes")}>
                    <div className="p-4 rounded-2xl text-center dash-card cursor-pointer"
                         style={{ backgroundColor: '#FFF9E6' }}>
                      <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                           style={{ backgroundColor: '#FFF4CC' }}>
                        <Quote className="w-5 h-5" style={{ color: '#FFD700' }} />
                      </div>
                      <p className="text-xs font-bold" style={{ color: '#2D3748' }}>Citations</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("BookTournament")}>
                    <div className="p-4 rounded-2xl text-center dash-card cursor-pointer"
                         style={{ backgroundColor: '#FFF5E6' }}>
                      <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                           style={{ backgroundColor: '#FFEACC' }}>
                        <Trophy className="w-5 h-5" style={{ color: '#FF9F7F' }} />
                      </div>
                      <p className="text-xs font-bold" style={{ color: '#2D3748' }}>Tournoi</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("Profile")}>
                    <div className="p-4 rounded-2xl text-center dash-card cursor-pointer"
                         style={{ backgroundColor: '#FFE6F0' }}>
                      <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                           style={{ backgroundColor: '#FFD6E4' }}>
                        <Heart className="w-5 h-5" style={{ color: '#E91E63' }} />
                      </div>
                      <p className="text-xs font-bold" style={{ color: '#2D3748' }}>Mes Persos</p>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog */}
      {selectedBookForDetails && (
        <BookDetailsDialog
          userBook={selectedBookForDetails}
          book={allBooks.find(b => b.id === selectedBookForDetails.book_id)}
          open={!!selectedBookForDetails}
          onOpenChange={(open) => !open && setSelectedBookForDetails(null)}
          initialTab="myinfo"
        />
      )}
    </div>
  );
}