import { motion } from 'framer-motion';
import { BookOpen, FileText, Star, Flame, Heart, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function SoftStats({ user, userBooks, allBooks, readingGoals, currentStreak }) {
  const completedBooks = userBooks.filter(ub => ub.status === 'Lu');
  const currentYear = new Date().getFullYear();
  const thisYearBooks = completedBooks.filter(ub => {
    const endDate = ub.end_date ? new Date(ub.end_date) : null;
    return endDate && endDate.getFullYear() === currentYear;
  });

  // Calculate total pages
  const totalPages = completedBooks.reduce((sum, ub) => {
    const book = allBooks.find(b => b.id === ub.book_id);
    return sum + (book?.page_count || 0);
  }, 0);

  // Calculate average rating
  const ratedBooks = completedBooks.filter(ub => ub.rating);
  const avgRating = ratedBooks.length > 0
    ? (ratedBooks.reduce((sum, ub) => sum + ub.rating, 0) / ratedBooks.length).toFixed(1)
    : 0;

  // Find favorite genres
  const genreCounts = {};
  completedBooks.forEach(ub => {
    const book = allBooks.find(b => b.id === ub.book_id);
    if (book?.genre) {
      genreCounts[book.genre] = (genreCounts[book.genre] || 0) + 1;
    }
  });
  const favoriteGenres = Object.entries(genreCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([genre]) => genre);

  const currentGoal = readingGoals[0];

  const stats = [
    {
      label: "Livres lus cette année",
      value: thisYearBooks.length,
      icon: BookOpen,
      gradient: 'from-pink-400 to-rose-500',
      subtext: currentGoal ? `Objectif: ${currentGoal.goal_count}` : null
    },
    {
      label: "Pages lues",
      value: totalPages.toLocaleString(),
      icon: FileText,
      gradient: 'from-purple-400 to-indigo-500'
    },
    {
      label: "Note moyenne",
      value: avgRating,
      icon: Star,
      gradient: 'from-yellow-400 to-orange-500',
      suffix: '/5'
    },
    {
      label: "Jours consécutifs",
      value: currentStreak,
      icon: Flame,
      gradient: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="p-6 border-0 shadow-xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
          <TrendingUp className="w-5 h-5" />
          Mon année de lecture
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="relative p-4 rounded-xl overflow-hidden"
                style={{ background: 'linear-gradient(135deg, var(--beige), var(--cream))' }}
              >
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-full opacity-20 blur-2xl bg-gradient-to-br ${stat.gradient}`} />
                
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-2`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--dark-text)' }}>
                    {stat.value}
                    {stat.suffix && <span className="text-sm ml-1">{stat.suffix}</span>}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--warm-pink)' }}>
                    {stat.label}
                  </div>
                  {stat.subtext && (
                    <div className="text-xs mt-1 opacity-60" style={{ color: 'var(--warm-pink)' }}>
                      {stat.subtext}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {favoriteGenres.length > 0 && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--beige)' }}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--dark-text)' }}>
              Genres préférés
            </p>
            <div className="flex flex-wrap gap-2">
              {favoriteGenres.map((genre, index) => (
                <motion.span
                  key={genre}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--soft-pink), var(--warm-pink))',
                    color: 'white'
                  }}
                >
                  {genre}
                </motion.span>
              ))}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}