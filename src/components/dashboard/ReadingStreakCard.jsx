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
    refetchInterval: 5000
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
    }
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
      



































    </Card>);

}