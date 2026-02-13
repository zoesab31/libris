import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Quote, Star, Trophy, Heart, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ActivityTimeline({ activities, allBooks }) {
  const [filter, setFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(10);

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.activity_type === filter);

  const visibleActivities = filteredActivities.slice(0, visibleCount);

  const getActivityIcon = (type) => {
    const icons = {
      finish_book: BookOpen,
      review: Star,
      quote: Quote,
      badge: Trophy,
      favorite: Heart
    };
    return icons[type] || BookOpen;
  };

  const getActivityColor = (type) => {
    const colors = {
      finish_book: 'from-green-400 to-emerald-500',
      review: 'from-yellow-400 to-orange-500',
      quote: 'from-purple-400 to-pink-500',
      badge: 'from-blue-400 to-indigo-500',
      favorite: 'from-red-400 to-pink-500'
    };
    return colors[type] || 'from-gray-400 to-gray-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="p-6 border-0 shadow-xl">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
          Mon activité
        </h2>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { value: 'all', label: 'Tout' },
            { value: 'finish_book', label: 'Livres terminés' },
            { value: 'review', label: 'Avis' },
            { value: 'quote', label: 'Citations' },
            { value: 'badge', label: 'Badges' }
          ].map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? 'default' : 'outline'}
              onClick={() => setFilter(f.value)}
              className={filter === f.value ? 'text-white' : ''}
              style={filter === f.value ? { 
                background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' 
              } : {}}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          {visibleActivities.length > 0 ? (
            visibleActivities.map((activity, index) => {
              const Icon = getActivityIcon(activity.activity_type);
              const gradient = getActivityColor(activity.activity_type);
              const book = activity.book_id ? allBooks.find(b => b.id === activity.book_id) : null;

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex gap-4 p-4 rounded-xl hover:shadow-md transition-shadow"
                  style={{ background: 'linear-gradient(135deg, var(--beige), var(--cream))' }}
                >
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium" style={{ color: 'var(--dark-text)' }}>
                      {activity.content}
                    </p>
                    {book && (
                      <p className="text-sm mt-1" style={{ color: 'var(--warm-pink)' }}>
                        {book.title} - {book.author}
                      </p>
                    )}
                    <p className="text-xs mt-2 opacity-60" style={{ color: 'var(--warm-pink)' }}>
                      {formatDistanceToNow(new Date(activity.created_date), { addSuffix: true, locale: fr })}
                    </p>

                    {/* Interaction buttons */}
                    <div className="flex gap-4 mt-3">
                      <button className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
                              style={{ color: 'var(--warm-pink)' }}>
                        <Heart className="w-4 h-4" />
                        {activity.likes_count || 0}
                      </button>
                      <button className="flex items-center gap-1 text-xs hover:opacity-70 transition-opacity"
                              style={{ color: 'var(--warm-pink)' }}>
                        <MessageCircle className="w-4 h-4" />
                        {activity.comments_count || 0}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--soft-pink)' }} />
              <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                Aucune activité pour le moment
              </p>
            </div>
          )}
        </div>

        {/* Load More */}
        {visibleCount < filteredActivities.length && (
          <div className="text-center mt-6">
            <Button
              variant="outline"
              onClick={() => setVisibleCount(prev => prev + 10)}
            >
              Voir plus
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}