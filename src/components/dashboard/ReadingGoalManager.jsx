import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Edit, Check, X, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const MAX_GOAL_CHANGES_PER_YEAR = 3;

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
    enabled: !!user
  });

  const changesRemaining = readingGoal ?
  MAX_GOAL_CHANGES_PER_YEAR - (readingGoal.changes_count || 0) :
  MAX_GOAL_CHANGES_PER_YEAR;

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list()
  });

  // Helper function to check if abandoned book counts (>50%)
  const abandonedBookCounts = (userBook) => {
    if (userBook.status !== "Abandonné") return false;
    if (userBook.abandon_percentage && userBook.abandon_percentage >= 50) return true;
    if (userBook.abandon_page) {
      const book = allBooks.find((b) => b.id === userBook.book_id);
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

  const booksReadThisYear = myBooks.reduce((count, b) => {
    // Compter la lecture initiale
    const effectiveDate = getEffectiveDate(b);
    if (effectiveDate) {
      const bookYear = new Date(effectiveDate).getFullYear();
      if (bookYear === year) count++;
    }

    // Compter chaque relecture
    if (b.rereads && b.rereads.length > 0) {
      b.rereads.forEach((reread) => {
        if (reread.end_date) {
          const rereadYear = new Date(reread.end_date).getFullYear();
          if (rereadYear === year) count++;
        }
      });
    }

    return count;
  }, 0);

  const saveGoalMutation = useMutation({
    mutationFn: async (goalCount) => {
      if (readingGoal) {
        const currentChanges = readingGoal.changes_count || 0;
        if (currentChanges >= MAX_GOAL_CHANGES_PER_YEAR) {
          throw new Error("Vous avez atteint le nombre maximum de modifications pour cette année");
        }
        await base44.entities.ReadingGoal.update(readingGoal.id, {
          goal_count: goalCount,
          changes_count: currentChanges + 1
        });
      } else {
        await base44.entities.ReadingGoal.create({
          year,
          goal_count: goalCount,
          changes_count: 0,
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
    onError: (error) => {
      toast.error(error.message || "Erreur lors de la mise à jour");
    }
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
    if (readingGoal && changesRemaining <= 0) {
      toast.error(`Vous avez atteint le nombre maximum de modifications (${MAX_GOAL_CHANGES_PER_YEAR}) pour cette année`);
      return;
    }
    setNewGoal(readingGoal?.goal_count?.toString() || "");
    setIsEditing(true);
  };

  const progress = readingGoal ? Math.round(booksReadThisYear / readingGoal.goal_count * 100) : 0;

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
            {!isEditing &&
            <Button
              variant="ghost"
              size="icon"
              onClick={startEditing}
              className="h-7 w-7">

                <Edit className="w-3 h-3" style={{ color: 'var(--deep-pink)' }} />
              </Button>
            }
          </div>

          {isEditing ?
          <div className="space-y-2">
              {readingGoal && changesRemaining > 0 &&
            <div className="flex items-center gap-1 text-xs p-2 rounded-lg"
            style={{ backgroundColor: 'var(--cream)', color: 'var(--warm-pink)' }}>
                  <AlertCircle className="w-3 h-3" />
                  <span>{changesRemaining} modification{changesRemaining > 1 ? 's' : ''} restante{changesRemaining > 1 ? 's' : ''}</span>
                </div>
            }
              <Input
              type="number"
              min="1"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="Nombre de livres"
              className="h-8 text-sm"
              autoFocus />

              <div className="flex gap-2">
                <Button
                size="sm"
                onClick={handleSave}
                disabled={saveGoalMutation.isPending}
                className="flex-1 h-7 text-xs text-white"
                style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>

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
                className="h-7 text-xs">

                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div> :
          readingGoal ?
          <>
              <div className="text-center mb-2">
                <p className="text-2xl font-bold" style={{ color: 'var(--dark-text)' }}>
                  {booksReadThisYear} / {readingGoal.goal_count}
                </p>
                <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                  {progress}% complété
                </p>
              </div>
              <div className="w-full h-2 rounded-full mb-2" style={{ backgroundColor: 'var(--beige)' }}>
                <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: 'linear-gradient(90deg, var(--deep-pink), var(--warm-pink))'
              }} />
              </div>
              {changesRemaining > 0 &&
            <p className="text-[10px] text-center" style={{ color: 'var(--warm-pink)' }}>
                  {changesRemaining} modification{changesRemaining > 1 ? 's' : ''} restante{changesRemaining > 1 ? 's' : ''}
                </p>
            }
            </> :

          <Button
            size="sm"
            onClick={() => setIsEditing(true)}
            className="w-full h-8 text-xs text-white"
            style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>

              Définir un objectif
            </Button>
          }
        </CardContent>
      </Card>);

  }

  // Full version (non-compact)
  return (
    <Card className="border rounded-2xl overflow-hidden" style={{ borderColor: '#FFD6E4', backgroundColor: 'white' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <h3 className="font-bold text-sm" style={{ color: '#FF1493' }}>
              Objectif {year}
            </h3>
          </div>
          {!isEditing && readingGoal && (
            <Button variant="ghost" size="icon" onClick={startEditing} className="h-7 w-7">
              <Edit className="w-3 h-3" style={{ color: '#FF1493' }} />
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            {readingGoal && changesRemaining > 0 && (
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                {changesRemaining} modification{changesRemaining > 1 ? 's' : ''} restante{changesRemaining > 1 ? 's' : ''}
              </p>
            )}
            <Input type="number" min="1" value={newGoal} onChange={(e) => setNewGoal(e.target.value)}
              placeholder="Nombre de livres" className="h-8 text-sm" autoFocus />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saveGoalMutation.isPending}
                className="flex-1 h-7 text-xs text-white" style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
                <Check className="w-3 h-3 mr-1" /> OK
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setNewGoal(""); }} className="h-7 text-xs">
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : readingGoal ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-black" style={{ color: '#FF1493' }}>
                {booksReadThisYear}<span className="text-sm font-normal text-gray-400">/{readingGoal.goal_count}</span>
              </span>
              <span className="text-sm font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: progress >= 100 ? '#D1FAE5' : '#FFE9F0', color: progress >= 100 ? '#059669' : '#FF1493' }}>
                {Math.min(progress, 100)}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full" style={{ backgroundColor: '#FFE9F0' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%`, background: 'linear-gradient(90deg, #FF1493, #FF69B4)' }} />
            </div>
            <p className="text-xs mt-1.5" style={{ color: '#9CA3AF' }}>
              {readingGoal.goal_count - booksReadThisYear > 0
                ? `Encore ${readingGoal.goal_count - booksReadThisYear} livre${readingGoal.goal_count - booksReadThisYear > 1 ? 's' : ''} à lire`
                : '🎉 Objectif atteint !'}
            </p>
          </>
        ) : (
          <Button size="sm" onClick={() => setIsEditing(true)}
            className="w-full h-8 text-xs text-white" style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
            Définir un objectif
          </Button>
        )}
      </CardContent>
    </Card>
  );
}