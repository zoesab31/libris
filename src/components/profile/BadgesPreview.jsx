import { motion } from 'framer-motion';
import { Trophy, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ALL_BADGES } from '@/components/utils/badgeDefinitions';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function BadgesPreview({ userBadges }) {
  const unlockedBadges = userBadges
    .filter(ub => ub.unlocked_at)
    .map(ub => {
      const badgeDef = ALL_BADGES.find(b => b.id === ub.badge_id);
      return { ...ub, ...badgeDef };
    })
    .filter(b => b.name)
    .sort((a, b) => {
      const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    })
    .slice(0, 6);

  const totalPoints = userBadges.reduce((sum, ub) => {
    const badge = ALL_BADGES.find(b => b.id === ub.badge_id);
    return sum + (badge?.points || 0);
  }, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="p-6 border-0 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: '#FFD700' }} />
            <h2 className="text-xl font-bold" style={{ color: 'var(--dark-text)' }}>
              Mes badges
            </h2>
          </div>
          <Link to={createPageUrl('Badges')}>
            <Button variant="ghost" size="sm" className="gap-1">
              Voir tout
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span style={{ color: 'var(--warm-pink)' }}>
              {userBadges.filter(ub => ub.unlocked_at).length} / {ALL_BADGES.length} badges
            </span>
            <span className="font-bold" style={{ color: 'var(--dark-text)' }}>
              {totalPoints} points
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ 
                width: `${(userBadges.filter(ub => ub.unlocked_at).length / ALL_BADGES.length) * 100}%` 
              }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {unlockedBadges.map((badge, index) => (
            <motion.div
              key={badge.badge_id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + index * 0.05 }}
              whileHover={{ scale: 1.1 }}
              className="relative"
            >
              <div 
                className="aspect-square rounded-xl flex items-center justify-center text-3xl shadow-md"
                style={{ 
                  background: `linear-gradient(135deg, ${badge.color_primary}, ${badge.color_secondary})`
                }}
              >
                {badge.icon}
              </div>
              {badge.is_new && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold"
                >
                  !
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {unlockedBadges.length === 0 && (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: 'var(--soft-pink)' }} />
            <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
              Commencez à lire pour débloquer des badges !
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}