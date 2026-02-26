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
    queryClient.invalidateQueries({ queryKey: ['userBooks'] })]
    );
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
    enabled: !!user
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list()
  });

  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ created_by: user?.email, status: "Acceptée" }),
    enabled: !!user
  });

  const { data: friendsBooks = [] } = useQuery({
    queryKey: ['friendsBooks'],
    queryFn: async () => {
      const friendsEmails = myFriends.map((f) => f.friend_email);
      if (friendsEmails.length === 0) return [];
      const allFriendsBooks = await Promise.all(
        friendsEmails.map((email) => base44.entities.UserBook.filter({ created_by: email }))
      );
      return allFriendsBooks.flat();
    },
    enabled: myFriends.length > 0
  });

  const { data: allQuotes = [] } = useQuery({
    queryKey: ['allQuotes'],
    queryFn: () => base44.entities.Quote.filter({ created_by: user?.email }),
    enabled: !!user
  });

  const { data: readingDayToday = [] } = useQuery({
    queryKey: ['readingDayToday'],
    queryFn: () => base44.entities.ReadingDay.filter({ created_by: user?.email, date: format(new Date(), 'yyyy-MM-dd') }),
    enabled: !!user,
    refetchInterval: 5000
  });

  const hasReadToday = readingDayToday.length > 0;

  // Sync live with ReadingDay changes so the button updates instantly
  useEffect(() => {
    if (!user) return;
    const unsubscribe = base44.entities.ReadingDay.subscribe((event) => {
      if (event?.data?.created_by === user.email) {
        queryClient.invalidateQueries({ queryKey: ['readingDayToday'] });
      }
    });
    return unsubscribe;
  }, [user]);

  const { data: activityFeed = [] } = useQuery({
    queryKey: ['activityFeed'],
    queryFn: async () => {
      const friendsEmails = myFriends.map((f) => f.friend_email);
      if (friendsEmails.length === 0) return [];

      const allActivities = await base44.entities.ActivityFeed.list('-created_date', 50);
      return allActivities.filter((activity) =>
      friendsEmails.includes(activity.created_by) && activity.is_visible
      );
    },
    enabled: myFriends.length > 0,
    refetchInterval: 30000
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const currentlyReading = myBooks.filter((b) => b.status === "En cours");
  const toReadCount = myBooks.filter((b) => b.status === "À lire").length;

  const { data: allProgressHistory = [] } = useQuery({
    queryKey: ['readingProgress', user?.email],
    queryFn: () => base44.entities.ReadingProgress.filter({ created_by: user?.email }),
    enabled: !!user
  });

  // Calculate estimated progress based on reading speed
  const getEstimatedProgress = (userBook, book) => {
    if (!userBook.current_page || !book.page_count) return null;

    // Get progress history for this book
    const bookProgress = allProgressHistory.
    filter((p) => p.user_book_id === userBook.id).
    sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

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

    const estimatedPage = Math.round(lastProgress.page_number + pagesPerHour * hoursSinceLastUpdate);
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
      const book = allBooks.find((b) => b.id === userBook.book_id);
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

  const booksReadThisYear = myBooks.filter((b) => {
    const effectiveDate = getEffectiveDate(b);
    if (!effectiveDate) return false;
    return new Date(effectiveDate).getFullYear() === selectedYear;
  }).length;

  const totalPagesThisYear = myBooks.
  filter((b) => {
    const effectiveDate = getEffectiveDate(b);
    if (!effectiveDate) return false;
    return new Date(effectiveDate).getFullYear() === selectedYear;
  }).
  reduce((sum, userBook) => {
    const book = allBooks.find((b) => b.id === userBook.book_id);
    if (!book || userBook.status !== "Lu") return sum;
    return sum + (book.page_count || 0);
  }, 0);

  const displayName = user?.display_name || user?.full_name?.split(' ')[0] || 'Lectrice';
  const randomQuote = allQuotes.length > 0 ? allQuotes[Math.floor(Math.random() * allQuotes.length)] : null;
  const quoteBook = randomQuote ? allBooks.find((b) => b.id === randomQuote.book_id) : null;

  // Collect music
  const allMusicWithBooks = React.useMemo(() => {
    const musicList = [];
    myBooks.forEach((userBook) => {
      const book = allBooks.find((b) => b.id === userBook.book_id);
      if (!book) return;
      if (userBook.music_playlist && userBook.music_playlist.length > 0) {
        userBook.music_playlist.forEach((music) => {
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

      {/* Header */}
      <div className="relative px-4 pt-5 pb-3 md:px-8">
        <div className="absolute top-4 right-4 md:top-5 md:right-8 z-20 flex items-center gap-2">
          <NotificationBell user={user} />
          <Link to={createPageUrl('AccountSettings')} className="inline-flex items-center justify-center w-9 h-9 rounded-full shadow-sm" style={{ backgroundColor: 'white', border: '1px solid rgba(255,105,180,0.2)' }}>
            <Settings className="w-4 h-4" style={{ color: '#FF1493' }} />
          </Link>
        </div>

        <div className="max-w-lg mx-auto space-y-4">

          {/* Titre */}
          <div className="pt-1">
            <h1 className="text-2xl font-bold" style={{ color: '#FF1493' }}>Bonjour {displayName} ✨</h1>
          </div>

          {/* Streak inline */}
          <ReadingStreakCard user={user} />

          {/* ── Lecture en cours ── */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ border: '2px solid #FF69B4' }}>
            {/* label */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#FF1493' }}>📖 Ta lecture en cours</span>
              {currentlyReading.length > 1 && (
                <Link to={createPageUrl("MyLibrary")} className="text-xs font-semibold no-hover flex items-center gap-0.5" style={{ color: '#FF69B4' }}>
                  +{currentlyReading.length - 1} <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {currentlyReading.length > 0 ? (() => {
              const userBook = currentlyReading[0];
              const book = allBooks.find((b) => b.id === userBook.book_id);
              if (!book) return null;
              const isEditing = editingBookId === userBook.id;
              const displayPage = isEditing ? parseInt(editValues.currentPage) || 0 : userBook.current_page || 0;
              const displayTotal = isEditing ? parseInt(editValues.totalPages) || book.page_count || 0 : book.page_count || 0;
              const progress = displayTotal > 0 ? Math.round(displayPage / displayTotal * 100) : 0;
              return (
                <div className="px-4 pb-4 flex gap-3">
                  {/* Cover */}
                  <div className="w-16 h-24 rounded-xl overflow-hidden flex-shrink-0 shadow-md" style={{ backgroundColor: '#FFE9F0' }}>
                    {book.cover_url && <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm leading-tight line-clamp-2 mb-0.5" style={{ color: '#1a1a1a' }}>{book.title}</h3>
                      <p className="text-xs mb-2" style={{ color: '#9CA3AF' }}>{book.author}</p>
                    </div>
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <div className="flex gap-1.5">
                          <input type="number" value={editValues.currentPage}
                            onChange={(e) => setEditValues({ ...editValues, currentPage: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveProgress(userBook, book); if (e.key === 'Escape') handleCancelEdit(); }}
                            className="flex-1 px-2 py-1 rounded-lg text-xs font-bold"
                            style={{ backgroundColor: '#FFF5F8', color: '#FF1493', border: '1.5px solid #FF69B4' }}
                            autoFocus placeholder="Page" />
                          <input type="number" value={editValues.totalPages}
                            onChange={(e) => setEditValues({ ...editValues, totalPages: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveProgress(userBook, book); if (e.key === 'Escape') handleCancelEdit(); }}
                            className="flex-1 px-2 py-1 rounded-lg text-xs font-bold"
                            style={{ backgroundColor: '#FFF5F8', color: '#FF1493', border: '1.5px solid #FF69B4' }}
                            placeholder="Total" />
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" onClick={() => handleSaveProgress(userBook, book)} className="flex-1 h-7 text-xs text-white" style={{ backgroundColor: '#FF1493' }}>
                            <Check className="w-3 h-3 mr-1" /> OK
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7 text-xs"><X className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <button onClick={() => handleStartEdit(userBook, book)} className="flex items-center gap-1 hover:opacity-70">
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>{displayPage}/{displayTotal || '?'} pages</span>
                            <Edit2 className="w-3 h-3" style={{ color: '#FFB6C8' }} />
                          </button>
                          <span className="text-sm font-black" style={{ color: '#FF1493' }}>{progress}%</span>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#FFE9F0' }}>
                          <motion.div className="h-full rounded-full"
                            initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            style={{ background: 'linear-gradient(90deg, #FF1493, #FF69B4)' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : (
              <div className="px-4 pb-5 flex flex-col items-center gap-2">
                <BookOpen className="w-10 h-10" style={{ color: '#FFD6E4' }} />
                <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>Aucune lecture en cours</p>
                <Link to={createPageUrl("MyLibrary")}>
                  <Button size="sm" className="font-bold text-white rounded-xl" style={{ backgroundColor: '#FF1493' }}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Choisir un livre
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* ── Stats 4 tuiles ── */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: booksReadThisYear, label: 'Livres lus', emoji: '📚', color: '#FF1493', bg: '#FFE9F0', to: 'MyLibrary' },
              { value: totalPagesThisYear.toLocaleString(), label: 'Pages', emoji: '📖', color: '#FF69B4', bg: '#FFE9F0', to: 'Statistics' },
              { value: myFriends.length, label: 'LC', emoji: '👯', color: '#9C27B0', bg: '#F3E5F5', to: 'SharedReadings' },
              { value: toReadCount, label: 'PAL', emoji: '📋', color: '#FF69B4', bg: '#FFE9F0', to: 'MyLibrary' },
            ].map(({ value, label, emoji, color, bg, to }) => (
              <button key={label} onClick={() => navigate(createPageUrl(to))}
                className="rounded-2xl p-3 flex flex-col items-center gap-0.5 transition-transform active:scale-95"
                style={{ backgroundColor: bg }}>
                <span className="text-base">{emoji}</span>
                <span className="text-lg font-black leading-none" style={{ color }}>{value}</span>
                <span className="text-[10px] font-semibold leading-tight text-center" style={{ color }}>{label}</span>
              </button>
            ))}
          </div>

          {/* ── Objectif de lecture ── */}
          <ReadingGoalManager year={selectedYear} compact={false} />

          {/* ── Activité des amies ── */}
          {activityFeed.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #FFE4EF' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: '#FF1493' }}>
                  <Sparkles className="w-4 h-4" /> Activité des amies
                </h3>
                <Link to={createPageUrl('Social')} className="text-xs font-semibold no-hover" style={{ color: '#FF69B4' }}>Tout voir →</Link>
              </div>
              <div className="space-y-2">
                {activityFeed.slice(0, 4).map((activity, idx) => {
                  const friendUser = allUsers.find((u) => u.email === activity.created_by);
                  const name = friendUser?.full_name?.split(' ')[0] || 'Une amie';
                  return (
                    <div key={idx} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
                        {name[0]}
                      </div>
                      <p className="text-xs leading-snug flex-1" style={{ color: '#4B5563' }}>
                        <span className="font-bold" style={{ color: '#FF1493' }}>{name}</span>{' '}
                        {activity.action_text || activity.description || 'a eu une activité'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Tes amies lisent ── */}
          {friendsBooks.filter((b) => b.status === "En cours").length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: '1px solid #E8D5F5' }}>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5" style={{ color: '#9C27B0' }}>
                <Users className="w-4 h-4" /> Tes amies lisent
              </h3>
              <div className="space-y-3">
                {friendsBooks.filter((b) => b.status === "En cours").slice(0, 3).map((userBook) => {
                  const book = allBooks.find((b) => b.id === userBook.book_id);
                  const friend = myFriends.find((f) => f.friend_email === userBook.created_by);
                  const friendUser = allUsers.find((u) => u.email === userBook.created_by);
                  if (!book || !friend) return null;
                  const pct = userBook.current_page && book.page_count
                    ? Math.round(userBook.current_page / book.page_count * 100) : 0;
                  return (
                    <div key={userBook.id} className="flex items-center gap-3">
                      <div className="w-9 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#F3E5F5' }}>
                        {book.cover_url && <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold" style={{ color: '#9C27B0' }}>{friendUser?.full_name?.split(' ')[0] || 'Amie'}</p>
                        <p className="text-xs font-medium line-clamp-1" style={{ color: '#1a1a1a' }}>{book.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#F3E5F5' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #9C27B0, #CE93D8)' }} />
                          </div>
                          <span className="text-[10px] font-bold flex-shrink-0" style={{ color: '#9C27B0' }}>{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Citation ── */}
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm" style={{ border: '1px solid #FFE4EF' }}>
            <Quote className="w-5 h-5 mx-auto mb-2" style={{ color: '#FFD700' }} />
            {randomQuote && quoteBook ? (
              <>
                <p className="text-sm italic leading-relaxed mb-1" style={{ color: '#4B5563' }}>"{randomQuote.quote_text}"</p>
                <p className="text-xs font-bold" style={{ color: '#FFD700' }}>— {quoteBook.title}</p>
              </>
            ) : (
              <p className="text-sm italic" style={{ color: '#9CA3AF' }}>"Lire, c'est vivre mille vies avant de mourir."</p>
            )}
          </div>

          {/* ── Playlist musicale ── */}
          {allMusicWithBooks.length > 0 && (
            <button onClick={() => navigate(createPageUrl("MusicPlaylist"))} className="w-full text-left bg-white rounded-2xl p-4 shadow-sm transition-transform active:scale-98" style={{ border: '1px solid #F3E5F5' }}>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5" style={{ color: '#E91E63' }}>
                <Music className="w-4 h-4" /> Ta Playlist
              </h3>
              <div className="space-y-2">
                {allMusicWithBooks.slice(0, 3).map((musicItem, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#FFE9F0' }}>
                      {musicItem.book.cover_url && <img src={musicItem.book.cover_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold line-clamp-1" style={{ color: '#1a1a1a' }}>{musicItem.title}</p>
                      <p className="text-[10px]" style={{ color: '#9CA3AF' }}>{musicItem.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </button>
          )}

          {/* bottom padding */}
          <div className="h-4" />
        </div>
      </div>

      {/* Dialog */}
      {selectedBookForDetails &&
        <BookDetailsDialog
          userBook={selectedBookForDetails}
          book={allBooks.find((b) => b.id === selectedBookForDetails.book_id)}
          open={!!selectedBookForDetails}
          onOpenChange={(open) => !open && setSelectedBookForDetails(null)}
          initialTab="myinfo" />

        }
    </div>
    </PullToRefresh>);

}