import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Crown, BookOpen, ThumbsDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function TournamentBracket({ monthlyVotes, allBooks, year, isWorst = false }) {
  const queryClient = useQueryClient();
  const [currentRound, setCurrentRound] = useState(1);
  const [winners, setWinners] = useState({});

  const { data: bookOfYear } = useQuery({
    queryKey: isWorst ? ['worstBookOfYear', year] : ['bookOfYear', year],
    queryFn: async () => {
      const user = await base44.auth.me();
      const results = await base44.entities.BookOfTheYear.filter({ 
        created_by: user.email,
        year: year,
        is_worst: isWorst,
        month: undefined
      });
      return results[0] || null;
    },
  });

  const saveWinnerMutation = useMutation({
    mutationFn: async (bookId) => {
      if (bookOfYear) {
        await base44.entities.BookOfTheYear.update(bookOfYear.id, { book_id: bookId });
      } else {
        await base44.entities.BookOfTheYear.create({
          year,
          book_id: bookId,
          is_worst: isWorst,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: isWorst ? ['worstBookOfYear'] : ['bookOfYear'] });
      toast.success(`🎉 ${isWorst ? "Pire" : "Meilleur"} livre ${year} enregistré !`);
    },
  });

  const rounds = useMemo(() => {
    const books = monthlyVotes
      .map(v => v.book_id ? allBooks.find(b => b.id === v.book_id) : null)
      .filter(Boolean);
    const numBooks = books.length;
    
    if (numBooks < 4) return [];

    const round1 = [];
    for (let i = 0; i < books.length; i += 2) {
      if (books[i + 1]) {
        round1.push([books[i], books[i + 1]]);
      }
    }

    return [round1];
  }, [monthlyVotes, allBooks]);

  const selectWinner = (roundNum, matchNum, bookId) => {
    setWinners({
      ...winners,
      [`${roundNum}-${matchNum}`]: bookId
    });
  };

  const canProceedToNextRound = () => {
    const requiredMatches = rounds[currentRound - 1]?.length || 0;
    const completedMatches = Object.keys(winners).filter(k => k.startsWith(`${currentRound}-`)).length;
    return completedMatches === requiredMatches;
  };

  const proceedToNextRound = () => {
    const currentWinners = rounds[currentRound - 1]
      .map((_, idx) => winners[`${currentRound}-${idx}`])
      .filter(Boolean)
      .map(id => allBooks.find(b => b.id === id))
      .filter(Boolean);

    if (currentWinners.length === 1) {
      saveWinnerMutation.mutate(currentWinners[0].id);
      return;
    }

    const nextRound = [];
    for (let i = 0; i < currentWinners.length; i += 2) {
      if (currentWinners[i + 1]) {
        nextRound.push([currentWinners[i], currentWinners[i + 1]]);
      }
    }
    
    rounds.push(nextRound);
    setCurrentRound(currentRound + 1);
  };

  if (bookOfYear) {
    const winningBook = allBooks.find(b => b.id === bookOfYear.book_id);
    const gradientColor = isWorst 
      ? 'linear-gradient(90deg, #EF4444, #DC2626, #EF4444)'
      : 'linear-gradient(90deg, var(--gold), var(--deep-pink), var(--gold))';
    const iconColor = isWorst ? '#EF4444' : 'var(--gold)';
    const Icon = isWorst ? ThumbsDown : Crown;

    return (
      <Card className="shadow-xl border-0 overflow-hidden">
        <div className="h-3 animate-pulse" style={{ background: gradientColor }} />
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3" 
                     style={{ color: 'var(--dark-text)' }}>
            <Icon className="w-10 h-10" style={{ color: iconColor }} />
            {isWorst ? "Pire" : "Meilleur"} Livre {year}
            <Icon className="w-10 h-10" style={{ color: iconColor }} />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center pb-8">
          <div className="w-48 h-72 rounded-xl overflow-hidden shadow-2xl mb-6"
               style={{ backgroundColor: 'var(--beige)' }}>
            {winningBook?.cover_url ? (
              <img src={winningBook.cover_url} alt={winningBook.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Trophy className="w-20 h-20" style={{ color: iconColor }} />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold mb-2 text-center" style={{ color: 'var(--dark-text)' }}>
            {winningBook?.title}
          </h2>
          <p className="text-lg mb-4" style={{ color: 'var(--warm-pink)' }}>
            par {winningBook?.author}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setWinners({});
              setCurrentRound(1);
            }}
            style={{ borderColor: 'var(--soft-pink)' }}
          >
            Recommencer le tournoi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--dark-text)' }}>
          {isWorst ? "👎" : "🏆"} Round {currentRound}
        </h2>
        {canProceedToNextRound() && (
          <Button
            onClick={proceedToNextRound}
            className="text-white font-medium"
            style={{ background: isWorst 
              ? 'linear-gradient(135deg, #EF4444, #DC2626)' 
              : 'linear-gradient(135deg, var(--warm-pink), var(--deep-pink))' 
            }}
          >
            {rounds[currentRound - 1].map((_, idx) => winners[`${currentRound}-${idx}`]).filter(Boolean).length === 1
              ? `🎉 Proclamer ${isWorst ? "le pire" : "le gagnant"} !`
              : "Passer au round suivant"}
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {rounds[currentRound - 1]?.map((match, matchIdx) => {
          const [book1, book2] = match;
          const winnerId = winners[`${currentRound}-${matchIdx}`];
          const borderColor = isWorst ? '#EF4444' : 'var(--gold)';
          const iconColor = isWorst ? '#EF4444' : 'var(--gold)';

          return (
            <Card key={matchIdx} className="shadow-lg border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
              <div className="h-2" style={{ background: isWorst 
                ? 'linear-gradient(90deg, #EF4444, #DC2626)' 
                : 'linear-gradient(90deg, var(--soft-pink), var(--deep-pink))' 
              }} />
              <CardHeader>
                <CardTitle className="text-center" style={{ color: 'var(--dark-text)' }}>
                  Match {matchIdx + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[book1, book2].map((book) => (
                  <button
                    key={book.id}
                    onClick={() => selectWinner(currentRound, matchIdx, book.id)}
                    className={`w-full flex gap-4 p-4 rounded-xl text-left transition-all ${
                      winnerId === book.id 
                        ? 'shadow-xl scale-105' 
                        : 'shadow-md hover:shadow-lg'
                    }`}
                    style={{ 
                      backgroundColor: 'var(--cream)',
                      borderWidth: '3px',
                      borderStyle: 'solid',
                      borderColor: winnerId === book.id ? borderColor : 'transparent'
                    }}
                  >
                    <div className="w-20 h-28 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                         style={{ backgroundColor: 'var(--beige)' }}>
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-8 h-8" style={{ color: 'var(--warm-pink)' }} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                        {book.title}
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                        {book.author}
                      </p>
                      {winnerId === book.id && (
                        <div className="flex items-center gap-1 mt-2">
                          {isWorst ? (
                            <ThumbsDown className="w-5 h-5" style={{ color: iconColor }} />
                          ) : (
                            <Trophy className="w-5 h-5" style={{ color: iconColor }} />
                          )}
                          <span className="text-sm font-bold" style={{ color: iconColor }}>
                            Gagnant du match
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}