import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/layout/PullToRefresh";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { BookOpen, TrendingUp, Users, Star, Plus, Music, Heart, MessageCircle, Quote, Trophy, Library, ArrowRight, Sparkles, Flame, Zap, Clock, Target, Edit2, Check, X, Settings, Bookmark } from "lucide-react";
import NotificationBell from "../components/notifications/NotificationBell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
      queryClient.invalidateQueries({ queryKey: ['myBooks'] }),
    ]);
  };

  const handleMarkToday = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    await base44.entities.ReadingDay.create({ date: today });
    queryClient.invalidateQueries({ queryKey: ['readingDayToday'] });
    toast.success("Jour de lecture enregistré 🔥");
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

  const { data: readingGoal = null } = useQuery({
    queryKey: ['readingGoal', selectedYear, user?.email],
    queryFn: async () => {
      const goals = await base44.entities.ReadingGoal.filter({ created_by: user?.email, year: selectedYear });
      return goals[0] || null;
    },
    enabled: !!user,
  });

  const { data: allProgressHistory = [] } = useQuery({
    queryKey: ['readingProgress', user?.email],
    queryFn: () => base44.entities.ReadingProgress.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const currentlyReading = myBooks.filter(b => b.status === "En cours");
  const toReadCount = myBooks.filter(b => b.status === "À lire").length;
  const enCours = myBooks.filter(b => b.status === "En cours").length;

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

  const sharedReadingsCount = myFriends.length;
  const displayName = user?.display_name || user?.full_name?.split(' ')[0] || 'Lectrice';
  const randomQuote = allQuotes.length > 0 ? allQuotes[Math.floor(Math.random() * allQuotes.length)] : null;
  const quoteBook = randomQuote ? allBooks.find(b => b.id === randomQuote.book_id) : null;

  const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);

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
    setEditValues({ currentPage: userBook.current_page?.toString() || '', totalPages: book.page_count?.toString() || '' });
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
    await base44.entities.ReadingProgress.create({ user_book_id: userBook.id, page_number: currentPage, timestamp: new Date().toISOString() });
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

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen relative" style={{ background: 'linear-gradient(180deg, #FFEAF4 0%, #FDE7F1 50%, #FADDEB 100%)' }}>
        <OnboardingTrigger />
        <FloatingParticles count={20} />

        <style>{`
          .dash-card { transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1); }
          .dash-card:hover { transform: translateY(-4px); box-shadow: 0 16px 32px rgba(255, 105, 180, 0.2); }
          @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
          .progress-shimmer { position: relative; overflow: hidden; }
          .progress-shimmer::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); animation: shimmer 2s ease-in-out infinite; }
        `}</style>

        {/* Header */}
        <div className="relative px-5 pt-6 pb-4 md:px-10 md:pt-8">
          <div className="absolute top-4 right-4 md:top-6 md:right-8 z-20 flex items-center gap-2">
            <NotificationBell user={user} />
            <Link to={createPageUrl('AccountSettings')} className="inline-flex items-center justify-center w-10 h-10 rounded-full shadow-md" style={{ backgroundColor: 'white', border: '1px solid rgba(255,105,180,0.25)' }}>
              <Settings className="w-5 h-5" style={{ color: '#FF1493' }} />
            </Link>
          </div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#FF1493' }}>
              Bonjour {displayName} ✨
            </h1>
          </motion.div>
        </div>

        {/* Contenu principal */}
        <div className="max-w-2xl mx-auto px-4 md:px-6 pb-10 space-y-4">

          {/* STREAK */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
            <ReadingStreakCard user={user} />
          </motion.div>

          {/* LECTURE EN COURS */}
          {currentlyReading.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <Card className="border-2 rounded-3xl overflow-hidden dash-card" style={{ backgroundColor: 'white', borderColor: '#FF69B4', boxShadow: '0 4px 16px rgba(255,105,180,0.1)' }}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-extrabold uppercase tracking-wide" style={{ color: '#FF1493' }}>Ta lecture en cours</span>
                    <div className="ml-auto">
                      <Bookmark className="w-6 h-6" style={{ color: '#FF1493' }} />
                    </div>
                  </div>

                  {currentlyReading.slice(0, 1).map((userBook) => {
                    const book = allBooks.find(b => b.id === userBook.book_id);
                    if (!book) return null;
                    const isEditing = editingBookId === userBook.id;
                    const displayPage = isEditing ? parseInt(editValues.currentPage) || 0 : userBook.current_page || 0;
                    const displayTotal = isEditing ? parseInt(editValues.totalPages) || book.page_count || 0 : book.page_count || 0;
                    const progress = displayTotal > 0 ? Math.round((displayPage / displayTotal) * 100) : 0;

                    return (
                      <div key={userBook.id} className="flex gap-4">
                        {/* Cover */}
                        <div className="w-24 h-36 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: '#FFE9F0', boxShadow: '0 4px 12px rgba(255,105,180,0.2)' }}>
                          {book.cover_url && <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h3 className="font-extrabold text-lg uppercase leading-tight mb-1" style={{ color: '#2D3748' }}>{book.title}</h3>
                            <p className="text-sm mb-3" style={{ color: '#9CA3AF' }}>{book.author}</p>
                          </div>

                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input type="number" value={editValues.currentPage} onChange={(e) => setEditValues({ ...editValues, currentPage: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveProgress(userBook, book); if (e.key === 'Escape') handleCancelEdit(); }} className="flex-1 px-2 py-1 rounded-lg text-sm font-bold" style={{ backgroundColor: 'white', color: '#FF1493', border: '2px solid #FF69B4' }} autoFocus placeholder="Page actuelle" />
                                <input type="number" value={editValues.totalPages} onChange={(e) => setEditValues({ ...editValues, totalPages: e.target.value })} className="flex-1 px-2 py-1 rounded-lg text-sm font-bold" style={{ backgroundColor: 'white', color: '#FF1493', border: '2px solid #FF69B4' }} placeholder="Total pages" />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleSaveProgress(userBook, book)} className="flex-1 text-white" style={{ backgroundColor: '#FF1493' }}><Check className="w-4 h-4 mr-1" />Valider</Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEdit}><X className="w-4 h-4" /></Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <button onClick={() => handleStartEdit(userBook, book)} className="flex items-center gap-1 hover:opacity-70 transition-opacity">
                                  <span className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>{userBook.current_page || 0}/{book.page_count || '?'} PAGES</span>
                                  <Edit2 className="w-3 h-3" style={{ color: '#FF69B4' }} />
                                </button>
                                <span className="text-lg font-extrabold" style={{ color: '#FF1493' }}>{progress}%</span>
                              </div>
                              <div className="relative h-3 rounded-full overflow-hidden progress-shimmer" style={{ backgroundColor: '#FFE9F0' }}>
                                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: "easeOut" }} style={{ background: 'linear-gradient(90deg, #FF1493, #FF69B4)' }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {currentlyReading.length > 1 && (
                    <button onClick={() => navigate(createPageUrl("MyLibrary"))} className="mt-4 w-full text-center text-xs font-semibold" style={{ color: '#FF69B4' }}>
                      +{currentlyReading.length - 1} autre{currentlyReading.length > 2 ? 's' : ''} en cours →
                    </button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Bouton J'ai lu + Ajouter */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="flex gap-3">
            <Button
              onClick={handleMarkToday}
              disabled={hasReadToday}
              className="flex-1 font-bold rounded-2xl py-3"
              style={{ background: hasReadToday ? '#E5E7EB' : 'linear-gradient(135deg, #FF69B4, #FF1493)', color: hasReadToday ? '#9CA3AF' : 'white' }}
            >
              <Flame className="w-5 h-5 mr-2" />
              {hasReadToday ? "Lu aujourd'hui ✓" : "J'ai lu aujourd'hui"}
            </Button>
            <Link to={createPageUrl("MyLibrary")}>
              <Button className="font-bold rounded-2xl py-3 px-5" style={{ background: '#FF1493', color: 'white' }}>
                <Plus className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>

          {/* STATS GRID */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-extrabold uppercase tracking-wide" style={{ color: '#FF1493' }}>Stats {selectedYear}</h2>
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="text-xs font-bold rounded-xl px-3 py-1 border" style={{ color: '#FF1493', borderColor: '#FFB6C1', backgroundColor: 'white' }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: `Livres lus en ${selectedYear}`, value: booksReadThisYear, sub: readingGoal ? `sur ${readingGoal.goal_count} objectif` : null, icon: BookOpen, color: '#FF1493', bg: '#FFE9F0', onClick: () => navigate(createPageUrl("MyLibrary")) },
                { label: 'Pages lues', value: totalPagesThisYear.toLocaleString(), sub: `en ${selectedYear}`, icon: TrendingUp, color: '#FF69B4', bg: '#FFF0F5', onClick: () => navigate(createPageUrl("Statistics")) },
                { label: 'Lectures communes', value: sharedReadingsCount, sub: 'avec tes amies', icon: Users, color: '#9C27B0', bg: '#F3E5F5', onClick: () => navigate(createPageUrl("SharedReadings")) },
                { label: 'Dans ta PAL', value: toReadCount + enCours, sub: `${toReadCount} à lire · ${enCours} en cours`, icon: Library, color: '#FF69B4', bg: '#FFE9F0', onClick: () => navigate(createPageUrl("MyLibrary")) },
              ].map((stat, idx) => (
                <motion.div key={idx} whileTap={{ scale: 0.97 }} onClick={stat.onClick} className="dash-card p-4 rounded-2xl cursor-pointer" style={{ backgroundColor: 'white', boxShadow: '0 2px 10px rgba(255,105,180,0.08)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: stat.bg }}>
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                  <p className="text-2xl font-extrabold mb-1" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs font-semibold" style={{ color: '#2D3748' }}>{stat.label}</p>
                  {stat.sub && <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{stat.sub}</p>}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ACTIVITÉS DES AMIS */}
          {activityFeed.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
              <Card className="border-0 rounded-3xl overflow-hidden dash-card" style={{ backgroundColor: 'white', boxShadow: '0 4px 16px rgba(255,105,180,0.08)' }}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-extrabold uppercase tracking-wide" style={{ color: '#FF1493' }}>Activités des amies</h2>
                    <Link to={createPageUrl('Social')} className="text-xs font-semibold no-hover" style={{ color: '#FF69B4' }}>Voir tout →</Link>
                  </div>
                  <div className="space-y-3">
                    {activityFeed.slice(0, 4).map((activity, idx) => (
                      <motion.div key={activity.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: idx * 0.05 }}>
                        <SocialFeedCard activity={activity} currentUser={user} allUsers={allUsers} />
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* OBJECTIF DE LECTURE */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <ReadingGoalManager year={selectedYear} compact={false} />
          </motion.div>

          {/* CITATION */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }}>
            <Card className="border-0 rounded-3xl overflow-hidden dash-card" style={{ backgroundColor: 'white', boxShadow: '0 4px 16px rgba(255,215,0,0.08)' }}>
              <CardContent className="p-5 text-center">
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: '#FFF9E6' }}>
                  <Quote className="w-5 h-5" style={{ color: '#FFD700' }} />
                </div>
                <h2 className="text-sm font-extrabold uppercase tracking-wide mb-3" style={{ color: '#2D3748' }}>Citations</h2>
                {randomQuote && quoteBook ? (
                  <>
                    <p className="text-sm italic mb-2 leading-relaxed" style={{ color: '#4B5563' }}>"{randomQuote.quote_text}"</p>
                    <p className="text-xs font-bold" style={{ color: '#FFD700' }}>— {quoteBook.title}</p>
                  </>
                ) : (
                  <p className="text-sm italic" style={{ color: '#9CA3AF' }}>"Lire, c'est vivre mille vies avant de mourir."</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </div>

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