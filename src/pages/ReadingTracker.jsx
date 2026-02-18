import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BookOpen, Flame, Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ReadingTracker() {
  const [user, setUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch reading progress entries to determine reading days
  const { data: readingProgress = [] } = useQuery({
    queryKey: ['readingProgress', user?.email],
    queryFn: () => base44.entities.ReadingProgress.filter({ created_by: user?.email }),
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Get unique reading days
  const readingDays = React.useMemo(() => {
    const days = new Set();
    readingProgress.forEach(entry => {
      if (entry.timestamp) {
        const date = new Date(entry.timestamp);
        days.add(format(date, 'yyyy-MM-dd'));
      }
    });
    return days;
  }, [readingProgress]);

  // Mutation to reset all reading progress
  const resetProgressMutation = useMutation({
    mutationFn: async () => {
      const entriesToDelete = readingProgress.map(entry => entry.id);
      await Promise.all(
        entriesToDelete.map(id => base44.entities.ReadingProgress.delete(id))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingProgress'] });
      toast.success('Tous les jours de lecture ont été réinitialisés');
      setIsResetDialogOpen(false);
    },
    onError: () => {
      toast.error('Erreur lors de la réinitialisation');
    }
  });

  // Calculate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: fr });
  const calendarEnd = endOfWeek(monthEnd, { locale: fr });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const isToday = (date) => isSameDay(date, new Date());
  const isReadingDay = (date) => readingDays.has(format(date, 'yyyy-MM-dd'));

  // Calculate stats
  const totalReadingDays = readingDays.size;
  const thisMonthReadingDays = [...readingDays].filter(day => {
    const date = new Date(day);
    return isSameMonth(date, currentMonth);
  }).length;

  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'linear-gradient(to bottom, #FFF5F8 0%, #FFE9F0 50%, #FFDCE5 100%)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                 style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
              <CalendarIcon className="w-8 h-8 text-white" />
            </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-bold" style={{ color: '#FF1493' }}>
                  Reading Tracker
                </h1>
                <p className="text-base md:text-xl" style={{ color: '#2c2c2c' }}>
                  Visualise tes jours de lecture
                </p>
              </div>
            </div>

            {/* Reset button */}
            <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl shadow-lg"
                  style={{ borderColor: '#FF1493', color: '#FF1493' }}
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle style={{ color: '#FF1493' }}>
                    Réinitialiser les jours de lecture ?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action supprimera tous les jours de lecture enregistrés. Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => resetProgressMutation.mutate()}
                    disabled={resetProgressMutation.isPending}
                    style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}
                  >
                    {resetProgressMutation.isPending ? 'Réinitialisation...' : 'Réinitialiser'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="border-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, #FFE9F0, #FFD6E4)' }}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                       style={{ backgroundColor: '#FF1493' }}>
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold" style={{ color: '#FF1493' }}>
                      {totalReadingDays}
                    </p>
                    <p className="text-sm font-medium" style={{ color: '#2c2c2c' }}>
                      Jours total
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, #F3E5F5, #E1BEE7)' }}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                       style={{ backgroundColor: '#9C27B0' }}>
                    <Flame className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold" style={{ color: '#9C27B0' }}>
                      {thisMonthReadingDays}
                    </p>
                    <p className="text-sm font-medium" style={{ color: '#2c2c2c' }}>
                      Ce mois-ci
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Calendar */}
        <Card className="border-0 rounded-3xl shadow-xl" style={{ backgroundColor: 'white' }}>
          <CardContent className="p-6 md:p-8">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="outline"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="rounded-xl"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <h2 className="text-2xl font-bold" style={{ color: '#FF1493' }}>
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </h2>

              <Button
                variant="outline"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="rounded-xl"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Week days header */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {weekDays.map(day => (
                <div key={day} className="text-center font-semibold text-sm py-2"
                     style={{ color: '#9CA3AF' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const hasRead = isReadingDay(day);
                const isTodayDay = isToday(day);

                return (
                  <motion.div
                    key={day.toISOString()}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: idx * 0.01 }}
                    className={`aspect-square rounded-xl flex items-center justify-center text-sm md:text-base font-semibold transition-all cursor-pointer ${
                      !isCurrentMonth ? 'opacity-30' : ''
                    } ${
                      isTodayDay ? 'ring-2 ring-offset-2' : ''
                    }`}
                    style={{
                      background: hasRead 
                        ? 'linear-gradient(135deg, #FF1493, #FF69B4)' 
                        : isCurrentMonth 
                          ? '#F9FAFB' 
                          : 'transparent',
                      color: hasRead ? 'white' : '#2D3748',
                      ringColor: '#FF1493',
                      boxShadow: hasRead ? '0 4px 12px rgba(255, 20, 147, 0.3)' : 'none'
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="flex flex-col items-center">
                      <span>{format(day, 'd')}</span>
                      {hasRead && (
                        <BookOpen className="w-3 h-3 md:w-4 md:h-4 mt-1" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t"
                 style={{ borderColor: 'rgba(255, 105, 180, 0.15)' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg"
                     style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }} />
                <span className="text-sm font-medium" style={{ color: '#4A5568' }}>
                  Jour de lecture
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg border-2"
                     style={{ borderColor: '#FF1493', backgroundColor: 'white' }} />
                <span className="text-sm font-medium" style={{ color: '#4A5568' }}>
                  Aujourd'hui
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}