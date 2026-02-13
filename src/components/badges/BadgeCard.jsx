import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

export default function BadgeCard({ badge, index }) {
  const rarityLabels = {
    common: '⚪ Commun',
    rare: '🔵 Rare',
    epic: '🟣 Épique',
    legendary: '🟡 Légendaire'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: badge.isUnlocked ? 1.05 : 1.02 }}
      className={`p-6 rounded-2xl shadow-lg transition-all ${
        badge.isUnlocked ? 'bg-white' : 'bg-gray-100'
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${
            badge.isUnlocked ? '' : 'grayscale opacity-50'
          }`}
          style={{
            background: badge.isUnlocked
              ? `linear-gradient(135deg, ${badge.color_primary}, ${badge.color_secondary})`
              : '#E5E7EB'
          }}
        >
          <span className="text-5xl">
            {badge.is_secret && !badge.isUnlocked ? '❓' : badge.icon}
          </span>
        </div>

        <h3 className={`font-bold text-lg mb-2 ${
          badge.isUnlocked ? 'text-gray-900' : 'text-gray-500'
        }`}>
          {badge.is_secret && !badge.isUnlocked ? '???' : badge.name}
        </h3>

        <p className="text-sm text-gray-600 mb-3">
          {badge.is_secret && !badge.isUnlocked
            ? 'Badge secret - À découvrir'
            : badge.description}
        </p>

        <div className="flex gap-2 mb-3">
          <Badge variant="outline">
            {rarityLabels[badge.rarity]}
          </Badge>
          <Badge style={{ background: '#FFD700', color: '#000' }}>
            {badge.points} pts
          </Badge>
        </div>

        {badge.isUnlocked && badge.userBadgeData && (
          <p className="text-xs text-gray-500 mt-2">
            Débloqué le {new Date(badge.userBadgeData.unlocked_at).toLocaleDateString('fr-FR')}
          </p>
        )}

        {!badge.isUnlocked && (
          <div className="w-full mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: '0%',
                  background: `linear-gradient(90deg, ${badge.color_primary}, ${badge.color_secondary})`
                }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}