import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, getDay, isToday, getYear } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Share2, Info, Sparkles, RotateCcw } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const WEEK_DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function ReadingTracker() {
  const [user, setUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
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

  // Map date -> cover_url (from books "En cours" or "Lu" around that date)
  const dateToCover = useMemo(() => {
    const map = {};
    // Build a map of book covers by user_book_id
    userBooks.forEach(ub => {
      const book = allBooks.find(b => b.id === ub.book_id);
      if (!book?.cover_url) return;
      // Use end_date for "Lu", or updated_date for "En cours"
      const relevantDate = ub.end_date || ub.updated_date;
      if (relevantDate) {
        const d = relevantDate.slice(0, 10);
        if (!map[d]) map[d] = book.cover_url;
      }
    });
    return map;
  }, [userBooks, allBooks]);

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
    let d = new Date();
    while (true) {
      const s = format(d, 'yyyy-MM-dd');
      if (readingDays.has(s)) { streak++; d = new Date(d); d.setDate(d.getDate() - 1); }
      else break;
    }
    return streak;
  }, [readingDays]);

  const totalReadingDaysYear = useMemo(() => {
    const year = getYear(new Date());
    return [...readingDays].filter(d => d.startsWith(String(year))).length;
  }, [readingDays]);

  // Toggle day
  const markDayMutation = useMutation({
    mutationFn: async (date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      await base44.entities.ReadingDay.create({ date: dateStr });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingProgress'] });
      queryClient.invalidateQueries({ queryKey: ['readingDayToday'] });
      confetti({ particleCount: 60, spread: 45, origin: { y: 0.15 } });
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
      toast.success('Jour marqué ✅');
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

  // Calendar grid: start on Sunday
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startOffset = getDay(monthStart); // 0 = Sunday
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const selectedMonthIdx = currentMonth.getMonth();

  // Get a cover for a reading day - pick any book that was being read around that time
  const getCoverForDay = (dateStr) => {
    // First try exact match
    if (dateToCover[dateStr]) return dateToCover[dateStr];
    // Fallback: find a book "En cours" with start_date <= dateStr
    const reading = userBooks
      .filter(ub => ub.start_date && ub.start_date.slice(0, 10) <= dateStr && (ub.status === 'En cours' || (ub.end_date && ub.end_date.slice(0, 10) >= dateStr)))
      .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
    if (reading.length > 0) {
      const book = allBooks.find(b => b.id === reading[0].book_id);
      return book?.cover_url || null;
    }
    return null;
  };

  return (
    <div className="min-h-screen" style={{ background: '#F5F0EE' }}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-0.5">Best reading streak</p>
            <p className="text-6xl font-extrabold leading-none" style={{ color: '#E91E8C' }}>{bestStreak}</p>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <span>days so far this year</span>
              <Info className="w-3.5 h-3.5 text-gray-400" />
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button className="p-2 rounded-full bg-white shadow-sm text-gray-500">
              <Share2 className="w-5 h-5" />
            </button>
            <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
              <AlertDialogTrigger asChild>
                <button className="p-2 rounded-full bg-white shadow-sm text-gray-500">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle style={{ color: '#FF1493' }}>Réinitialiser ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action supprimera tous les jours de lecture. Irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => resetProgressMutation.mutate()}
                    disabled={resetProgressMutation.isPending}
                    style={{ background: '#FF1493' }}
                  >
                    Réinitialiser
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Month selector pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {MONTHS.map((m, i) => {
            const isSelected = i === selectedMonthIdx;
            return (
              <button
                key={m}
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), i, 1))}
                className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all"
                style={{
                  background: isSelected ? '#E91E8C' : '#E8E0DC',
                  color: isSelected ? 'white' : '#4A4A4A',
                }}
              >
                {m}
              </button>
            );
          })}
        </div>

        {/* Calendar */}
        <div className="rounded-3xl overflow-hidden" style={{ background: '#EDE6E1' }}>
          {/* Week days header */}
          <div className="grid grid-cols-7 px-2 pt-3 pb-1">
            {WEEK_DAYS.map((d, i) => (
              <div key={i} className="text-center text-xs font-bold text-gray-400">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1.5 p-2">
            {/* Empty cells for offset */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const hasRead = readingDays.has(dateStr);
              const todayDay = isToday(day);
              const cover = hasRead ? getCoverForDay(dateStr) : null;

              return (
                <motion.button
                  key={dateStr}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15, delay: idx * 0.008 }}
                  onClick={() => toggleDay(day)}
                  whileTap={{ scale: 0.92 }}
                  className="relative flex flex-col items-center justify-start rounded-xl overflow-hidden transition-all"
                  style={{
                    aspectRatio: '1 / 1.3',
                    background: hasRead ? '#E91E8C' : 'white',
                    boxShadow: todayDay ? '0 0 0 2px #E91E8C' : 'none',
                  }}
                >
                  {/* Day number */}
                  <span
                    className="text-xs font-bold pt-1 z-10 relative"
                    style={{ color: hasRead ? 'rgba(255,255,255,0.9)' : '#555' }}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Book cover */}
                  {cover && (
                    <div className="absolute inset-0 top-5">
                      <img
                        src={cover}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ opacity: 0.85 }}
                      />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(233,30,140,0.3) 0%, transparent 40%)' }} />
                    </div>
                  )}

                  {/* Pink overlay if read but no cover */}
                  {hasRead && !cover && (
                    <div className="absolute inset-0 top-5 flex items-center justify-center">
                      <span className="text-white text-lg">📖</span>
                    </div>
                  )}
                </motion.button>
              );
            })}

            {/* Fill remaining cells to complete last row */}
            {(() => {
              const totalCells = startOffset + days.length;
              const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
              return Array.from({ length: remaining }).map((_, i) => (
                <div key={`end-${i}`} />
              ));
            })()}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-around px-4 py-3 border-t border-black/5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md" style={{ background: '#E91E8C' }} />
              <span className="text-xs text-gray-500">Best {new Date().getFullYear()} streak</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-white border border-gray-200" />
              <span className="text-xs text-gray-500">Days read</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md" style={{ background: '#D4C8C2' }} />
              <span className="text-xs text-gray-500">No reading</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Streak actuel', value: currentStreak, suffix: ' j.' },
            { label: 'Jours cette année', value: totalReadingDaysYear, suffix: '' },
            { label: 'Meilleur streak', value: bestStreak, suffix: ' j.' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-3 text-center" style={{ background: 'white' }}>
              <p className="text-2xl font-extrabold" style={{ color: '#E91E8C' }}>{s.value}<span className="text-base">{s.suffix}</span></p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Reader insight */}
        {currentStreak > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl p-4"
            style={{ background: 'white' }}
          >
            <p className="text-sm font-bold flex items-center gap-1.5 mb-1" style={{ color: '#E91E8C' }}>
              <Sparkles className="w-4 h-4" />
              Reader insight
            </p>
            <p className="text-sm text-gray-600">
              {currentStreak >= bestStreak
                ? "You're currently on your longest reading streak! 🎉"
                : `Continue encore ${bestStreak - currentStreak} jour${bestStreak - currentStreak > 1 ? 's' : ''} pour battre ton record !`}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}