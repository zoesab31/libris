import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import PullToRefresh from "@/components/layout/PullToRefresh";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { BookOpen, TrendingUp, Users, Star, Plus, Heart, Quote, Target, Edit2, Check, X, Settings, Flame, Sparkles, ArrowRight } from "lucide-react";
import NotificationBell from "../components/notifications/NotificationBell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { motion } from "framer-motion";
import ReadingGoalManager from "../components/dashboard/ReadingGoalManager";
import BookDetailsDialog from "../components/library/BookDetailsDialog";
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
    queryKey: ['readingDayToday'],
    queryFn: () => base44.entities.ReadingDay.filter({ created_by: user?.email, date: format(new Date(), 'yyyy-MM-dd') }),
    enabled: !!user,
    refetchInterval: 5000,
  });

  const hasReadToday = readingDayToday.length > 0;

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

  const { data: sharedReadings = [] } = useQuery({
    queryKey: ['sharedReadings'],
    queryFn: () => base44.entities.SharedReading.list(),
    enabled: !!user,
  });

  const handleMarkToday = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    await base44.entities.ReadingDay.create({ date: today });
    queryClient.invalidateQueries({ queryKey: ['readingDayToday'] });
    queryClient.invalidateQueries({ queryKey: ['readingStreak'] });
    toast.success("Jour de lecture enregistré 🔥");
  };

  const currentlyReading = myBooks.filter(b => b.status === "En cours");
  const toReadCount = myBooks.filter(b => b.status === "À lire").length;
  const sharedReadingCount = sharedReadings.filter(r =>
    r.participants?.includes(user?.email) || r.created_by === user?.email
  ).length;

  const { data: allProgressHistory = [] } = useQuery({
    queryKey: ['readingProgress', user?.email],
    queryFn: () => base44.entities.ReadingProgress.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const getEstimatedProgress = (userBook, book) => {
    if (!userBook.current_page || !book.page_count) return null;
    const bookProgress = allProgressHistory
      .filter(p => p.user_book_id === userBook.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    if (bookProgress.length < 2) return null;
    const firstProgress = bookProgress[0];
    const lastProgress = bookProgress[bookProgress.length - 1];
    const pagesRead = lastProgress.page_number - firstProgress.page_number;
    const hoursPassed = (new Date(lastProgress.timestamp) - new Date(firstProgress.timestamp)) / (1000 * 60 * 60);
    if (hoursPassed <= 0 || pagesRead <= 0) return null;
    const pagesPerHour = pagesRead / hoursPassed;
    const lastUpdateTime = new Date(lastProgress.timestamp).getTime();
    const hoursSinceLastUpdate = (Date.now() - lastUpdateTime) / (1000 * 60 * 60);
    if (hoursSinceLastUpdate < 1) return null;
    const estimatedPage = Math.round(lastProgress.page_number + (pagesPerHour * hoursSinceLastUpdate));
    return { estimatedPage: Math.min(estimatedPage, book.page_count), pagesPerHour };
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
    if (isNaN(currentPage) || currentPage < 0) { toast.error("Page invalide"); return; }
    if (!isNaN(totalPages) && currentPage > totalPages) { toast.error("La page ne peut pas dépasser le total"); return; }
    await base44.entities.UserBook.update(userBook.id, { current_page: currentPage });
    if (!isNaN(totalPages) && totalPages !== book.page_count) {
      await base44.entities.Book.update(book.id, { page_count: totalPages });
    }
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
      if (book && book.page_count && userBook.abandon_page >= book.page_count / 2) return true;
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
  const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);

  const friendsCurrentlyReading = friendsBooks.filter(b => b.status === "En cours");

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen relative" style={{ background: 'linear-gradient(180deg, #FFEAF4 0%, #FDE7F1 50%, #FADDEB 100%)' }}>
        <OnboardingTrigger />
        <FloatingParticles count={20} />

        <style>{`
          .dash-card { transition: all 350ms cubic-bezier(0.4, 0, 0.2, 1); }
          .dash-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(255,105,180,0.2); }
          @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
          @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
          .progress-shimmer { position:relative; overflow:hidden; }
          .progress-shimmer::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent); animation:shimmer 2s ease-in-out infinite; }
          .book-3d {
            transform-style: preserve-3d;
            transition: transform 0.4s ease;
          }
          .book-3d:hover { transform: perspective(600px) rotateY(-15deg) rotateX(3deg) scale(1.05); }
          .book-spine {
            position:absolute; left:0; top:0; bottom:0; width:12px;
            background:linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 100%);
            border-radius: 4px 0 0 4px;
          }
          .book-shadow {
            position:absolute; bottom:-8px; left:8px; right:-8px; height:8px;
            background:rgba(0,0,0,0.12);
            filter:blur(6px);
            border-radius:50%;
          }
        `}</style>

        {/* ── TOP BAR ── */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-2">
          <div className="flex items-start justify-between gap-4">
            {/* Gauche : bonjour + streak + boutons */}
            <div className="flex-1 min-w-0">
              <motion.h1
                className="text-2xl md:text-4xl font-bold mb-1"
                style={{ color: '#FF1493' }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Bonjour {displayName} ✨
              </motion.h1>

              {/* Streak inline + boutons */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <StreakBadge user={user} />

                <Button
                  onClick={handleMarkToday}
                  disabled={hasReadToday}
                  size="sm"
                  className="rounded-xl font-semibold text-xs px-4 py-2"
                  style={{
                    background: hasReadToday ? '#F3F4F6' : 'linear-gradient(135deg,#FF1493,#FF69B4)',
                    color: hasReadToday ? '#9CA3AF' : 'white',
                    border: 'none'
                  }}
                >
                  <Flame className="w-3.5 h-3.5 mr-1" />
                  {hasReadToday ? "Lu aujourd'hui ✓" : "J'ai lu aujourd'hui"}
                </Button>

                <Link to={createPageUrl("MyLibrary")}>
                  <Button
                    size="sm"
                    className="rounded-xl font-semibold text-xs px-4 py-2"
                    style={{ background: 'linear-gradient(135deg,#FF69B4,#FF1493)', color: 'white', border: 'none' }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Ajouter un livre
                  </Button>
                </Link>
              </div>
            </div>

            {/* Droite : notif + settings + année */}
            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
              <NotificationBell user={user} />
              <Link to={createPageUrl('AccountSettings')}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full shadow-sm"
                style={{ backgroundColor: 'white', border: '1px solid rgba(255,105,180,0.25)' }}>
                <Settings className="w-4 h-4" style={{ color: '#FF1493' }} />
              </Link>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: 'white', color: '#FF1493', border: '1px solid rgba(255,105,180,0.25)' }}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 space-y-6">

          {/* ── EN COURS DE LECTURE ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card className="border-0 rounded-3xl overflow-hidden"
              style={{ backgroundColor: 'white', boxShadow: '0 4px 24px rgba(255,105,180,0.1)' }}>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: '#FF1493' }}>
                    <BookOpen className="w-6 h-6" />
                    EN COURS DE LECTURE
                    {currentlyReading.length > 0 && (
                      <span className="ml-2 px-3 py-0.5 rounded-full text-sm font-bold"
                        style={{ backgroundColor: '#FFE9F0', color: '#FF1493' }}>
                        {currentlyReading.length}
                      </span>
                    )}
                  </h2>
                  <Link to={createPageUrl("MyLibrary")} className="text-sm font-semibold no-hover" style={{ color: '#FF1493' }}>
                    Voir tout →
                  </Link>
                </div>

                {currentlyReading.length > 0 ? (
                  <div className="flex gap-6 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
                    {currentlyReading.map((userBook, idx) => {
                      const book = allBooks.find(b => b.id === userBook.book_id);
                      if (!book) return null;
                      const isEditing = editingBookId === userBook.id;
                      const displayPage = isEditing ? parseInt(editValues.currentPage) || 0 : userBook.current_page || 0;
                      const displayTotal = isEditing ? parseInt(editValues.totalPages) || book.page_count || 0 : book.page_count || 0;
                      const progress = displayTotal > 0 ? Math.round((displayPage / displayTotal) * 100) : 0;

                      return (
                        <motion.div
                          key={userBook.id}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex-shrink-0 w-44 md:w-52"
                        >
                          {/* 3D Book Cover */}
                          <div className="relative mb-4" style={{ paddingBottom: '8px' }}>
                            <div className="book-3d relative w-full" style={{ paddingTop: '145%' }}>
                              <div className="absolute inset-0 rounded-xl overflow-hidden"
                                style={{
                                  backgroundColor: '#FFE9F0',
                                  boxShadow: '4px 6px 20px rgba(255,20,147,0.25), -2px 0 0 rgba(0,0,0,0.1)'
                                }}>
                                <div className="book-spine" />
                                {book.cover_url
                                  ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                  : (
                                    <div className="w-full h-full flex items-center justify-center p-3 text-center">
                                      <span className="text-xs font-bold" style={{ color: '#FF69B4' }}>{book.title}</span>
                                    </div>
                                  )}
                              </div>
                              <div className="book-shadow" />
                            </div>
                          </div>

                          {/* Info */}
                          <h3 className="font-bold text-sm line-clamp-2 mb-0.5" style={{ color: '#2D3748' }}>{book.title}</h3>
                          <p className="text-xs mb-3 line-clamp-1" style={{ color: '#9CA3AF' }}>{book.author}</p>

                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="number"
                                value={editValues.currentPage}
                                onChange={(e) => setEditValues({ ...editValues, currentPage: e.target.value })}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveProgress(userBook, book); if (e.key === 'Escape') handleCancelEdit(); }}
                                className="w-full px-2 py-1.5 rounded-lg text-sm font-bold text-center"
                                style={{ border: '2px solid #FF69B4', color: '#FF1493' }}
                                placeholder="Page actuelle"
                                autoFocus
                              />
                              <div className="flex gap-1">
                                <Button size="sm" className="flex-1 text-white text-xs" style={{ backgroundColor: '#FF1493' }}
                                  onClick={() => handleSaveProgress(userBook, book)}>
                                  <Check className="w-3 h-3 mr-1" /> OK
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between mb-1.5">
                                <button onClick={() => handleStartEdit(userBook, book)}
                                  className="flex items-center gap-1 text-xs font-bold hover:opacity-70 transition-opacity"
                                  style={{ color: '#FF1493' }}>
                                  {userBook.current_page || 0} / {book.page_count || '?'}p
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-extrabold" style={{ color: '#FF1493' }}>{progress}%</span>
                              </div>
                              <div className="h-2.5 rounded-full overflow-hidden progress-shimmer" style={{ backgroundColor: '#FFE9F0' }}>
                                <motion.div className="h-full rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                  style={{ background: 'linear-gradient(90deg,#FF1493,#FF69B4)' }} />
                              </div>
                            </>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#FFE9F0' }}>
                      <BookOpen className="w-8 h-8" style={{ color: '#FF69B4' }} />
                    </div>
                    <p className="font-bold mb-2" style={{ color: '#2D3748' }}>Aucune lecture en cours</p>
                    <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>Commencez votre prochaine aventure</p>
                    <Link to={createPageUrl("MyLibrary")}>
                      <Button className="font-bold px-6 py-2 rounded-2xl" style={{ backgroundColor: '#FF1493', color: 'white' }}>
                        <Plus className="w-4 h-4 mr-2" /> Choisir un livre
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── LIGNE DU BAS : amies | stats ── */}
          <div className="grid lg:grid-cols-2 gap-6">

            {/* Tes amies lisent */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <Card className="border-0 rounded-3xl h-full" style={{ backgroundColor: 'white', boxShadow: '0 4px 16px rgba(156,39,176,0.08)' }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#2D3748' }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F3E5F5' }}>
                        <Users className="w-4 h-4" style={{ color: '#9C27B0' }} />
                      </div>
                      Tes amies lisent
                    </h2>
                    <Link to={createPageUrl('Social')} className="text-xs font-semibold no-hover" style={{ color: '#9C27B0' }}>Voir plus →</Link>
                  </div>

                  {friendsCurrentlyReading.length > 0 ? (
                    <div className="space-y-3">
                      {friendsCurrentlyReading.slice(0, 5).map((userBook, idx) => {
                        const book = allBooks.find(b => b.id === userBook.book_id);
                        const friendUser = allUsers.find(u => u.email === userBook.created_by);
                        if (!book) return null;
                        const progress = userBook.current_page && book.page_count
                          ? Math.round((userBook.current_page / book.page_count) * 100) : 0;
                        return (
                          <motion.div key={userBook.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.08 }}
                            className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: '#F9F5FF' }}>
                            <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#F3E5F5' }}>
                              {book.cover_url && <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold mb-0.5" style={{ color: '#9C27B0' }}>
                                @{friendUser?.pseudo || friendUser?.display_name || friendUser?.full_name?.split(' ')[0] || 'amie'}
                              </p>
                              <p className="text-sm font-semibold line-clamp-1" style={{ color: '#2D3748' }}>{book.title}</p>
                              {progress > 0 && (
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#E9D5FF' }}>
                                    <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#9C27B0,#BA68C8)' }} />
                                  </div>
                                  <span className="text-xs font-bold" style={{ color: '#9C27B0' }}>{progress}%</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: '#9C27B0' }} />
                      <p className="text-sm" style={{ color: '#9CA3AF' }}>Tes amies ne lisent rien en ce moment</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Stats 4 carrés */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <div className="grid grid-cols-2 gap-3 h-full">
                {[
                  { label: `Livres lus en ${selectedYear}`, value: booksReadThisYear, icon: BookOpen, color: '#FF1493', bg: '#FFE9F0', onClick: () => navigate(createPageUrl("Statistics")) },
                  { label: `Pages lues en ${selectedYear}`, value: totalPagesThisYear.toLocaleString(), icon: TrendingUp, color: '#E91E63', bg: '#FFE9F0', onClick: () => navigate(createPageUrl("Statistics")) },
                  { label: 'Lectures communes', value: sharedReadingCount, icon: Users, color: '#9C27B0', bg: '#F3E5F5', onClick: () => navigate(createPageUrl("SharedReadings")) },
                  { label: 'PAL + En cours', value: toReadCount + currentlyReading.length, icon: Target, color: '#FF69B4', bg: '#FFE9F0', onClick: () => navigate(createPageUrl("MyLibrary")) },
                ].map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + idx * 0.08 }}
                    whileHover={{ scale: 1.04, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.97 }}
                    onClick={stat.onClick}
                    className="p-5 rounded-3xl cursor-pointer flex flex-col justify-between"
                    style={{ backgroundColor: 'white', boxShadow: '0 2px 12px rgba(255,105,180,0.08)', minHeight: '120px' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: stat.bg }}>
                      <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold" style={{ color: stat.color }}>{stat.value}</p>
                      <p className="text-xs mt-0.5 leading-tight" style={{ color: '#9CA3AF' }}>{stat.label}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── CITATION DU JOUR ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <Card className="border-0 rounded-3xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, #fff7f9 0%, #fdf3ff 100%)',
                boxShadow: '0 4px 20px rgba(255,215,0,0.1)'
              }}>
              {/* Décos florales */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {['🌸','🌿','🌺','🍃','✨','🌷','🌼','🍀'].map((emoji, i) => (
                  <span key={i} className="absolute text-xl opacity-20 select-none"
                    style={{
                      top: `${[10,70,20,80,40,60,15,85][i]}%`,
                      left: `${[5,8,88,92,2,95,50,50][i]}%`,
                      transform: `rotate(${[-15,10,20,-10,5,-20,0,15][i]}deg)`,
                      fontSize: `${[1.2,1,1.5,1,0.9,1.3,1.1,0.8][i]}rem`
                    }}>
                    {emoji}
                  </span>
                ))}
              </div>

              <CardContent className="p-8 md:p-10 text-center relative">
                <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#FFD700,#FFA500)' }}>
                  <Quote className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-base font-bold mb-4 uppercase tracking-widest" style={{ color: '#D97706' }}>
                  ✨ Citation du jour
                </h2>
                {randomQuote && quoteBook ? (
                  <>
                    <p className="text-lg md:text-xl italic leading-relaxed mb-4 max-w-2xl mx-auto" style={{ color: '#4B5563' }}>
                      "{randomQuote.quote_text}"
                    </p>
                    <p className="text-sm font-bold" style={{ color: '#FFD700' }}>
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
          </motion.div>

          {/* Objectif de lecture */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
            <ReadingGoalManager year={selectedYear} compact={false} />
          </motion.div>

          {/* Feed d'activité */}
          {activityFeed.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
              <Card className="border-0 rounded-3xl" style={{ backgroundColor: 'white', boxShadow: '0 4px 16px rgba(255,105,180,0.08)' }}>
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: '#2D3748' }}>
                      <Sparkles className="w-5 h-5" style={{ color: '#FF1493' }} />
                      🔥 Activité de tes amies
                    </h2>
                    <Link to={createPageUrl('Social')} className="text-xs font-semibold no-hover" style={{ color: '#FF1493' }}>Voir plus →</Link>
                  </div>
                  <div className="space-y-3">
                    {activityFeed.slice(0, 4).map((activity, idx) => (
                      <motion.div key={activity.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                        <SocialFeedCard activity={activity} currentUser={user} allUsers={allUsers} />
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

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

// Petit badge streak inline
function StreakBadge({ user }) {
  const { data: streakData } = useQuery({
    queryKey: ['readingStreak', user?.email],
    queryFn: async () => {
      const streaks = await base44.entities.ReadingStreak.filter({ created_by: user.email });
      return streaks[0] || null;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });
  const current = streakData?.current_streak || 0;
  const longest = streakData?.longest_streak || 0;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
      style={{ backgroundColor: 'white', border: '1px solid rgba(255,105,180,0.25)', color: '#FF1493' }}>
      <Flame className="w-3.5 h-3.5" style={{ color: '#FF6B35' }} />
      <span>{current} jour{current > 1 ? 's' : ''}</span>
      {longest > 0 && <span style={{ color: '#9CA3AF' }}>· record {longest}</span>}
    </div>
  );
}