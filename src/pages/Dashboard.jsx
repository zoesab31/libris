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
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FFF5F7 0%, #FFE4EC 30%, #FFF0F6 60%, #FFE4EC 100%)' }}>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-soft {
          0%, 100% { 
            box-shadow: 0 4px 24px rgba(255, 20, 147, 0.12);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 8px 32px rgba(255, 20, 147, 0.2);
            transform: scale(1.01);
          }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes progressFill {
          from { width: 0%; }
          to { width: var(--progress-width); }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        
        .hover-lift {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .hover-lift:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(255, 20, 147, 0.15);
        }
        
        .stat-card {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
          transition: left 0.6s ease;
        }
        .stat-card:hover::before {
          left: 100%;
        }
        .stat-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 50px rgba(255, 20, 147, 0.18);
        }
        
        .reading-card {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          border: 2px solid transparent;
          opacity: 0;
          animation: fadeInUp 0.5s ease-out forwards;
        }
        .reading-card:nth-child(1) { animation-delay: 0.1s; }
        .reading-card:nth-child(2) { animation-delay: 0.2s; }
        .reading-card:nth-child(3) { animation-delay: 0.3s; }
        .reading-card:hover {
          border-color: rgba(255, 20, 147, 0.25);
          transform: translateY(-6px);
          box-shadow: 0 16px 40px rgba(255, 20, 147, 0.2);
          background-color: #FFF !important;
        }
        
        .badge-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .icon-pulse:hover {
          animation: pulse-soft 0.6s ease-in-out;
        }
        
        .progress-bar-animated {
          animation: progressFill 1s ease-out forwards;
        }
        
        .card-entrance {
          opacity: 0;
          animation: fadeInUp 0.6s ease-out forwards;
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

        <div className="relative p-6 md:p-16">
          <div className="max-w-7xl mx-auto">
            {/* Titre principal avec badge premium */}
            <div className="mb-10 md:mb-14 card-entrance">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-6 badge-float"
                   style={{ 
                     background: 'rgba(255, 255, 255, 0.7)',
                     border: '2px solid rgba(255, 20, 147, 0.2)',
                     backdropFilter: 'blur(10px)',
                     boxShadow: '0 4px 16px rgba(255, 20, 147, 0.1)'
                   }}>
                <Sparkles className="w-4 h-4 icon-pulse" style={{ color: '#FF1493' }} />
                <span className="text-sm font-bold" style={{ color: '#C2185B' }}>
                  Votre espace littéraire
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black mb-4 leading-tight" 
                  style={{ 
                    color: '#C2185B',
                    letterSpacing: '-0.02em',
                    textShadow: '0 2px 20px rgba(255, 20, 147, 0.1)'
                  }}>
                Bonjour {displayName} ✨
              </h1>
              <p className="text-xl md:text-2xl font-medium" style={{ color: '#E91E63', lineHeight: '1.5' }}>
                Plongez dans votre univers de lecture
              </p>
            </div>

            {/* Stats Cards en grille moderne - IDENTITÉ ROSE */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
              <div className="stat-card p-6 md:p-8 rounded-3xl cursor-pointer animate-fade-in-up"
                   onClick={() => navigate(createPageUrl("MyLibrary"))}
                   style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)', boxShadow: '0 10px 30px rgba(255, 20, 147, 0.15)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center icon-pulse"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(10px)' }}>
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <Flame className="w-6 h-6 text-white opacity-50" />
                </div>
                <p className="text-4xl md:text-5xl font-black text-white mb-2">
                  {booksReadThisYear}
                </p>
                <p className="text-sm font-medium text-white opacity-95">Livres lus en {selectedYear}</p>
              </div>

              <div className="stat-card p-6 md:p-8 rounded-3xl cursor-pointer animate-fade-in-up delay-100"
                   onClick={() => navigate(createPageUrl("Statistics"))}
                   style={{ background: 'linear-gradient(135deg, #FF69B4, #FFB6C8)', boxShadow: '0 10px 30px rgba(255, 105, 180, 0.15)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center icon-pulse"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(10px)' }}>
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <Zap className="w-6 h-6 text-white opacity-50" />
                </div>
                <p className="text-4xl md:text-5xl font-black text-white mb-2">
                  {totalPagesThisYear.toLocaleString()}
                </p>
                <p className="text-sm font-medium text-white opacity-95">Pages dévorées</p>
              </div>

              <div className="stat-card p-6 md:p-8 rounded-3xl cursor-pointer animate-fade-in-up delay-200"
                   onClick={() => navigate(createPageUrl("SharedReadings"))}
                   style={{ background: 'linear-gradient(135deg, #FFB6C8, #FFC0CB)', boxShadow: '0 10px 30px rgba(255, 182, 200, 0.15)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center icon-pulse"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(10px)' }}>
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <Heart className="w-6 h-6 text-white opacity-50" />
                </div>
                <p className="text-4xl md:text-5xl font-black text-white mb-2">
                  {myFriends.length}
                </p>
                <p className="text-sm font-medium text-white opacity-95">Amies littéraires</p>
              </div>

              <div className="stat-card p-6 md:p-8 rounded-3xl cursor-pointer animate-fade-in-up delay-300"
                   onClick={() => navigate(createPageUrl("MyLibrary"))}
                   style={{ background: 'linear-gradient(135deg, #FFC0CB, #FFD6E0)', boxShadow: '0 10px 30px rgba(255, 192, 203, 0.15)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center icon-pulse"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', backdropFilter: 'blur(10px)' }}>
                    <Target className="w-7 h-7 text-white" />
                  </div>
                  <Clock className="w-6 h-6 text-white opacity-50" />
                </div>
                <p className="text-4xl md:text-5xl font-black text-white mb-2">
                  {toReadCount}
                </p>
                <p className="text-sm font-medium text-white opacity-95">Dans la pile</p>
              </div>
            </div>

            {/* Sélecteur d'année élégant */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-8 py-4 rounded-2xl font-bold shadow-xl text-lg hover:shadow-2xl transition-all"
                style={{ 
                  backgroundColor: 'white',
                  color: '#FF1493',
                  border: '2px solid #FFE1F0',
                  cursor: 'pointer'
                }}
              >
                {years.map(year => (
                  <option key={year} value={year}>📅 {year}</option>
                ))}
              </select>

              <Link to={createPageUrl("MyLibrary")} className="flex-1 md:flex-none">
                <Button
                  className="w-full md:w-auto shadow-xl font-bold px-10 py-6 rounded-2xl hover:scale-105 transition-all text-lg"
                  style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)', color: 'white' }}
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

            {/* Lectures en cours - SECTION PRINCIPALE ROSE */}
            <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden hover:shadow-3xl transition-all duration-500 card-entrance delay-400"
                  style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 240, 246, 0.95))', backdropFilter: 'blur(10px)' }}>
              <div className="h-2" style={{ background: 'linear-gradient(90deg, #FF1493, #FF69B4, #FFB6C8)' }} />
              <CardContent className="p-8 md:p-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl icon-pulse"
                         style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl md:text-4xl font-black" style={{ color: '#C2185B', letterSpacing: '-0.01em' }}>
                        En cours de lecture
                      </h2>
                      <p className="text-sm font-semibold mt-1" style={{ color: '#E91E63' }}>
                        Vos aventures du moment
                      </p>
                    </div>
                  </div>
                  {currentlyReading.length > 0 && (
                    <span className="px-5 py-2.5 rounded-full text-base font-black text-white shadow-xl badge-float"
                          style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)', boxShadow: '0 4px 20px rgba(255, 20, 147, 0.3)' }}>
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
                             style={{ 
                               backgroundColor: '#FFF7FA',
                               border: '2px solid rgba(255, 20, 147, 0.08)'
                             }}
                             onClick={() => setSelectedBookForDetails(userBook)}>
                          <div className="flex gap-5">
                            <div className="relative flex-shrink-0">
                              <div className="w-24 h-32 md:w-32 md:h-44 rounded-2xl overflow-hidden shadow-2xl"
                                   style={{ 
                                     backgroundColor: '#FFE4EC',
                                     boxShadow: '0 8px 24px rgba(255, 20, 147, 0.15)'
                                   }}>
                                {book.cover_url && (
                                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <h3 className="font-black text-xl md:text-2xl mb-2 line-clamp-2" 
                                    style={{ color: '#C2185B', letterSpacing: '-0.01em' }}>
                                  {book.title}
                                </h3>
                                <p className="text-base md:text-lg font-semibold mb-4" style={{ color: '#E91E63' }}>
                                  {book.author}
                                </p>
                              </div>

                              {userBook.current_page && book.page_count && (
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-bold" style={{ color: '#FF1493' }}>
                                      Page {userBook.current_page} / {book.page_count}
                                    </span>
                                    <span className="text-3xl font-black" 
                                          style={{ 
                                            background: 'linear-gradient(135deg, #FF1493, #FF69B4)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent'
                                          }}>
                                      {progress}%
                                    </span>
                                  </div>
                                  <div className="relative h-3.5 rounded-full overflow-hidden"
                                       style={{ backgroundColor: '#FFE4EC' }}>
                                    <div className="h-full rounded-full progress-bar-animated"
                                         style={{
                                           '--progress-width': `${progress}%`,
                                           width: `${progress}%`,
                                           background: 'linear-gradient(90deg, #4CAF50, #66BB6A)',
                                           boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
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

            {/* Amies qui lisent en ce moment - SECONDAIRE LAVANDE */}
            {friendsBooks.filter(b => b.status === "En cours").length > 0 && (
              <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden hover:shadow-3xl transition-all duration-500 card-entrance"
                    style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)' }}>
                <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #E1BEE7, #F3E5F5)' }} />
                <CardContent className="p-8 md:p-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg icon-pulse"
                         style={{ background: 'linear-gradient(135deg, #E1BEE7, #F3E5F5)' }}>
                      <Users className="w-7 h-7" style={{ color: '#9B59B6' }} />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black" style={{ color: '#C2185B', letterSpacing: '-0.01em' }}>
                        Tes amies lisent
                      </h2>
                      <p className="text-sm font-semibold mt-1" style={{ color: '#E91E63' }}>
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
                             className="hover-lift p-4 rounded-2xl transition-all"
                             style={{ 
                               backgroundColor: '#FFF0F6',
                               border: '1px solid rgba(225, 190, 231, 0.3)'
                             }}>
                          <div className="flex gap-3 mb-3">
                            <div className="w-16 h-24 rounded-xl overflow-hidden shadow-lg flex-shrink-0"
                                 style={{ backgroundColor: '#FFE4EC' }}>
                              {book.cover_url && (
                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold mb-1" style={{ color: '#E91E63' }}>
                                {friend.friend_name?.split(' ')[0]}
                              </p>
                              <h4 className="font-bold text-sm line-clamp-2 mb-1" style={{ color: '#C2185B' }}>
                                {book.title}
                              </h4>
                              <p className="text-xs font-medium" style={{ color: '#E91E63' }}>
                                {book.author}
                              </p>
                            </div>
                          </div>

                          {progress > 0 && (
                            <div className="relative h-2 rounded-full" style={{ backgroundColor: '#FFE4EC' }}>
                              <div className="h-full rounded-full transition-all duration-500"
                                   style={{
                                     width: `${progress}%`,
                                     background: 'linear-gradient(90deg, #4CAF50, #66BB6A)'
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
            {/* Citation du jour - ROSE DOUX */}
            <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden hover:shadow-3xl transition-all duration-500 card-entrance"
                  style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}>
              <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #FFB6C8, #FFC0CB)' }} />
              <CardContent className="p-8 md:p-10 text-center"
                           style={{ background: 'linear-gradient(135deg, rgba(255, 240, 246, 0.5), rgba(255, 228, 236, 0.5))' }}>
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center icon-pulse"
                     style={{ background: 'linear-gradient(135deg, #FFB6C8, #FFC0CB)', boxShadow: '0 4px 16px rgba(255, 182, 200, 0.3)' }}>
                  <QuoteIcon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-black mb-4" style={{ color: '#C2185B' }}>
                  Citation du jour
                </h2>
                {randomQuote && quoteBook ? (
                  <>
                    <p className="text-base md:text-lg italic mb-4 leading-relaxed font-medium" style={{ color: '#C2185B' }}>
                      "{randomQuote.quote_text}"
                    </p>
                    <p className="text-sm font-bold" style={{ color: '#FF1493' }}>
                      — {quoteBook.title}
                    </p>
                  </>
                ) : (
                  <p className="text-lg italic font-medium" style={{ color: '#E91E63' }}>
                    "Lire, c'est vivre mille vies avant de mourir."
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Playlist musicale - ROSE */}
            {allMusicWithBooks.length > 0 && (
              <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden cursor-pointer hover-lift card-entrance delay-100"
                    onClick={() => navigate(createPageUrl("MusicPlaylist"))}
                    style={{ background: 'linear-gradient(135deg, #FFB6C8, #FFC0CB)', boxShadow: '0 10px 30px rgba(255, 182, 200, 0.2)' }}>
                <CardContent className="p-8 md:p-10">
                  <h2 className="text-2xl font-black mb-4 text-white flex items-center gap-2">
                    <Music className="w-7 h-7 icon-pulse" />
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

            {/* Accès rapide - ROSE */}
            <Card className="shadow-2xl border-0 rounded-3xl overflow-hidden hover:shadow-3xl transition-all duration-500 card-entrance delay-200"
                  style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)' }}>
              <CardContent className="p-8 md:p-10">
                <h2 className="text-2xl font-black mb-6" style={{ color: '#C2185B' }}>
                  ⚡ Raccourcis
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <Link to={createPageUrl("SharedReadings")}>
                    <div className="p-5 rounded-2xl text-center hover-lift cursor-pointer transition-all"
                         style={{ 
                           background: 'linear-gradient(135deg, rgba(255, 240, 246, 0.8), rgba(255, 228, 236, 0.8))',
                           border: '2px solid rgba(255, 20, 147, 0.1)'
                         }}>
                      <Users className="w-10 h-10 mx-auto mb-3 icon-pulse" style={{ color: '#FF1493' }} />
                      <p className="text-sm font-bold" style={{ color: '#C2185B' }}>Lectures communes</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("Quotes")}>
                    <div className="p-5 rounded-2xl text-center hover-lift cursor-pointer transition-all"
                         style={{ 
                           background: 'linear-gradient(135deg, rgba(255, 240, 246, 0.8), rgba(255, 228, 236, 0.8))',
                           border: '2px solid rgba(255, 105, 180, 0.1)'
                         }}>
                      <QuoteIcon className="w-10 h-10 mx-auto mb-3 icon-pulse" style={{ color: '#FF69B4' }} />
                      <p className="text-sm font-bold" style={{ color: '#C2185B' }}>Citations</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("BookTournament")}>
                    <div className="p-5 rounded-2xl text-center hover-lift cursor-pointer transition-all"
                         style={{ 
                           background: 'linear-gradient(135deg, rgba(255, 240, 246, 0.8), rgba(255, 228, 236, 0.8))',
                           border: '2px solid rgba(255, 182, 200, 0.1)'
                         }}>
                      <Trophy className="w-10 h-10 mx-auto mb-3 icon-pulse" style={{ color: '#FFB6C8' }} />
                      <p className="text-sm font-bold" style={{ color: '#C2185B' }}>Tournoi</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("Profile")}>
                    <div className="p-5 rounded-2xl text-center hover-lift cursor-pointer transition-all"
                         style={{ 
                           background: 'linear-gradient(135deg, rgba(255, 240, 246, 0.8), rgba(255, 228, 236, 0.8))',
                           border: '2px solid rgba(233, 30, 99, 0.1)'
                         }}>
                      <Heart className="w-10 h-10 mx-auto mb-3 icon-pulse" style={{ color: '#E91E63' }} />
                      <p className="text-sm font-bold" style={{ color: '#C2185B' }}>Mes Persos</p>
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