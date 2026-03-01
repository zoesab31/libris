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
  const [bookOverrides, setBookOverrides] = useState({}); // { dateStr: book_id[] }
  const [showBookPicker, setShowBookPicker] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.reading_day_book_overrides) {
      try { setBookOverrides(JSON.parse(user.reading_day_book_overrides)); } catch {}
    }
  }, [user]);

  // Exit edit mode clears selection
  useEffect(() => {
    if (!editMode) { setSelectedDays(new Set()); setShowBookPicker(false); }
  }, [editMode]);

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

  // Auto-detect book being read on a given date
  const autoDetectBookForDay = (dateStr) => {
    // "En cours" with no end_date: include today
    const today = format(new Date(), 'yyyy-MM-dd');
    const reading = userBooks
      .filter(ub => {
        if (!ub.start_date) return false;
        const start = ub.start_date.slice(0, 10);
        if (start > dateStr) return false;
        if (ub.status === 'En cours') return true; // reading right now, include all past days from start
        if (ub.end_date && ub.end_date.slice(0, 10) >= dateStr) return true;
        return false;
      })
      .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
    if (reading.length > 0) return allBooks.find(b => b.id === reading[0].book_id) || null;
    return null;
  };

  // Returns array of book_ids for a day (supports multi-book)
  const getBookIdsForDay = (dateStr) => {
    const override = bookOverrides[dateStr];
    if (override) {
      // Support both old format (string) and new format (array)
      return Array.isArray(override) ? override : [override];
    }
    const auto = autoDetectBookForDay(dateStr);
    return auto ? [auto.id] : [];
  };

  const getBooksForDay = (dateStr) => {
    return getBookIdsForDay(dateStr)
      .map(id => allBooks.find(b => b.id === id))
      .filter(Boolean);
  };

  const getCoverForDay = (dateStr) => {
    const books = getBooksForDay(dateStr);
    return books[0]?.cover_url || null;
  };

  const getBookForDay = (dateStr) => {
    const books = getBooksForDay(dateStr);
    return books[0] || null;
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
      // In edit mode: toggle day selection for multi-day editing
      setSelectedDays(prev => {
        const next = new Set(prev);
        if (next.has(dateStr)) next.delete(dateStr);
        else next.add(dateStr);
        return next;
      });
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

  // Books read this year, sorted by start_date ascending (reading order)
  const thisYear = String(getYear(new Date()));
  const booksForPicker = useMemo(() => {
    return userBooks
      .filter(ub => {
        if (ub.status === 'En cours') return true; // include currently reading
        const date = ub.end_date || ub.start_date;
        return date && date.slice(0, 4) === thisYear;
      })
      .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))
      .map(ub => allBooks.find(b => b.id === ub.book_id))
      .filter(Boolean)
      .filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i);
  }, [userBooks, allBooks, thisYear]);

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
                  ✏️ Sélectionne un ou plusieurs jours puis choisis le livre ou l'action
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
              const isFuture = day > new Date();
              const isSelected = editMode && selectedDays.has(dateStr);
              const dayBooks = hasRead ? getBooksForDay(dateStr) : [];
              const covers = dayBooks.map(b => b.cover_url).filter(Boolean);

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
                    background: isSelected
                      ? '#7C3AED'
                      : hasRead
                      ? 'linear-gradient(135deg, #FF1493, #FF69B4)'
                      : todayDay ? '#FFF0F8' : isFuture ? '#FAFAFA' : '#F8F5FF',
                    boxShadow: isSelected ? '0 0 0 2.5px #7C3AED, 0 2px 8px rgba(124,58,237,0.4)'
                      : todayDay && !hasRead ? 'inset 0 0 0 2px #FF69B4'
                      : hasRead ? '0 2px 8px rgba(255,20,147,0.25)' : 'none',
                    cursor: isFuture ? 'default' : 'pointer',
                    opacity: isFuture ? 0.3 : 1,
                  }}
                >
                  <span className="text-[10px] font-bold pt-1 z-10 relative leading-none"
                    style={{ color: isSelected || hasRead ? 'white' : todayDay ? '#FF1493' : '#6B5B7B' }}>
                    {format(day, 'd')}
                  </span>

                  {/* Multi-book covers: split vertically */}
                  {covers.length > 0 && !isSelected && (
                    <div className="absolute inset-0 top-4 flex">
                      {covers.slice(0, 2).map((c, ci) => (
                        <div key={ci} className="relative flex-1 overflow-hidden">
                          <img src={c} alt="" className="w-full h-full object-cover" style={{ opacity: 0.82 }} />
                        </div>
                      ))}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(255,20,147,0.2) 0%, transparent 50%)' }} />
                      {/* Badge if 3+ books */}
                      {covers.length > 2 && (
                        <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full flex items-center justify-center z-10 text-[8px] font-bold text-white"
                          style={{ background: '#FF1493' }}>
                          +{covers.length - 2}
                        </div>
                      )}
                    </div>
                  )}

                  {hasRead && covers.length === 0 && !isSelected && (
                    <div className="absolute inset-0 top-4 flex items-center justify-center">
                      <span className="text-xs">📖</span>
                    </div>
                  )}

                  {isSelected && (
                    <div className="absolute inset-0 top-4 flex items-center justify-center">
                      <Check style={{ width: 14, height: 14, color: 'white' }} />
                    </div>
                  )}
                </motion.button>
              );
            })}

            {Array.from({ length: trailingEmpty }).map((_, i) => <div key={`end-${i}`} />)}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-5 mx-3 mb-3 py-3 rounded-2xl"
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
              <div className="w-4 h-4 rounded-md" style={{ background: '#7C3AED' }} />
              <span className="text-xs" style={{ color: '#6B5B7B' }}>Sélectionné</span>
            </div>
          </div>

          {/* Edit mode action bar */}
          <AnimatePresence>
            {editMode && selectedDays.size > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="mx-3 mb-4 p-3 rounded-2xl flex items-center gap-2 flex-wrap"
                style={{ background: '#F0EAFF', border: '1.5px solid #7C3AED' }}>
                <span className="text-xs font-bold" style={{ color: '#7C3AED' }}>
                  {selectedDays.size} jour{selectedDays.size > 1 ? 's' : ''} sélectionné{selectedDays.size > 1 ? 's' : ''}
                </span>
                <div className="flex gap-2 ml-auto flex-wrap">
                  {/* Mark as read */}
                  <button
                    onClick={() => {
                      const unmarked = [...selectedDays].filter(d => !readingDays.has(d));
                      unmarked.forEach(d => markDayMutation.mutate(new Date(d + 'T12:00:00')));
                      if (unmarked.length) toast.success(`${unmarked.length} jour${unmarked.length > 1 ? 's' : ''} marqué${unmarked.length > 1 ? 's' : ''} ✅`);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#FF1493,#FF69B4)' }}>
                    Marquer comme lu
                  </button>
                  {/* Change book */}
                  <button
                    onClick={() => setShowBookPicker(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                    style={{ background: '#7C3AED' }}>
                    Changer le livre
                  </button>
                  {/* Unmark */}
                  <button
                    onClick={() => {
                      const marked = [...selectedDays].filter(d => readingDays.has(d));
                      marked.forEach(d => unmarkDayMutation.mutate(new Date(d + 'T12:00:00')));
                      setSelectedDays(new Set());
                      if (marked.length) toast.success(`${marked.length} jour${marked.length > 1 ? 's' : ''} retiré${marked.length > 1 ? 's' : ''}`);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{ background: '#FEE2E2', color: '#DC2626' }}>
                    Retirer
                  </button>
                  {/* Clear selection */}
                  <button onClick={() => setSelectedDays(new Set())}
                    className="px-2 py-1.5 rounded-xl text-xs font-bold"
                    style={{ background: '#F3F4F6', color: '#6B7280' }}>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

      {/* ── BOOK PICKER DIALOG (multi-day, multi-book) ── */}
      <BookPickerDialog
        open={showBookPicker}
        onClose={() => setShowBookPicker(false)}
        selectedDays={selectedDays}
        booksForPicker={booksForPicker}
        bookOverrides={bookOverrides}
        getBookIdsForDay={getBookIdsForDay}
        onSave={(newOverrides) => {
          saveOverrides(newOverrides);
          setShowBookPicker(false);
          setSelectedDays(new Set());
        }}
      />
    </div>
  );
}