import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { BookOpen, Plus, Flame, ChevronRight, Settings } from "lucide-react";
import NotificationBell from "../components/notifications/NotificationBell";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from "framer-motion";
import AddBookDialog from "../components/library/AddBookDialog";
import BookDetailsDialog from "../components/library/BookDetailsDialog";
import OnboardingTrigger from "../components/onboarding/OnboardingTrigger";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedYear] = useState(new Date().getFullYear());
  const [showAddBookDialog, setShowAddBookDialog] = useState(false);
  const [selectedBookForDetails, setSelectedBookForDetails] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: activityFeed = [] } = useQuery({
    queryKey: ['activityFeed'],
    queryFn: async () => {
      const friendsEmails = myFriends.map(f => f.friend_email);
      if (friendsEmails.length === 0) return [];
      const all = await base44.entities.ActivityFeed.list('-created_date', 30);
      return all.filter(a => friendsEmails.includes(a.created_by) && a.is_visible);
    },
    enabled: myFriends.length > 0,
    refetchInterval: 30000
  });

  const { data: allQuotes = [] } = useQuery({
    queryKey: ['allQuotes'],
    queryFn: () => base44.entities.Quote.filter({ created_by: user?.email }),
    enabled: !!user
  });

  const { data: readingStreak } = useQuery({
    queryKey: ['readingStreak', user?.email],
    queryFn: async () => {
      const s = await base44.entities.ReadingStreak.filter({ created_by: user?.email });
      return s[0] || null;
    },
    enabled: !!user
  });

  const { data: readingGoal } = useQuery({
    queryKey: ['readingGoal', selectedYear, user?.email],
    queryFn: async () => {
      const goals = await base44.entities.ReadingGoal.filter({ created_by: user?.email, year: selectedYear });
      return goals[0] || null;
    },
    enabled: !!user
  });

  const { data: readingDayToday = [] } = useQuery({
    queryKey: ['readingDayToday'],
    queryFn: () => base44.entities.ReadingDay.filter({
      created_by: user?.email,
      date: format(new Date(), 'yyyy-MM-dd')
    }),
    enabled: !!user,
    refetchInterval: 5000
  });

  const hasReadToday = readingDayToday.length > 0;

  const handleMarkToday = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    await base44.entities.ReadingDay.create({ date: today });
    queryClient.invalidateQueries({ queryKey: ['readingDayToday'] });
    toast.success("Jour de lecture enregistré ✨");
  };

  const handleAddPages = async (pages) => {
    if (!heroBook || !heroBookData) return;
    const newPage = Math.min((heroBook.current_page || 0) + pages, heroBookData.page_count || 9999);
    await base44.entities.UserBook.update(heroBook.id, { current_page: newPage });
    queryClient.invalidateQueries({ queryKey: ['myBooks'] });
    toast.success(`+${pages} pages ajoutées 📖`);
  };

  // ── Computed ──
  const getEffectiveDate = (ub) => (ub.status === "Lu" && ub.end_date) ? ub.end_date : null;

  const currentlyReading = myBooks.filter(b => b.status === "En cours");
  const heroBook = currentlyReading[0] || null;
  const heroBookData = heroBook ? allBooks.find(b => b.id === heroBook.book_id) : null;
  const heroProgress = (heroBook?.current_page && heroBookData?.page_count)
    ? Math.round(heroBook.current_page / heroBookData.page_count * 100) : 0;

  const booksReadThisYear = myBooks.filter(b => {
    const d = getEffectiveDate(b);
    return d && new Date(d).getFullYear() === selectedYear;
  }).length;

  const totalPagesThisYear = myBooks
    .filter(b => { const d = getEffectiveDate(b); return d && new Date(d).getFullYear() === selectedYear; })
    .reduce((sum, ub) => sum + (allBooks.find(b => b.id === ub.book_id)?.page_count || 0), 0);

  const toReadCount = myBooks.filter(b => b.status === "À lire" || b.status === "En cours").length;
  const sharedCount = myFriends.length;
  const currentStreak = readingStreak?.current_streak || 0;
  const displayName = user?.display_name || user?.full_name?.split(' ')[0] || 'Lectrice';
  const goalCount = readingGoal?.goal_count;

  const randomQuote = allQuotes.length > 0 ? allQuotes[Math.floor(Math.random() * allQuotes.length)] : null;
  const quoteBook = randomQuote ? allBooks.find(b => b.id === randomQuote.book_id) : null;

  const stats = [
    {
      emoji: '📚',
      value: goalCount ? `${booksReadThisYear} / ${goalCount}` : `${booksReadThisYear}`,
      label: 'Livres lus',
      bg: 'rgba(255,182,210,0.18)',
      onClick: () => navigate(createPageUrl('Statistics'))
    },
    {
      emoji: '📄',
      value: totalPagesThisYear > 999
        ? `${(totalPagesThisYear / 1000).toFixed(1)}k`
        : totalPagesThisYear.toLocaleString('fr-FR'),
      label: 'Pages lues',
      bg: 'rgba(196,168,255,0.18)',
      onClick: () => navigate(createPageUrl('Statistics'))
    },
    {
      emoji: '🤝',
      value: sharedCount,
      label: 'Lectures communes',
      bg: 'rgba(255,182,182,0.18)',
      onClick: () => navigate(createPageUrl('SharedReadings'))
    },
    {
      emoji: '🗂️',
      value: toReadCount,
      label: 'Dans ta PAL',
      bg: 'rgba(182,230,255,0.22)',
      onClick: () => navigate(createPageUrl('MyLibrary'))
    },
  ];

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(160deg, #FFF8FC 0%, #FEF3F9 45%, #F9F0FA 75%, #F5F0FF 100%)'
    }}>
      <OnboardingTrigger />
      <style>{`
        .lb-card {
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255,255,255,0.95);
          box-shadow: 0 6px 32px rgba(233,30,99,0.08), 0 1px 4px rgba(0,0,0,0.04);
        }
        .lb-hero {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,1);
          box-shadow: 0 12px 48px rgba(233,30,99,0.12), 0 2px 8px rgba(0,0,0,0.04);
          border-radius: 28px;
        }
        .lb-btn-primary {
          background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
          color: white;
          border-radius: 16px;
          font-weight: 700;
          font-size: 14px;
          padding: 14px 20px;
          border: none;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(233,30,99,0.32);
          transition: transform 0.15s, box-shadow 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .lb-btn-primary:active { transform: scale(0.96); box-shadow: 0 2px 8px rgba(233,30,99,0.2); }
        .lb-btn-secondary {
          background: rgba(233,30,99,0.08);
          color: #D81558;
          border-radius: 16px;
          font-weight: 700;
          font-size: 14px;
          padding: 14px 18px;
          border: none;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
        }
        .lb-btn-secondary:active { transform: scale(0.96); background: rgba(233,30,99,0.15); }
        .lb-progress-track {
          height: 7px;
          background: rgba(233,30,99,0.10);
          border-radius: 99px;
          overflow: hidden;
        }
        .lb-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #E91E63, #F06292, #FF8FAB);
          border-radius: 99px;
          transition: width 1s cubic-bezier(0.34,1.56,0.64,1);
        }
        .lb-stat {
          border-radius: 20px;
          padding: 16px;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.8);
          box-shadow: 0 4px 16px rgba(233,30,99,0.06);
          transition: transform 0.15s;
        }
        .lb-stat:active { transform: scale(0.96); }
        .lb-divider { height: 1px; background: rgba(233,30,99,0.07); }
        .lb-quote-card {
          background: linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,240,252,0.9) 100%);
          border: 1px solid rgba(255,200,230,0.35);
          border-radius: 24px;
          box-shadow: 0 4px 20px rgba(233,30,99,0.07);
        }
        @media (min-width: 768px) {
          .lb-wrap { max-width: 440px; margin: 0 auto; }
        }
      `}</style>

      <div className="lb-wrap px-5 pt-8 pb-28">

        {/* ── HEADER ── */}
        <motion.div
          className="flex items-start justify-between mb-7"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase mb-1" style={{ color: '#C9A0BC' }}>
              {format(new Date(), "EEEE d MMMM", { locale: fr })}
            </p>
            <h1 className="text-3xl font-black mb-2.5" style={{ color: '#2D1F3F', letterSpacing: '-0.5px' }}>
              Bonjour {displayName} ✨
            </h1>

            <div className="flex items-center gap-2 flex-wrap">
              {currentStreak > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: 'linear-gradient(135deg,#FFF0E8,#FFE0CC)', border: '1px solid rgba(255,110,40,0.15)' }}>
                  <Flame className="w-3.5 h-3.5" style={{ color: '#FF6B35' }} />
                  <span className="text-xs font-black" style={{ color: '#C94010' }}>
                    {currentStreak} jour{currentStreak > 1 ? 's' : ''} d'affilée
                  </span>
                </div>
              )}
              {!hasReadToday && (
                <button
                  onClick={handleMarkToday}
                  style={{
                    background: 'rgba(233,30,99,0.08)',
                    color: '#E91E63',
                    border: 'none',
                    borderRadius: 99,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    minHeight: 'auto',
                    minWidth: 'auto'
                  }}
                >
                  🔥 Marquer lu aujourd'hui
                </button>
              )}
              {hasReadToday && (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(76,175,80,0.1)', color: '#2E7D32' }}>
                  ✓ Lu aujourd'hui
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-shrink-0">
            <NotificationBell user={user} />
            <Link to={createPageUrl('AccountSettings')}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 12px rgba(233,30,99,0.1)' }}>
                <Settings className="w-4 h-4" style={{ color: '#E91E63' }} />
              </div>
            </Link>
          </div>
        </motion.div>

        {/* ── HERO CARD: LECTURE EN COURS ── */}
        <motion.div
          className="lb-hero p-5 mb-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
        >
          {heroBook && heroBookData ? (
            <>
              <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: '#C9A0BC' }}>
                📖 En cours de lecture
              </p>
              <div className="flex gap-4 mb-5">
                {/* Cover */}
                <div className="flex-shrink-0 rounded-2xl overflow-hidden"
                  style={{ width: 88, height: 132, boxShadow: '0 10px 28px rgba(0,0,0,0.18)' }}>
                  {heroBookData.cover_url
                    ? <img src={heroBookData.cover_url} alt={heroBookData.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#FDE8F4,#F3E5F5)' }}>
                        <BookOpen className="w-8 h-8" style={{ color: '#E91E63' }} />
                      </div>
                  }
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <h2 className="font-black text-lg leading-tight mb-1"
                      style={{ color: '#2D1F3F', letterSpacing: '-0.3px' }}>
                      {heroBookData.title}
                    </h2>
                    <p className="text-sm mb-4" style={{ color: '#A78BBA' }}>
                      {heroBookData.author}
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-xs font-semibold" style={{ color: '#C9A0BC' }}>
                        {heroBook.current_page || 0} / {heroBookData.page_count || '?'} pages
                      </span>
                      <span className="text-base font-black" style={{ color: '#E91E63' }}>
                        {heroProgress}%
                      </span>
                    </div>
                    <div className="lb-progress-track">
                      <div className="lb-progress-fill" style={{ width: `${heroProgress}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex gap-3">
                <button className="lb-btn-primary flex-1"
                  onClick={() => setSelectedBookForDetails(heroBook)}>
                  <BookOpen className="w-4 h-4" />
                  Continuer la lecture
                </button>
                <button className="lb-btn-secondary"
                  onClick={() => handleAddPages(50)}>
                  <Plus className="w-4 h-4" />
                  50 pages
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#FFE9F0,#FFD6E8)' }}>
                <BookOpen className="w-8 h-8" style={{ color: '#E91E63' }} />
              </div>
              <p className="font-bold mb-1" style={{ color: '#2D1F3F' }}>Aucune lecture en cours</p>
              <p className="text-sm mb-4" style={{ color: '#A78BBA' }}>Commence ta prochaine aventure ✨</p>
              <button className="lb-btn-primary mx-auto" style={{ width: 'auto', padding: '12px 24px' }}
                onClick={() => setShowAddBookDialog(true)}>
                <Plus className="w-4 h-4" /> Ajouter un livre
              </button>
            </div>
          )}
        </motion.div>

        {/* ── STATS 2×2 GRID ── */}
        <motion.div
          className="grid grid-cols-2 gap-3 mb-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
        >
          {stats.map((s, i) => (
            <div key={i} className="lb-stat" style={{ background: s.bg }} onClick={s.onClick}>
              <span className="text-2xl mb-2 block">{s.emoji}</span>
              <p className="text-2xl font-black leading-none mb-1" style={{ color: '#2D1F3F' }}>{s.value}</p>
              <p className="text-xs font-medium" style={{ color: '#A78BBA' }}>{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* ── FRIENDS ACTIVITY ── */}
        {activityFeed.length > 0 && (
          <motion.div
            className="lb-card rounded-3xl p-5 mb-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.24 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-base" style={{ color: '#2D1F3F' }}>
                Activité des amies
              </h3>
              <Link to={createPageUrl('Social')}
                className="flex items-center gap-0.5 text-xs font-bold no-hover"
                style={{ color: '#E91E63' }}>
                Tout voir <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div>
              {activityFeed.slice(0, 4).map((activity, idx) => {
                const actUser = allUsers.find(u => u.email === activity.created_by);
                const actFriend = myFriends.find(f => f.friend_email === activity.created_by);
                const name = actUser?.pseudo || actUser?.display_name || actFriend?.friend_name || activity.created_by?.split('@')[0] || '?';
                const book = activity.book_id ? allBooks.find(b => b.id === activity.book_id) : null;
                const initials = name[0]?.toUpperCase() || '?';

                return (
                  <div key={activity.id}>
                    <div className="flex items-center gap-3 py-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm text-white"
                        style={{ background: 'linear-gradient(135deg,#E91E63,#F06292)' }}>
                        {actUser?.profile_picture
                          ? <img src={actUser.profile_picture} alt="" className="w-full h-full object-cover" />
                          : initials}
                      </div>
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug" style={{ color: '#2D1F3F' }}>
                          <span className="font-bold">@{name}</span>{' '}
                          <span style={{ color: '#A78BBA' }}>
                            {activity.action_text || activity.description || 'a eu une activité'}
                          </span>
                        </p>
                        {activity.created_date && (
                          <p className="text-xs mt-0.5" style={{ color: '#C9A0BC' }}>
                            {format(new Date(activity.created_date), "d MMM", { locale: fr })}
                          </p>
                        )}
                      </div>
                      {/* Book thumb */}
                      {book?.cover_url && (
                        <div className="flex-shrink-0 rounded-lg overflow-hidden"
                          style={{ width: 32, height: 46, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    {idx < Math.min(activityFeed.length, 4) - 1 && (
                      <div className="lb-divider" style={{ marginLeft: 48 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── INSPIRATIONAL QUOTE ── */}
        <motion.div
          className="lb-quote-card px-7 py-8 text-center mb-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.32 }}
        >
          <p style={{
            fontSize: 64,
            color: 'rgba(233,30,99,0.15)',
            fontFamily: 'Georgia, "Times New Roman", serif',
            lineHeight: 0.8,
            marginBottom: 12
          }}>"</p>
          <p className="italic leading-relaxed mb-4"
            style={{
              color: '#4A3060',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 16,
              lineHeight: 1.7
            }}>
            {randomQuote?.quote_text || "Lire, c'est voyager sans bouger."}
          </p>
          {quoteBook && (
            <p className="text-xs font-black tracking-widest uppercase"
              style={{ color: 'rgba(233,30,99,0.6)' }}>
              — {quoteBook.title}
            </p>
          )}
          {!randomQuote && (
            <Link to={createPageUrl('Quotes')}
              className="mt-3 block text-xs font-semibold no-hover"
              style={{ color: '#E91E63' }}>
              Ajouter des citations →
            </Link>
          )}
        </motion.div>

        {/* ── QUICK NAV CHIPS ── */}
        <motion.div
          className="flex gap-2 flex-wrap mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          {[
            { label: '📚 Bibliothèque', page: 'MyLibrary' },
            { label: '🎯 Bingo', page: 'Bingo' },
            { label: '📊 Stats', page: 'Statistics' },
            { label: '🤝 Lectures', page: 'SharedReadings' },
          ].map((chip) => (
            <button key={chip.page}
              onClick={() => navigate(createPageUrl(chip.page))}
              style={{
                background: 'rgba(255,255,255,0.82)',
                border: '1px solid rgba(233,30,99,0.12)',
                borderRadius: 99,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 700,
                color: '#5A3060',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(233,30,99,0.06)',
                minHeight: 'auto',
                minWidth: 'auto'
              }}>
              {chip.label}
            </button>
          ))}
        </motion.div>
      </div>

      {/* ── FAB ── */}
      <motion.button
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #E91E63, #F06292)',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          zIndex: 50,
          boxShadow: '0 8px 24px rgba(233,30,99,0.4)',
          minHeight: 'auto',
          minWidth: 'auto'
        }}
        onClick={() => setShowAddBookDialog(true)}
        whileTap={{ scale: 0.88 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.5 }}
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      <AddBookDialog open={showAddBookDialog} onOpenChange={setShowAddBookDialog} user={user} />

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
  );
}