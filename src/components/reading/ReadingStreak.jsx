import { motion } from 'framer-motion';

export default function ReadingStreak({ streakDays, longestStreak }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-6 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-lg text-white"
    >
      <div className="flex items-center gap-4">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [-5, 5, -5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity
          }}
          className="text-6xl"
        >
          🔥
        </motion.div>

        <div className="flex-1">
          <p className="text-sm opacity-90 mb-1">Votre Streak</p>
          <p className="text-4xl font-bold">
            {streakDays} {streakDays > 1 ? 'jours' : 'jour'}
          </p>
          <p className="text-xs opacity-75 mt-1">
            Record : {longestStreak} jours
          </p>
        </div>

        {streakDays >= 7 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-4 py-2 bg-white/20 rounded-full text-sm font-bold"
          >
            🏆 En feu !
          </motion.div>
        )}
      </div>

      <div className="mt-4 flex gap-1">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-2 rounded ${
              i < Math.min(streakDays, 7) ? 'bg-white' : 'bg-white/20'
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}