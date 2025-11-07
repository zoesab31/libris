import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, TrendingUp, Users, Star, Plus, Music, Heart, MessageCircle, Sparkles, Target, ArrowRight, Calendar, Quote as QuoteIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatsCard from "../components/dashboard/StatsCard";
import RecentActivity from "../components/dashboard/RecentActivity";
import ReadingGoalCard from "../components/dashboard/ReadingGoalCard";
import YearSelector from "../components/dashboard/YearSelector";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [animatedCount, setAnimatedCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [], isLoading: loadingBooks } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 1000,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 1000,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['recentComments'],
    queryFn: () => base44.entities.ReadingComment.list('-created_date', 5),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 1000,
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
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 1000,
  });

  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ created_by: user?.email, status: "Acceptée" }),
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 1000,
  });

  const { data: friendsBooks = [] } = useQuery({
    queryKey: ['friendsBooks'],
    queryFn: async () => {
      const friendsEmails = myFriends.map(f => f.friend_email);
      if (friendsEmails.length === 0) return [];
      
      const allFriendsBooks = await Promise.all(
        friendsEmails.map(email => 
          base44.entities.UserBook.filter({ created_by: email, status: "En cours" })
        )
      );
      
      return allFriendsBooks.flat();
    },
    enabled: myFriends.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 1000,
  });

  const { data: friendsFinishedBooks = [] } = useQuery({
    queryKey: ['friendsFinishedBooks', selectedYear],
    queryFn: async () => {
      const friendsEmails = myFriends.map(f => f.friend_email);
      if (friendsEmails.length === 0) return [];
      
      const allFriendsFinishedBooks = await Promise.all(
        friendsEmails.map(email => 
          base44.entities.UserBook.filter({ created_by: email, status: "Lu" }, '-end_date', 50)
        )
      );
      
      return allFriendsFinishedBooks.flat()
        .filter(userBook => {
          if (!userBook.end_date) return false;
          const endYear = new Date(userBook.end_date).getFullYear();
          return endYear === selectedYear;
        })
        .sort((a, b) => new Date(b.end_date) - new Date(a.end_date))
        .slice(0, 10);
    },
    enabled: myFriends.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 1000,
  });

  const { data: friendsComments = [] } = useQuery({
    queryKey: ['friendsComments'],
    queryFn: async () => {
      const friendsEmails = myFriends.map(f => f.friend_email);
      if (friendsEmails.length === 0) return [];
      
      const allCommentsPromises = friendsEmails.map(email =>
        base44.entities.ReadingComment.filter({ created_by: email }, '-created_date', 3)
      );
      
      const allComments = await Promise.all(allCommentsPromises);
      return allComments.flat().sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      ).slice(0, 5);
    },
    enabled: myFriends.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 1000,
  });

  const { data: allSharedReadings = [] } = useQuery({
    queryKey: ['sharedReadings'],
    queryFn: () => base44.entities.SharedReading.filter({ created_by: user?.email }),
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 1000,
  });

  const { data: allQuotes = [] } = useQuery({
    queryKey: ['allQuotes'],
    queryFn: () => base44.entities.Quote.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const currentlyReading = myBooks.filter(b => b.status === "En cours");
  const readBooks = myBooks.filter(b => b.status === "Lu");
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

  const sharedReadingsThisYear = allSharedReadings.filter(sr => {
    if (!sr.start_date) return false;
    const startYear = new Date(sr.start_date).getFullYear();
    const endYear = sr.end_date ? new Date(sr.end_date).getFullYear() : startYear;
    return startYear <= selectedYear && selectedYear <= endYear;
  }).length;

  const ratedBooks = readBooks.filter(b => b.rating !== undefined && b.rating !== null);
  const avgRating = ratedBooks.length > 0 
    ? (ratedBooks.reduce((sum, b) => sum + b.rating, 0) / ratedBooks.length).toFixed(1)
    : 0;

  const allRecentComments = [...comments, ...friendsComments]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 8);

  // Last finished book
  const lastFinishedBook = myBooks
    .filter(b => b.status === "Lu" && b.end_date)
    .sort((a, b) => new Date(b.end_date) - new Date(a.end_date))[0];
  
  const lastFinishedBookData = lastFinishedBook ? allBooks.find(b => b.id === lastFinishedBook.book_id) : null;

  // Random quote from user's quotes
  const randomQuote = allQuotes.length > 0 ? allQuotes[Math.floor(Math.random() * allQuotes.length)] : null;
  const quoteBook = randomQuote ? allBooks.find(b => b.id === randomQuote.book_id) : null;

  // Suggested book from wishlist
  const wishlistBooks = myBooks.filter(b => b.status === "À lire" || b.status === "Wishlist");
  const suggestedBook = wishlistBooks.length > 0 
    ? allBooks.find(b => b.id === wishlistBooks[Math.floor(Math.random() * wishlistBooks.length)]?.book_id)
    : null;

  // Books with music for playlist
  const booksWithMusic = myBooks.filter(b => b.music && b.music_link).slice(0, 1);

  // Animated counter effect
  useEffect(() => {
    if (booksReadThisYear > 0) {
      let start = 0;
      const duration = 1500;
      const increment = booksReadThisYear / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= booksReadThisYear) {
          setAnimatedCount(booksReadThisYear);
          clearInterval(timer);
        } else {
          setAnimatedCount(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }
  }, [booksReadThisYear]);

  // Progress message
  const getProgressMessage = () => {
    if (!readingGoal) return "Aucun objectif défini pour cette année";
    const remaining = readingGoal.goal_count - booksReadThisYear;
    if (remaining <= 0) return `🎉 Objectif atteint ! ${booksReadThisYear} livre${booksReadThisYear > 1 ? 's' : ''} lu${booksReadThisYear > 1 ? 's' : ''} cette année !`;
    if (remaining === 1) return "Plus qu'un seul livre pour atteindre ton objectif ! 📚";
    return `${remaining} livres restants pour ton objectif 📖`;
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #FFF5F9 0%, #FFFFFF 100%)' }}>
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
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out;
        }
        
        .animate-pulse-slow {
          animation: pulse 3s ease-in-out infinite;
        }
        
        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(255, 20, 147, 0.15);
        }

        .gradient-text {
          background: linear-gradient(135deg, var(--deep-pink), var(--warm-pink));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .card-glow {
          box-shadow: 0 4px 20px rgba(255, 105, 180, 0.1);
        }

        .card-glow:hover {
          box-shadow: 0 8px 32px rgba(255, 105, 180, 0.2);
        }
      `}</style>

      {/* Hero Section */}
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 gradient-text">
              Bonjour {user?.display_name || user?.full_name?.split(' ')[0] || 'Lectrice'} 🌸
            </h1>
            <p className="text-xl md:text-2xl mb-4" style={{ color: 'var(--warm-pink)' }}>
              {getProgressMessage()}
            </p>
            <Link to={createPageUrl("MyLibrary")}>
              <Button 
                className="shadow-2xl text-white font-bold px-8 py-6 rounded-2xl transition-all hover:shadow-3xl hover:scale-105 text-lg"
                style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
              >
                <Plus className="w-6 h-6 mr-2" />
                Ajouter un livre
              </Button>
            </Link>
          </div>

          {/* Year Selector */}
          <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <YearSelector currentYear={selectedYear} onYearChange={setSelectedYear} />
          </div>

          {/* BLOC 1: MA PROGRESSION */}
          <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  📊 Ma Progression
                </h2>
                <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                  Suivi de mes lectures {selectedYear}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <ReadingGoalCard 
                  currentGoal={readingGoal}
                  booksReadThisYear={booksReadThisYear}
                  year={selectedYear}
                  user={user}
                />

                {/* Last Finished Book */}
                {lastFinishedBook && lastFinishedBookData && (
                  <Card className="shadow-2xl border-0 overflow-hidden hover-lift card-glow" style={{ backgroundColor: 'white' }}>
                    <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--gold), var(--warm-pink))' }} />
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                        <Sparkles className="w-5 h-5" />
                        Dernier livre terminé
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4">
                        <div className="w-24 h-36 rounded-xl overflow-hidden shadow-lg flex-shrink-0 animate-pulse-slow"
                             style={{ backgroundColor: 'var(--beige)' }}>
                          {lastFinishedBookData.cover_url ? (
                            <img src={lastFinishedBookData.cover_url} alt={lastFinishedBookData.title} 
                                 className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="w-8 h-8" style={{ color: 'var(--warm-pink)' }} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-2 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                            {lastFinishedBookData.title}
                          </h3>
                          <p className="text-sm mb-3" style={{ color: 'var(--warm-pink)' }}>
                            {lastFinishedBookData.author}
                          </p>
                          {lastFinishedBook.rating && (
                            <div className="flex items-center gap-1 mb-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className="w-4 h-4"
                                  style={{
                                    fill: i < lastFinishedBook.rating ? 'var(--gold)' : 'none',
                                    stroke: 'var(--gold)',
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          {lastFinishedBook.review && (
                            <p className="text-sm italic line-clamp-2" style={{ color: 'var(--warm-brown)' }}>
                              "{lastFinishedBook.review}"
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard 
                  title="Livres lus" 
                  value={booksReadThisYear}
                  icon={BookOpen}
                  gradient="linear-gradient(135deg, #FF8FAB, #FFB6C8)"
                />
                <StatsCard 
                  title="Pages lues" 
                  value={totalPagesThisYear.toLocaleString()}
                  icon={TrendingUp}
                  gradient="linear-gradient(135deg, #FFB6C8, #F4C2C2)"
                />
                <StatsCard 
                  title="Lectures communes" 
                  value={sharedReadingsThisYear}
                  icon={Users}
                  gradient="linear-gradient(135deg, #F4C2C2, #FFD700)"
                />
                <StatsCard 
                  title="À lire" 
                  value={toReadCount}
                  icon={Star}
                  gradient="linear-gradient(135deg, #FFD700, #FFB6C8)"
                />
              </div>
            </div>
          </div>

          {/* BLOC 2: MES AMIES & ACTIVITÉ SOCIALE */}
          <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                👭 Mes Amies & Activités
              </h2>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                Suivez les lectures de votre communauté
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Currently Reading - Me & Friends */}
              <Card className="shadow-2xl border-0 overflow-hidden hover-lift card-glow" style={{ backgroundColor: 'white' }}>
                <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--soft-pink), var(--lavender))' }} />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                    <BookOpen className="w-5 h-5" />
                    Lectures en cours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentlyReading.length > 0 || friendsBooks.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                      {currentlyReading.slice(0, 2).map((userBook) => {
                        const book = allBooks.find(b => b.id === userBook.book_id);
                        if (!book) return null;
                        return (
                          <div key={userBook.id} className="flex gap-3 p-3 rounded-xl transition-all hover:shadow-md"
                               style={{ backgroundColor: 'var(--cream)' }}>
                            <div className="w-16 h-24 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                                 style={{ backgroundColor: 'var(--beige)' }}>
                              {book.cover_url && (
                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs px-2 py-1 rounded-full font-bold mb-2 inline-block"
                                    style={{ backgroundColor: 'var(--deep-pink)', color: 'white' }}>
                                Vous 📖
                              </span>
                              <h3 className="font-bold text-sm mb-1 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                                {book.title}
                              </h3>
                              <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                                {book.author}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {friendsBooks.slice(0, 3).map((userBook) => {
                        const book = allBooks.find(b => b.id === userBook.book_id);
                        const friend = myFriends.find(f => f.friend_email === userBook.created_by);
                        if (!book || !friend) return null;
                        return (
                          <div key={userBook.id} className="flex gap-3 p-3 rounded-xl transition-all hover:shadow-md"
                               style={{ backgroundColor: 'var(--cream)' }}>
                            <div className="w-16 h-24 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                                 style={{ backgroundColor: 'var(--beige)' }}>
                              {book.cover_url && (
                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs px-2 py-1 rounded-full font-bold mb-2 inline-block"
                                    style={{ backgroundColor: 'var(--soft-pink)', color: 'white' }}>
                                {friend.friend_name?.split(' ')[0]} 📖
                              </span>
                              <h3 className="font-bold text-sm mb-1 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                                {book.title}
                              </h3>
                              <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                                {book.author}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                      <p style={{ color: 'var(--warm-pink)' }}>Aucune lecture en cours</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity Timeline */}
              <RecentActivity 
                comments={allRecentComments}
                allBooks={allBooks}
                myFriends={myFriends}
              />
            </div>

            {/* Friends finished books */}
            {myFriends.length > 0 && friendsFinishedBooks.length > 0 && (
              <Card className="shadow-2xl border-0 overflow-hidden mt-6 hover-lift card-glow" style={{ backgroundColor: 'white' }}>
                <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--lavender), var(--gold))' }} />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                    <Users className="w-5 h-5" />
                    Livres terminés par mes amies ({selectedYear})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {friendsFinishedBooks.slice(0, 6).map((userBook) => {
                      const book = allBooks.find(b => b.id === userBook.book_id);
                      const friend = myFriends.find(f => f.friend_email === userBook.created_by);
                      if (!book || !friend) return null;

                      return (
                        <div key={`${userBook.id}-${userBook.end_date}`}
                             className="flex gap-3 p-3 rounded-xl transition-all hover:shadow-md"
                             style={{ backgroundColor: 'var(--cream)' }}>
                          <div className="w-12 h-18 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                               style={{ backgroundColor: 'var(--beige)' }}>
                            {book.cover_url && (
                              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs mb-1 font-medium" style={{ color: 'var(--deep-pink)' }}>
                              {friend.friend_name?.split(' ')[0]}
                            </p>
                            <h3 className="font-bold text-sm mb-1 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                              {book.title}
                            </h3>
                            {userBook.rating && (
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className="w-3 h-3"
                                        style={{ fill: i < userBook.rating ? 'var(--gold)' : 'none', stroke: 'var(--gold)' }} />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* BLOC 3: INSPIRATION & DÉCOUVERTE */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                ✨ Inspiration & Découverte
              </h2>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                Musique, citations et suggestions
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Playlist */}
              {booksWithMusic.length > 0 && (
                <Card className="shadow-2xl border-0 overflow-hidden hover-lift card-glow" style={{ backgroundColor: 'white' }}>
                  <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--deep-pink), var(--gold))' }} />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg" style={{ color: 'var(--dark-text)' }}>
                      <Music className="w-5 h-5" />
                      Ma Playlist Littéraire
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {booksWithMusic.map((userBook) => {
                      const book = allBooks.find(b => b.id === userBook.book_id);
                      const platform = userBook.music_link?.includes('youtube') || userBook.music_link?.includes('youtu.be') 
                        ? 'youtube' 
                        : userBook.music_link?.includes('spotify') 
                        ? 'spotify' 
                        : 'deezer';
                      
                      return (
                        <div key={userBook.id} className="rounded-xl overflow-hidden"
                             style={{ background: 'linear-gradient(135deg, var(--soft-pink), var(--beige))' }}>
                          <div className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <Music className="w-10 h-10 p-2 rounded-full shadow-md" 
                                     style={{ backgroundColor: 'var(--deep-pink)', color: 'white' }} />
                              <div className="flex-1">
                                <p className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
                                  🎵 {userBook.music}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                                  {userBook.music_artist}
                                </p>
                              </div>
                            </div>
                            <a href={userBook.music_link} target="_blank" rel="noopener noreferrer">
                              <Button className="w-full" style={{ backgroundColor: 'var(--deep-pink)', color: 'white' }}>
                                ▶️ Écouter
                              </Button>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Random Quote */}
              {randomQuote && quoteBook && (
                <Card className="shadow-2xl border-0 overflow-hidden hover-lift card-glow" style={{ backgroundColor: 'white' }}>
                  <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--lavender), var(--rose-gold))' }} />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg" style={{ color: 'var(--dark-text)' }}>
                      <QuoteIcon className="w-5 h-5" />
                      Citation du moment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                      <p className="text-lg italic mb-4 leading-relaxed" style={{ color: 'var(--dark-text)' }}>
                        "{randomQuote.quote_text}"
                      </p>
                      <p className="text-sm font-medium" style={{ color: 'var(--deep-pink)' }}>
                        — {quoteBook.title}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Suggested Book */}
              {suggestedBook && (
                <Card className="shadow-2xl border-0 overflow-hidden hover-lift card-glow" style={{ backgroundColor: 'white' }}>
                  <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--gold), var(--soft-pink))' }} />
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg" style={{ color: 'var(--dark-text)' }}>
                      <Sparkles className="w-5 h-5" />
                      Suggestion du jour
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                      <div className="w-20 h-30 rounded-lg overflow-hidden shadow-lg flex-shrink-0"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {suggestedBook.cover_url && (
                          <img src={suggestedBook.cover_url} alt={suggestedBook.title} 
                               className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-2 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                          {suggestedBook.title}
                        </h3>
                        <p className="text-sm mb-3" style={{ color: 'var(--warm-pink)' }}>
                          {suggestedBook.author}
                        </p>
                        <Button 
                          size="sm" 
                          className="text-white"
                          style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                          onClick={() => navigate(createPageUrl("MyLibrary"))}
                        >
                          Commencer <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Access */}
              <Card className="shadow-2xl border-0 overflow-hidden hover-lift card-glow" style={{ backgroundColor: 'white' }}>
                <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--rose-gold), var(--soft-pink))' }} />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg" style={{ color: 'var(--dark-text)' }}>
                    <Heart className="w-5 h-5" />
                    Accès rapide
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start font-medium hover-lift"
                    style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}
                    onClick={() => navigate(createPageUrl("Friends"))}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Mes amies
                  </Button>
                  <Link to={createPageUrl("SharedReadings")}>
                    <Button variant="outline" className="w-full justify-start font-medium hover-lift" 
                            style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                      <Users className="w-4 h-4 mr-2" />
                      Lectures communes
                    </Button>
                  </Link>
                  <Link to={createPageUrl("Profile")}>
                    <Button variant="outline" className="w-full justify-start font-medium hover-lift" 
                            style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                      <Heart className="w-4 h-4 mr-2" />
                      Mes Personnages
                    </Button>
                  </Link>
                  <Link to={createPageUrl("Chat")}>
                    <Button variant="outline" className="w-full justify-start font-medium hover-lift" 
                            style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Chat
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}