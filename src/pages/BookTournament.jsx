import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trophy, Star, Crown, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import MonthlyVoteDialog from "../components/tournament/MonthlyVoteDialog";
import TournamentBracket from "../components/tournament/TournamentBracket";
import { toast } from "sonner";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function BookTournament() {
  const [user, setUser] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: monthlyVotes = [] } = useQuery({
    queryKey: ['monthlyVotes', currentYear],
    queryFn: () => base44.entities.MonthlyBookVote.filter({ 
      created_by: user?.email,
      year: currentYear 
    }, 'month'),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ 
      created_by: user?.email,
      status: "Lu"
    }),
    enabled: !!user,
  });

  // Get books read each month
  const booksReadByMonth = useMemo(() => {
    const result = {};
    for (let i = 1; i <= 12; i++) {
      result[i] = myBooks.filter(ub => {
        if (!ub.end_date) return false;
        const endDate = new Date(ub.end_date);
        return endDate.getFullYear() === currentYear && endDate.getMonth() + 1 === i;
      }).map(ub => allBooks.find(b => b.id === ub.book_id)).filter(Boolean);
    }
    return result;
  }, [myBooks, allBooks, currentYear]);

  const canStartTournament = monthlyVotes.length >= 4; // Need at least 4 months to start

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
               style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--deep-pink))' }}>
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
              Tournoi du Livre 🏆
            </h1>
            <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
              Élisez votre livre de l'année {currentYear}
            </p>
          </div>
        </div>

        {/* Monthly votes */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
            📅 Votes mensuels ({monthlyVotes.length}/12)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {MONTHS.map((monthName, idx) => {
              const monthNum = idx + 1;
              const vote = monthlyVotes.find(v => v.month === monthNum);
              const book = vote ? allBooks.find(b => b.id === vote.book_id) : null;
              const canVote = monthNum <= currentMonth;
              const hasBooks = booksReadByMonth[monthNum]?.length > 0;

              return (
                <Card 
                  key={monthNum}
                  className="shadow-md border-0 overflow-hidden transition-all hover:shadow-lg cursor-pointer"
                  style={{ backgroundColor: 'white' }}
                  onClick={() => canVote && hasBooks && setSelectedMonth(monthNum)}
                >
                  <div className="h-2" style={{ 
                    backgroundColor: vote ? 'var(--gold)' : canVote && hasBooks ? 'var(--soft-pink)' : 'var(--beige)' 
                  }} />
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold" style={{ color: 'var(--dark-text)' }}>
                        {monthName}
                      </h3>
                      {vote ? (
                        <Crown className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                      ) : (
                        <Calendar className="w-5 h-5" style={{ color: 'var(--warm-pink)' }} />
                      )}
                    </div>
                    
                    {vote && book ? (
                      <div>
                        <div className="w-full h-32 rounded-lg overflow-hidden mb-2 shadow-sm"
                             style={{ backgroundColor: 'var(--beige)' }}>
                          {book.cover_url && (
                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <p className="text-xs font-medium line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                          {book.title}
                        </p>
                      </div>
                    ) : canVote && hasBooks ? (
                      <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                        {booksReadByMonth[monthNum].length} livre{booksReadByMonth[monthNum].length > 1 ? 's' : ''} lu{booksReadByMonth[monthNum].length > 1 ? 's' : ''}
                        <br />
                        <span className="font-semibold">Cliquez pour voter</span>
                      </p>
                    ) : (
                      <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                        {!canVote ? "Pas encore disponible" : "Aucun livre lu"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Tournament bracket */}
        {canStartTournament ? (
          <TournamentBracket 
            monthlyVotes={monthlyVotes}
            allBooks={allBooks}
            year={currentYear}
          />
        ) : (
          <div className="text-center py-20 rounded-2xl" style={{ backgroundColor: 'white' }}>
            <Trophy className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              Tournoi pas encore disponible
            </h3>
            <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
              Votez pour au moins 4 mois pour démarrer le tournoi
              <br />
              ({monthlyVotes.length}/4 votes)
            </p>
          </div>
        )}

        {selectedMonth && (
          <MonthlyVoteDialog
            month={selectedMonth}
            monthName={MONTHS[selectedMonth - 1]}
            year={currentYear}
            books={booksReadByMonth[selectedMonth]}
            currentVote={monthlyVotes.find(v => v.month === selectedMonth)}
            open={!!selectedMonth}
            onOpenChange={(open) => !open && setSelectedMonth(null)}
          />
        )}
      </div>
    </div>
  );
}