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
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FFFBF7 0%, #FFF5F8 50%, #F8F9FF 100%)' }}>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes progressGrow {
          from { width: 0; }
        }
        .hover-lift {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hover-lift:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(155, 89, 182, 0.12);
        }
        .stat-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .stat-card::after {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
        }
        .stat-card:hover::after {
          opacity: 1;
        }
        .stat-card:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
        }
        .reading-card {
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }
        .reading-card:hover {
          border-color: rgba(255, 105, 180, 0.3);
          transform: translateY(-6px);
          box-shadow: 0 16px 40px rgba(255, 105, 180, 0.15);
        }
        .badge-float {
          animation: float 3s ease-in-out infinite;
        }
        .progress-bar {
          animation: progressGrow 1s ease-out;
        }
        .fade-in-up {
          animation: fadeInUp 0.6s ease-out;
        }
        .icon-pulse {
          transition: transform 0.2s ease;
        }
        .icon-pulse:hover {
          transform: scale(1.1);
        }
      `}</style>

      {/* Hero Header enrichi */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute top-20 left-20 w-96 h-96 rounded-full blur-3xl" 
               style={{ background: 'radial-gradient(circle, #FF69B4, transparent)' }} />
          <div className="absolute top-40 right-32 w-80 h-80 rounded-full blur-3xl" 
               style={{ background: 'radial-gradient(circle, #9B59B6, transparent)' }} />
          <div className="absolute bottom-32 left-1/3 w-72 h-72 rounded-full blur-3xl" 
               style={{ background: 'radial-gradient(circle, #87CEEB, transparent)' }} />
        </div>

        <div className="relative p-6 md:p-16">
          <div className="max-w-7xl mx-auto">
            {/* Titre principal avec badge premium */}
            <div className="mb-10 md:mb-14">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-6 badge-float"
                   style={{ 
                     background: 'linear-gradient(135deg, rgba(255, 105, 180, 0.12), rgba(186, 104, 200, 0.12))',
                     border: '1.5px solid rgba(255, 105, 180, 0.3)',
                     backdropFilter: 'blur(10px)'
                   }}>
                <Sparkles className="w-4 h-4 icon-pulse" style={{ color: '#C2185B' }} />
                <span className="text-sm font-bold" style={{ color: '#C2185B' }}>
                  Votre univers de lecture
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight" 
                  style={{ 
                    background: 'linear-gradient(135deg, #C2185B 0%, #E91E63 40%, #F06292 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '-0.02em'
                  }}>
                Bonjour {displayName} 
                <span style={{ 
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>✨</span>
              </h1>
              <p className="text-xl md:text-2xl font-medium" style={{ color: '#6B7280', lineHeight: '1.5' }}>
                Plongez dans votre univers de lecture
              </p>
            </div>

            {/* Stats Cards - palette enrichie avec rose dominant */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
              {/* Rose - Stat principale */}
              <div className="stat-card p-6 md:p-8 rounded-3xl cursor-pointer fade-in-up"
                   onClick={() => navigate(createPageUrl("MyLibrary"))}
                   style={{ 
                     background: 'linear-gradient(135deg, #E91E63 0%, #F06292 100%)',
                     animationDelay: '0.1s'
                   }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)' }}>
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <Flame className="w-6 h-6 text-white opacity-50" />
                </div>
                <p className="text-4xl md:text-5xl font-black text-white mb-2">
                  {booksReadThisYear}
                </p>
                <p className="text-sm font-medium text-white opacity-95">Livres lus en {selectedYear}</p>
              </div>

              {/* Rose clair - Progression */}
              <div className="stat-card p-6 md:p-8 rounded-3xl cursor-pointer fade-in-up"
                   onClick={() => navigate(createPageUrl("Statistics"))}
                   style={{ 
                     background: 'linear-gradient(135deg, #F06292 0%, #F8BBD0 100%)',
                     animationDelay: '0.2s'
                   }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)' }}>
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <Zap className="w-6 h-6 text-white opacity-50" />
                </div>
                <p className="text-4xl md:text-5xl font-black text-white mb-2">
                  {totalPagesThisYear.toLocaleString()}
                </p>
                <p className="text-sm font-medium text-white opacity-95">Pages dévorées</p>
              </div>

              {/* Bleu pastel - Social */}
              <div className="stat-card p-6 md:p-8 rounded-3xl cursor-pointer fade-in-up"
                   onClick={() => navigate(createPageUrl("SharedReadings"))}
                   style={{ 
                     background: 'linear-gradient(135deg, #81C4E8 0%, #A7C7E7 100%)',
                     animationDelay: '0.3s'
                   }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <Heart className="w-6 h-6 text-white opacity-50" />
                </div>
                <p className="text-4xl md:text-5xl font-black text-white mb-2">
                  {myFriends.length}
                </p>
                <p className="text-sm font-medium text-white opacity-95">Amies littéraires</p>
              </div>

              {/* Violet pastel - Imaginaire */}
              <div className="stat-card p-6 md:p-8 rounded-3xl cursor-pointer fade-in-up"
                   onClick={() => navigate(createPageUrl("MyLibrary"))}
                   style={{ 
                     background: 'linear-gradient(135deg, #BA68C8 0%, #CE93D8 100%)',
                     animationDelay: '0.4s'
                   }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
                    <Target className="w-7 h-7 text-white" />
                  </div>
                  <Sparkles className="w-6 h-6 text-white opacity-50" />
                </div>
                <p className="text-4xl md:text-5xl font-black text-white mb-2">
                  {toReadCount}
                </p>
                <p className="text-sm font-medium text-white opacity-95">À découvrir</p>
              </div>
            </div>

            {/* Sélecteur d'année élégant */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-8 py-4 rounded-2xl font-bold shadow-lg text-lg hover:shadow-xl transition-all"
                style={{ 
                  backgroundColor: 'white',
                  color: '#C2185B',
                  border: '2px solid #F8BBD0',
                  cursor: 'pointer'
                }}
              >
                {years.map(year => (
                  <option key={year} value={year}>📅 {year}</option>
                ))}
              </select>

              <Link to={createPageUrl("MyLibrary")} className="flex-1 md:flex-none">
                <Button
                  className="w-full md:w-auto shadow-lg font-bold px-10 py-6 rounded-2xl hover:scale-[1.03] transition-all text-lg"
                  style={{ background: 'linear-gradient(135deg, #E91E63, #F06292)', color: 'white' }}
                >
                  <Plus className="w-6 h-6 mr-2" />
                  Ajouter un livre
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          {/* Colonne gauche */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* Objectif de lecture */}
            <ReadingGoalManager year={selectedYear} compact={false} />

            {/* Lectures en cours - SECTION ROSE PRINCIPALE */}
            <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden hover:shadow-3xl transition-all duration-300 fade-in-up"
                  style={{ animationDelay: '0.2s' }}>
              <div className="h-2" style={{ background: 'linear-gradient(90deg, #E91E63, #F06292, #F48FB1)' }} />
              <CardContent className="p-8 md:p-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl icon-pulse"
                         style={{ background: 'linear-gradient(135deg, #E91E63, #F06292)' }}>
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl md:text-4xl font-black" style={{ color: '#1F2937', letterSpacing: '-0.01em' }}>
                        En cours de lecture
                      </h2>
                      <p className="text-sm font-medium mt-1" style={{ color: '#6B7280' }}>
                        Vos aventures du moment
                      </p>
                    </div>
                  </div>
                  {currentlyReading.length > 0 && (
                    <span className="px-5 py-2.5 rounded-full text-base font-black text-white shadow-lg badge-float"
                          style={{ background: 'linear-gradient(135deg, #E91E63, #F06292)' }}>
                      {currentlyReading.length}
                    </span>
                  )}
                </div>

                <div className="space-y-5">
                  {currentlyReading.length > 0 ? (
                    currentlyReading.slice(0, 3).map((userBook) => {
                      const book = allBooks.find(b => b.id === userBook.book_id);
                      if (!book) return null;

                      const progress = userBook.current_page && book.page_count 
                        ? Math.round((userBook.current_page / book.page_count) * 100)
                        : 0;

                      return (
                        <div key={userBook.id}
                             className="reading-card cursor-pointer p-6 md:p-7 rounded-3xl"
                             style={{ backgroundColor: '#FFFBFE', border: '1px solid #FCE4EC' }}
                             onClick={() => setSelectedBookForDetails(userBook)}>
                          <div className="flex gap-5">
                            <div className="relative flex-shrink-0">
                              <div className="w-24 h-32 md:w-32 md:h-44 rounded-2xl overflow-hidden shadow-2xl"
                                   style={{ backgroundColor: '#FCE4EC' }}>
                                {book.cover_url && (
                                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <h3 className="font-black text-xl md:text-2xl mb-2 line-clamp-2" 
                                    style={{ color: '#1F2937', letterSpacing: '-0.01em' }}>
                                  {book.title}
                                </h3>
                                <p className="text-base md:text-lg font-medium mb-4" style={{ color: '#6B7280' }}>
                                  {book.author}
                                </p>
                              </div>

                              {userBook.current_page && book.page_count && (
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-bold" style={{ color: '#C2185B' }}>
                                      Page {userBook.current_page} / {book.page_count}
                                    </span>
                                    <span className="text-3xl font-black" style={{ color: '#81C784' }}>
                                      {progress}%
                                    </span>
                                  </div>
                                  <div className="relative h-3.5 rounded-full overflow-hidden"
                                       style={{ backgroundColor: '#E8F5E9' }}>
                                    <div className="progress-bar h-full rounded-full transition-all duration-700"
                                         style={{
                                           width: `${progress}%`,
                                           background: 'linear-gradient(90deg, #66BB6A, #81C784, #A5D6A7)',
                                           boxShadow: '0 2px 8px rgba(129, 199, 132, 0.3)'
                                         }} />
                                  </div>
                                </div>
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

            {/* Amies qui lisent - BLEU SOCIAL */}
            {friendsBooks.filter(b => b.status === "En cours").length > 0 && (
              <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden hover:shadow-3xl transition-all duration-300 fade-in-up"
                    style={{ animationDelay: '0.3s' }}>
                <div className="h-2" style={{ background: 'linear-gradient(90deg, #64B5F6, #81C4E8, #A7C7E7)' }} />
                <CardContent className="p-8 md:p-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl icon-pulse"
                         style={{ background: 'linear-gradient(135deg, #64B5F6, #81C4E8)' }}>
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl md:text-4xl font-black" style={{ color: '#1F2937', letterSpacing: '-0.01em' }}>
                        Tes amies lisent
                      </h2>
                      <p className="text-sm font-medium mt-1" style={{ color: '#6B7280' }}>
                        Découvrez leurs lectures
                      </p>
                    </div>
                  </div>

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
                             style={{ backgroundColor: '#E8F4F8', border: '1px solid #B3E5FC' }}>
                          <div className="flex gap-3 mb-3">
                            <div className="w-16 h-24 rounded-xl overflow-hidden shadow-lg flex-shrink-0"
                                 style={{ backgroundColor: '#B3E5FC' }}>
                              {book.cover_url && (
                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold mb-1" style={{ color: '#0277BD' }}>
                                {friend.friend_name?.split(' ')[0]}
                              </p>
                              <h4 className="font-bold text-sm line-clamp-2 mb-1" style={{ color: '#1F2937' }}>
                                {book.title}
                              </h4>
                              <p className="text-xs" style={{ color: '#6B7280' }}>
                                {book.author}
                              </p>
                            </div>
                          </div>

                          {progress > 0 && (
                            <div className="relative h-2 rounded-full" style={{ backgroundColor: '#B3E5FC' }}>
                              <div className="progress-bar h-full rounded-full"
                                   style={{
                                     width: `${progress}%`,
                                     background: 'linear-gradient(90deg, #64B5F6, #81C4E8)'
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
          <div className="space-y-6 md:space-y-8">
            {/* Citation du jour */}
            <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden hover:shadow-3xl transition-all duration-500">
              <div className="h-2" style={{ background: 'linear-gradient(90deg, #FFD700, #FFA500)' }} />
              <CardContent className="p-8 md:p-10 text-center"
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
                    <p className="text-base md:text-lg italic mb-4 leading-relaxed" style={{ color: '#374151' }}>
                      "{randomQuote.quote_text}"
                    </p>
                    <p className="text-sm font-bold" style={{ color: '#F9A825' }}>
                      — {quoteBook.title}
                    </p>
                  </>
                ) : (
                  <p className="text-lg italic" style={{ color: '#6B7280' }}>
                    "Lire, c'est vivre mille vies avant de mourir."
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Playlist musicale - VIOLET IMAGINAIRE */}
            {allMusicWithBooks.length > 0 && (
              <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden cursor-pointer hover-lift fade-in-up"
                    onClick={() => navigate(createPageUrl("MusicPlaylist"))}
                    style={{ animationDelay: '0.5s' }}>
                <CardContent className="p-8 md:p-10"
                             style={{ background: 'linear-gradient(135deg, #BA68C8, #CE93D8)' }}>
                  <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                    <Music className="w-6 h-6 icon-pulse" />
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

            {/* Accès rapide - palette enrichie */}
            <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden hover:shadow-3xl transition-all duration-300 fade-in-up"
                  style={{ animationDelay: '0.6s' }}>
              <CardContent className="p-8 md:p-10">
                <h2 className="text-2xl font-black mb-6" style={{ color: '#1F2937' }}>
                  ⚡ Raccourcis
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <Link to={createPageUrl("SharedReadings")}>
                    <div className="p-5 rounded-2xl text-center hover-lift cursor-pointer transition-all"
                         style={{ backgroundColor: '#E8F4F8', border: '2px solid transparent' }}>
                      <Users className="w-10 h-10 mx-auto mb-3 icon-pulse" style={{ color: '#0277BD' }} />
                      <p className="text-sm font-bold" style={{ color: '#1F2937' }}>Lectures communes</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("Quotes")}>
                    <div className="p-5 rounded-2xl text-center hover-lift cursor-pointer transition-all"
                         style={{ backgroundColor: '#FFFDE7', border: '2px solid transparent' }}>
                      <QuoteIcon className="w-10 h-10 mx-auto mb-3 icon-pulse" style={{ color: '#F9A825' }} />
                      <p className="text-sm font-bold" style={{ color: '#1F2937' }}>Citations</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("BookTournament")}>
                    <div className="p-5 rounded-2xl text-center hover-lift cursor-pointer transition-all"
                         style={{ backgroundColor: '#FCE4EC', border: '2px solid transparent' }}>
                      <Trophy className="w-10 h-10 mx-auto mb-3 icon-pulse" style={{ color: '#E91E63' }} />
                      <p className="text-sm font-bold" style={{ color: '#1F2937' }}>Tournoi</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("Profile")}>
                    <div className="p-5 rounded-2xl text-center hover-lift cursor-pointer transition-all"
                         style={{ backgroundColor: '#F3E5F5', border: '2px solid transparent' }}>
                      <Heart className="w-10 h-10 mx-auto mb-3 icon-pulse" style={{ color: '#BA68C8' }} />
                      <p className="text-sm font-bold" style={{ color: '#1F2937' }}>Mes Persos</p>
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