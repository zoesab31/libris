
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, History, Skull, ChevronDown, RotateCcw, Share2, Undo, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
// Removed confetti import as it's no longer used based on the outline

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const ROUND_COLORS = {
  monthly: "bg-gray-100 border-gray-300",
  eighth: "bg-pink-50 border-pink-300",
  quarter: "bg-orange-50 border-orange-300",
  semi: "bg-purple-50 border-purple-300",
  final: "bg-yellow-50 border-yellow-400"
};

export default function BookTournament() {
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [mode, setMode] = useState("best"); // "best" or "worst"
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [currentColumn, setCurrentColumn] = useState(0); // For mobile carousel
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: currentTournament, refetch: refetchTournament } = useQuery({
    queryKey: ['tournament', selectedYear, mode],
    queryFn: async () => {
      const tournaments = await base44.entities.Tournament.filter({
        created_by: user?.email,
        year: selectedYear,
        type: mode
      });
      return tournaments[0] || null;
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 2000,
  });

  // Helper: check if DNF book counts (>50%)
  const abandonedBookCounts = (userBook) => {
    if (userBook.status !== "Abandonné") return false;
    if (userBook.abandon_percentage >= 50) return true;
    
    const book = allBooks.find(b => b.id === userBook.book_id);
    if (book?.page_count && userBook.abandon_page >= book.page_count / 2) {
      return true;
    }
    return false;
  };

  // Get books finished in selected year, organized by month
  const booksByMonth = useMemo(() => {
    const months = {};
    
    for (let i = 0; i < 12; i++) {
      months[i] = [];
    }

    myBooks.forEach(userBook => {
      if (!userBook.end_date) return;
      const endDate = new Date(userBook.end_date);
      if (endDate.getFullYear() !== selectedYear) return;

      const isLu = userBook.status === "Lu";
      const isQualifiedDNF = userBook.status === "Abandonné" && abandonedBookCounts(userBook);

      // For "best" mode: only Lu books
      // For "worst" mode: Lu books + qualified DNF
      if (mode === "best" && !isLu) return;
      if (mode === "worst" && !isLu && !isQualifiedDNF) return;

      const month = endDate.getMonth();
      months[month].push(userBook);
    });

    return months;
  }, [myBooks, selectedYear, mode, allBooks]);

  // Initialize tournament mutation
  const initTournamentMutation = useMutation({
    mutationFn: async () => {
      // Delete existing tournament if any
      if (currentTournament) {
        await base44.entities.Tournament.delete(currentTournament.id);
      }

      // Create monthly picks structure
      const monthlyPicks = {};
      Object.keys(booksByMonth).forEach(month => {
        monthlyPicks[month] = booksByMonth[month].map(ub => ub.book_id);
      });

      // Create new tournament
      const tournament = await base44.entities.Tournament.create({
        year: selectedYear,
        type: mode,
        status: "in_progress",
        monthly_picks: monthlyPicks,
        monthly_winners: {},
        bracket: { rounds: [], champion: null },
        participant_books: Object.values(monthlyPicks).flat()
      });

      return tournament;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament'] });
      toast.success("Tournoi initialisé !");
    }
  });

  // Select monthly winner mutation
  const selectMonthWinnerMutation = useMutation({
    mutationFn: async ({ month, bookId }) => {
      if (!currentTournament) return;

      const monthlyWinners = { ...currentTournament.monthly_winners, [month]: bookId };
      
      await base44.entities.Tournament.update(currentTournament.id, {
        monthly_winners: monthlyWinners
      });

      // Check if we need to generate rounds
      await generateBracketIfReady(currentTournament.id, monthlyWinners);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament'] });
      toast.success("✨ Gagnant mensuel sélectionné");
    }
  });

  // Helper to generate bracket when all monthly winners are selected
  const generateBracketIfReady = async (tournamentId, monthlyWinners) => {
    const winnerIds = Object.values(monthlyWinners).filter(Boolean);
    
    if (winnerIds.length === 0) return;

    // Determine bracket structure based on number of winners
    let bracketStructure;
    if (winnerIds.length <= 3) {
      // Mini tournament: direct duel then final
      bracketStructure = generateMiniTournament(winnerIds);
    } else if (winnerIds.length <= 7) {
      // Compact: quarters -> semi -> final
      bracketStructure = generateCompactTournament(winnerIds);
    } else {
      // Full: eighths -> quarters -> semi -> final
      bracketStructure = generateFullTournament(monthlyWinners);
    }

    await base44.entities.Tournament.update(tournamentId, {
      bracket: bracketStructure
    });
  };

  // Generate bracket structures
  const generateFullTournament = (monthlyWinners) => {
    const pairs = [
      [0, 1], // Jan-Feb
      [2, 3], // Mar-Apr
      [4, 5], // May-Jun
      [6, 7], // Jul-Aug
      [8, 9], // Sep-Oct
      [10, 11] // Nov-Dec
    ];

    const eighthMatches = pairs.map(([m1, m2]) => ({
      left: monthlyWinners[m1] || null,
      right: monthlyWinners[m2] || null,
      winner: null
    }));

    return {
      rounds: [
        { name: "Huitièmes", matches: eighthMatches },
        { name: "Quarts", matches: [] },
        { name: "Demi-finales", matches: [] },
        { name: "Finale", matches: [] }
      ],
      champion: null
    };
  };

  const generateCompactTournament = (winnerIds) => {
    const quarterMatches = [];
    for (let i = 0; i < winnerIds.length; i += 2) {
      quarterMatches.push({
        left: winnerIds[i],
        right: winnerIds[i + 1] || null,
        winner: null
      });
    }

    return {
      rounds: [
        { name: "Quarts", matches: quarterMatches },
        { name: "Demi-finales", matches: [] },
        { name: "Finale", matches: [] }
      ],
      champion: null
    };
  };

  const generateMiniTournament = (winnerIds) => {
    if (winnerIds.length === 1) {
      return {
        rounds: [{ name: "Finale", matches: [{ left: winnerIds[0], right: null, winner: winnerIds[0] }] }],
        champion: winnerIds[0]
      };
    }

    const matches = [];
    for (let i = 0; i < winnerIds.length; i += 2) {
      matches.push({
        left: winnerIds[i],
        right: winnerIds[i + 1] || null,
        winner: null
      });
    }

    return {
      rounds: [{ name: "Finale", matches }],
      champion: null
    };
  };

  // Select match winner mutation
  const selectMatchWinnerMutation = useMutation({
    mutationFn: async ({ roundIndex, matchIndex, bookId }) => {
      if (!currentTournament || !currentTournament.bracket || !currentTournament.bracket.rounds) return;

      const bracket = { ...currentTournament.bracket };
      
      // Safety check
      if (!bracket.rounds[roundIndex] || !bracket.rounds[roundIndex].matches[matchIndex]) return;
      
      bracket.rounds[roundIndex].matches[matchIndex].winner = bookId;

      // Check if round is complete
      const round = bracket.rounds[roundIndex];
      const allMatchesComplete = round.matches.every(m => m.winner || !m.right);

      if (allMatchesComplete && roundIndex < bracket.rounds.length - 1) {
        // Generate next round
        const winners = round.matches.map(m => m.winner).filter(Boolean);
        const nextRound = bracket.rounds[roundIndex + 1];
        
        nextRound.matches = [];
        for (let i = 0; i < winners.length; i += 2) {
          nextRound.matches.push({
            left: winners[i],
            right: winners[i + 1] || null,
            winner: null
          });
        }
      }

      // Check if tournament is complete (final round winner selected)
      if (roundIndex === bracket.rounds.length - 1 && bracket.rounds[roundIndex].matches[matchIndex].winner) {
        bracket.champion = bookId;
        
        await base44.entities.Tournament.update(currentTournament.id, {
          bracket,
          status: "completed",
          winner_book_id: bookId
        });

        // Success message for completion
        toast.success(mode === "best" ? "🏆 Champion désigné !" : "💀 Pire lecture désignée", {
          duration: 5000,
        });
      } else {
        await base44.entities.Tournament.update(currentTournament.id, {
          bracket
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament'] });
      toast.success("Vote enregistré !");
    },
    onError: (error) => {
      console.error("Error voting:", error);
      toast.error("Erreur lors du vote");
    }
  });

  // Reset tournament
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (currentTournament) {
        await base44.entities.Tournament.delete(currentTournament.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament'] });
      toast.success("Tournoi réinitialisé");
    }
  });

  const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i + 2);
  const isDark = mode === "worst";
  const accentColor = isDark ? '#666' : 'var(--gold)';
  const secondaryColor = isDark ? '#999' : 'var(--deep-pink)';

  // Count eligible books
  const totalEligibleBooks = Object.values(booksByMonth).flat().length;

  // Get safe bracket data
  const bracket = currentTournament?.bracket || { rounds: [], champion: null };
  const rounds = bracket.rounds || [];

  // Render monthly card
  const renderMonthlyCard = (month) => {
    const books = booksByMonth[month] || [];
    const winner = currentTournament?.monthly_winners?.[month];

    if (books.length === 0) {
      return (
        <div className="p-4 rounded-xl border-2 border-dashed opacity-50" style={{ backgroundColor: 'var(--cream)', borderColor: 'var(--beige)' }}>
          <p className="text-xs font-medium text-center" style={{ color: 'var(--warm-pink)' }}>
            Aucune lecture
          </p>
        </div>
      );
    }

    if (books.length === 1 && !winner) {
      // Auto-select
      selectMonthWinnerMutation.mutate({ month, bookId: books[0].book_id });
    }

    return (
      <div className={`p-3 rounded-xl border-2 transition-all ${winner ? 'shadow-lg scale-105' : ''}`} 
           style={{ backgroundColor: 'white', borderColor: winner ? accentColor : 'var(--beige)' }}>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {books.map(userBook => {
            const book = allBooks.find(b => b.id === userBook.book_id);
            if (!book) return null;

            const isWinner = winner === userBook.book_id;

            return (
              <button
                key={userBook.id}
                onClick={() => selectMonthWinnerMutation.mutate({ month, bookId: userBook.book_id })}
                disabled={selectMonthWinnerMutation.isPending}
                className={`w-full flex gap-2 p-2 rounded-lg transition-all hover:shadow-md ${isWinner ? 'bg-gradient-to-r from-yellow-100 to-pink-100' : 'hover:bg-gray-50'}`}
              >
                <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0 shadow-sm" style={{ backgroundColor: 'var(--beige)' }}>
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xl">{mode === "best" ? "📖" : "💀"}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-bold line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                    {book.title}
                  </p>
                  {isWinner && (
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-lg">{mode === "best" ? "✓" : "💀"}</span>
                      <span className="text-xs font-bold" style={{ color: accentColor }}>Sélectionné</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render match card
  const renderMatchCard = (match, roundIndex, matchIndex) => {
    if (!match || (!match.left && !match.right)) return null;

    const leftBook = allBooks.find(b => b.id === match.left);
    const rightBook = allBooks.find(b => b.id === match.right);

    // Auto-bye if one side is empty
    if (match.left && !match.right && !match.winner) {
      selectMatchWinnerMutation.mutate({ roundIndex, matchIndex, bookId: match.left });
    }

    return (
      <div className="p-3 rounded-xl border-2 bg-white space-y-2" style={{ borderColor: match.winner ? accentColor : 'var(--beige)' }}>
        {/* Left book */}
        {leftBook && (
          <button
            onClick={() => selectMatchWinnerMutation.mutate({ roundIndex, matchIndex, bookId: match.left })}
            disabled={selectMatchWinnerMutation.isPending || !!match.winner}
            className={`w-full flex gap-2 p-2 rounded-lg transition-all ${match.winner === match.left ? 'bg-gradient-to-r from-yellow-100 to-pink-100 shadow-md' : 'hover:bg-gray-50'}`}
          >
            <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0 shadow-sm" style={{ backgroundColor: 'var(--beige)' }}>
              {leftBook.cover_url ? (
                <img src={leftBook.cover_url} alt={leftBook.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xl">{mode === "best" ? "📖" : "💀"}</span>
                </div>
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-bold line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                {leftBook.title}
              </p>
              {match.winner === match.left && (
                <span className="text-lg">{mode === "best" ? "✓" : "💀"}</span>
              )}
            </div>
          </button>
        )}

        {/* VS */}
        {rightBook && (
          <>
            <div className="text-center py-1">
              <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--cream)', color: 'var(--warm-pink)' }}>
                VS
              </span>
            </div>

            {/* Right book */}
            <button
              onClick={() => selectMatchWinnerMutation.mutate({ roundIndex, matchIndex, bookId: match.right })}
              disabled={selectMatchWinnerMutation.isPending || !!match.winner}
              className={`w-full flex gap-2 p-2 rounded-lg transition-all ${match.winner === match.right ? 'bg-gradient-to-r from-yellow-100 to-pink-100 shadow-md' : 'hover:bg-gray-50'}`}
            >
              <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0 shadow-sm" style={{ backgroundColor: 'var(--beige)' }}>
                {rightBook.cover_url ? (
                  <img src={rightBook.cover_url} alt={rightBook.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xl">{mode === "best" ? "📖" : "💀"}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-bold line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                  {rightBook.title}
                </p>
                {match.winner === match.right && (
                  <span className="text-lg">{mode === "best" ? "✓" : "💀"}</span>
                )}
              </div>
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: `linear-gradient(135deg, ${accentColor}, ${secondaryColor})` }}>
              {isDark ? <Skull className="w-7 h-7 text-white" /> : <Trophy className="w-7 h-7 text-white" />}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--dark-text)' }}>
                {isDark ? "💀" : "🏆"} Tournoi du Livre {selectedYear}
              </h1>
              <p className="text-sm md:text-base" style={{ color: 'var(--warm-pink)' }}>
                {totalEligibleBooks} livre{totalEligibleBooks > 1 ? 's' : ''} éligible{totalEligibleBooks > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Year Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-2" style={{ borderColor: 'var(--beige)' }}>
                  <Calendar className="w-4 h-4 mr-2" />
                  {selectedYear}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {years.map(year => (
                  <DropdownMenuItem key={year} onClick={() => setSelectedYear(year)}>
                    {year}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mode Toggle */}
            <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm">
              <Button
                onClick={() => setMode("best")}
                variant={mode === "best" ? "default" : "ghost"}
                size="sm"
                className={mode === "best" ? "bg-gradient-to-r from-yellow-400 to-pink-400 text-white" : ""}
              >
                👑 Meilleure
              </Button>
              <Button
                onClick={() => setMode("worst")}
                variant={mode === "worst" ? "default" : "ghost"}
                size="sm"
                className={mode === "worst" ? "bg-gradient-to-r from-gray-500 to-gray-700 text-white" : ""}
              >
                💀 Pire
              </Button>
            </div>

            {currentTournament && (
              <Button
                variant="outline"
                onClick={() => resetMutation.mutate()}
                className="border-2"
                style={{ borderColor: 'var(--beige)' }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Recommencer
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        {!currentTournament ? (
          totalEligibleBooks === 0 ? (
            <div className="text-center py-20">
              {isDark ? <Skull className="w-20 h-20 mx-auto mb-6 opacity-20" /> : <Trophy className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: accentColor }} />}
              <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                Aucune lecture éligible en {selectedYear}
              </h3>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                Ajoutez des livres terminés pour lancer le tournoi
              </p>
            </div>
          ) : (
            <div className="text-center py-20">
              {isDark ? <Skull className="w-20 h-20 mx-auto mb-6 opacity-20" /> : <Trophy className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: accentColor }} />}
              <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                Lancez le tournoi {selectedYear} !
              </h3>
              <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
                {totalEligibleBooks} livre{totalEligibleBooks > 1 ? 's' : ''} prêt{totalEligibleBooks > 1 ? 's' : ''} à s'affronter
              </p>
              <Button
                onClick={() => initTournamentMutation.mutate()}
                disabled={initTournamentMutation.isPending}
                className="text-white font-bold px-8 py-6 text-lg shadow-xl"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${secondaryColor})` }}
              >
                Démarrer le tournoi
              </Button>
            </div>
          )
        ) : currentTournament.status === "completed" ? (
          /* Winner Display */
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-2xl border-0 overflow-hidden">
              <div className="h-3" style={{ background: `linear-gradient(90deg, ${accentColor}, ${secondaryColor})` }} />
              <CardContent className="p-8 text-center">
                <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                  {isDark ? "💀 Pire lecture" : "🏆 Meilleure lecture"} de {selectedYear}
                </h2>
                {(() => {
                  const book = allBooks.find(b => b.id === bracket.champion);
                  if (!book) return null;
                  return (
                    <div className="flex flex-col items-center gap-4">
                      {book.cover_url && (
                        <img 
                          src={book.cover_url} 
                          alt={book.title} 
                          className={`w-48 h-72 object-cover rounded-xl shadow-lg ${isDark ? 'grayscale' : ''}`} 
                        />
                      )}
                      <div>
                        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                          {book.title}
                        </h3>
                        <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                          {book.author}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Bracket View */
          <div>
            {/* Mobile: Column Navigation */}
            <div className="md:hidden mb-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentColumn(Math.max(0, currentColumn - 1))}
                disabled={currentColumn === 0}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                {currentColumn === 0 ? "Mois" : rounds[currentColumn - 1]?.name || ""}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentColumn(Math.min(rounds.length, currentColumn + 1))}
                disabled={currentColumn >= rounds.length}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Desktop: Full Bracket */}
            <div className="hidden md:flex gap-6 overflow-x-auto pb-4">
              {/* Monthly Column */}
              <div className="flex-shrink-0 w-64 space-y-3">
                <h3 className="text-lg font-bold text-center mb-4 px-3 py-2 rounded-lg" 
                    style={{ backgroundColor: 'var(--cream)', color: 'var(--dark-text)' }}>
                  📅 Mois
                </h3>
                {MONTH_NAMES.map((name, idx) => (
                  <div key={idx}>
                    <h4 className="text-sm font-bold mb-2 px-2" style={{ color: 'var(--warm-pink)' }}>
                      {name}
                    </h4>
                    {renderMonthlyCard(idx)}
                  </div>
                ))}
              </div>

              {/* Bracket Rounds */}
              {rounds.map((round, roundIdx) => (
                <div key={roundIdx} className="flex-shrink-0 w-64 space-y-4">
                  <h3 className="text-lg font-bold text-center mb-4 px-3 py-2 rounded-lg" 
                      style={{ 
                        backgroundColor: roundIdx === rounds.length - 1 ? 'var(--gold)' : 'var(--cream)', 
                        color: roundIdx === rounds.length - 1 ? 'white' : 'var(--dark-text)' 
                      }}>
                    {round.name}
                  </h3>
                  {(round.matches || []).map((match, matchIdx) => (
                    <div key={matchIdx}>
                      {renderMatchCard(match, roundIdx, matchIdx)}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Mobile: Single Column View */}
            <div className="md:hidden">
              {currentColumn === 0 ? (
                /* Monthly View */
                <div className="space-y-3">
                  {MONTH_NAMES.map((name, idx) => (
                    <div key={idx}>
                      <h4 className="text-sm font-bold mb-2 px-2" style={{ color: 'var(--warm-pink)' }}>
                        {name}
                      </h4>
                      {renderMonthlyCard(idx)}
                    </div>
                  ))}
                </div>
              ) : (
                /* Round View */
                <div className="space-y-4">
                  {(rounds[currentColumn - 1]?.matches || []).map((match, matchIdx) => (
                    <div key={matchIdx}>
                      {renderMatchCard(match, currentColumn - 1, matchIdx)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
