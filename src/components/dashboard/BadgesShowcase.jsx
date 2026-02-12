import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Sparkles, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BadgesShowcase({ user }) {
  const { data: userBadges = [] } = useQuery({
    queryKey: ['userBadges', user?.email],
    queryFn: () => base44.entities.UserBadge.filter({ created_by: user?.email }, '-unlocked_date'),
    enabled: !!user,
  });

  const { data: allBadges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.Badge.list(),
  });

  const unlockedBadges = userBadges
    .map(ub => {
      const badge = allBadges.find(b => b.id === ub.badge_id);
      return badge ? { ...badge, unlocked_date: ub.unlocked_date } : null;
    })
    .filter(Boolean)
    .slice(0, 6);

  if (unlockedBadges.length === 0) return null;

  return (
    <Card className="border-0 rounded-3xl overflow-hidden shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: '#2D3748' }}>
            <Award className="w-6 h-6" style={{ color: '#F59E0B' }} />
            Tes badges
          </h3>
          <Link to={createPageUrl("AccountSettings")} className="text-sm font-semibold" style={{ color: '#FF1493' }}>
            Voir tout →
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {unlockedBadges.map(badge => (
            <div 
              key={badge.id}
              className="relative group cursor-pointer"
            >
              <div 
                className="aspect-square rounded-2xl flex flex-col items-center justify-center p-3 transition-all hover:scale-105"
                style={{ 
                  backgroundColor: badge.color || '#FFE9F0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
              >
                <span className="text-3xl mb-1">{badge.icon}</span>
                <p className="text-xs font-bold text-center leading-tight" style={{ color: '#2D3748' }}>
                  {badge.name}
                </p>
              </div>
              
              {/* Rarity indicator */}
              {badge.rarity !== 'common' && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                     style={{ 
                       backgroundColor: badge.rarity === 'legendary' ? '#8B5CF6' : 
                                       badge.rarity === 'epic' ? '#EC4899' : '#F59E0B',
                       boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                     }}>
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}