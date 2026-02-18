import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ReadingStreakCard({ user }) {
  const queryClient = useQueryClient();

  const { data: streakData } = useQuery({
    queryKey: ['readingStreak', user?.email],
    queryFn: async () => {
      const streaks = await base44.entities.ReadingStreak.filter({ created_by: user.email });
      return streaks[0] || null;
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const updateStreakMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      if (!streakData) {
        return await base44.entities.ReadingStreak.create({
          current_streak: 1,
          longest_streak: 1,
          last_reading_date: today,
          total_reading_days: 1
        });
      }

      const lastDate = new Date(streakData.last_reading_date);
      const todayDate = new Date(today);
      const diffTime = Math.abs(todayDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        toast.info("Déjà enregistré aujourd'hui !");
        return streakData;
      }

      let newCurrentStreak = diffDays === 1 ? streakData.current_streak + 1 : 1;
      let newLongestStreak = Math.max(streakData.longest_streak, newCurrentStreak);

      return await base44.entities.ReadingStreak.update(streakData.id, {
        current_streak: newCurrentStreak,
        longest_streak: newLongestStreak,
        last_reading_date: today,
        total_reading_days: streakData.total_reading_days + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingStreak'] });
      toast.success("Lecture enregistrée ! 🔥");
    },
  });

  const currentStreak = streakData?.current_streak || 0;
  const longestStreak = streakData?.longest_streak || 0;

  const canLogToday = () => {
    if (!streakData) return true;
    const today = new Date().toISOString().split('T')[0];
    return streakData.last_reading_date !== today;
  };

  return (
    <Card className="border-0 rounded-3xl overflow-hidden dash-card" style={{ 
      backgroundColor: 'white',
      boxShadow: '0 4px 16px rgba(255, 105, 180, 0.08)'
    }}>
      <CardContent className="p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, #FF69B4, #FF1493)' }}>
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-base md:text-lg" style={{ color: '#2D3748' }}>
                  {currentStreak === 0 ? "Commence ta série !" : `${currentStreak} jour${currentStreak > 1 ? 's' : ''} 🔥`}
                </h3>
                {currentStreak >= 7 && <Sparkles className="w-4 h-4" style={{ color: '#FFD700' }} />}
              </div>
              <p className="text-xs md:text-sm" style={{ color: '#9CA3AF' }}>
                {longestStreak > 0 ? `Record : ${longestStreak} jour${longestStreak > 1 ? 's' : ''}` : 'Enregistre ta première lecture'}
              </p>
            </div>
          </div>

          {canLogToday() && (
            <Button
              size="sm"
              onClick={() => updateStreakMutation.mutate()}
              disabled={updateStreakMutation.isPending}
              className="font-semibold rounded-xl px-4 py-2 text-xs md:text-sm flex-shrink-0"
              style={{ 
                background: 'linear-gradient(135deg, #FF1493, #FF69B4)',
                color: 'white'
              }}
            >
              ✓ J'ai lu
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}