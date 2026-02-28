import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function MiniReadingCalendar({ user }) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Offset pour aligner le 1er jour (lundi = 0)
  const startOffset = (getDay(monthStart) + 6) % 7;

  const { data: readingDays = [] } = useQuery({
    queryKey: ['readingDaysMonth', user?.email, format(now, 'yyyy-MM')],
    queryFn: () => base44.entities.ReadingDay.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const readDates = new Set(readingDays.map(d => d.date?.slice(0, 10)));

  return (
    <Link to={createPageUrl("ReadingTracker")} className="block no-hover">
      <div className="glass-card rounded-3xl shadow-sm p-5 card-hover">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#F4A7CE,#D4A0E8)' }}>
            <BookOpen className="w-4 h-4" style={{ color: '#4A1060' }} />
          </span>
          <div>
            <h2 className="text-sm font-bold" style={{ color: '#2D1F3F' }}>Jours de lecture</h2>
            <p className="text-xs capitalize" style={{ color: '#A78BBA' }}>{format(now, 'MMMM yyyy', { locale: fr })}</p>
          </div>
          <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#F4D6EE', color: '#C0176A' }}>
            {readDates.size} j.
          </span>
        </div>

        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold pb-1" style={{ color: '#C090C0' }}>{d}</div>
          ))}
        </div>

        {/* Grille des jours */}
        <div className="grid grid-cols-7 gap-y-1">
          {/* Cellules vides pour l'offset */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {days.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const hasRead = readDates.has(dateStr);
            const today = isToday(day);
            const future = day > now;

            return (
              <motion.div
                key={dateStr}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: idx * 0.01 }}
                className="flex items-center justify-center"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all"
                  style={{
                    background: hasRead
                      ? 'linear-gradient(135deg,#F4A7CE,#D4A0E8)'
                      : today
                      ? 'rgba(244,167,206,0.25)'
                      : 'transparent',
                    color: hasRead
                      ? '#4A1060'
                      : today
                      ? '#C0176A'
                      : future
                      ? '#D4C0D4'
                      : '#9C7AAC',
                    border: today && !hasRead ? '2px solid #F4A7CE' : 'none',
                    fontWeight: today || hasRead ? 700 : 400,
                  }}
                >
                  {format(day, 'd')}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Légende */}
        <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid rgba(212,160,200,0.2)' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg,#F4A7CE,#D4A0E8)' }} />
            <span className="text-xs" style={{ color: '#A78BBA' }}>Lu</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ border: '2px solid #F4A7CE' }} />
            <span className="text-xs" style={{ color: '#A78BBA' }}>Aujourd'hui</span>
          </div>
        </div>
      </div>
    </Link>
  );
}