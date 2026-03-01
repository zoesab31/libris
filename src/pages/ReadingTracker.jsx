import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, getYear, addMonths, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Sparkles, RotateCcw, Pencil, Check, ChevronLeft, ChevronRight, Flame, BookOpen, CalendarDays } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const WEEK_DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function ReadingTracker() {
  const [user, setUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editMode, setEditMode] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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

  // Calculate best streak (consecutive days)
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

  // Current streak (from today backwards)
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

  // Get cover for a reading day
  const getCoverForDay = (dateStr) => {
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

  // Toggle day
  const markDayMutation = useMutation({
    mutationFn: async (date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      await base44.entities.ReadingDay.create({ date: dateStr });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingProgress'] });
      queryClient.invalidateQueries({ queryKey: ['readingDayToday'] });
      if (!editMode) confetti({ particleCount: 60, spread: 45, origin: { y: 0.15 } });
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

  const toggleDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (readingDays.has(dateStr)) {
      unmarkDayMutation.mutate(date);
      toast.success('Jour retiré');
    } else {
      markDayMutation.mutate(date);
      if (!editMode) toast.success('Jour marqué ✅');
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

  // Calendar
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startOffset = getDay(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const selectedMonthIdx = currentMonth.getMonth();

  const totalCells = startOffset + days.length;
  const trailingEmpty = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #FFF8FC 0%, #FEF3F9 40%, #F9F0FA 70%, #F5F0FF 100%)' }}>
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-6 md:pt-10 pb-12">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
                <CalendarDays className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: '#2D1F3F' }}>
                  Reading Tracker
                </h1>
                <p className="text-sm" style={{ color: '#A78BBA' }}>Suis tes jours de lecture</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit mode toggle */}
            <motion.button
              onClick={() => { setEditMode(v => !v); if (!editMode) toast('Mode édition activé — clique pour ajouter/retirer des jours', { icon: '✏️' }); }}
              whileTap={{ scale: 0.93 }}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm shadow-sm transition-all"
              style={{
                background: editMode ? 'linear-gradient(135deg,#FF1493,#FF69B4)' : 'rgba(255,255,255,0.9)',
                color: editMode ? 'white' : '#FF1493',
                border: editMode ? 'none' : '2px solid #FF69B4',
              }}
            >
              {editMode ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              {editMode ? 'Terminer' : 'Modifier'}
            </motion.button>

            {/* Reset */}
            <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
              <AlertDialogTrigger asChild>
                <button className="p-2.5 rounded-2xl shadow-sm" style={{ background: 'rgba(255,255,255,0.9)', color: '#A78BBA' }}>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { icon: <Flame className="w-5 h-5" />, value: currentStreak, label: 'Streak actuel', unit: ' j.', grad: 'linear-gradient(135deg,#FF6B35,#FF9666)', light: '#FFF0E8' },
            { icon: <Sparkles className="w-5 h-5" />, value: bestStreak, label: 'Meilleur streak', unit: ' j.', grad: 'linear-gradient(135deg,#FF1493,#FF69B4)', light: '#FFE9F6' },
            { icon: <BookOpen className="w-5 h-5" />, value: thisMonthDays, label: 'Ce mois', unit: ' j.', grad: 'linear-gradient(135deg,#9C27B0,#CE93D8)', light: '#F3E5F5' },
            { icon: <CalendarDays className="w-5 h-5" />, value: totalReadingDaysYear, label: `Total ${getYear(new Date())}`, unit: ' j.', grad: 'linear-gradient(135deg,#2196F3,#90CAF9)', light: '#E3F2FD' },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-3xl p-4"
              style={{ background: s.light, border: `1px solid rgba(0,0,0,0.05)` }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white mb-3"
                style={{ background: s.grad }}>
                {s.icon}
              </div>
              <p className="text-3xl font-extrabold leading-none mb-1" style={{ background: s.grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {s.value}<span className="text-lg">{s.unit}</span>
              </p>
              <p className="text-xs font-medium text-gray-500">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── CALENDAR CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl shadow-lg overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(255,105,180,0.15)' }}
        >
          {/* Edit mode banner */}
          <AnimatePresence>
            {editMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-3 text-sm font-semibold text-center"
                  style={{ background: 'linear-gradient(135deg,#FF1493,#FF69B4)', color: 'white' }}>
                  ✏️ Mode édition — clique sur un jour pour l'ajouter ou le retirer
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-5">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-pink-50"
              style={{ color: '#FF1493' }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <h2 className="text-xl font-extrabold capitalize" style={{ color: '#2D1F3F' }}>
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </h2>
            </div>

            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-pink-50"
              style={{ color: '#FF1493' }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Month pills */}
          <div className="flex gap-2 overflow-x-auto px-4 pb-4" style={{ scrollbarWidth: 'none' }}>
            {MONTHS.map((m, i) => {
              const isSelected = i === selectedMonthIdx;
              return (
                <button
                  key={m}
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), i, 1))}
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: isSelected ? 'linear-gradient(135deg,#FF1493,#FF69B4)' : '#F5F0FF',
                    color: isSelected ? 'white' : '#9B3EC8',
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* Week days header */}
          <div className="grid grid-cols-7 px-4 pb-2">
            {WEEK_DAYS.map((d, i) => (
              <div key={i} className="text-center text-xs font-bold" style={{ color: '#C090C0' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1.5 px-4 pb-5">
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
                  transition={{ duration: 0.2, delay: idx * 0.006 }}
                  onClick={() => !isFuture && toggleDay(day)}
                  whileTap={!isFuture ? { scale: 0.88 } : {}}
                  className="relative flex flex-col items-center justify-start rounded-2xl overflow-hidden transition-all"
                  style={{
                    aspectRatio: '1 / 1.4',
                    background: hasRead
                      ? 'linear-gradient(135deg, #FF1493, #FF69B4)'
                      : todayDay
                      ? '#FFF0F8'
                      : isFuture ? '#FAFAFA' : '#F8F5FF',
                    boxShadow: todayDay && !hasRead ? 'inset 0 0 0 2px #FF69B4' : hasRead ? '0 4px 14px rgba(255,20,147,0.3)' : 'none',
                    cursor: isFuture ? 'default' : 'pointer',
                    opacity: isFuture ? 0.35 : 1,
                  }}
                >
                  {/* Day number */}
                  <span className="text-xs font-bold pt-1.5 z-10 relative leading-none"
                    style={{ color: hasRead ? 'white' : todayDay ? '#FF1493' : '#6B5B7B' }}>
                    {format(day, 'd')}
                  </span>

                  {/* Book cover */}
                  {cover && (
                    <div className="absolute inset-0 top-5">
                      <img src={cover} alt="" className="w-full h-full object-cover" style={{ opacity: 0.8 }} />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(255,20,147,0.25) 0%, transparent 50%)' }} />
                    </div>
                  )}

                  {/* No cover fallback */}
                  {hasRead && !cover && (
                    <div className="absolute inset-0 top-5 flex items-center justify-center">
                      <span className="text-base">📖</span>
                    </div>
                  )}

                  {/* Edit mode indicator */}
                  {editMode && hasRead && (
                    <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-white/80 flex items-center justify-center">
                      <span className="text-[8px]">×</span>
                    </div>
                  )}
                </motion.button>
              );
            })}

            {Array.from({ length: trailingEmpty }).map((_, i) => <div key={`end-${i}`} />)}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mx-4 mb-5 py-4 rounded-2xl"
            style={{ background: '#F8F4FE' }}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg" style={{ background: 'linear-gradient(135deg,#FF1493,#FF69B4)' }} />
              <span className="text-xs font-medium" style={{ color: '#6B5B7B' }}>Jour lu</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg" style={{ background: '#FFF0F8', boxShadow: 'inset 0 0 0 2px #FF69B4' }} />
              <span className="text-xs font-medium" style={{ color: '#6B5B7B' }}>Aujourd'hui</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg" style={{ background: '#F8F5FF' }} />
              <span className="text-xs font-medium" style={{ color: '#6B5B7B' }}>Non lu</span>
            </div>
          </div>
        </motion.div>

        {/* ── READER INSIGHT ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-4 rounded-3xl p-5"
          style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,105,180,0.15)' }}
        >
          <p className="text-sm font-bold flex items-center gap-2 mb-2" style={{ color: '#FF1493' }}>
            <Sparkles className="w-4 h-4" />
            Reader insight
          </p>
          {readingDays.size === 0 ? (
            <p className="text-sm" style={{ color: '#A78BBA' }}>
              Commence à marquer tes jours de lecture pour voir ta progression ! 🚀
            </p>
          ) : currentStreak === 0 ? (
            <p className="text-sm" style={{ color: '#A78BBA' }}>
              Tu n'es pas en streak actuellement. Lis aujourd'hui pour en démarrer un ! 📚
            </p>
          ) : currentStreak >= bestStreak ? (
            <p className="text-sm font-semibold" style={{ color: '#2D1F3F' }}>
              🎉 Tu es sur ton meilleur streak ({currentStreak} jours) — continue comme ça !
            </p>
          ) : (
            <p className="text-sm" style={{ color: '#2D1F3F' }}>
              Streak actuel : <strong>{currentStreak} j.</strong> — Plus que{' '}
              <strong>{bestStreak - currentStreak} j.</strong> pour battre ton record de {bestStreak} jours !
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}