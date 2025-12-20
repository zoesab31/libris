import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Edit, Check, X, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function ReadingGoalManager({ year, compact = false }) {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: readingGoal } = useQuery({
    queryKey: ['readingGoal', year, user?.email],
    queryFn: async () => {
      const goals = await base44.entities.ReadingGoal.filter({ 
        created_by: user?.email,
        year: year 
      });
      return goals[0] || null;
    },
    enabled: !!user,
  });

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  // Helper function to check if abandoned book counts (>50%)
  const abandonedBookCounts = (userBook) => {
    if (userBook.status !== "Abandonné") return false;
    if (userBook.abandon_percentage && userBook.abandon_percentage >= 50) return true;
    if (userBook.abandon_page) {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (book && book.page_count && userBook.abandon_page >= book.page_count / 2) {
        return true;
      }
    }
    return false;
  };

  const getEffectiveDate = (userBook) => {
    if (userBook.status === "Lu" && userBook.end_date) {
      return userBook.end_date;
    }
    if (userBook.status === "Abandonné" && abandonedBookCounts(userBook)) {
      return userBook.end_date || userBook.updated_date;
    }
    return null;
  };
  
  const booksReadThisYear = myBooks.filter(b => {
    const effectiveDate = getEffectiveDate(b);
    if (!effectiveDate) return false;
    const bookYear = new Date(effectiveDate).getFullYear();
    return bookYear === year;
  }).length;

  const saveGoalMutation = useMutation({
    mutationFn: async (goalCount) => {
      if (readingGoal) {
        await base44.entities.ReadingGoal.update(readingGoal.id, { goal_count: goalCount });
      } else {
        await base44.entities.ReadingGoal.create({ 
          year, 
          goal_count: goalCount,
          created_by: user?.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingGoal'] });
      toast.success("Objectif mis à jour !");
      setIsEditing(false);
      setNewGoal("");
    },
  });

  const handleSave = () => {
    const goal = parseInt(newGoal);
    if (isNaN(goal) || goal < 1) {
      toast.error("Veuillez entrer un nombre valide");
      return;
    }
    saveGoalMutation.mutate(goal);
  };

  const startEditing = () => {
    setNewGoal(readingGoal?.goal_count?.toString() || "");
    setIsEditing(true);
  };

  const progress = readingGoal ? Math.round((booksReadThisYear / readingGoal.goal_count) * 100) : 0;

  if (compact) {
    return (
      <Card className="shadow-lg border-0 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" style={{ color: 'var(--deep-pink)' }} />
              <h3 className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
                Objectif {year}
              </h3>
            </div>
            {!isEditing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={startEditing}
                className="h-7 w-7"
              >
                <Edit className="w-3 h-3" style={{ color: 'var(--deep-pink)' }} />
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Input
                type="number"
                min="1"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Nombre de livres"
                className="h-8 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saveGoalMutation.isPending}
                  className="flex-1 h-7 text-xs text-white"
                  style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                >
                  <Check className="w-3 h-3 mr-1" />
                  OK
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setNewGoal("");
                  }}
                  className="h-7 text-xs"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : readingGoal ? (
            <>
              <div className="text-center mb-2">
                <p className="text-2xl font-bold" style={{ color: 'var(--dark-text)' }}>
                  {booksReadThisYear} / {readingGoal.goal_count}
                </p>
                <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                  {progress}% complété
                </p>
              </div>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--beige)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                     style={{ 
                       width: `${Math.min(progress, 100)}%`,
                       background: 'linear-gradient(90deg, var(--deep-pink), var(--warm-pink))'
                     }} />
              </div>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsEditing(true)}
              className="w-full h-8 text-xs text-white"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
            >
              Définir un objectif
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full version (non-compact)
  return (
    <Card className="border-0 rounded-3xl overflow-hidden dash-card"
          style={{ 
            backgroundColor: 'white',
            boxShadow: '0 4px 16px rgba(255, 105, 180, 0.08)'
          }}>
      <CardContent className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                 style={{ backgroundColor: '#FFE9F0' }}>
              <Target className="w-5 h-5" style={{ color: '#FF1493' }} />
            </div>
            <h3 className="font-bold text-xl md:text-2xl" style={{ color: '#2D3748' }}>
              Objectif {year}
            </h3>
          </div>
          {!isEditing && readingGoal && (
            <Button
              variant="ghost"
              size="icon"
              onClick={startEditing}
              className="dash-card"
            >
              <Edit className="w-4 h-4" style={{ color: '#FF1493' }} />
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <Input
              type="number"
              min="1"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="Nombre de livres à lire cette année"
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={saveGoalMutation.isPending}
                className="flex-1 text-white"
                style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
              >
                <Check className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setNewGoal("");
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          </div>
        ) : readingGoal ? (
          <>
            <style>{`
              @keyframes progress-fill {
                from { width: 0%; }
                to { width: ${Math.min(progress, 100)}%; }
              }
              @keyframes shimmer {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
              }
              .animated-progress {
                animation: progress-fill 1.5s cubic-bezier(0.4, 0, 0.2, 1);
                background: linear-gradient(
                  90deg,
                  #FFB6D9 0%,
                  #FF69B4 25%,
                  #E91E63 50%,
                  #FF69B4 75%,
                  #FFB6D9 100%
                );
                background-size: 200% 100%;
                animation: progress-fill 1.5s cubic-bezier(0.4, 0, 0.2, 1), shimmer 3s linear infinite;
              }
            `}</style>
            <div className="text-center mb-6">
              <p className="text-4xl md:text-5xl font-bold mb-2" style={{ color: '#2D3748' }}>
                {booksReadThisYear} <span style={{ color: '#FFB6C8' }}>/</span> {readingGoal.goal_count}
              </p>
              <p className="text-base" style={{ color: '#9CA3AF' }}>
                {progress}% accompli
              </p>
            </div>
            <div className="mb-6 relative">
              <div className="w-full h-5 rounded-full overflow-hidden"
                   style={{ 
                     backgroundColor: '#FFE9F0',
                     boxShadow: 'inset 0 2px 4px rgba(255, 105, 180, 0.1)'
                   }}>
                <div className="animated-progress h-full rounded-full relative"
                     style={{ 
                       width: `${Math.min(progress, 100)}%`,
                       boxShadow: '0 0 12px rgba(255, 105, 180, 0.4)'
                     }}>
                  <div className="absolute inset-0 rounded-full"
                       style={{
                         background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.3), transparent)',
                       }} />
                </div>
              </div>
            </div>
            <p className="text-center font-semibold text-base" style={{ color: '#2D3748' }}>
              {readingGoal.goal_count - booksReadThisYear > 0 
                ? `Encore ${readingGoal.goal_count - booksReadThisYear} livre${readingGoal.goal_count - booksReadThisYear > 1 ? 's' : ''} ✨`
                : `Objectif accompli ! 🎉`
              }
            </p>
          </>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
            <p className="mb-4" style={{ color: 'var(--warm-pink)' }}>
              Aucun objectif défini pour {year}
            </p>
            <Button
              onClick={() => setIsEditing(true)}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
            >
              Définir mon objectif
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}