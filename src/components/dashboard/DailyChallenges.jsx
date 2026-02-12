import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, BookOpen, Star, Trophy } from "lucide-react";

export default function DailyChallenges({ user, booksToday = 0, pagesGoal = 20, streak = 0 }) {
  const pagesProgress = Math.min((booksToday / pagesGoal) * 100, 100);
  const nextBadgeProgress = 75; // TODO: Calculate based on actual badges

  return (
    <Card className="border-0 rounded-3xl overflow-hidden shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, #FF1493 0%, #FF69B4 100%)',
          }}>
      <CardContent className="p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Target className="w-6 h-6" />
          Aujourd'hui
        </h3>

        <div className="space-y-4">
          {/* Daily reading goal */}
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-white" />
                <span className="font-semibold text-white">Lis {pagesGoal} pages</span>
              </div>
              <span className="font-bold text-white text-lg">
                {booksToday}/{pagesGoal}
              </span>
            </div>
            <Progress value={pagesProgress} className="h-2 bg-white bg-opacity-30" />
            {pagesProgress >= 100 && (
              <p className="text-xs text-white mt-2 flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                Objectif atteint ! 🎉
              </p>
            )}
          </div>

          {/* Reading streak */}
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="font-semibold text-white">Série de lecture</p>
                  <p className="text-xs text-white text-opacity-80">Continue comme ça !</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{streak}</p>
                <p className="text-xs text-white text-opacity-80">jours</p>
              </div>
            </div>
          </div>

          {/* Next badge */}
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-white" />
              <span className="font-semibold text-white">Prochain badge</span>
            </div>
            <Progress value={nextBadgeProgress} className="h-2 bg-white bg-opacity-30" />
            <p className="text-xs text-white mt-2 text-opacity-80">
              Plus que 5 livres pour débloquer "Lectrice assidue" 🏆
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}