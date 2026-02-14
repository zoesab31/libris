import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ALL_BADGES } from '@/components/utils/badgeDefinitions';
import BadgeCard from '@/components/badges/BadgeCard';
import { motion } from 'framer-motion';

export default function BadgesPage() {
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedBadgeId, setSelectedBadgeId] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: userBadges = [] } = useQuery({
    queryKey: ['userBadges', user?.email],
    queryFn: () => base44.entities.UserBadge.filter({ created_by: user?.email }),
    enabled: !!user
  });

  const unlockedBadgeIds = userBadges.map(ub => ub.badge_id);
  
  const allBadges = ALL_BADGES.map(badge => ({
    ...badge,
    isUnlocked: unlockedBadgeIds.includes(badge.id),
    userBadgeData: userBadges.find(ub => ub.badge_id === badge.id)
  }));

  const filteredBadges = allBadges
    .filter(badge => {
      if (filter === 'unlocked') return badge.isUnlocked;
      if (filter === 'locked') return !badge.isUnlocked;
      return true;
    })
    .filter(badge => {
      if (categoryFilter === 'all') return true;
      return badge.category === categoryFilter;
    });

  const unlockedCount = allBadges.filter(b => b.isUnlocked).length;
  const totalPoints = userBadges.reduce((sum, ub) => {
    const badge = ALL_BADGES.find(b => b.id === ub.badge_id);
    return sum + (badge?.points || 0);
  }, 0);
  const level = Math.floor(totalPoints / 100) + 1;
  const levelBase = (level - 1) * 100;
  const levelProgress = Math.min(100, Math.round(((totalPoints - levelBase) / 100) * 100));
  const pointsToNext = Math.max(0, level * 100 - totalPoints);

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'linear-gradient(to bottom, #FFF5F8 0%, #FFE9F0 50%, #FFDCE5 100%)' }}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                 style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}>
              <span className="text-3xl">🏆</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-bold" style={{ color: '#FF1493' }}>
                Mes Badges
              </h1>
              <p className="text-base md:text-xl" style={{ color: '#2c2c2c' }}>
                Débloquez des récompenses en lisant
              </p>
            </div>
          </div>

          {user?.role === 'admin' && (
            <div className="mb-4 flex items-center gap-2">
              <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                <SelectTrigger className="w-60"><SelectValue placeholder="Choisir un badge à débloquer"/></SelectTrigger>
                <SelectContent>
                  {ALL_BADGES.filter(b => !unlockedBadgeIds.includes(b.id)).map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.icon} {b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!selectedBadgeId}
                onClick={async ()=>{
                  await base44.entities.UserBadge.create({ badge_id: selectedBadgeId, unlocked_at: new Date().toISOString(), is_new: true });
                  setSelectedBadgeId("");
                  queryClient.invalidateQueries({ queryKey: ['userBadges', user?.email] });
                }}
                className="bg-pink-600 hover:bg-pink-700"
              >Débloquer</Button>
            </div>
          )}

           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl shadow-lg text-center">
              <p className="text-3xl font-bold" style={{ color: '#FF1493' }}>
                {unlockedCount}/{ALL_BADGES.length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Badges débloqués</p>
            </div>
            <div className="p-4 bg-white rounded-2xl shadow-lg text-center">
              <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>
                {totalPoints}
              </p>
              <p className="text-sm text-gray-600 mt-1">Points totaux</p>
            </div>
            <div className="p-4 bg-white rounded-2xl shadow-lg text-center">
              <p className="text-3xl font-bold" style={{ color: '#9C27B0' }}>
                {Math.round((unlockedCount / ALL_BADGES.length) * 100)}%
              </p>
              <p className="text-sm text-gray-600 mt-1">Complétion</p>
            </div>
            <div className="p-4 bg-white rounded-2xl shadow-lg">
              <p className="text-sm font-semibold text-gray-700 mb-2">Niveau {level}</p>
              <Progress value={levelProgress} className="h-2 mb-1" />
              <p className="text-xs text-gray-500">{pointsToNext} pts pour le niveau {level + 1}</p>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              Tous
            </Button>
            <Button
              variant={filter === 'unlocked' ? 'default' : 'outline'}
              onClick={() => setFilter('unlocked')}
            >
              Débloqués ({unlockedCount})
            </Button>
            <Button
              variant={filter === 'locked' ? 'default' : 'outline'}
              onClick={() => setFilter('locked')}
            >
              À débloquer ({ALL_BADGES.length - unlockedCount})
            </Button>
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              <SelectItem value="reading">📚 Lecture</SelectItem>
              <SelectItem value="social">👥 Social</SelectItem>
              <SelectItem value="streak">🔥 Régularité</SelectItem>
              <SelectItem value="completion">✅ Complétion</SelectItem>
              <SelectItem value="diversity">🌍 Diversité</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBadges.map((badge, index) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              index={index}
            />
          ))}
        </div>

        {filteredBadges.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun badge à afficher</p>
          </div>
        )}
      </div>
    </div>
  );
}