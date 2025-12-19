import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, TrendingUp, Users, Star, Plus, Music, Heart, MessageCircle, Quote as QuoteIcon, Trophy, Library, ArrowRight, Sparkles, Flame, Zap, Clock, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReadingGoalManager from "../components/dashboard/ReadingGoalManager";
import BookDetailsDialog from "../components/library/BookDetailsDialog";

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
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FFF0F6 0%, #FFE4EC 100%)' }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 20, 147, 0.3); }
          50% { box-shadow: 0 0 40px rgba(255, 20, 147, 0.6); }
        }
        .hover-lift {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hover-lift:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px rgba(255, 20, 147, 0.2);
        }
        .stat-card {
          transition: all 0.3s ease;
        }
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }
      `}</style>

      {/* Hero Header avec gradient rose */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl" 
               style={{ background: 'radial-gradient(circle, #FF1493, transparent)' }} />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl" 
               style={{ background: 'radial-gradient(circle, #FF69B4, transparent)' }} />
        </div>

        <div className="relative p-6 md:p-12">
          <div className="max-w-7xl mx-auto">
            {/* Titre principal */}
            <div className="mb-6 md:mb-8">
              <h1 className="text-4xl md:text-6xl font-bold mb-3" 
                  style={{ 
                    background: 'linear-gradient(135deg, #FF1493, #FF69B4)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                Bonjour {displayName} ✨
              </h1>
              <p className="text-lg md:text-2xl font-medium" style={{ color: '#666' }}>
                Ton univers littéraire t'attend
              </p>
            </div>

            {/* Stats Cards en grille moderne */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
              <div className="stat-card p-4 md:p-6 rounded-2xl cursor-pointer"
                   onClick={() => navigate(createPageUrl("MyLibrary"))}
                   style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <Flame className="w-5 h-5 text-white opacity-50" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">
                  {booksReadThisYear}
                </p>
                <p className="text-sm text-white opacity-80">Livres lus en {selectedYear}</p>
              </div>

              <div className="stat-card p-4 md:p-6 rounded-2xl cursor-pointer"
                   onClick={() => navigate(createPageUrl("Statistics"))}
                   style={{ background: 'linear-gradient(135deg, #E91E63, #F48FB1)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <Zap className="w-5 h-5 text-white opacity-50" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">
                  {totalPagesThisYear.toLocaleString()}
                </p>
                <p className="text-sm text-white opacity-80">Pages dévorées</p>
              </div>

              <div className="stat-card p-4 md:p-6 rounded-2xl cursor-pointer"
                   onClick={() => navigate(createPageUrl("SharedReadings"))}
                   style={{ background: 'linear-gradient(135deg, #9B59B6, #BA68C8)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <Heart className="w-5 h-5 text-white opacity-50" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">
                  {myFriends.length}
                </p>
                <p className="text-sm text-white opacity-80">Amies littéraires</p>
              </div>

              <div className="stat-card p-4 md:p-6 rounded-2xl cursor-pointer"
                   onClick={() => navigate(createPageUrl("MyLibrary"))}
                   style={{ background: 'linear-gradient(135deg, #FFB6C8, #FFC0CB)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <Clock className="w-5 h-5 text-white opacity-50" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">
                  {toReadCount}
                </p>
                <p className="text-sm text-white opacity-80">Dans la pile</p>
              </div>
            </div>

            {/* Sélecteur d'année élégant */}
            <div className="flex items-center gap-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-6 py-3 rounded-2xl font-bold shadow-xl text-lg"
                style={{ 
                  backgroundColor: 'white',
                  color: '#FF1493',
                  border: '2px solid #FFE1F0'
                }}
              >
                {years.map(year => (
                  <option key={year} value={year}>📅 {year}</option>
                ))}
              </select>

              <Link to={createPageUrl("MyLibrary")} className="flex-1 md:flex-none">
                <Button
                  className="w-full md:w-auto shadow-xl font-bold px-8 py-6 rounded-2xl hover:scale-105 transition-transform text-lg"
                  style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)', color: 'white' }}
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
            <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden">
              <div className="h-1" style={{ background: 'linear-gradient(90deg, #FF1493, #FF69B4, #FFB6C8)' }} />
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3" style={{ color: '#2D3748' }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                         style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    En cours de lecture
                  </h2>
                  {currentlyReading.length > 0 && (
                    <span className="px-4 py-2 rounded-full text-sm font-bold text-white shadow-lg"
                          style={{ backgroundColor: '#FF1493' }}>
                      {currentlyReading.length}
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {currentlyReading.length > 0 ? (
                    currentlyReading.slice(0, 3).map((userBook) => {
                      const book = allBooks.find(b => b.id === userBook.book_id);
                      if (!book) return null;

                      const progress = userBook.current_page && book.page_count 
                        ? Math.round((userBook.current_page / book.page_count) * 100)
                        : 0;

                      return (
                        <div key={userBook.id}
                             className="hover-lift cursor-pointer p-4 md:p-6 rounded-2xl"
                             style={{ backgroundColor: '#FFF7FA' }}
                             onClick={() => setSelectedBookForDetails(userBook)}>
                          <div className="flex gap-4">
                            <div className="relative flex-shrink-0">
                              <div className="w-20 h-28 md:w-28 md:h-40 rounded-xl overflow-hidden shadow-xl"
                                   style={{ backgroundColor: '#FFE4EC' }}>
                                {book.cover_url && (
                                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg md:text-xl mb-2 line-clamp-2" style={{ color: '#2D3748' }}>
                                {book.title}
                              </h3>
                              <p className="text-sm md:text-base mb-3" style={{ color: '#666' }}>
                                {book.author}
                              </p>

                              {userBook.current_page && book.page_count && (
                                <>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold" style={{ color: '#FF1493' }}>
                                      Page {userBook.current_page} / {book.page_count}
                                    </span>
                                    <span className="text-2xl font-bold" style={{ color: '#FF1493' }}>
                                      {progress}%
                                    </span>
                                  </div>
                                  <div className="relative h-3 rounded-full overflow-hidden"
                                       style={{ backgroundColor: '#FFE4EC' }}>
                                    <div className="h-full rounded-full transition-all duration-500"
                                         style={{
                                           width: `${progress}%`,
                                           background: 'linear-gradient(90deg, #FF1493, #FF69B4, #FFB6C8)'
                                         }} />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
                           style={{ backgroundColor: '#FFE4EC' }}>
                        <BookOpen className="w-12 h-12" style={{ color: '#FF1493' }} />
                      </div>
                      <p className="text-xl font-bold mb-2" style={{ color: '#2D3748' }}>
                        Aucune lecture en cours
                      </p>
                      <p className="text-base mb-6" style={{ color: '#666' }}>
                        Commencez votre prochaine aventure !
                      </p>
                      <Link to={createPageUrl("MyLibrary")}>
                        <Button className="shadow-xl font-bold px-8 py-4 rounded-2xl"
                                style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)', color: 'white' }}>
                          <Plus className="w-5 h-5 mr-2" />
                          Choisir un livre
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Amies qui lisent en ce moment */}
            {friendsBooks.filter(b => b.status === "En cours").length > 0 && (
              <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden">
                <div className="h-1" style={{ background: 'linear-gradient(90deg, #9B59B6, #BA68C8, #E1BEE7)' }} />
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3" style={{ color: '#2D3748' }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                         style={{ background: 'linear-gradient(135deg, #9B59B6, #BA68C8)' }}>
                      <Users className="w-6 h-6 text-white" />
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
                             className="hover-lift p-4 rounded-2xl"
                             style={{ backgroundColor: '#F3E5F5' }}>
                          <div className="flex gap-3 mb-3">
                            <div className="w-16 h-24 rounded-xl overflow-hidden shadow-lg flex-shrink-0"
                                 style={{ backgroundColor: '#E1BEE7' }}>
                              {book.cover_url && (
                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold mb-1" style={{ color: '#9B59B6' }}>
                                {friend.friend_name?.split(' ')[0]}
                              </p>
                              <h4 className="font-bold text-sm line-clamp-2 mb-1" style={{ color: '#2D3748' }}>
                                {book.title}
                              </h4>
                              <p className="text-xs" style={{ color: '#666' }}>
                                {book.author}
                              </p>
                            </div>
                          </div>

                          {progress > 0 && (
                            <div className="relative h-2 rounded-full" style={{ backgroundColor: '#E1BEE7' }}>
                              <div className="h-full rounded-full"
                                   style={{
                                     width: `${progress}%`,
                                     background: 'linear-gradient(90deg, #9B59B6, #BA68C8)'
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
            <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden">
              <div className="h-1" style={{ background: 'linear-gradient(90deg, #FFD700, #FFA500)' }} />
              <CardContent className="p-6 md:p-8 text-center"
                           style={{ background: 'linear-gradient(135deg, #FFF9E6, #FFECB3)' }}>
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                     style={{ backgroundColor: 'rgba(255, 215, 0, 0.3)' }}>
                  <QuoteIcon className="w-8 h-8" style={{ color: '#FFD700' }} />
                </div>
                <h2 className="text-xl font-bold mb-4" style={{ color: '#2D3748' }}>
                  Citation du jour
                </h2>
                {randomQuote && quoteBook ? (
                  <>
                    <p className="text-base md:text-lg italic mb-4 leading-relaxed" style={{ color: '#2D3748' }}>
                      "{randomQuote.quote_text}"
                    </p>
                    <p className="text-sm font-bold" style={{ color: '#FFD700' }}>
                      — {quoteBook.title}
                    </p>
                  </>
                ) : (
                  <p className="text-lg italic" style={{ color: '#666' }}>
                    "Lire, c'est vivre mille vies avant de mourir."
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Playlist musicale */}
            {allMusicWithBooks.length > 0 && (
              <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden cursor-pointer hover-lift"
                    onClick={() => navigate(createPageUrl("MusicPlaylist"))}>
                <CardContent className="p-6 md:p-8"
                             style={{ background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)' }}>
                  <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                    <Music className="w-6 h-6" />
                    Ta Playlist
                  </h2>
                  <div className="space-y-3">
                    {allMusicWithBooks.slice(0, 3).map((musicItem, idx) => (
                      <div key={idx} className="p-3 rounded-2xl flex items-center gap-3"
                           style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                          {musicItem.book.cover_url && (
                            <img src={musicItem.book.cover_url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-white line-clamp-1">
                            {musicItem.title}
                          </p>
                          <p className="text-xs text-white opacity-80 line-clamp-1">
                            {musicItem.artist}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-4 bg-white font-bold rounded-xl py-3"
                          style={{ color: '#9B59B6' }}>
                    Voir toute la playlist
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Accès rapide */}
            <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <h2 className="text-xl font-bold mb-4" style={{ color: '#2D3748' }}>
                  ⚡ Raccourcis
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <Link to={createPageUrl("SharedReadings")}>
                    <div className="p-4 rounded-2xl text-center hover-lift cursor-pointer"
                         style={{ backgroundColor: '#FFF0F6' }}>
                      <Users className="w-8 h-8 mx-auto mb-2" style={{ color: '#FF1493' }} />
                      <p className="text-sm font-bold" style={{ color: '#2D3748' }}>Lectures communes</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("Quotes")}>
                    <div className="p-4 rounded-2xl text-center hover-lift cursor-pointer"
                         style={{ backgroundColor: '#FFF9E6' }}>
                      <QuoteIcon className="w-8 h-8 mx-auto mb-2" style={{ color: '#FFD700' }} />
                      <p className="text-sm font-bold" style={{ color: '#2D3748' }}>Citations</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("BookTournament")}>
                    <div className="p-4 rounded-2xl text-center hover-lift cursor-pointer"
                         style={{ backgroundColor: '#FFF5E6' }}>
                      <Trophy className="w-8 h-8 mx-auto mb-2" style={{ color: '#FF9F7F' }} />
                      <p className="text-sm font-bold" style={{ color: '#2D3748' }}>Tournoi</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("Profile")}>
                    <div className="p-4 rounded-2xl text-center hover-lift cursor-pointer"
                         style={{ backgroundColor: '#FFE6F0' }}>
                      <Heart className="w-8 h-8 mx-auto mb-2" style={{ color: '#E91E63' }} />
                      <p className="text-sm font-bold" style={{ color: '#2D3748' }}>Mes Persos</p>
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
        />
      )}
    </div>
  );
}