import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ChevronRight, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ActiveSharedReadingCard({ user }) {
  const { data: sharedReadings = [] } = useQuery({
    queryKey: ['sharedReadings', user?.email],
    queryFn: () => base44.entities.SharedReading.list(),
    enabled: !!user
  });
  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list()
  });

  const active = useMemo(() => sharedReadings.find((sr) =>
    (sr.participants?.includes(user?.email) || sr.created_by === user?.email) &&
    sr.status === "En cours"
  ), [sharedReadings, user]);

  if (!active) return null;

  const book = allBooks.find((b) => b.id === active.book_id);

  // Jour actuel (override manuel sinon calcul depuis la date de début)
  let currentDay = 1;
  if (active.current_day_override && active.current_day_set_date) {
    const daysSinceSet = Math.max(0, Math.floor((Date.now() - new Date(active.current_day_set_date).getTime()) / 86400000));
    currentDay = active.current_day_override + daysSinceSet;
  } else if (active.start_date) {
    currentDay = Math.max(1, Math.floor((Date.now() - new Date(active.start_date).getTime()) / 86400000) + 1);
  }
  if (active.duration_days) currentDay = Math.min(currentDay, active.duration_days);

  // Chapitres prévus aujourd'hui
  let chaptersToday = null;
  if (active.use_custom_plan && Array.isArray(active.custom_plan)) {
    const dayPlan = active.custom_plan.find((p) => p.day_number === currentDay);
    chaptersToday = dayPlan?.chapters_text ? `Chapitres ${dayPlan.chapters_text}` : null;
  } else if (active.chapters_per_day) {
    chaptersToday = `${active.chapters_per_day} chapitre${active.chapters_per_day > 1 ? 's' : ''} aujourd'hui`;
  }

  const progressPct = active.duration_days ? Math.min(100, Math.round(currentDay / active.duration_days * 100)) : 0;

  return (
    <Link to={createPageUrl("SharedReadings")} className="block no-hover">
      <div className="rounded-3xl overflow-hidden shadow-sm card-hover relative"
        style={{ background: 'linear-gradient(135deg,#C24FAE 0%,#9C27B0 60%,#7B1FA2 100%)' }}>
        <div className="p-4 md:p-5 flex items-center gap-4">
          <div className="w-16 h-24 md:w-20 md:h-28 rounded-xl overflow-hidden flex-shrink-0 shadow-lg" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
            {book?.cover_url ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" /> :
              <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-6 h-6 text-white/70" /></div>}
          </div>
          <div className="flex-1 min-w-0 text-white">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide mb-1" style={{ background: 'rgba(255,255,255,0.22)' }}>
              📚 Lecture commune en cours
            </span>
            <h3 className="font-bold text-sm md:text-lg leading-snug line-clamp-1">{book?.title || active.title}</h3>
            <p className="text-xs md:text-sm opacity-90 mt-0.5">
              Jour {currentDay}{active.duration_days ? ` / ${active.duration_days}` : ''}{chaptersToday ? ` · ${chaptersToday}` : ''}
            </p>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.25)' }}>
              <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: 'rgba(255,255,255,0.9)' }} />
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white flex-shrink-0" />
        </div>
      </div>
    </Link>
  );
}