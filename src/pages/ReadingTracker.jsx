import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, getYear, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Sparkles, RotateCcw, Pencil, Check, ChevronLeft, ChevronRight, Flame, BookOpen, CalendarDays, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const WEEK_DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function ReadingTracker() {
  const [user, setUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editMode, setEditMode] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  // Multi-day edit selection
  const [selectedDays, setSelectedDays] = useState(new Set()); // Set of dateStr
  const [bookOverrides, setBookOverrides] = useState({}); // { dateStr: book_id }
  const [showBookPicker, setShowBookPicker] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Load saved overrides from user data
  useEffect(() => {
    if (!user) return;
    if (user.reading_day_book_overrides) {
      try { setBookOverrides(JSON.parse(user.reading_day_book_overrides)); } catch {}
    }
  }, [user]);

  const saveOverrides = async (overrides) => {
    setBookOverrides(overrides);
    await base44.auth.updateMe({ reading_day_book_overrides: JSON.stringify(overrides) });
  };

  const { data: readingProgress = [] } = useQuery({
    queryKey: ['readingProgress', user?.email],
    queryFn: () => base44.entities.ReadingDay.filter({ created_by: user?.email }),
    enabled: !!user,
    refetchInterval: 10000,
  });

  const { data: userBooks = [] } = useQuery({
    queryKey: ['userBooksTracker', user?.email],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['allBooksTracker'],
    queryFn: () => base44.entities.Book.list(),
  });

  const readingDays = useMemo(() => {
    const days = new Set();
    readingProgress.forEach(entry => {
      if (entry.date) days.add(entry.date.slice(0, 10));
    });
    return days;
  }, [readingProgress]);

  const bestStreak = useMemo(() => {
    if (readingDays.size === 0) return 0;
    const sorted = [...readingDays].sort();
    let max = 1, cur = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (curr - prev) / (1000 * 60 * 60 * 24);
      if (diff === 1) { cur++; max = Math.max(max, cur); }
      else cur = 1;
    }
    return max;
  }, [readingDays]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    while (true) {
      const s = format(d, 'yyyy-MM-dd');
      if (readingDays.has(s)) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  }, [readingDays]);

  const totalReadingDaysYear = useMemo(() => {
    const year = getYear(new Date());
    return [...readingDays].filter(d => d.startsWith(String(year))).length;
  }, [readingDays]);

  const thisMonthDays = useMemo(() => {
    const prefix = format(currentMonth, 'yyyy-MM');
    return [...readingDays].filter(d => d.startsWith(prefix)).length;
  }, [readingDays, currentMonth]);

  // Get cover for a day (with manual override support)
  const getCoverForDay = (dateStr) => {
    // Check manual override first
    if (bookOverrides[dateStr]) {
      const book = allBooks.find(b => b.id === bookOverrides[dateStr]);
      if (book?.cover_url) return book.cover_url;
    }
    // Auto-detect: book being read on that date
    const reading = userBooks
      .filter(ub => ub.start_date && ub.start_date.slice(0, 10) <= dateStr &&
        (ub.status === 'En cours' || (ub.end_date && ub.end_date.slice(0, 10) >= dateStr)))
      .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
    if (reading.length > 0) {
      const book = allBooks.find(b => b.id === reading[0].book_id);
      return book?.cover_url || null;
    }
    return null;
  };

  const getBookForDay = (dateStr) => {
    if (bookOverrides[dateStr]) return allBooks.find(b => b.id === bookOverrides[dateStr]) || null;
    const reading = userBooks
      .filter(ub => ub.start_date && ub.start_date.slice(0, 10) <= dateStr &&
        (ub.status === 'En cours' || (ub.end_date && ub.end_date.slice(0, 10) >= dateStr)))
      .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
    if (reading.length > 0) return allBooks.find(b => b.id === reading[0].book_id) || null;
    return null;
  };

  const markDayMutation = useMutation({
    mutationFn: async (date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      await base44.entities.ReadingDay.create({ date: dateStr });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingProgress'] });
      queryClient.invalidateQueries({ queryKey: ['readingDayToday'] });
      confetti({ particleCount: 50, spread: 40, origin: { y: 0.2 } });
    }
  });

  const unmarkDayMutation = useMutation({
    mutationFn: async (date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const ids = readingProgress.filter(e => e.date?.slice(0, 10) === dateStr).map(e => e.id);
      await Promise.all(ids.map(id => base44.entities.ReadingDay.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingProgress'] });
      queryClient.invalidateQueries({ queryKey: ['readingDayToday'] });
    }
  });

  const handleDayClick = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const isFuture = day > new Date();
    if (isFuture) return;

    if (editMode) {
      // In edit mode: show options (toggle + change book)
      if (readingDays.has(dateStr)) {
        setSelectedDayForBook({ dateStr, hasRead: true });
      } else {
        // Just mark it
        markDayMutation.mutate(day);
        toast.success('Jour marqué ✅');
      }
    } else {
      // Normal mode: toggle
      if (readingDays.has(dateStr)) {
        unmarkDayMutation.mutate(day);
        toast.success('Jour retiré');
      } else {
        markDayMutation.mutate(day);
        toast.success('Jour marqué ✅');
      }
    }
  };

  const resetProgressMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(readingProgress.map(e => base44.entities.ReadingDay.delete(e.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingProgress'] });
      toast.success('Réinitialisé');
      setIsResetDialogOpen(false);
    }
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startOffset = getDay(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const selectedMonthIdx = currentMonth.getMonth();
  const totalCells = startOffset + days.length;
  const trailingEmpty = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

  // Books for the book picker (sorted by most recent)
  const booksWithCovers = useMemo(() => {
    return userBooks
      .map(ub => allBooks.find(b => b.id === ub.book_id))
      .filter(Boolean)
      .filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i);
  }, [userBooks, allBooks]);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #FFF8FC 0%, #FEF3F9 40%, #F9F0FA 70%, #F5F0FF 100%)' }}>
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-6 md:pt-10 pb-12">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold" style={{ color: '#2D1F3F' }}>Reading Tracker</h1>
              <p className="text-xs" style={{ color: '#A78BBA' }}>Suis tes jours de lecture</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => { setEditMode(v => !v); if (!editMode) toast('Mode édition — clique sur un jour lu pour changer son livre', { icon: '✏️' }); }}
              whileTap={{ scale: 0.93 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm shadow-sm transition-all"
              style={{
                background: editMode ? 'linear-gradient(135deg,#FF1493,#FF69B4)' : 'rgba(255,255,255,0.9)',
                color: editMode ? 'white' : '#FF1493',
                border: editMode ? 'none' : '2px solid #FF69B4',
              }}
            >
              {editMode ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
              {editMode ? 'Terminer' : 'Modifier'}
            </motion.button>

            <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
              <AlertDialogTrigger asChild>
                <button className="p-2 rounded-xl shadow-sm" style={{ background: 'rgba(255,255,255,0.9)', color: '#A78BBA' }}>
                  <RotateCcw className="w-4 h-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle style={{ color: '#FF1493' }}>Réinitialiser tous les jours ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action supprimera définitivement tous tes jours de lecture enregistrés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => resetProgressMutation.mutate()}
                    disabled={resetProgressMutation.isPending}
                    style={{ background: 'linear-gradient(135deg,#FF1493,#FF69B4)', color: 'white' }}
                  >
                    Réinitialiser
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* ── STATS CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: <Flame className="w-4 h-4" />, value: currentStreak, label: 'Streak actuel', unit: ' j.', grad: 'linear-gradient(135deg,#FF6B35,#FF9666)', light: '#FFF0E8' },
            { icon: <Sparkles className="w-4 h-4" />, value: bestStreak, label: 'Meilleur streak', unit: ' j.', grad: 'linear-gradient(135deg,#FF1493,#FF69B4)', light: '#FFE9F6' },
            { icon: <BookOpen className="w-4 h-4" />, value: thisMonthDays, label: 'Ce mois', unit: ' j.', grad: 'linear-gradient(135deg,#9C27B0,#CE93D8)', light: '#F3E5F5' },
            { icon: <CalendarDays className="w-4 h-4" />, value: totalReadingDaysYear, label: `Total ${getYear(new Date())}`, unit: ' j.', grad: 'linear-gradient(135deg,#2196F3,#90CAF9)', light: '#E3F2FD' },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-3"
              style={{ background: s.light, border: '1px solid rgba(0,0,0,0.05)' }}
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white mb-2"
                style={{ background: s.grad }}>
                {s.icon}
              </div>
              <p className="text-2xl font-extrabold leading-none mb-0.5" style={{ background: s.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {s.value}<span className="text-sm">{s.unit}</span>
              </p>
              <p className="text-xs font-medium text-gray-500">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── CALENDAR CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-3xl shadow-lg overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,105,180,0.15)' }}
        >
          {/* Edit mode banner */}
          <AnimatePresence>
            {editMode && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-4 py-2 text-xs font-semibold text-center"
                  style={{ background: 'linear-gradient(135deg,#FF1493,#FF69B4)', color: 'white' }}>
                  ✏️ Clique sur un jour lu pour modifier le livre associé, ou sur un jour vide pour l'ajouter
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-pink-50" style={{ color: '#FF1493' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-extrabold capitalize" style={{ color: '#2D1F3F' }}>
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-pink-50" style={{ color: '#FF1493' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month pills */}
          <div className="flex gap-1.5 overflow-x-auto px-3 pb-3" style={{ scrollbarWidth: 'none' }}>
            {MONTHS.map((m, i) => {
              const isSelected = i === selectedMonthIdx;
              return (
                <button key={m} onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), i, 1))}
                  className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all"
                  style={{ background: isSelected ? 'linear-gradient(135deg,#FF1493,#FF69B4)' : '#F5F0FF', color: isSelected ? 'white' : '#9B3EC8' }}>
                  {m}
                </button>
              );
            })}
          </div>

          {/* Week days header */}
          <div className="grid grid-cols-7 px-3 pb-1">
            {WEEK_DAYS.map((d, i) => (
              <div key={i} className="text-center text-xs font-bold" style={{ color: '#C090C0' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid — smaller cells */}
          <div className="grid grid-cols-7 gap-1 px-3 pb-4">
            {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}

            {days.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const hasRead = readingDays.has(dateStr);
              const todayDay = isToday(day);
              const cover = hasRead ? getCoverForDay(dateStr) : null;
              const isFuture = day > new Date();

              return (
                <motion.button
                  key={dateStr}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15, delay: idx * 0.005 }}
                  onClick={() => handleDayClick(day)}
                  whileTap={!isFuture ? { scale: 0.85 } : {}}
                  className="relative flex flex-col items-center justify-start rounded-xl overflow-hidden transition-all"
                  style={{
                    aspectRatio: '1 / 1.35',
                    background: hasRead
                      ? 'linear-gradient(135deg, #FF1493, #FF69B4)'
                      : todayDay ? '#FFF0F8' : isFuture ? '#FAFAFA' : '#F8F5FF',
                    boxShadow: todayDay && !hasRead ? 'inset 0 0 0 2px #FF69B4' : hasRead ? '0 2px 8px rgba(255,20,147,0.25)' : 'none',
                    cursor: isFuture ? 'default' : 'pointer',
                    opacity: isFuture ? 0.3 : 1,
                  }}
                >
                  <span className="text-[10px] font-bold pt-1 z-10 relative leading-none"
                    style={{ color: hasRead ? 'white' : todayDay ? '#FF1493' : '#6B5B7B' }}>
                    {format(day, 'd')}
                  </span>

                  {cover && (
                    <div className="absolute inset-0 top-4">
                      <img src={cover} alt="" className="w-full h-full object-cover" style={{ opacity: 0.82 }} />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(255,20,147,0.2) 0%, transparent 50%)' }} />
                    </div>
                  )}

                  {hasRead && !cover && (
                    <div className="absolute inset-0 top-4 flex items-center justify-center">
                      <span className="text-xs">📖</span>
                    </div>
                  )}

                  {/* Edit mode pencil indicator */}
                  {editMode && hasRead && (
                    <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full flex items-center justify-center z-20"
                      style={{ background: 'rgba(255,255,255,0.9)' }}>
                      <Pencil style={{ width: 6, height: 6, color: '#FF1493' }} />
                    </div>
                  )}
                </motion.button>
              );
            })}

            {Array.from({ length: trailingEmpty }).map((_, i) => <div key={`end-${i}`} />)}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-5 mx-3 mb-4 py-3 rounded-2xl"
            style={{ background: '#F8F4FE' }}>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md" style={{ background: 'linear-gradient(135deg,#FF1493,#FF69B4)' }} />
              <span className="text-xs" style={{ color: '#6B5B7B' }}>Jour lu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md" style={{ background: '#FFF0F8', boxShadow: 'inset 0 0 0 2px #FF69B4' }} />
              <span className="text-xs" style={{ color: '#6B5B7B' }}>Aujourd'hui</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-md" style={{ background: '#F8F5FF' }} />
              <span className="text-xs" style={{ color: '#6B5B7B' }}>Non lu</span>
            </div>
          </div>
        </motion.div>

        {/* ── READER INSIGHT ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="mt-4 rounded-3xl p-4"
          style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,105,180,0.15)' }}>
          <p className="text-sm font-bold flex items-center gap-2 mb-1.5" style={{ color: '#FF1493' }}>
            <Sparkles className="w-4 h-4" />
            Reader insight
          </p>
          {readingDays.size === 0 ? (
            <p className="text-sm" style={{ color: '#A78BBA' }}>Commence à marquer tes jours de lecture pour voir ta progression ! 🚀</p>
          ) : currentStreak === 0 ? (
            <p className="text-sm" style={{ color: '#A78BBA' }}>Tu n'as pas lu aujourd'hui. Lis maintenant pour démarrer un streak ! 📚</p>
          ) : currentStreak >= bestStreak ? (
            <p className="text-sm font-semibold" style={{ color: '#2D1F3F' }}>🎉 Tu es sur ton meilleur streak ({currentStreak} jours) — continue !</p>
          ) : (
            <p className="text-sm" style={{ color: '#2D1F3F' }}>
              Streak actuel : <strong>{currentStreak} j.</strong> — Plus que <strong>{bestStreak - currentStreak} j.</strong> pour battre ton record !
            </p>
          )}
        </motion.div>
      </div>

      {/* ── BOOK PICKER DIALOG ── */}
      <Dialog open={!!selectedDayForBook} onOpenChange={(open) => !open && setSelectedDayForBook(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle style={{ color: '#FF1493' }}>
              📖 Modifier le livre — {selectedDayForBook && format(new Date(selectedDayForBook.dateStr + 'T12:00:00'), 'd MMMM', { locale: fr })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-gray-500">Quel livre lisais-tu ce jour-là ?</p>

            {/* Current book */}
            {selectedDayForBook && (() => {
              const current = getBookForDay(selectedDayForBook.dateStr);
              return current ? (
                <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: '#FFF0F8', border: '2px solid #FF69B4' }}>
                  {current.cover_url && <img src={current.cover_url} alt="" className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />}
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Actuellement</p>
                    <p className="font-bold text-sm" style={{ color: '#2D1F3F' }}>{current.title}</p>
                    <p className="text-xs text-gray-500">{current.author}</p>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Remove override option */}
            {selectedDayForBook && bookOverrides[selectedDayForBook.dateStr] && (
              <button
                onClick={() => {
                  const newOverrides = { ...bookOverrides };
                  delete newOverrides[selectedDayForBook.dateStr];
                  saveOverrides(newOverrides);
                  toast.success('Livre par défaut restauré');
                  setSelectedDayForBook(null);
                }}
                className="w-full py-2 rounded-xl text-sm font-semibold"
                style={{ background: '#F3F4F6', color: '#6B7280' }}
              >
                Restaurer la détection automatique
              </button>
            )}

            {/* Book list */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {booksWithCovers.map(book => {
                const isSelected = selectedDayForBook && bookOverrides[selectedDayForBook.dateStr] === book.id;
                return (
                  <button
                    key={book.id}
                    onClick={() => {
                      if (!selectedDayForBook) return;
                      const newOverrides = { ...bookOverrides, [selectedDayForBook.dateStr]: book.id };
                      saveOverrides(newOverrides);
                      toast.success(`Livre mis à jour : ${book.title}`);
                      setSelectedDayForBook(null);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: isSelected ? '#FFE9F6' : '#F8F5FF',
                      border: isSelected ? '2px solid #FF69B4' : '2px solid transparent',
                    }}
                  >
                    {book.cover_url
                      ? <img src={book.cover_url} alt="" className="w-8 h-11 object-cover rounded-lg flex-shrink-0" />
                      : <div className="w-8 h-11 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: '#FFE9F0' }}><BookOpen className="w-4 h-4" style={{ color: '#FF69B4' }} /></div>
                    }
                    <div className="min-w-0">
                      <p className="font-semibold text-sm line-clamp-1" style={{ color: '#2D1F3F' }}>{book.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{book.author}</p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: '#FF1493' }} />}
                  </button>
                );
              })}
            </div>

            {/* Unmark day option */}
            <button
              onClick={() => {
                if (!selectedDayForBook) return;
                const date = new Date(selectedDayForBook.dateStr + 'T12:00:00');
                unmarkDayMutation.mutate(date);
                toast.success('Jour retiré');
                setSelectedDayForBook(null);
              }}
              className="w-full py-2 rounded-xl text-sm font-semibold"
              style={{ background: '#FEE2E2', color: '#DC2626' }}
            >
              Supprimer ce jour de lecture
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}