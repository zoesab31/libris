import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/layout/PullToRefresh";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { BookOpen, TrendingUp, Users, Star, Plus, Music, Heart, MessageCircle, Quote, Trophy, Library, ArrowRight, Sparkles, Flame, Zap, Clock, Target, Edit2, Check, X, Home, Settings, User, ChevronRight, BookMarked } from "lucide-react";
import NotificationBell from "../components/notifications/NotificationBell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from "framer-motion";
import ReadingGoalManager from "../components/dashboard/ReadingGoalManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import BookDetailsDialog from "../components/library/BookDetailsDialog";
import BestFriendCard from "../components/dashboard/BestFriendCard";
import SocialFeedCard from "../components/dashboard/SocialFeedCard";
import ReadingStreakCard from "../components/dashboard/ReadingStreakCard";
import FloatingParticles from "../components/effects/FloatingParticles";
import OnboardingTrigger from "../components/onboarding/OnboardingTrigger";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } }
};

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] } }
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBookForDetails, setSelectedBookForDetails] = useState(null);
  const [editingBookId, setEditingBookId] = useState(null);
  const [editValues, setEditValues] = useState({ currentPage: '', totalPages: '' });
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [newGoalValue, setNewGoalValue] = useState("");
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

  const handleMarkToday = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    await base44.entities.ReadingDay.create({ date: today });
    queryClient.invalidateQueries({ queryKey: ['readingDayToday'] });
    toast.success("Jour de lecture enregistré ✨");
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

  const { data: friendsQuotes = [] } = useQuery({
    queryKey: ['friendsQuotes'],
    queryFn: async () => {
      const friendsEmails = myFriends.map(f => f.friend_email);
      if (friendsEmails.length === 0) return [];
      const results = await Promise.all(friendsEmails.map(email => base44.entities.Quote.filter({ created_by: email })));
      return results.flat();
    },
    enabled: myFriends.length > 0,
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

  const MAX_GOAL_CHANGES = 3;

  const { data: readingGoal } = useQuery({
    queryKey: ['readingGoal', selectedYear, user?.email],
    queryFn: async () => {
      const goals = await base44.entities.ReadingGoal.filter({ created_by: user?.email, year: selectedYear });
      return goals[0] || null;
    },
    enabled: !!user,
  });

  const changesRemaining = readingGoal
    ? MAX_GOAL_CHANGES - (readingGoal.changes_count || 0)
    : MAX_GOAL_CHANGES;

  const handleSaveGoal = async () => {
    const goal = parseInt(newGoalValue);
    if (isNaN(goal) || goal < 1) { toast.error("Veuillez entrer un nombre valide"); return; }
    if (readingGoal) {
      if ((readingGoal.changes_count || 0) >= MAX_GOAL_CHANGES) {
        toast.error(`Maximum ${MAX_GOAL_CHANGES} modifications par an`);
        return;
      }
      await base44.entities.ReadingGoal.update(readingGoal.id, { goal_count: goal, changes_count: (readingGoal.changes_count || 0) + 1 });
    } else {
      await base44.entities.ReadingGoal.create({ year: selectedYear, goal_count: goal, changes_count: 0 });
    }
    queryClient.invalidateQueries({ queryKey: ['readingGoal'] });
    toast.success("Objectif mis à jour !");
    setShowGoalDialog(false);
    setNewGoalValue("");
  };

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
  const toReadCount = myBooks.filter(b => b.status === "À lire" || b.status === "En cours").length;

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
    if (userBook.status === "Abandonné" && abandonedBookCounts(userBook)) return userBook.end_date || userBook.updated_date;
    return null;
  };

  const booksReadThisYear = myBooks.reduce((count, b) => {
    const effectiveDate = getEffectiveDate(b);
    if (effectiveDate && new Date(effectiveDate).getFullYear() === selectedYear) count++;
    if (b.rereads && b.rereads.length > 0) {
      b.rereads.forEach(reread => {
        if (reread.end_date && new Date(reread.end_date).getFullYear() === selectedYear) count++;
      });
    }
    return count;
  }, 0);

  const totalPagesThisYear = myBooks
    .filter(b => { const d = getEffectiveDate(b); return d && new Date(d).getFullYear() === selectedYear; })
    .reduce((sum, userBook) => {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (!book || userBook.status !== "Lu") return sum;
      return sum + (book.page_count || 0);
    }, 0);

  const displayName = user?.display_name || user?.full_name?.split(' ')[0] || 'Lectrice';
  const randomQuote = allQuotes.length > 0 ? allQuotes[Math.floor(Math.random() * allQuotes.length)] : null;
  const quoteBook = randomQuote ? allBooks.find(b => b.id === randomQuote.book_id) : null;

  const allMusicWithBooks = React.useMemo(() => {
    const musicList = [];
    myBooks.forEach(userBook => {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (!book) return;
      if (userBook.music_playlist && userBook.music_playlist.length > 0) {
        userBook.music_playlist.forEach(music => musicList.push({ ...music, book, userBook }));
      }
    });
    return musicList.sort(() => 0.5 - Math.random()).slice(0, 3);
  }, [myBooks, allBooks]);

  const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);
  const goalProgress = readingGoal ? Math.min(100, Math.round((booksReadThisYear / readingGoal.goal_count) * 100)) : 0;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen relative overflow-x-hidden" style={{ background: 'linear-gradient(160deg, #FEF0FA 0%, #F5EEFF 50%, #EEF4FF 100%)' }}>
        <OnboardingTrigger />

        {/* Animated SVG background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE8F8" />
                <stop offset="50%" stopColor="#EDE0FF" />
                <stop offset="100%" stopColor="#D8EEFF" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#bg-grad)" />
          </svg>
          {/* Animated wavy lines */}
          <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.35 }}>
            <defs>
              <style>{`
                @keyframes wave1 { 0%,100%{ d: path("M0,200 C200,150 400,250 600,200 S1000,100 1200,180 1440,220 1440,220 L1440,0 L0,0 Z"); } 50%{ d: path("M0,220 C200,270 400,170 600,220 S1000,300 1200,240 1440,200 1440,200 L1440,0 L0,0 Z"); } }
                @keyframes wave2 { 0%,100%{ d: path("M0,400 C300,360 500,440 800,390 S1100,430 1440,400 L1440,0 L0,0 Z"); } 50%{ d: path("M0,380 C300,420 500,360 800,410 S1100,370 1440,420 L1440,0 L0,0 Z"); } }
                @keyframes wave3 { 0%,100%{ d: path("M0,600 C250,560 500,640 750,590 S1150,630 1440,600 L1440,0 L0,0 Z"); } 50%{ d: path("M0,620 C250,660 500,580 750,630 S1150,590 1440,620 L1440,0 L0,0 Z"); } }
                @keyframes wave4 { 0%,100%{ d: path("M0,800 C350,760 600,840 900,790 S1200,830 1440,800 L1440,0 L0,0 Z"); } 50%{ d: path("M0,820 C350,860 600,780 900,830 S1200,790 1440,820 L1440,0 L0,0 Z"); } }
                @keyframes lineFloat { 0%,100%{ transform: translateY(0px); } 50%{ transform: translateY(-18px); } }
              `}</style>
            </defs>
            {/* Wave bands */}
            <path style={{ animation: 'wave1 8s ease-in-out infinite' }} fill="#F4A7CE" opacity="0.18"
              d="M0,200 C200,150 400,250 600,200 S1000,100 1200,180 1440,220 1440,220 L1440,0 L0,0 Z" />
            <path style={{ animation: 'wave2 11s ease-in-out infinite' }} fill="#D4A0E8" opacity="0.14"
              d="M0,400 C300,360 500,440 800,390 S1100,430 1440,400 L1440,0 L0,0 Z" />
            <path style={{ animation: 'wave3 9s ease-in-out infinite' }} fill="#A0C4F8" opacity="0.10"
              d="M0,600 C250,560 500,640 750,590 S1150,630 1440,600 L1440,0 L0,0 Z" />
            <path style={{ animation: 'wave4 13s ease-in-out infinite' }} fill="#C8A0E8" opacity="0.08"
              d="M0,800 C350,760 600,840 900,790 S1200,830 1440,800 L1440,0 L0,0 Z" />
            {/* Diagonal floating lines */}
            {[
              { x1: 0, y1: 300, x2: 400, y2: 0, delay: '0s' },
              { x1: 300, y1: 900, x2: 900, y2: 200, delay: '1.5s' },
              { x1: 800, y1: 900, x2: 1440, y2: 400, delay: '3s' },
              { x1: 1100, y1: 700, x2: 1440, y2: 200, delay: '0.8s' },
              { x1: 0, y1: 700, x2: 600, y2: 300, delay: '2.2s' },
            ].map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke="#E0A8D8" strokeWidth="0.8" opacity="0.25"
                style={{ animation: `lineFloat ${7 + i * 1.3}s ease-in-out infinite`, animationDelay: l.delay }} />
            ))}
          </svg>
          {/* Soft blobs */}
          <div style={{ position:'absolute', top:'-80px', right:'-80px', width:'340px', height:'340px', borderRadius:'50%', background:'radial-gradient(circle, #F9C8EC 0%, transparent 70%)', opacity:0.5 }} />
          <div style={{ position:'absolute', bottom:'10%', left:'-60px', width:'280px', height:'280px', borderRadius:'50%', background:'radial-gradient(circle, #C8B0F4 0%, transparent 70%)', opacity:0.35 }} />
          <div style={{ position:'absolute', top:'40%', right:'5%', width:'200px', height:'200px', borderRadius:'50%', background:'radial-gradient(circle, #A8D0F8 0%, transparent 70%)', opacity:0.25 }} />
        </div>

        <FloatingParticles count={18} />

        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
          @keyframes pulse-ring {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          @keyframes float-gentle {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          @keyframes gradient-x {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes eq {
            0%, 100% { scaleY: 0.3; }
            50% { scaleY: 1; }
          }
          .glass-card {
            background: rgba(255,255,255,0.72);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,0.85);
          }
          .glass-card-purple {
            background: rgba(248,240,255,0.75);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(200,160,255,0.3);
          }
          .card-hover {
            transition: transform 0.35s cubic-bezier(0.23,1,0.32,1), box-shadow 0.35s cubic-bezier(0.23,1,0.32,1);
          }
          .card-hover:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 50px rgba(255,20,147,0.18);
          }
          .progress-bar-shine {
            position: relative;
            overflow: hidden;
          }
          .progress-bar-shine::after {
            content: '';
            position: absolute;
            top: 0; left: 0;
            width: 60%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
            animation: shimmer 2.5s ease-in-out infinite;
          }
          .stat-card {
            transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
          }
          .stat-card:hover {
            transform: translateY(-6px) scale(1.04);
            box-shadow: 0 16px 40px rgba(255,20,147,0.2);
          }
          .float-gentle {
            animation: float-gentle 3s ease-in-out infinite;
          }
          .gradient-text-pink {
          background: linear-gradient(135deg, #D4288C, #E880BB, #9B3EC8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .hero-bg-blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(60px);
            opacity: 0.45;
            pointer-events: none;
          }
          @keyframes eq-bar {
            0%, 100% { height: 4px; }
            50% { height: 16px; }
          }
          .eq-bar { animation: eq-bar 0.7s ease-in-out infinite; }
          .eq-bar:nth-child(2) { animation-delay: 0.1s; }
          .eq-bar:nth-child(3) { animation-delay: 0.2s; }
          .eq-bar:nth-child(4) { animation-delay: 0.3s; }
        `}</style>

        {/* ─── HERO HEADER ─── */}
        <div className="relative overflow-hidden" style={{ zIndex: 1 }}>
          {/* Blobs décoratifs */}
          <div className="hero-bg-blob w-72 h-72 -top-20 -right-20" style={{ background: '#FADADD' }} />
          <div className="hero-bg-blob w-96 h-96 top-10 -left-32" style={{ background: '#FDE8F0' }} />
          <div className="hero-bg-blob w-48 h-48 bottom-0 right-1/3" style={{ background: '#EDD9F5' }} />

          {/* Icônes flottantes */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[
              { icon: <BookOpen className="w-7 h-7" />, color: '#F4A7CE', x: 'right-16', y: 'top-12', delay: 0, dur: 4 },
              { icon: <Heart className="w-5 h-5" />, color: '#D4A0E8', x: 'left-20', y: 'top-28', delay: 1, dur: 5 },
              { icon: <Sparkles className="w-6 h-6" />, color: '#F8D6EE', x: 'right-1/3', y: 'top-8', delay: 2, dur: 3.5 },
              { icon: <Star className="w-4 h-4" />, color: '#EAC8E8', x: 'left-1/3', y: 'bottom-12', delay: 0.5, dur: 4.5 },
              { icon: <Music className="w-5 h-5" />, color: '#C990E8', x: 'right-8', y: 'bottom-16', delay: 1.5, dur: 6 },
            ].map((el, i) => (
              <motion.div
                key={i}
                className={`absolute ${el.x} ${el.y}`}
                animate={{ y: [0, -16, 4, -12, 0], rotate: [0, 10, -5, 8, 0], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: el.dur, repeat: Infinity, ease: "easeInOut", delay: el.delay }}
                style={{ color: el.color }}
              >
                {el.icon}
              </motion.div>
            ))}
          </div>

          <div className="relative px-5 pt-6 pb-8 md:px-10 md:pt-10 md:pb-10">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-8">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                <p className="text-sm font-medium mb-0.5" style={{ color: '#D4A0C8' }}>
                  {format(new Date(), "EEEE d MMMM", { locale: fr })}
                </p>
                <h1 className="text-2xl md:text-4xl font-bold gradient-text-pink leading-tight">
                  Bonjour {displayName} ✨
                </h1>
                <p className="text-sm mt-1" style={{ color: '#B090B0' }}>
                  Ton univers littéraire t'attend
                </p>
              </motion.div>
              <div className="flex items-center gap-2">
                <NotificationBell user={user} />
                <Link to={createPageUrl('AccountSettings')} className="inline-flex items-center justify-center w-10 h-10 rounded-full glass-card shadow-sm">
                  <Settings className="w-4 h-4" style={{ color: '#FF1493' }} />
                </Link>
              </div>
            </div>

            {/* Stats cards */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
            >
              {[
                {
                  icon: <BookOpen className="w-5 h-5" style={{ color: '#E91E8C' }} />,
                  bg: '#FDE8F4',
                  iconBg: '#FBB9DC',
                  value: booksReadThisYear,
                  suffix: readingGoal ? `/${readingGoal.goal_count}` : null,
                  label: `Livres lus en ${selectedYear}`,
                  valueColor: '#C0176A',
                  labelColor: '#D45A9A',
                  onClick: () => { setNewGoalValue(readingGoal?.goal_count?.toString() || ""); setShowGoalDialog(true); },
                  sparkle: true,
                },
                {
                  icon: <TrendingUp className="w-5 h-5" style={{ color: '#9B5DE5' }} />,
                  bg: '#F0E8FD',
                  iconBg: '#D8C3F9',
                  value: totalPagesThisYear.toLocaleString('fr-FR'),
                  label: 'Pages dévorées',
                  valueColor: '#6B28C8',
                  labelColor: '#9B5DE5',
                  onClick: () => navigate(createPageUrl("Statistics")),
                  sparkle: true,
                },
                {
                  icon: <Users className="w-5 h-5" style={{ color: '#E06AC4' }} />,
                  bg: '#FCE8F8',
                  iconBg: '#F4BDE9',
                  value: myFriends.length,
                  label: 'Lectures communes',
                  valueColor: '#A81F8C',
                  labelColor: '#C24FAE',
                  onClick: () => navigate(createPageUrl("SharedReadings")),
                },
                {
                  icon: <BookMarked className="w-5 h-5" style={{ color: '#C97ABF' }} />,
                  bg: '#F8EDF9',
                  iconBg: '#EAC8E8',
                  value: toReadCount,
                  label: 'Dans ta PAL',
                  valueColor: '#8B3A8B',
                  labelColor: '#B060B0',
                  onClick: () => navigate(createPageUrl("MyLibrary")),
                },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  variants={scaleVariants}
                  className="stat-card rounded-3xl p-4 md:p-5 cursor-pointer relative overflow-hidden"
                  style={{ background: s.bg, border: `1px solid ${s.iconBg}` }}
                  onClick={s.onClick}
                  whileTap={{ scale: 0.96 }}
                >
                  <div className="relative z-10">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ background: s.iconBg }}>
                      {s.icon}
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-2xl md:text-3xl font-extrabold" style={{ color: s.valueColor }}>{s.value}</span>
                      {s.suffix && <span className="text-base font-semibold opacity-60" style={{ color: s.valueColor }}>{s.suffix}</span>}
                    </div>
                    <p className="text-xs md:text-sm font-medium" style={{ color: s.labelColor }}>{s.label}</p>
                  </div>
                  {s.sparkle && (
                    <motion.div
                      className="absolute top-3 right-3"
                      animate={{ rotate: [0, 20, -10, 15, 0], scale: [1, 1.3, 0.9, 1.2, 1] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                    >
                      <Sparkles className="w-4 h-4 opacity-40" style={{ color: s.valueColor }} />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </motion.div>

            {/* Actions bar */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-wrap items-center gap-3"
            >
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-4 py-2.5 rounded-2xl font-semibold text-sm glass-card shadow-sm cursor-pointer"
                style={{ color: '#FF1493', outline: 'none' }}
              >
                {years.map(year => <option key={year} value={year}>📅 {year}</option>)}
              </select>

              <motion.button
                onClick={handleMarkToday}
                disabled={hasReadToday}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm shadow-sm transition-all"
                style={{
                  background: hasReadToday ? 'rgba(255,255,255,0.7)' : '#F4A7CE',
                  color: hasReadToday ? '#C0C0C0' : '#7A1050',
                  border: hasReadToday ? '1px solid rgba(200,200,200,0.4)' : 'none'
                }}
                whileTap={{ scale: 0.95 }}
                whileHover={!hasReadToday ? { scale: 1.04 } : {}}
              >
                <Flame className="w-4 h-4" />
                {hasReadToday ? "Lu aujourd'hui ✓" : "J'ai lu aujourd'hui"}
              </motion.button>

              <Link to={createPageUrl("MyLibrary")}>
                <motion.button
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm shadow-sm"
                  style={{ background: '#D4A0E8', color: '#4A1060' }}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.04 }}
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un livre
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* ─── CONTENU PRINCIPAL ─── */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
          <div className="grid lg:grid-cols-3 gap-5 md:gap-7">

            {/* ── Colonne gauche (2/3) ── */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-2 space-y-5 md:space-y-6"
            >
              {/* Streak */}
              <motion.div variants={itemVariants}>
                <ReadingStreakCard user={user} />
              </motion.div>

              {/* Lectures en cours */}
              <motion.div variants={itemVariants}>
                <div className="glass-card rounded-3xl shadow-sm overflow-hidden card-hover">
                  <div className="p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg md:text-xl font-bold flex items-center gap-3" style={{ color: '#2D1F3F' }}>
                        <span className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FF69B4,#FF1493)' }}>
                          <BookOpen className="w-4 h-4 text-white" />
                        </span>
                        En cours de lecture
                      </h2>
                      {currentlyReading.length > 0 && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#FF1493,#FF69B4)' }}>
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
                          const displayPage = isEditing ? parseInt(editValues.currentPage) || 0 : userBook.current_page || 0;
                          const displayTotal = isEditing ? parseInt(editValues.totalPages) || book.page_count || 0 : book.page_count || 0;
                          const progress = displayTotal > 0 ? Math.round((displayPage / displayTotal) * 100) : 0;

                          return (
                            <motion.div
                              key={userBook.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.4, delay: idx * 0.1 }}
                              className="p-4 md:p-5 rounded-2xl"
                              style={{ background: '#FEF5FB', border: '1px solid #F8D6EE' }}
                            >
                              <div className="flex gap-4">
                                <div className="relative flex-shrink-0">
                                  <div className="w-28 h-40 md:w-32 md:h-48 rounded-2xl overflow-hidden shadow-md"
                                      style={{ backgroundColor: '#FDE8F4' }}>
                                     {book.cover_url && <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />}
                                   </div>
                                   {progress > 0 && (
                                     <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center font-extrabold shadow-md"
                                       style={{ background: '#FBB9DC', color: '#C0176A', fontSize: '10px' }}>
                                       {progress}%
                                     </div>
                                   )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-base mb-0.5 line-clamp-2" style={{ color: '#2D1F3F' }}>{book.title}</h3>
                                  <p className="text-sm mb-3" style={{ color: '#A78BBA' }}>{book.author}</p>

                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <div className="flex gap-2">
                                        <input type="number" value={editValues.currentPage}
                                          onChange={e => setEditValues({ ...editValues, currentPage: e.target.value })}
                                          onKeyDown={e => { if (e.key === 'Enter') handleSaveProgress(userBook, book); if (e.key === 'Escape') handleCancelEdit(); }}
                                          placeholder="Page" autoFocus
                                          className="flex-1 px-3 py-2 rounded-xl text-sm font-bold text-center"
                                          style={{ border: '2px solid #FF69B4', color: '#FF1493', background: 'white' }}
                                        />
                                        <input type="number" value={editValues.totalPages}
                                          onChange={e => setEditValues({ ...editValues, totalPages: e.target.value })}
                                          placeholder="Total"
                                          className="flex-1 px-3 py-2 rounded-xl text-sm font-bold text-center"
                                          style={{ border: '2px solid #FF69B4', color: '#FF1493', background: 'white' }}
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <button onClick={() => handleSaveProgress(userBook, book)}
                                          className="flex-1 py-2 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1"
                                          style={{ background: 'linear-gradient(135deg,#FF1493,#FF69B4)' }}>
                                          <Check className="w-3.5 h-3.5" /> Valider
                                        </button>
                                        <button onClick={handleCancelEdit}
                                          className="px-3 py-2 rounded-xl text-sm font-bold"
                                          style={{ background: '#F3F4F6', color: '#9CA3AF' }}>
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <button onClick={() => handleStartEdit(userBook, book)}
                                        className="flex items-center gap-1.5 mb-2 hover:opacity-75 transition-opacity">
                                        <span className="text-xs font-semibold" style={{ color: '#FF1493' }}>
                                          📖 {userBook.current_page || 0} / {book.page_count || '?'} pages
                                        </span>
                                        <Edit2 className="w-3 h-3" style={{ color: '#FF69B4' }} />
                                      </button>
                                      {estimation && (
                                        <p className="text-xs mb-2 italic" style={{ color: '#9C27B0' }}>
                                          ⏱ Est. ~{estimation.estimatedPage} pages
                                        </p>
                                      )}
                                      <div className="relative h-2.5 rounded-full overflow-hidden progress-bar-shine" style={{ background: '#FFE9F0' }}>
                                        <motion.div
                                          className="h-full rounded-full"
                                          initial={{ width: 0 }}
                                          animate={{ width: `${progress}%` }}
                                          transition={{ duration: 1.2, ease: "easeOut", delay: idx * 0.1 }}
                                          style={{ background: 'linear-gradient(90deg, #E91E8C, #F472B6)' }}
                                        />
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
                          <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #FFE9F0, #FFD6E8)' }}
                          >
                            <BookOpen className="w-10 h-10" style={{ color: '#FF69B4' }} />
                          </motion.div>
                          <p className="font-bold mb-2" style={{ color: '#2D1F3F' }}>Aucune lecture en cours</p>
                          <p className="text-sm mb-5" style={{ color: '#A78BBA' }}>Commencez votre prochaine aventure</p>
                          <Link to={createPageUrl("MyLibrary")}>
                            <button className="px-6 py-2.5 rounded-2xl font-bold text-sm text-white"
                              style={{ background: 'linear-gradient(135deg,#FF1493,#FF69B4)' }}>
                              <Plus className="w-4 h-4 inline mr-1" /> Choisir un livre
                            </button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Feed amies */}
              {activityFeed.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div className="glass-card rounded-3xl shadow-sm overflow-hidden card-hover">
                    <div className="p-6 md:p-8">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg md:text-xl font-bold flex items-center gap-3" style={{ color: '#2D1F3F' }}>
                          <span className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#E91E63,#FF69B4)' }}>
                            <Sparkles className="w-4 h-4 text-white" />
                          </span>
                          Activité de tes amies
                        </h2>
                        <Link to={createPageUrl('Social')} className="flex items-center gap-1 text-xs font-semibold no-hover" style={{ color: '#FF1493' }}>
                          Voir plus <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                      <div className="space-y-3">
                        {activityFeed.slice(0, 5).map((activity, idx) => (
                          <motion.div key={activity.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: idx * 0.05 }}>
                            <SocialFeedCard activity={activity} currentUser={user} allUsers={allUsers} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tes amies lisent */}
              {friendsBooks.filter(b => b.status === "En cours").length > 0 && (
                <motion.div variants={itemVariants}>
                  <div className="glass-card-purple rounded-3xl shadow-sm overflow-hidden card-hover">
                    <div className="p-6 md:p-8">
                      <h2 className="text-lg md:text-xl font-bold mb-6 flex items-center gap-3" style={{ color: '#2D1F3F' }}>
                        <span className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#9C27B0,#BA68C8)' }}>
                          <Users className="w-4 h-4 text-white" />
                        </span>
                        Tes amies lisent
                      </h2>
                      <div className="grid md:grid-cols-2 gap-4">
                        {friendsBooks.filter(b => b.status === "En cours").slice(0, 4).map((userBook, idx) => {
                          const book = allBooks.find(b => b.id === userBook.book_id);
                          const friend = myFriends.find(f => f.friend_email === userBook.created_by);
                          const friendUser = allUsers.find(u => u.email === userBook.created_by);
                          if (!book || !friend) return null;
                          const progress = userBook.current_page && book.page_count
                            ? Math.round((userBook.current_page / book.page_count) * 100) : 0;
                          const friendQuotes = friendsQuotes.filter(q => q.book_id === book.id && q.created_by === userBook.created_by);
                          const friendQuote = friendQuotes.length > 0 ? friendQuotes[Math.floor(Math.random() * friendQuotes.length)] : null;

                          return (
                            <motion.div key={userBook.id}
                              initial={{ opacity: 0, scale: 0.92 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.35, delay: idx * 0.08 }}
                              className="p-4 rounded-2xl"
                              style={{ background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(156,39,176,0.12)' }}
                            >
                              <div className="flex gap-3 mb-3">
                                <div className="w-14 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-sm" style={{ backgroundColor: '#F3E5F5' }}>
                                  {book.cover_url && <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold mb-1" style={{ color: '#9C27B0' }}>
                                    @{friendUser?.pseudo || friendUser?.display_name || friend.friend_name || 'amie'}
                                  </p>
                                  <h4 className="font-bold text-sm line-clamp-2 mb-1" style={{ color: '#2D1F3F' }}>{book.title}</h4>
                                  <p className="text-xs mb-2" style={{ color: '#A78BBA' }}>{book.author}</p>
                                  {userBook.current_page && book.page_count && (
                                    <div className="flex items-center justify-between text-xs">
                                      <span style={{ color: '#9C27B0' }}>{userBook.current_page}/{book.page_count} p.</span>
                                      <span className="font-bold" style={{ color: '#9C27B0' }}>{progress}%</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {progress > 0 && (
                                <div className="relative h-2 rounded-full overflow-hidden mb-3 progress-bar-shine" style={{ background: '#F3E5F5' }}>
                                  <motion.div className="h-full rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1, ease: "easeOut", delay: idx * 0.1 }}
                                    style={{ background: 'linear-gradient(90deg, #9C27B0, #CE93D8)' }}
                                  />
                                </div>
                              )}
                              {friendQuote && (
                                <div className="px-3 py-2.5 rounded-xl" style={{ background: 'rgba(243,229,245,0.7)' }}>
                                  <p className="text-xs italic leading-relaxed" style={{ color: '#7B1FA2' }}>
                                    "{friendQuote.quote_text}"
                                  </p>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Citation du jour */}
              <motion.div variants={itemVariants}>
                <div className="rounded-3xl overflow-hidden shadow-sm card-hover"
                  style={{ background: 'linear-gradient(135deg, #FFF9E6 0%, #FFF3CC 100%)', border: '1px solid rgba(255,215,0,0.25)' }}>
                  <div className="p-6 md:p-8 text-center">
                    <motion.div
                      animate={{ rotate: [0, 10, -8, 5, 0], scale: [1, 1.1, 0.95, 1.05, 1] }}
                      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                      className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center shadow-md"
                      style={{ background: 'linear-gradient(135deg,#FFD700,#FFC200)' }}
                    >
                      <Quote className="w-6 h-6 text-white" />
                    </motion.div>
                    <h2 className="text-base font-bold mb-4" style={{ color: '#8B6800' }}>✨ Citation du jour</h2>
                    {randomQuote && quoteBook ? (
                      <>
                        <p className="text-sm md:text-base italic mb-3 leading-relaxed" style={{ color: '#5C4A00' }}>
                          "{randomQuote.quote_text}"
                        </p>
                        <p className="text-xs font-bold" style={{ color: '#FFB800' }}>— {quoteBook.title}</p>
                      </>
                    ) : (
                      <p className="text-base italic" style={{ color: '#B8860B' }}>
                        "Lire, c'est vivre mille vies avant de mourir."
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* ── Colonne droite (1/3) ── */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-5 md:space-y-6"
            >
              {/* Meilleure amie */}
              <motion.div variants={itemVariants}>
                <BestFriendCard user={user} />
              </motion.div>

              {/* Objectif de lecture */}
              {readingGoal && (
                <motion.div variants={itemVariants}>
                  <div
                    className="rounded-3xl shadow-sm card-hover overflow-hidden cursor-pointer"
                    style={{ background: 'linear-gradient(135deg,#F4A7CE 0%,#C990E8 100%)' }}
                    onClick={() => { setNewGoalValue(readingGoal?.goal_count?.toString() || ""); setShowGoalDialog(true); }}
                  >
                    <div className="p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                          <Target className="w-5 h-5 opacity-70" style={{ color: '#4A1060' }} />
                          <span className="text-sm font-bold opacity-70" style={{ color: '#4A1060' }}>Objectif {selectedYear}</span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-4xl font-extrabold" style={{ color: '#3A0050' }}>{booksReadThisYear}</span>
                          <span className="text-xl font-semibold opacity-60" style={{ color: '#3A0050' }}>/ {readingGoal.goal_count}</span>
                        </div>
                        <div className="relative h-3 rounded-full overflow-hidden mb-2 progress-bar-shine" style={{ background: 'rgba(255,255,255,0.4)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${goalProgress}%` }}
                            transition={{ duration: 1.4, ease: "easeOut" }}
                            style={{ background: 'rgba(58,0,80,0.4)' }}
                          />
                        </div>
                        <p className="text-xs opacity-80" style={{ color: '#4A1060' }}>
                          {goalProgress >= 100 ? "🎉 Objectif atteint !" : `${goalProgress}% complété · encore ${readingGoal.goal_count - booksReadThisYear} livre${readingGoal.goal_count - booksReadThisYear !== 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Playlist musicale */}
              {allMusicWithBooks.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div
                    className="glass-card rounded-3xl shadow-sm overflow-hidden card-hover cursor-pointer"
                    onClick={() => navigate(createPageUrl("MusicPlaylist"))}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold flex items-center gap-2" style={{ color: '#2D1F3F' }}>
                          <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#E91E63,#FF69B4)' }}>
                            <Music className="w-4 h-4 text-white" />
                          </span>
                          Ta Playlist
                        </h2>
                        {/* Equalizer */}
                        <div className="flex items-end gap-0.5 h-5">
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} className="w-1 rounded-full eq-bar" style={{ background: '#E91E63', minHeight: '4px' }} />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {allMusicWithBooks.slice(0, 3).map((musicItem, idx) => (
                          <motion.div key={idx}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.08 }}
                            className="flex items-center gap-3 p-2.5 rounded-xl"
                            style={{ background: 'rgba(255,241,249,0.7)' }}
                          >
                            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: '#FFE9F0' }}>
                              {musicItem.book.cover_url && <img src={musicItem.book.cover_url} alt="" className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs line-clamp-1" style={{ color: '#2D1F3F' }}>{musicItem.title}</p>
                              <p className="text-xs line-clamp-1" style={{ color: '#A78BBA' }}>{musicItem.artist}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      <button className="w-full mt-4 py-2.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
                        style={{ background: '#F4A7CE', color: '#7A1050' }}>
                        Voir toute la playlist <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Goal Dialog */}
        <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
          <DialogContent className="max-w-sm rounded-3xl">
            <DialogHeader>
              <DialogTitle style={{ color: '#FF1493' }}>🎯 Objectif de lecture {selectedYear}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {readingGoal && changesRemaining > 0 && (
                <p className="text-sm px-3 py-2 rounded-xl" style={{ backgroundColor: '#FFE9F0', color: '#FF1493' }}>
                  ⚠️ {changesRemaining} modification{changesRemaining !== 1 ? 's' : ''} restante{changesRemaining !== 1 ? 's' : ''} cette année
                </p>
              )}
              {readingGoal && changesRemaining <= 0 && (
                <p className="text-sm px-3 py-2 rounded-xl" style={{ backgroundColor: '#FFE9F0', color: '#FF1493' }}>
                  🔒 Maximum de modifications atteint pour {selectedYear}
                </p>
              )}
              <Input type="number" min="1" value={newGoalValue}
                onChange={e => setNewGoalValue(e.target.value)}
                placeholder="Nombre de livres à lire"
                disabled={readingGoal && changesRemaining <= 0}
                onKeyDown={e => e.key === 'Enter' && handleSaveGoal()}
                autoFocus />
              <div className="flex gap-2">
                <Button onClick={handleSaveGoal} disabled={readingGoal && changesRemaining <= 0}
                  className="flex-1 text-white font-bold rounded-xl" style={{ background: '#FF1493' }}>
                  Enregistrer
                </Button>
                <Button variant="outline" onClick={() => setShowGoalDialog(false)} className="rounded-xl">
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {selectedBookForDetails && (
          <BookDetailsDialog
            userBook={selectedBookForDetails}
            book={allBooks.find(b => b.id === selectedBookForDetails.book_id)}
            open={!!selectedBookForDetails}
            onOpenChange={open => !open && setSelectedBookForDetails(null)}
            initialTab="myinfo"
          />
        )}
      </div>
    </PullToRefresh>
  );
}