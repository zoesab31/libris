import { motion } from 'framer-motion';
import { Star, Heart, BookOpen, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function ReadingHighlights({ user, userBooks, allBooks }) {
  // Find user's favorite books
  const completedBooks = userBooks.filter(ub => ub.status === 'Lu');
  const currentYear = new Date().getFullYear();
  
  // Best book this year (highest rated from this year)
  const thisYearBooks = completedBooks.filter(ub => {
    const endDate = ub.end_date ? new Date(ub.end_date) : null;
    return endDate && endDate.getFullYear() === currentYear;
  });
  const bestThisYear = thisYearBooks
    .filter(ub => ub.rating)
    .sort((a, b) => b.rating - a.rating)[0];

  // Favorite books of all time (top 3 by rating)
  const favoritesAllTime = completedBooks
    .filter(ub => ub.rating === 5)
    .slice(0, 3);

  // Current reading
  const currentReading = userBooks.find(ub => ub.status === 'En cours');

  const highlights = [
    {
      title: "Meilleur livre de l'année",
      icon: Star,
      color: 'from-yellow-400 to-orange-500',
      book: bestThisYear ? allBooks.find(b => b.id === bestThisYear.book_id) : null,
      userBook: bestThisYear
    },
    {
      title: "En cours de lecture",
      icon: BookOpen,
      color: 'from-blue-400 to-purple-500',
      book: currentReading ? allBooks.find(b => b.id === currentReading.book_id) : null,
      userBook: currentReading
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="p-6 border-0 shadow-xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
          <Sparkles className="w-5 h-5" />
          Mes lectures phares
        </h2>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {highlights.map((highlight, index) => {
            const Icon = highlight.icon;
            return (
              <motion.div
                key={highlight.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="relative group"
              >
                <div className="p-4 rounded-xl bg-gradient-to-br hover:shadow-lg transition-shadow"
                     style={{ background: `linear-gradient(135deg, var(--beige), var(--cream))` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${highlight.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--dark-text)' }}>
                      {highlight.title}
                    </h3>
                  </div>
                  
                  {highlight.book ? (
                    <div className="flex gap-3">
                      {highlight.book.cover_url && (
                        <img 
                          src={highlight.book.cover_url} 
                          alt={highlight.book.title}
                          className="w-16 h-24 object-cover rounded-lg shadow-md"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                          {highlight.book.title}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--warm-pink)' }}>
                          {highlight.book.author}
                        </p>
                        {highlight.userBook?.rating && (
                          <div className="flex items-center gap-1 mt-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star 
                                key={i}
                                className={`w-3 h-3 ${i < highlight.userBook.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Aucun livre pour le moment</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Favorite books carousel */}
        {favoritesAllTime.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
              <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />
              Mes coups de cœur
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {favoritesAllTime.map((ub, index) => {
                const book = allBooks.find(b => b.id === ub.book_id);
                if (!book) return null;
                return (
                  <motion.div
                    key={ub.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className="flex-shrink-0 cursor-pointer"
                  >
                    <img 
                      src={book.cover_url} 
                      alt={book.title}
                      className="w-24 h-36 object-cover rounded-lg shadow-md"
                    />
                    <p className="text-xs mt-2 w-24 line-clamp-2 font-medium" style={{ color: 'var(--dark-text)' }}>
                      {book.title}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}