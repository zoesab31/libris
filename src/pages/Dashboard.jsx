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
    <div className="min-h-screen dreamscape-bg" style={{ position: 'relative', overflow: 'hidden' }}>
      <style>{`
        /* 🌫️ Palette onirique */
        :root {
          --dream-rose: rgba(255, 192, 203, 0.3);
          --dream-lavender: rgba(230, 179, 232, 0.4);
          --dream-blue: rgba(167, 199, 231, 0.25);
          --dream-fog: rgba(255, 255, 255, 0.6);
        }

        /* 🌊 Fond onirique avec nappes flottantes */
        .dreamscape-bg {
          background: linear-gradient(135deg, 
            #FFF5F7 0%, 
            #FFE8F0 25%, 
            #F3E5F5 50%, 
            #E1F5FE 75%, 
            #FFF0F6 100%
          );
          background-size: 400% 400%;
          animation: dreamShift 20s ease-in-out infinite;
        }

        @keyframes dreamShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        /* ✨ Halos flottants dans le fond */
        .dreamscape-bg::before,
        .dreamscape-bg::after {
          content: '';
          position: fixed;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.15;
          pointer-events: none;
          animation: floatHalo 25s ease-in-out infinite;
        }

        .dreamscape-bg::before {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, #E6B3E8, transparent);
          top: -200px;
          left: -200px;
          animation-delay: 0s;
        }

        .dreamscape-bg::after {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #FFC0CB, transparent);
          bottom: -150px;
          right: -150px;
          animation-delay: 12s;
        }

        @keyframes floatHalo {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(100px, -50px) scale(1.1); }
          66% { transform: translate(-50px, 80px) scale(0.95); }
        }

        /* 💫 Animations douces d'apparition */
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* 🫧 Animation de respiration subtile */
        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.01);
            opacity: 0.95;
          }
        }

        /* 🌸 Dérive douce d'éléments */
        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(1deg); }
        }

        /* ✨ Pulse lumineux très doux */
        @keyframes softPulse {
          0%, 100% {
            box-shadow: 0 8px 32px rgba(230, 179, 232, 0.2);
          }
          50% {
            box-shadow: 0 12px 48px rgba(230, 179, 232, 0.35);
          }
        }

        /* 🎴 Cartes oniriques avec verre dépoli */
        .dream-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
          transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1);
          animation: fadeSlideIn 0.8s ease-out backwards;
        }

        .dream-card:hover {
          transform: translateY(-8px) scale(1.01);
          box-shadow: 0 20px 60px rgba(230, 179, 232, 0.25);
          backdrop-filter: blur(24px) saturate(200%);
          border-color: rgba(230, 179, 232, 0.5);
        }

        /* 📊 Stat cards avec halo */
        .stat-dream {
          background: linear-gradient(135deg, 
            rgba(255, 192, 203, 0.9), 
            rgba(255, 182, 193, 0.85)
          );
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          transition: all 350ms ease;
          animation: fadeSlideIn 0.6s ease-out backwards, breathe 6s ease-in-out infinite;
        }

        .stat-dream:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 48px rgba(255, 105, 180, 0.3);
        }

        /* 🌟 Effet flottant sur les icônes */
        .float-icon {
          animation: gentleFloat 4s ease-in-out infinite;
        }

        /* 💭 Texte flou rêveur (titres) */
        .dream-text {
          background: linear-gradient(135deg, #E6B3E8, #FFC0CB, #A7C7E7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 2px 8px rgba(230, 179, 232, 0.3));
          animation: fadeSlideIn 1s ease-out;
        }

        /* 📖 Lectures en cours - effet brumeux */
        .reading-card {
          background: linear-gradient(135deg, 
            rgba(255, 247, 250, 0.9), 
            rgba(255, 240, 246, 0.85)
          );
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 192, 203, 0.2);
          transition: all 400ms ease;
        }

        .reading-card:hover {
          backdrop-filter: blur(20px);
          border-color: rgba(230, 179, 232, 0.4);
          box-shadow: 0 16px 48px rgba(255, 105, 180, 0.2);
        }

        /* 🎵 Citation flottante */
        .quote-dream {
          background: linear-gradient(135deg, 
            rgba(255, 249, 230, 0.95), 
            rgba(255, 236, 179, 0.9)
          );
          backdrop-filter: blur(12px);
          animation: breathe 8s ease-in-out infinite;
        }

        /* ⚡ Déclenchement des animations en séquence */
        .dream-card:nth-child(1) { animation-delay: 0.1s; }
        .dream-card:nth-child(2) { animation-delay: 0.2s; }
        .dream-card:nth-child(3) { animation-delay: 0.3s; }
        .dream-card:nth-child(4) { animation-delay: 0.4s; }

        .stat-dream:nth-child(1) { animation-delay: 0.15s; }
        .stat-dream:nth-child(2) { animation-delay: 0.25s; }
        .stat-dream:nth-child(3) { animation-delay: 0.35s; }
        .stat-dream:nth-child(4) { animation-delay: 0.45s; }

        /* 🌫️ Parallax subtil */
        .parallax-layer {
          transition: transform 0.3s ease-out;
        }

        /* 📱 Responsive */
        @media (max-width: 768px) {
          .dreamscape-bg::before,
          .dreamscape-bg::after {
            display: none;
          }
        }
      `}</style>

      {/* Hero Header onirique */}
      <div className="relative overflow-hidden parallax-layer">
        <div className="relative p-6 md:p-12">
          <div className="max-w-7xl mx-auto">
            {/* Titre principal flottant */}
            <div className="mb-8 md:mb-12">
              <h1 className="text-4xl md:text-6xl font-bold mb-3 dream-text">
                Bonjour {displayName} ✨
              </h1>
              <p className="text-lg md:text-2xl font-medium" 
                 style={{ 
                   color: '#9B7CA0',
                   opacity: 0.8,
                   animation: 'fadeSlideIn 1.2s ease-out'
                 }}>
                Perds-toi dans ton univers littéraire
              </p>
            </div>

            {/* Stats Cards oniriques */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
              <div className="stat-dream p-6 md:p-8 rounded-3xl cursor-pointer"
                   onClick={() => navigate(createPageUrl("MyLibrary"))}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center float-icon"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}>
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <Sparkles className="w-5 h-5 text-white opacity-60 float-icon" style={{ animationDelay: '0.5s' }} />
                </div>
                <p className="text-3xl md:text-5xl font-bold text-white mb-2">
                  {booksReadThisYear}
                </p>
                <p className="text-sm text-white opacity-90 font-medium">Livres lus en {selectedYear}</p>
              </div>

              <div className="stat-dream p-6 md:p-8 rounded-3xl cursor-pointer"
                   onClick={() => navigate(createPageUrl("Statistics"))}
                   style={{ 
                     background: 'linear-gradient(135deg, rgba(230, 179, 232, 0.9), rgba(186, 104, 200, 0.85))',
                     animationDelay: '0.1s'
                   }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center float-icon"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}>
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <Zap className="w-5 h-5 text-white opacity-60 float-icon" style={{ animationDelay: '0.7s' }} />
                </div>
                <p className="text-3xl md:text-5xl font-bold text-white mb-2">
                  {totalPagesThisYear.toLocaleString()}
                </p>
                <p className="text-sm text-white opacity-90 font-medium">Pages dévorées</p>
              </div>

              <div className="stat-dream p-6 md:p-8 rounded-3xl cursor-pointer"
                   onClick={() => navigate(createPageUrl("SharedReadings"))}
                   style={{ 
                     background: 'linear-gradient(135deg, rgba(167, 199, 231, 0.9), rgba(144, 202, 249, 0.85))',
                     animationDelay: '0.2s'
                   }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center float-icon"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}>
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <Heart className="w-5 h-5 text-white opacity-60 float-icon" style={{ animationDelay: '0.9s' }} />
                </div>
                <p className="text-3xl md:text-5xl font-bold text-white mb-2">
                  {myFriends.length}
                </p>
                <p className="text-sm text-white opacity-90 font-medium">Âmes littéraires</p>
              </div>

              <div className="stat-dream p-6 md:p-8 rounded-3xl cursor-pointer"
                   onClick={() => navigate(createPageUrl("MyLibrary"))}
                   style={{ 
                     background: 'linear-gradient(135deg, rgba(255, 182, 200, 0.9), rgba(255, 192, 203, 0.85))',
                     animationDelay: '0.3s'
                   }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center float-icon"
                       style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}>
                    <Target className="w-7 h-7 text-white" />
                  </div>
                  <Clock className="w-5 h-5 text-white opacity-60 float-icon" style={{ animationDelay: '1.1s' }} />
                </div>
                <p className="text-3xl md:text-5xl font-bold text-white mb-2">
                  {toReadCount}
                </p>
                <p className="text-sm text-white opacity-90 font-medium">Rêves en attente</p>
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

            {/* Lectures en cours oniriques */}
            <div className="dream-card rounded-3xl overflow-hidden">
              <div className="h-1" style={{ background: 'linear-gradient(90deg, #E6B3E8, #FFC0CB, #A7C7E7)' }} />
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3" style={{ color: '#9B7CA0' }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center float-icon"
                         style={{ 
                           background: 'linear-gradient(135deg, rgba(230, 179, 232, 0.3), rgba(255, 192, 203, 0.3))',
                           backdropFilter: 'blur(10px)'
                         }}>
                      <BookOpen className="w-7 h-7" style={{ color: '#E6B3E8' }} />
                    </div>
                    En cours de lecture
                  </h2>
                  {currentlyReading.length > 0 && (
                    <span className="px-4 py-2 rounded-full text-sm font-bold text-white shadow-lg float-icon"
                          style={{ 
                            background: 'linear-gradient(135deg, #E6B3E8, #FFC0CB)',
                            backdropFilter: 'blur(10px)'
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

                      const progress = userBook.current_page && book.page_count 
                        ? Math.round((userBook.current_page / book.page_count) * 100)
                        : 0;

                      return (
                        <div key={userBook.id}
                             className="reading-card cursor-pointer p-4 md:p-6 rounded-2xl"
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
                                       style={{ 
                                         backgroundColor: 'rgba(230, 179, 232, 0.2)',
                                         backdropFilter: 'blur(10px)'
                                       }}>
                                    <div className="h-full rounded-full transition-all duration-700"
                                         style={{
                                           width: `${progress}%`,
                                           background: 'linear-gradient(90deg, #E6B3E8, #FFC0CB, #A7C7E7)',
                                           boxShadow: '0 2px 12px rgba(230, 179, 232, 0.4)'
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
              </div>
            </div>

            {/* Amies qui lisent en ce moment */}
            {friendsBooks.filter(b => b.status === "En cours").length > 0 && (
              <div className="dream-card rounded-3xl overflow-hidden">
                <div className="h-1" style={{ background: 'linear-gradient(90deg, #A7C7E7, #E6B3E8, #FFC0CB)' }} />
                <div className="p-6 md:p-8">
                  <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3" style={{ color: '#9B7CA0' }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center float-icon"
                         style={{ 
                           background: 'linear-gradient(135deg, rgba(167, 199, 231, 0.3), rgba(230, 179, 232, 0.3))',
                           backdropFilter: 'blur(10px)'
                         }}>
                      <Users className="w-7 h-7" style={{ color: '#A7C7E7' }} />
                    </div>
                    Tes âmes sœurs lisent
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
                             className="reading-card p-4 rounded-2xl"
                             style={{ 
                               background: 'linear-gradient(135deg, rgba(243, 229, 245, 0.8), rgba(225, 190, 231, 0.7))',
                               backdropFilter: 'blur(12px)'
                             }}>
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
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite */}
          <div className="space-y-4 md:space-y-6">
            {/* Citation flottante */}
            <div className="quote-dream rounded-3xl overflow-hidden border border-white/30">
              <div className="h-1" style={{ background: 'linear-gradient(90deg, #FFD700, #FFB347, #FFA500)' }} />
              <div className="p-6 md:p-8 text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center float-icon"
                     style={{ 
                       backgroundColor: 'rgba(255, 215, 0, 0.2)',
                       backdropFilter: 'blur(10px)'
                     }}>
                  <QuoteIcon className="w-8 h-8" style={{ color: '#FFB347' }} />
                </div>
                <h2 className="text-xl font-bold mb-4" style={{ color: '#9B7CA0' }}>
                  Murmure du jour
                </h2>
                {randomQuote && quoteBook ? (
                  <>
                    <p className="text-base md:text-lg italic mb-4 leading-relaxed" 
                       style={{ 
                         color: '#6B5B73',
                         lineHeight: '1.8',
                         filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.05))'
                       }}>
                      "{randomQuote.quote_text}"
                    </p>
                    <p className="text-sm font-bold" style={{ color: '#FFB347' }}>
                      — {quoteBook.title}
                    </p>
                  </>
                ) : (
                  <p className="text-lg italic" style={{ color: '#9B7CA0' }}>
                    "Lire, c'est se perdre dans l'infini des rêves."
                  </p>
                )}
              </div>
            </div>

            {/* Playlist musicale */}
            {allMusicWithBooks.length > 0 && (
              <div className="dream-card rounded-3xl overflow-hidden cursor-pointer"
                   onClick={() => navigate(createPageUrl("MusicPlaylist"))}
                   style={{ animationDelay: '0.3s' }}>
                <div className="p-6 md:p-8"
                     style={{ 
                       background: 'linear-gradient(135deg, rgba(230, 179, 232, 0.8), rgba(255, 182, 200, 0.7))',
                       backdropFilter: 'blur(16px)'
                     }}>
                  <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2 float-icon">
                    <Music className="w-6 h-6" />
                    Bande-son onirique
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
                  <Button className="w-full mt-4 bg-white/90 backdrop-blur-md font-bold rounded-xl py-3 hover:bg-white transition-all"
                          style={{ color: '#9B59B6' }}>
                    Découvrir plus
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Accès rapide */}
            <div className="dream-card rounded-3xl overflow-hidden" style={{ animationDelay: '0.4s' }}>
              <div className="p-6 md:p-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#9B7CA0' }}>
                  <Sparkles className="w-5 h-5 float-icon" />
                  Portails magiques
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <Link to={createPageUrl("SharedReadings")}>
                    <div className="p-4 rounded-2xl text-center dream-card cursor-pointer"
                         style={{ 
                           background: 'linear-gradient(135deg, rgba(255, 240, 246, 0.9), rgba(255, 230, 240, 0.8))',
                           backdropFilter: 'blur(10px)',
                           animationDelay: '0.5s'
                         }}>
                      <Users className="w-8 h-8 mx-auto mb-2 float-icon" style={{ color: '#E6B3E8' }} />
                      <p className="text-sm font-bold" style={{ color: '#9B7CA0' }}>Lectures partagées</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("Quotes")}>
                    <div className="p-4 rounded-2xl text-center dream-card cursor-pointer"
                         style={{ 
                           background: 'linear-gradient(135deg, rgba(255, 249, 230, 0.9), rgba(255, 236, 179, 0.8))',
                           backdropFilter: 'blur(10px)',
                           animationDelay: '0.6s'
                         }}>
                      <QuoteIcon className="w-8 h-8 mx-auto mb-2 float-icon" style={{ color: '#FFB347' }} />
                      <p className="text-sm font-bold" style={{ color: '#9B7CA0' }}>Murmures</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("BookTournament")}>
                    <div className="p-4 rounded-2xl text-center dream-card cursor-pointer"
                         style={{ 
                           background: 'linear-gradient(135deg, rgba(255, 245, 230, 0.9), rgba(255, 224, 178, 0.8))',
                           backdropFilter: 'blur(10px)',
                           animationDelay: '0.7s'
                         }}>
                      <Trophy className="w-8 h-8 mx-auto mb-2 float-icon" style={{ color: '#FF9F7F' }} />
                      <p className="text-sm font-bold" style={{ color: '#9B7CA0' }}>Tournoi</p>
                    </div>
                  </Link>

                  <Link to={createPageUrl("Profile")}>
                    <div className="p-4 rounded-2xl text-center dream-card cursor-pointer"
                         style={{ 
                           background: 'linear-gradient(135deg, rgba(255, 230, 240, 0.9), rgba(255, 192, 203, 0.8))',
                           backdropFilter: 'blur(10px)',
                           animationDelay: '0.8s'
                         }}>
                      <Heart className="w-8 h-8 mx-auto mb-2 float-icon" style={{ color: '#FFC0CB' }} />
                      <p className="text-sm font-bold" style={{ color: '#9B7CA0' }}>Âmes fictives</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
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