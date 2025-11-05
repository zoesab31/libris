
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Edit, TrendingUp, Calendar, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ReadingGoalCard({ currentGoal, booksReadThisYear, year, user }) {
  const [showDialog, setShowDialog] = useState(false);
  const [goalCount, setGoalCount] = useState(currentGoal?.goal_count || 50);
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const isYearEnded = year < currentYear;

  const { data: allGoals = [] } = useQuery({
    queryKey: ['allReadingGoals'],
    queryFn: () => base44.entities.ReadingGoal.filter({ created_by: user?.email }, '-year'),
    enabled: !!user,
  });

  const { data: allUserBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email, status: "Lu" }), // This query only fetches "Lu" books.
    enabled: !!user,
  });
  
  // Re-fetching all books is necessary if we want to count "Abandonné" books based on their status and percentage.
  // The existing `allUserBooks` query specifically filters for `status: "Lu"`.
  // To evaluate "Abandonné" books, we need books with that status.
  const { data: allUserBooksForGoalCalculation = [] } = useQuery({
    queryKey: ['allUserBooksForGoalCalculation'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }), // Fetch all user books
    enabled: !!user,
  });

  const { data: sharedReadings = [] } = useQuery({
    queryKey: ['sharedReadingsForGoal', year],
    queryFn: async () => {
      const all = await base44.entities.SharedReading.filter({ created_by: user?.email });
      return all.filter(sr => {
        if (!sr.end_date) return false;
        const endYear = new Date(sr.end_date).getFullYear();
        return endYear === year && sr.status === "Terminée";
      });
    },
    enabled: !!user,
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (count) => {
      if (currentGoal) {
        await base44.entities.ReadingGoal.update(currentGoal.id, { goal_count: count });
      } else {
        await base44.entities.ReadingGoal.create({ year, goal_count: count });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingGoal'] });
      queryClient.invalidateQueries({ queryKey: ['allReadingGoals'] });
      queryClient.invalidateQueries({ queryKey: ['allUserBooksForGoalCalculation'] }); 
      queryClient.invalidateQueries({ queryKey: ['myBooks'] }); // Invalidate the "Lu" specific query too
      
      // Animation paillettes
      toast.success("✨ Objectif enregistré avec succès !", {
        duration: 3000,
        style: {
          background: 'linear-gradient(135deg, var(--gold), var(--warm-pink))',
          color: 'white',
          fontWeight: 'bold'
        }
      });
      
      setShowDialog(false);
    },
  });

  const getBooksReadForYear = (targetYear) => {
    return allUserBooksForGoalCalculation.filter(b => {
      if (!b.end_date) return false;
      const endYear = new Date(b.end_date).getFullYear();
      if (endYear !== targetYear) return false;
      
      // Count "Lu" books
      if (b.status === "Lu") return true;
      
      // Count "Abandonné" books if >50%
      if (b.status === "Abandonné") {
        // Check percentage
        if (b.abandon_percentage >= 50) return true;
        
        // Check page count - need to find the book
        // If we were to implement page count, we'd need to fetch the actual book details
        // (e.g., total_pages) and compare b.abandon_page against total_pages.
        // For simplicity, as per the outline, we'll stick to percentage for now.
        // if (b.abandon_page && b.book_id) {
        //   // This would require a separate query or pre-fetched data for the book's total_pages
        //   // const bookDetails = allBooks.find(book => book.id === b.book_id);
        //   // if (bookDetails && b.abandon_page / bookDetails.total_pages >= 0.5) return true;
        // }
      }
      
      return false;
    }).length;
  };

  const progress = currentGoal ? (booksReadThisYear / currentGoal.goal_count) * 100 : 0;
  const isComplete = currentGoal && booksReadThisYear >= currentGoal.goal_count;

  const pastGoals = allGoals.filter(g => g.year < year);

  return (
    <>
      <Card className="shadow-lg border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
        <div className={`h-2 transition-all duration-500 ${isComplete ? 'animate-pulse' : ''}`} 
             style={{ 
               background: isComplete 
                 ? 'linear-gradient(90deg, var(--gold), var(--warm-brown))' 
                 : 'linear-gradient(90deg, var(--warm-brown), var(--soft-brown))'
             }} 
        />
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--deep-brown)' }}>
              <Target className="w-5 h-5" />
              Défi Lecture {year}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowDialog(true)}
              className="hover:bg-opacity-50"
            >
              <Edit className="w-4 h-4" style={{ color: 'var(--warm-brown)' }} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {currentGoal ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="text-4xl font-bold mb-2" style={{ color: 'var(--deep-brown)' }}>
                  {booksReadThisYear} / {currentGoal.goal_count}
                </div>
                {isYearEnded ? (
                  isComplete ? (
                    <p className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                      🎉 Félicitations ! Objectif atteint !
                    </p>
                  ) : (
                    <p className="text-sm font-bold text-red-600">
                      😢 Objectif non atteint
                    </p>
                  )
                ) : (
                  <p className="text-sm" style={{ color: 'var(--warm-brown)' }}>
                    {isComplete 
                      ? "🎉 Objectif atteint ! Félicitations !" 
                      : `Plus que ${currentGoal.goal_count - booksReadThisYear} livre${currentGoal.goal_count - booksReadThisYear > 1 ? 's' : ''}`
                    }
                  </p>
                )}
              </div>

              <div className="relative h-4 rounded-full overflow-hidden" 
                   style={{ backgroundColor: 'var(--beige)' }}>
                <div 
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(progress, 100)}%`,
                    background: isComplete
                      ? 'linear-gradient(90deg, var(--gold), var(--warm-brown))'
                      : 'linear-gradient(90deg, var(--warm-brown), var(--soft-brown))'
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--warm-brown)' }}>Progression</span>
                <div className="flex items-center gap-1" style={{ color: 'var(--deep-brown)' }}>
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-bold">{Math.round(progress)}%</span>
                </div>
              </div>

              {/* Shared Readings Counter */}
              {sharedReadings.length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg"
                     style={{ backgroundColor: 'var(--cream)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--deep-brown)' }}>
                    📚 Lectures communes
                  </span>
                  <span className="text-lg font-bold" style={{ color: 'var(--deep-pink)' }}>
                    {sharedReadings.length}
                  </span>
                </div>
              )}

              {pastGoals.length > 0 && (
                <div className="pt-4 border-t" style={{ borderColor: 'var(--beige)' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--warm-brown)' }}>
                    Années précédentes :
                  </p>
                  <div className="space-y-1">
                    {pastGoals.slice(0, 3).map((goal) => {
                      const booksRead = getBooksReadForYear(goal.year);
                      const achieved = booksRead >= goal.goal_count;
                      const goalYearEnded = goal.year < currentYear;
                      
                      return (
                        <div key={goal.id} className="flex items-center justify-between text-xs p-2 rounded-lg"
                             style={{ 
                               backgroundColor: 'var(--cream)',
                               borderLeft: goalYearEnded && !achieved ? '3px solid #DC2626' : 'none'
                             }}>
                          <span style={{ color: 'var(--deep-brown)' }}>
                            {achieved ? '🏆' : goalYearEnded ? '😢' : '📚'} {goal.year}
                          </span>
                          <span className={`font-medium ${achieved ? 'text-green-600' : goalYearEnded && !achieved ? 'text-red-600' : ''}`}
                                style={{ color: achieved ? undefined : (goalYearEnded && !achieved ? undefined : 'var(--warm-brown)') }}>
                            {booksRead} / {goal.goal_count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-brown)' }} />
              <p className="mb-4" style={{ color: 'var(--warm-brown)' }}>
                Définissez votre objectif de lecture pour {year}
              </p>
              <Button
                onClick={() => setShowDialog(true)}
                className="text-white font-medium"
                style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}
              >
                <Target className="w-4 h-4 mr-2" />
                Définir mon objectif
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--deep-brown)' }}>
              Objectif de lecture {year}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="current">Objectif {year}</TabsTrigger>
              <TabsTrigger value="history">Historique</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-4">
              <div>
                <Label htmlFor="goal">Combien de livres voulez-vous lire en {year} ?</Label>
                <Input
                  id="goal"
                  type="number"
                  min="1"
                  value={goalCount}
                  onChange={(e) => setGoalCount(parseInt(e.target.value) || 1)}
                  className="text-lg font-bold text-center py-6 mt-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[20, 50, 100].map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    onClick={() => setGoalCount(preset)}
                    className="font-medium"
                    style={{ 
                      borderColor: goalCount === preset ? 'var(--warm-brown)' : 'var(--beige)',
                      backgroundColor: goalCount === preset ? 'var(--cream)' : 'white'
                    }}
                  >
                    {preset}
                  </Button>
                ))}
              </div>

              <Button
                onClick={() => createOrUpdateMutation.mutate(goalCount)}
                disabled={createOrUpdateMutation.isPending || !goalCount}
                className="w-full font-medium py-6"
                style={{ 
                  background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))',
                  color: '#000000'
                }}
              >
                {createOrUpdateMutation.isPending ? "Enregistrement..." : "Enregistrer l'objectif"}
              </Button>
            </TabsContent>

            <TabsContent value="history" className="space-y-3">
              {allGoals.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allGoals.map((goal) => {
                    // Use allUserBooksForGoalCalculation for accurate counts here too
                    const booksRead = getBooksReadForYear(goal.year);
                    const achieved = booksRead >= goal.goal_count;
                    const progressPct = (booksRead / goal.goal_count) * 100;
                    
                    return (
                      <div key={goal.id} className="p-4 rounded-xl border-2"
                           style={{ 
                             backgroundColor: achieved ? 'var(--cream)' : 'white',
                             borderColor: achieved ? 'var(--gold)' : 'var(--beige)'
                           }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {achieved ? (
                              <Trophy className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                            ) : (
                              <Calendar className="w-5 h-5" style={{ color: 'var(--warm-brown)' }} />
                            )}
                            <span className="font-bold" style={{ color: 'var(--deep-brown)' }}>
                              {goal.year}
                            </span>
                          </div>
                          <span className="font-bold text-lg" style={{ color: 'var(--deep-brown)' }}>
                            {booksRead} / {goal.goal_count}
                          </span>
                        </div>
                        <div className="relative h-2 rounded-full overflow-hidden"
                             style={{ backgroundColor: 'var(--beige)' }}>
                          <div 
                            className="absolute inset-y-0 left-0 rounded-full"
                            style={{ 
                              width: `${Math.min(progressPct, 100)}%`,
                              background: achieved
                                ? 'linear-gradient(90deg, var(--gold), var(--warm-brown))'
                                : 'linear-gradient(90deg, var(--warm-brown), var(--soft-brown))'
                            }}
                          />
                        </div>
                        {achieved && (
                          <p className="text-xs mt-2 text-center font-medium" style={{ color: 'var(--warm-brown)' }}>
                            ✨ Objectif atteint !
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--warm-brown)' }}>
                  Aucun historique d'objectifs
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
