import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function RecentActivity({ activities = [], allBooks, userName }) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-6 h-6 text-purple-500" />
        <h2 className="text-xl font-bold text-gray-900">
          Activité récente
        </h2>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const metadata = activity.metadata ? JSON.parse(activity.metadata) : {};
          const book = metadata.book_id ? allBooks.find(b => b.id === metadata.book_id) : null;
          const timeAgo = formatDistanceToNow(new Date(activity.created_date), {
            addSuffix: true,
            locale: fr
          });

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xl">
                {getActivityIcon(activity.activity_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 mb-1">{activity.content}</p>
                {book && (
                  <p className="text-sm text-gray-600 mb-1">
                    📚 {book.title}
                  </p>
                )}
                <p className="text-xs text-gray-500">{timeAgo}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function getActivityIcon(activityType) {
  const icons = {
    book_finished: '✅',
    book_started: '📖',
    review_posted: '✍️',
    badge_unlocked: '🏆',
    goal_achieved: '🎯',
    quote_shared: '💭',
    friend_added: '👥',
    joined: '🎉',
    reading_streak: '🔥'
  };

  return icons[activityType] || '📚';
}