import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/layout/PullToRefresh";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { BookOpen, TrendingUp, Users, Star, Plus, Music, Heart, MessageCircle, Quote, Trophy, Library, ArrowRight, Sparkles, Flame, Zap, Clock, Target, Edit2, Check, X, Home, Settings, User } from "lucide-react";
import NotificationBell from "../components/notifications/NotificationBell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from "framer-motion";
import ReadingGoalManager from "../components/dashboard/ReadingGoalManager";
import BookDetailsDialog from "../components/library/BookDetailsDialog";
import BestFriendCard from "../components/dashboard/BestFriendCard";
import SocialFeedCard from "../components/dashboard/SocialFeedCard";
import ReadingStreakCard from "../components/dashboard/ReadingStreakCard";
import FloatingParticles from "../components/effects/FloatingParticles";
import OnboardingTrigger from "../components/onboarding/OnboardingTrigger";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBookForDetails, setSelectedBookForDetails] = useState(null);
  const [editingBookId, setEditingBookId] = useState(null);
  const [editValues, setEditValues] = useState({ currentPage: '', totalPages: '' });
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['currentlyReading'] }),
      queryClient.invalidateQueries({ queryKey: ['friends'] }),
      queryClient.invalidateQueries({ queryKey: ['quotes'] }),
      queryClient.invalidateQueries({ queryKey: ['userBooks'] }),
    ]);
  };

  const handleMarkToday = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    await base44.entities.ReadingDay.create({ date: today });
    queryClient.invalidateQueries({ queryKey: ['readingDayToday'] });
    toast.success("Jour de lecture enregistré");
  };

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

  const { data: readingDayToday = [] } = useQuery({
    queryKey: ['readingDayToday', user?.email],
    queryFn: () => base44.entities.ReadingDay.filter({ created_by: user?.email, date: format(new Date(), 'yyyy-MM-dd') }),
    enabled: !!user,
    refetchInterval: 5000,
  });

  const hasReadToday = readingDayToday.length > 0;

  const { data: activityFeed = [] } = useQuery({
    queryKey: ['activityFeed'],
    queryFn: async () => {
      const friendsEmails = myFriends.map(f => f.friend_email);
      if (friendsEmails.length === 0) return [];
      
      const allActivities = await base44.entities.ActivityFeed.list('-created_date', 50);
      return allActivities.filter(activity => 
        friendsEmails.includes(activity.created_by) && activity.is_visible
      );
    },
    enabled: myFriends.length > 0,
    refetchInterval: 30000,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
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
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen relative" style={{ background: 'linear-gradient(180deg, #FFEAF4 0%, #FDE7F1 50%, #FADDEB 100%)' }}>
      <OnboardingTrigger />
      <FloatingParticles count={30} />
      <style>{`
        .dash-card {
          transition: all 350ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dash-card:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 20px 40px rgba(255, 105, 180, 0.25);
        }
        .stat-bubble {
          transition: all 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }
        .stat-bubble::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s;
        }
        .stat-bubble:hover::before {
          left: 100%;
        }
        .stat-bubble:hover {
          transform: translateY(-8px) scale(1.05) rotate(-1deg);
          box-shadow: 0 20px 50px rgba(255, 105, 180, 0.35);
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-15px) rotate(5deg); }
          50% { transform: translateY(-10px) rotate(0deg); }
          75% { transform: translateY(-20px) rotate(-5deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(255, 105, 180, 0.3);
            filter: brightness(1);
          }
          50% { 
            box-shadow: 0 0 50px rgba(255, 105, 180, 0.8);
            filter: brightness(1.1);
          }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes scale-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .floating-sparkle {
          animation: float 4s ease-in-out infinite;
        }
        .gradient-animate {
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
        .bounce-hover:hover {
          animation: bounce-subtle 0.6s ease infinite;
        }
        .rotate-on-hover:hover {
          animation: rotate-slow 3s linear infinite;
        }
        .progress-shimmer {
          position: relative;
          overflow: hidden;
        }
        .progress-shimmer::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>

      {/* Hero Header */}
      <div className="relative overflow-hidden">
        {/* Floating decorative elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-10 right-20"
            animate={{ 
              y: [0, -25, 5, -20, 0], 
              rotate: [0, 15, -5, 10, 0],
              scale: [1, 1.2, 0.9, 1.1, 1]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="w-8 h-8" style={{ color: '#FFD700', opacity: 0.4 }} />
          </motion.div>
          <motion.div
            className="absolute top-32 left-16"
            animate={{ 
              y: [0, 20, -10, 15, 0], 
              rotate: [0, -20, 10, -15, 0],
              x: [0, 10, -5, 5, 0]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <BookOpen className="w-10 h-10" style={{ color: '#FF69B4', opacity: 0.3 }} />
          </motion.div>
          <motion.div
            className="absolute bottom-20 right-32"
            animate={{ 
              y: [0, -30, 10, -25, 0], 
              rotate: [0, 25, -10, 20, 0],
              scale: [1, 1.3, 0.95, 1.2, 1]
            }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          >
            <Heart className="w-6 h-6" style={{ color: '#FF1493', opacity: 0.35 }} />
          </motion.div>
          <motion.div
            className="absolute top-64 right-64"
            animate={{ 
              y: [0, -35, 15, -30, 0], 
              x: [0, 25, -10, 20, 0],
              rotate: [0, 360, 180, 360, 0],
              scale: [1, 1.4, 0.9, 1.3, 1]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            <Star className="w-5 h-5" style={{ color: '#FFB6C1', opacity: 0.3 }} />
          </motion.div>
          <motion.div
            className="absolute bottom-40 left-40"
            animate={{ 
              y: [0, 25, -5, 20, 0], 
              rotate: [0, -15, 5, -10, 0],
              opacity: [0.25, 0.5, 0.3, 0.45, 0.25]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          >
            <Music className="w-7 h-7" style={{ color: '#E91E63', opacity: 0.35 }} />
          </motion.div>
          <motion.div
            className="absolute top-1/2 left-10"
            animate={{ 
              y: [0, -20, 10, -15, 0],
              rotate: [0, 180, 90, 270, 0],
              scale: [1, 1.5, 0.8, 1.3, 1]
            }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          >
            <Sparkles className="w-6 h-6" style={{ color: '#9C27B0', opacity: 0.25 }} />
          </motion.div>
          <motion.div
            className="absolute top-20 left-1/3"
            animate={{ 
              y: [0, 30, -15, 25, 0],
              x: [0, -20, 10, -15, 0],
              scale: [1, 0.8, 1.2, 0.9, 1]
            }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
          >
            <Heart className="w-5 h-5" style={{ color: '#FFB6C1', opacity: 0.3 }} />
          </motion.div>
          <motion.div
            className="absolute bottom-32 left-1/2"
            animate={{ 
              y: [0, -40, 20, -35, 0],
              rotate: [0, -360, -180, -360, 0],
            }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <Star className="w-7 h-7" style={{ color: '#FF69B4', opacity: 0.25 }} />
          </motion.div>
        </div>

        <div className="relative p-6 md:p-10">
          <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20 flex items-center gap-2">
            <NotificationBell user={user} />
            <Link to={createPageUrl('AccountSettings')} className="inline-flex items-center justify-center w-10 h-10 rounded-full shadow-md md:w-11 md:h-11" style={{ backgroundColor: 'white', border: '1px solid rgba(255,105,180,0.25)' }}>
              <Settings className="w-5 h-5" style={{ color: '#FF1493' }} />
            </Link>
          </div>
          <div className="max-w-7xl mx-auto">
            {/* Titre principal */}
            <motion.div 
              className="mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-3xl md:text-5xl font-bold mb-2" 
                  style={{ color: '#FF1493' }}>
                Bonjour {displayName} ✨
              </h1>
              <p className="text-base md:text-xl" style={{ color: '#2c2c2cff' }}>
                Ton univers littéraire t'attend
              </p>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
              <motion.div 
                className="stat-bubble p-5 md:p-6 rounded-3xl cursor-pointer gradient-animate"
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 100 }}
                whileHover={{ 
                  scale: 1.08,
                  rotate: [0, -2, 2, 0],
                  transition: { duration: 0.3 }
                }}
                whileTap={{ scale: 0.95 }}
                   onClick={() => navigate(createPageUrl("MyLibrary"))}
                   style={{ 
                     background: 'linear-gradient(135deg, #FFE9F0 0%, #FFD6E4 100%)',
                     border: '1px solid rgba(255, 105, 180, 0.15)'
                   }}>
                <div className="flex items-center gap-3 mb-3">
                  <motion.div 
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: '#FF69B4' }}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <BookOpen className="w-5 h-5 text-white" />
                  </motion.div>
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: '#FFD700' }} />
                  </motion.div>
                </div>
                <p className="text-3xl md:text-4xl font-bold mb-1" style={{ color: '#FF1493' }}>
                  {booksReadThisYear}
                </p>
                <p className="text-sm font-medium" style={{ color: '#2c2c2cff' }}>
                  Livres lus en {selectedYear}
                </p>
              </motion.div>

              <motion.div 
                className="stat-bubble p-5 md:p-6 rounded-3xl cursor-pointer gradient-animate"
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 100 }}
                whileHover={{ 
                  scale: 1.08,
                  rotate: [0, 2, -2, 0],
                  transition: { duration: 0.3 }
                }}
                whileTap={{ scale: 0.95 }}
                   onClick={() => navigate(createPageUrl("Statistics"))}
                   style={{ 
                     background: 'linear-gradient(135deg, #FFE9F0 0%, #FFD6E4 100%)',
                     border: '1px solid rgba(255, 105, 180, 0.15)'
                   }}>
                <div className="flex items-center gap-3 mb-3">
                  <motion.div 
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: '#FF1493' }}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <TrendingUp className="w-5 h-5 text-white" />
                  </motion.div>
                  <motion.div
                    animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: '#FFD700' }} />
                  </motion.div>
                </div>
                <p className="text-3xl md:text-4xl font-bold mb-1" style={{ color: '#FF1493' }}>
                  {totalPagesThisYear.toLocaleString()}
                </p>
                <p className="text-sm font-medium" style={{ color: '#2c2c2cff' }}>
                  Pages dévorées
                </p>
              </motion.div>

              <motion.div 
                className="stat-bubble p-5 md:p-6 rounded-3xl cursor-pointer gradient-animate"
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3, type: "spring", stiffness: 100 }}
                whileHover={{ 
                  scale: 1.08,
                  rotate: [0, -2, 2, 0],
                  transition: { duration: 0.3 }
                }}
                whileTap={{ scale: 0.95 }}
                   onClick={() => navigate(createPageUrl("SharedReadings"))}
                   style={{ 
                     background: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)',
                     border: '1px solid rgba(156, 39, 176, 0.15)'
                   }}>
                <div className="flex items-center gap-3 mb-3">
                  <motion.div 
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: '#9C27B0' }}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Users className="w-5 h-5 text-white" />
                  </motion.div>
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: '#FFD700' }} />
                  </motion.div>
                </div>
                <p className="text-3xl md:text-4xl font-bold mb-1" style={{ color: '#9C27B0' }}>
                  {myFriends.length}
                </p>
                <p className="text-sm font-medium" style={{ color: '#2c2c2cff' }}>
                  Lectures communes
                </p>
              </motion.div>

              <motion.div 
                className="stat-bubble p-5 md:p-6 rounded-3xl cursor-pointer gradient-animate"
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, type: "spring", stiffness: 100 }}
                whileHover={{ 
                  scale: 1.08,
                  rotate: [0, 2, -2, 0],
                  transition: { duration: 0.3 }
                }}
                whileTap={{ scale: 0.95 }}
                   onClick={() => navigate(createPageUrl("MyLibrary"))}
                   style={{ 
                     background: 'linear-gradient(135deg, #FFE9F0 0%, #FFD6E4 100%)',
                     border: '1px solid rgba(255, 105, 180, 0.15)'
                   }}>
                <div className="flex items-center gap-3 mb-3">
                  <motion.div 
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: '#FFB6C8' }}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Target className="w-5 h-5 text-white" />
                  </motion.div>
                  <motion.div
                    animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.9 }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: '#FFD700' }} />
                  </motion.div>
                </div>
                <p className="text-3xl md:text-4xl font-bold mb-1" style={{ color: '#FF69B4' }}>
                  {toReadCount}
                </p>
                <p className="text-sm font-medium" style={{ color: '#2c2c2cff' }}>
                  Livres dans ta PAL
                </p>
              </motion.div>
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

              <Button
                onClick={handleMarkToday}
                disabled={hasReadToday}
                className="w-full md:w-auto font-bold px-6 py-3 rounded-2xl text-base dash-card"
                style={{ 
                  background: hasReadToday ? '#E5E7EB' : '#FF69B4',
                  color: hasReadToday ? '#9CA3AF' : 'white'
                }}
              >
                <Flame className="w-5 h-5 mr-2" />
                {hasReadToday ? "Déjà lu aujourd'hui" : "J'ai lu aujourd'hui"}
              </Button>

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
            {/* Reading Streak Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <ReadingStreakCard user={user} />
            </motion.div>

            {/* Objectif de lecture */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <ReadingGoalManager year={selectedYear} compact={false} />
            </motion.div>

            {/* Lectures en cours */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
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
                    currentlyReading.slice(0, 3).map((userBook, idx) => {
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
                        <motion.div 
                          key={userBook.id}
                          initial={{ opacity: 0, x: -30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: idx * 0.1 }}
                          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
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
                                  
                                  <div className="relative h-3 rounded-full overflow-hidden progress-shimmer"
                                       style={{ backgroundColor: '#FFE9F0' }}>
                                    <motion.div 
                                      className="h-full rounded-full relative"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progress}%` }}
                                      transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                                      style={{
                                        background: 'linear-gradient(90deg, #FF1493, #FF69B4, #FF1493)',
                                        backgroundSize: '200% 100%'
                                      }}
                                    >
                                      <motion.div 
                                        className="absolute inset-0"
                                        animate={{ backgroundPosition: ['0% 0%', '200% 0%'] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                        style={{
                                          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)',
                                        }}
                                      />
                                    </motion.div>
                                  </div>


                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
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
            </motion.div>

            {/* Feed d'activité des amies */}
            {activityFeed.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
              <Card className="border-0 rounded-3xl overflow-hidden dash-card"
                    style={{ 
                      backgroundColor: 'white',
                      boxShadow: '0 4px 16px rgba(255, 105, 180, 0.08)'
                    }}>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-3" style={{ color: '#2D3748' }}>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                         style={{ backgroundColor: '#FFE9F0' }}>
                      <Sparkles className="w-5 h-5" style={{ color: '#FF1493' }} />
                    </div>
                    🔥 Activité de tes amies
                  </h2>

                  <div className="space-y-4">
                    {activityFeed.slice(0, 5).map((activity, idx) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                      >
                        <SocialFeedCard
                          activity={activity}
                          currentUser={user}
                          allUsers={allUsers}
                        />
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    {activityFeed.length > 5 ? (
                      <p className="text-sm" style={{ color: '#9CA3AF' }}>
                        +{activityFeed.length - 5} autres activités
                      </p>
                    ) : (
                      <span />
                    )}
                    <Link to={createPageUrl('Social')} className="text-sm font-semibold no-hover" style={{ color: '#FF1493' }}>
                      Voir plus
                    </Link>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            )}

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
                    {friendsBooks.filter(b => b.status === "En cours").slice(0, 4).map((userBook, idx) => {
                      const book = allBooks.find(b => b.id === userBook.book_id);
                      const friend = myFriends.find(f => f.friend_email === userBook.created_by);
                                              const friendUser = allUsers.find(u => u.email === userBook.created_by);
                                              if (!book || !friend) return null;

                      const progress = userBook.current_page && book.page_count 
                        ? Math.round((userBook.current_page / book.page_count) * 100)
                        : 0;

                      return (
                        <motion.div 
                          key={userBook.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: idx * 0.1 }}
                          whileHover={{ y: -5, transition: { duration: 0.2 } }}
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
                                @{friendUser?.pseudo || friendUser?.username || friendUser?.display_name || 'amie'}
                              </p>
                              <h4 className="font-bold text-sm line-clamp-2 mb-1" style={{ color: '#2D3748' }}>
                                {book.title}
                              </h4>
                              <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>
                                {book.author}
                              </p>
                              {userBook.current_page && book.page_count && (
                                <div className="flex items-center justify-between text-xs mb-2">
                                  <span style={{ color: '#9C27B0' }}>
                                    {userBook.current_page} / {book.page_count} pages
                                  </span>
                                  <span className="font-bold text-sm" style={{ color: '#9C27B0' }}>
                                    {progress}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {progress > 0 && (
                            <div className="relative h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F3E5F5' }}>
                              <div className="h-full rounded-full relative"
                                   style={{
                                     width: `${progress}%`,
                                     background: 'linear-gradient(90deg, #9C27B0, #BA68C8)',
                                     transition: 'width 500ms ease'
                                   }}>
                                <div 
                                  className="absolute inset-0"
                                  style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)',
                                    animation: 'shimmer 2.5s ease-in-out infinite'
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Colonne droite */}
          <div className="space-y-4 md:space-y-6">
            {/* Mes amies */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <BestFriendCard user={user} />
            </motion.div>

            {/* Citation du jour */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
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
            </motion.div>

            {/* Playlist musicale */}
            {allMusicWithBooks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                whileHover={{ scale: 1.02 }}
              >
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
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.1 }}
                        whileHover={{ x: 5, backgroundColor: '#FFF5F8', transition: { duration: 0.2 } }}
                        className="p-3 rounded-xl flex items-center gap-3"
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
                      </motion.div>
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
              </motion.div>
            )}

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
    </PullToRefresh>
  );
}