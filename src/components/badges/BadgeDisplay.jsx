import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Lock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function BadgeDisplay({ user, compact = false }) {
  const { data: allBadges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.Badge.list(),
  });

  const { data: userBadges = [] } = useQuery({
    queryKey: ['userBadges', user?.email],
    queryFn: () => base44.entities.UserBadge.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: readingLists = [] } = useQuery({
    queryKey: ['readingLists'],
    queryFn: () => base44.entities.ReadingList.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ created_by: user?.email, status: "Acceptée" }),
    enabled: !!user,
  });

  const unlockedBadgeIds = userBadges.map(ub => ub.badge_id);

  // Check if user meets badge requirements
  const checkBadgeRequirement = (badge) => {
    switch (badge.condition_type) {
      case "books_read":
        const booksRead = myBooks.filter(b => b.status === "Lu").length;
        return booksRead >= badge.condition_value;
      case "years_reading":
        if (!user?.created_date) return false;
        const yearsSince = (new Date() - new Date(user.created_date)) / (1000 * 60 * 60 * 24 * 365);
        return yearsSince >= badge.condition_value;
      case "pal_completed":
        const completedPALs = readingLists.filter(pal => {
          if (!pal.book_ids || pal.book_ids.length === 0) return false;
          const allRead = pal.book_ids.every(bookId =>
            myBooks.some(ub => ub.book_id === bookId && ub.status === "Lu")
          );
          return allRead;
        }).length;
        return completedPALs >= badge.condition_value;
      case "friends_count":
        return myFriends.length >= badge.condition_value;
      case "genres_read":
        const uniqueGenres = new Set();
        myBooks.forEach(ub => {
          const book = allBadges.find(b => b.id === ub.book_id);
          if (book?.custom_genres) {
            book.custom_genres.forEach(g => uniqueGenres.add(g));
          }
        });
        return uniqueGenres.size >= badge.condition_value;
      default:
        return false;
    }
  };

  const unlockedBadges = allBadges.filter(badge => 
    unlockedBadgeIds.includes(badge.id) || checkBadgeRequirement(badge)
  );

  const lockedBadges = allBadges.filter(badge => 
    !unlockedBadgeIds.includes(badge.id) && !checkBadgeRequirement(badge)
  );

  const rarityColors = {
    common: '#94A3B8',
    rare: '#3B82F6',
    epic: '#9C27B0',
    legendary: '#FFD700'
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {unlockedBadges.slice(0, 3).map(badge => (
          <div
            key={badge.id}
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
            style={{ backgroundColor: badge.color || rarityColors[badge.rarity] }}
            title={badge.name}
          >
            <span className="text-2xl">{badge.icon}</span>
          </div>
        ))}
        {unlockedBadges.length > 3 && (
          <span className="text-xs font-bold" style={{ color: 'var(--warm-pink)' }}>
            +{unlockedBadges.length - 3}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Unlocked Badges */}
      {unlockedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
            <Trophy className="w-5 h-5" style={{ color: '#FFD700' }} />
            Badges débloqués ({unlockedBadges.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {unlockedBadges.map(badge => (
              <Card
                key={badge.id}
                className="border-2 shadow-lg hover:shadow-xl transition-all cursor-pointer"
                style={{ borderColor: badge.color || rarityColors[badge.rarity] }}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center shadow-lg"
                       style={{ backgroundColor: badge.color || rarityColors[badge.rarity] }}>
                    <span className="text-3xl">{badge.icon}</span>
                  </div>
                  <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--dark-text)' }}>
                    {badge.name}
                  </h4>
                  <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                    {badge.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
            <Lock className="w-5 h-5" style={{ color: '#9CA3AF' }} />
            À débloquer ({lockedBadges.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {lockedBadges.map(badge => (
              <Card
                key={badge.id}
                className="border-2 opacity-60 hover:opacity-80 transition-all"
                style={{ borderColor: '#E5E7EB' }}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center"
                       style={{ backgroundColor: '#F3F4F6' }}>
                    <Lock className="w-6 h-6" style={{ color: '#9CA3AF' }} />
                  </div>
                  <h4 className="font-bold text-sm mb-1" style={{ color: '#6B7280' }}>
                    {badge.name}
                  </h4>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>
                    {badge.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}