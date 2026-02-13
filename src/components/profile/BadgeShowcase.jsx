import { motion } from 'framer-motion';
import { Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ALL_BADGES } from '@/components/utils/badgeDefinitions';

export default function BadgeShowcase({ userBadges, isOwnProfile }) {
  const navigate = useNavigate();

  const sortedBadges = userBadges
    .map(ub => {
      const badge = ALL_BADGES.find(b => b.id === ub.badge_id);
      return { ...ub, ...badge };
    })
    .filter(b => b.name)
    .sort((a, b) => {
      const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
      return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
    })
    .slice(0, 6);

  if (sortedBadges.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-6 mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Award className="w-6 h-6 text-yellow-500" />
          Mes Badges
        </h2>
        <button
          onClick={() => navigate('/badges')}
          className="text-sm text-pink-600 hover:text-pink-700 font-medium"
        >
          Voir tous ({userBadges.length}) →
        </button>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {sortedBadges.map((badge, index) => (
          <motion.div
            key={badge.id}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: index * 0.1, type: 'spring' }}
            className="flex flex-col items-center"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg mb-2"
              style={{
                background: `linear-gradient(135deg, ${badge.color_primary}, ${badge.color_secondary})`
              }}
            >
              <span className="text-3xl">{badge.icon}</span>
            </div>
            <p className="text-xs text-center text-gray-700 font-medium line-clamp-2">
              {badge.name}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}