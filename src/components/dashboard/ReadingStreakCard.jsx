import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Calendar, Trophy } from "lucide-react";
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
  });

  const updateStreakMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      if (!streakData) {
        // Créer le premier streak
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
  const totalDays = streakData?.total_reading_days || 0;

  const canLogToday = () => {
    if (!streakData) return true;
    const today = new Date().toISOString().split('T')[0];
    return streakData.last_reading_date !== today;
  };

  return (
    <Card className="overflow-hidden border-0 shadow-lg" style={{ 
      background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
    }}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-white" />
            <h3 className="font-bold text-white text-lg">Série de lecture</h3>
          </div>
          {canLogToday() && (
            <Button
              size="sm"
              onClick={() => updateStreakMutation.mutate()}
              disabled={updateStreakMutation.isPending}
              className="bg-white text-orange-600 hover:bg-gray-100 font-bold shadow-md"
            >
              J'ai lu aujourd'hui
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {currentStreak}
            </div>
            <div className="text-xs text-white/90 flex items-center justify-center gap-1">
              <Flame className="w-3 h-3" />
              Série actuelle
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {longestStreak}
            </div>
            <div className="text-xs text-white/90 flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3" />
              Record
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {totalDays}
            </div>
            <div className="text-xs text-white/90 flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3" />
              Total de jours
            </div>
          </div>
        </div>

        {currentStreak >= 7 && (
          <div className="mt-4 text-center text-sm text-white/95 font-medium">
            🎉 Incroyable ! {currentStreak} jours consécutifs !
          </div>
        )}
      </CardContent>
    </Card>
  );
}