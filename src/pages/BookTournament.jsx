
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, History, Sparkles, Skull, ChevronDown, Play, RotateCcw, Zap } from "lucide-react";
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

const ROUND_NAMES = {
  round_of_16: "Huitièmes de finale",
  quarter: "Quarts de finale",
  semi: "Demi-finales",
  final: "Finale"
};

const ROUND_ORDER = ["round_of_16", "quarter", "semi", "final"];

// Badges selon le nombre de lectures
const READING_BADGES = {
  1: { emoji: "🌱", title: "Explorateur naissant", message: "Chaque page est un nouveau départ." },
  2: { emoji: "🌱", title: "Explorateur naissant", message: "Chaque page est un nouveau départ." },
  3: { emoji: "🌱", title: "Explorateur naissant", message: "Chaque page est un nouveau départ." },
  4: { emoji: "📘", title: "Lecteur tranquille", message: "Tu avances à ton rythme, et c'est beau." },
  5: { emoji: "📘", title: "Lecteur tranquille", message: "Tu avances à ton rythme, et c'est beau." },
  6: { emoji: "📘", title: "Lecteur tranquille", message: "Tu avances à ton rythme, et c'est beau." },
  7: { emoji: "📘", title: "Lecteur tranquille", message: "Tu avances à ton rythme, et c'est beau." },
  8: { emoji: "📚", title: "Aventurier des mots", message: "Tu dévores les mondes littéraires." },
};

const getReadingBadge = (count) => {
  if (count >= 16) return { emoji: "🏆", title: "Grand lecteur", message: "Rien ne t'arrête, champion de l'imaginaire." };
  if (count >= 8) return READING_BADGES[8];
  return READING_BADGES[count] || READING_BADGES[1];
};

// Calculer la structure du tournoi selon le nombre de livres
const getTournamentStructure = (bookCount) => {
  if (bookCount === 0) return { type: "none", rounds: [], size: 0, message: "Aucun livre éligible" };
  if (bookCount === 1) return { type: "auto", rounds: ["final"], size: 1, message: "Lecture unique — auto-vainqueur 🎉" };
  if (bookCount <= 3) return { type: "duel", rounds: ["final"], size: 2, message: "Duel de l'année 💫" };
  if (bookCount <= 7) return { type: "mini", rounds: ["quarter", "semi", "final"], size: 4, message: "Mini tournoi ✨" };
  if (bookCount <= 15) return { type: "standard", rounds: ["round_of_16", "quarter", "semi", "final"], size: 8, message: "Tournoi standard 🎯" };
  return { type: "full", rounds: ["round_of_16", "quarter", "semi", "final"], size: 16, message: "Tournoi complet 🏆" };
};

export default function BookTournament() {
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [tournamentType, setTournamentType] = useState("best");
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
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

  const { data: currentTournament } = useQuery({
    queryKey: ['tournament', selectedYear, tournamentType],
    queryFn: async () => {
      const tournaments = await base44.entities.Tournament.filter({
        created_by: user?.email,
        year: selectedYear,
        type: tournamentType
      });
      return tournaments[0] || null;
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refresh every 5 seconds during tournament
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['tournamentMatches', currentTournament?.id],
    queryFn: () => base44.entities.TournamentMatch.filter({
      tournament_id: currentTournament.id,
      created_by: user?.email
    }),
    enabled: !!currentTournament,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: allTournaments = [] } = useQuery({
    queryKey: ['allTournaments'],
    queryFn: () => base44.entities.Tournament.filter({
      created_by: user?.email,
      status: "completed"
    }),
    enabled: !!user && showHistoryDialog,
  });

  // Helper to check if DNF book counts
  const abandonedBookCounts = (userBook) => {
    if (userBook.status !== "Abandonné") return false;
    if (userBook.abandon_percentage >= 50) return true;
    if (userBook.abandon_page) {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (book && book.page_count && userBook.abandon_page >= book.page_count / 2) {
        return true;
      }
    }
    return false;
  };

  // Get eligible books for the year
  const eligibleBooks = useMemo(() => {
    return myBooks.filter(userBook => {
      if (!userBook.end_date) return false;
      const endYear = new Date(userBook.end_date).getFullYear();
      if (endYear !== selectedYear) return false;
      
      if (userBook.status === "Lu") return true;
      if (userBook.status === "Abandonné" && abandonedBookCounts(userBook)) return true;
      
      return false;
    });
  }, [myBooks, selectedYear, allBooks]);

  const tournamentStructure = getTournamentStructure(eligibleBooks.length);

  // Create tournament mutation
  const createTournamentMutation = useMutation({
    mutationFn: async () => {
      // Shuffle books randomly
      const shuffled = [...eligibleBooks].sort(() => Math.random() - 0.5);
      const participants = shuffled.slice(0, tournamentStructure.size);
      
      // Pour 1 livre : créer directement le tournoi complété
      if (tournamentStructure.type === "auto") {
        const tournament = await base44.entities.Tournament.create({
          year: selectedYear,
          type: tournamentType,
          status: "completed",
          current_round: "final",
          winner_book_id: participants[0].book_id,
          participant_books: [participants[0].book_id]
        });
        return tournament;
      }

      // Create tournament
      const firstRound = tournamentStructure.rounds[0];
      const tournament = await base44.entities.Tournament.create({
        year: selectedYear,
        type: tournamentType,
        status: "in_progress",
        current_round: firstRound,
        participant_books: participants.map(b => b.book_id)
      });

      // Create matches for first round
      const matchPromises = [];
      const matchCount = participants.length / 2;
      for (let i = 0; i < matchCount; i++) {
        matchPromises.push(
          base44.entities.TournamentMatch.create({
            tournament_id: tournament.id,
            round: firstRound,
            position: i,
            book_1_id: participants[i * 2]?.book_id,
            book_2_id: participants[i * 2 + 1]?.book_id
          })
        );
      }
      await Promise.all(matchPromises);
      
      return tournament;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament'] });
      queryClient.invalidateQueries({ queryKey: ['tournamentMatches'] });
    }
  });

  // Auto tournament mutation (random winner based on ratings)
  const autoTournamentMutation = useMutation({
    mutationFn: async () => {
      const shuffled = [...eligibleBooks].sort(() => Math.random() - 0.5);
      
      // Pondération par note si disponible
      const weighted = shuffled.map(ub => {
        const userBook = myBooks.find(mb => mb.book_id === ub.book_id);
        const weight = userBook?.rating || 3; // Note par défaut = 3
        return { ...ub, weight };
      });
      
      // Sélection pondérée
      const totalWeight = weighted.reduce((sum, b) => sum + b.weight, 0);
      let random = Math.random() * totalWeight;
      let winner = weighted[0];
      
      for (const book of weighted) {
        random -= book.weight;
        if (random <= 0) {
          winner = book;
          break;
        }
      }
      
      const tournament = await base44.entities.Tournament.create({
        year: selectedYear,
        type: tournamentType,
        status: "completed",
        current_round: "final",
        winner_book_id: winner.book_id,
        participant_books: shuffled.slice(0, tournamentStructure.size).map(b => b.book_id)
      });
      
      return tournament;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament'] });
    }
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ matchId, winnerBookId }) => {
      await base44.entities.TournamentMatch.update(matchId, {
        winner_book_id: winnerBookId
      });

      // Check if round is complete
      const currentRound = selectedMatch.round;
      const roundMatches = matches.filter(m => m.round === currentRound);
      const allVoted = roundMatches.every(m => m.winner_book_id || m.id === matchId);

      if (allVoted) {
        // Move to next round
        const currentRoundIndex = tournamentStructure.rounds.indexOf(currentRound);
        const nextRound = tournamentStructure.rounds[currentRoundIndex + 1];

        if (nextRound) {
          // Create next round matches
          const winners = [];
          for (const match of roundMatches) {
            const winnerId = match.id === matchId ? winnerBookId : match.winner_book_id;
            winners.push(winnerId);
          }

          const nextMatchPromises = [];
          for (let i = 0; i < winners.length / 2; i++) {
            nextMatchPromises.push(
              base44.entities.TournamentMatch.create({
                tournament_id: currentTournament.id,
                round: nextRound,
                position: i,
                book_1_id: winners[i * 2],
                book_2_id: winners[i * 2 + 1]
              })
            );
          }
          await Promise.all(nextMatchPromises);

          // Update tournament
          await base44.entities.Tournament.update(currentTournament.id, {
            current_round: nextRound
          });
        } else {
          // Tournament complete!
          await base44.entities.Tournament.update(currentTournament.id, {
            status: "completed",
            winner_book_id: winnerBookId
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament'] });
      queryClient.invalidateQueries({ queryKey: ['tournamentMatches'] });
      setSelectedMatch(null);
    }
  });

  // Reset tournament
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (currentTournament) {
        await base44.entities.Tournament.delete(currentTournament.id);
        const deletePromises = matches.map(m => base44.entities.TournamentMatch.delete(m.id));
        await Promise.all(deletePromises);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament'] });
      queryClient.invalidateQueries({ queryKey: ['tournamentMatches'] });
    }
  });

  const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i + 2);

  const isDark = tournamentType === "worst";
  const accentColor = isDark ? '#666' : 'var(--gold)';
  const secondaryColor = isDark ? '#999' : 'var(--deep-pink)';
  const badge = getReadingBadge(eligibleBooks.length);

  // Get current match to vote on
  const nextMatchToVote = useMemo(() => {
    if (!currentTournament || currentTournament.status === "completed") return null;
    return matches.find(m => 
      m.round === currentTournament.current_round && 
      !m.winner_book_id
    );
  }, [matches, currentTournament]);

  // Calculate progress
  const totalMatches = matches.length;
  const votedMatches = matches.filter(m => m.winner_book_id).length;
  const progressPercent = totalMatches > 0 ? (votedMatches / totalMatches) * 100 : 0;

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: `linear-gradient(135deg, ${accentColor}, ${secondaryColor})` }}>
              {isDark ? <Skull className="w-7 h-7 text-white" /> : <Trophy className="w-7 h-7 text-white" />}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                {isDark ? "💀" : "🏆"} Tournoi du Livre {selectedYear}
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                {isDark ? "Pire lecture" : "Meilleure lecture"} • {eligibleBooks.length} livre{eligibleBooks.length > 1 ? 's' : ''} éligible{eligibleBooks.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            {/* Year Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="px-6 py-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all border-2"
                  style={{
                    backgroundColor: 'white',
                    borderColor: secondaryColor,
                    color: '#000000'
                  }}
                >
                  <Calendar className="w-5 h-5 mr-2" style={{ color: secondaryColor }} />
                  📅 {selectedYear}
                  <ChevronDown className="w-5 h-5 ml-2" style={{ color: secondaryColor }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-64 overflow-y-auto">
                {years.map((year) => (
                  <DropdownMenuItem
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`cursor-pointer font-medium ${
                      selectedYear === year ? 'bg-pink-100 font-bold' : ''
                    }`}
                    style={{
                      color: selectedYear === year ? secondaryColor : '#000000'
                    }}
                  >
                    {selectedYear === year && '✓ '}{year}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tournament Type Toggle */}
            <div className="flex gap-2 bg-white rounded-xl p-1 shadow-lg">
              <Button
                onClick={() => setTournamentType("best")}
                variant={tournamentType === "best" ? "default" : "ghost"}
                className="rounded-lg font-bold"
                style={tournamentType === "best" ? {
                  background: 'linear-gradient(135deg, var(--gold), var(--deep-pink))',
                  color: 'white'
                } : {}}
              >
                👑 Meilleure
              </Button>
              <Button
                onClick={() => setTournamentType("worst")}
                variant={tournamentType === "worst" ? "default" : "ghost"}
                className="rounded-lg font-bold"
                style={tournamentType === "worst" ? {
                  background: 'linear-gradient(135deg, #666, #999)',
                  color: 'white'
                } : {}}
              >
                💀 Pire
              </Button>
            </div>

            {/* History Button */}
            <Button
              variant="outline"
              onClick={() => setShowHistoryDialog(true)}
              className="px-6 py-6 rounded-xl font-bold shadow-lg"
              style={{
                borderColor: 'var(--beige)',
                color: secondaryColor
              }}
            >
              <History className="w-5 h-5 mr-2" />
              Historique
            </Button>

            {currentTournament && (
              <Button
                variant="outline"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="px-6 py-6 rounded-xl font-bold shadow-lg"
                style={{
                  borderColor: 'var(--beige)',
                  color: '#ff1744'
                }}
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Recommencer
              </Button>
            )}
          </div>
        </div>

        {/* Badge de lecteur */}
        {!currentTournament && eligibleBooks.length > 0 && (
          <div className="mb-6 p-6 rounded-2xl text-center shadow-lg"
               style={{ background: 'linear-gradient(135deg, var(--cream), white)' }}>
            <div className="text-5xl mb-2">{badge.emoji}</div>
            <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
              {badge.title}
            </h3>
            <p className="text-sm italic" style={{ color: 'var(--warm-pink)' }}>
              {badge.message}
            </p>
          </div>
        )}

        {/* Progress Bar */}
        {currentTournament && currentTournament.status !== "completed" && matches.length > 0 && (
          <div className="mb-8 p-6 rounded-xl shadow-md" style={{ backgroundColor: 'white' }}>
            <div className="flex justify-between items-center mb-3">
              <p className="font-bold" style={{ color: 'var(--dark-text)' }}>
                Tour actuel : {ROUND_NAMES[currentTournament.current_round]}
              </p>
              <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                {votedMatches}/{totalMatches} matchs complétés
              </p>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--beige)' }}>
              <div 
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${progressPercent}%`,
                  background: `linear-gradient(90deg, ${accentColor}, ${secondaryColor})`
                }}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        {!currentTournament || currentTournament.status === "completed" ? (
          currentTournament?.status === "completed" ? (
            /* Winner Display */
            <Card className="shadow-xl border-0 overflow-hidden max-w-2xl mx-auto">
              <div className="h-3" style={{ background: `linear-gradient(90deg, ${accentColor}, ${secondaryColor})` }} />
              <CardContent className="p-8 text-center">
                {isDark ? (
                  <Skull className="w-20 h-20 mx-auto mb-4" style={{ color: accentColor }} />
                ) : (
                  <Sparkles className="w-20 h-20 mx-auto mb-4" style={{ color: accentColor }} />
                )}
                
                {/* Badge final */}
                <div className="text-5xl mb-3">{badge.emoji}</div>
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--warm-pink)' }}>
                  {badge.title} • {eligibleBooks.length} lecture{eligibleBooks.length > 1 ? 's' : ''} cette année
                </h3>
                
                <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                  {isDark ? "💀 Pire lecture" : "🏆 Meilleure lecture"} de {selectedYear}
                </h2>
                {(() => {
                  const book = allBooks.find(b => b.id === currentTournament.winner_book_id);
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
                        <p className="text-lg mb-4" style={{ color: 'var(--warm-pink)' }}>
                          {book.author}
                        </p>
                        <p className="text-sm italic" style={{ color: '#666' }}>
                          {tournamentStructure.type === "auto" 
                            ? "Auto-désigné comme lecture unique 🎯" 
                            : `Vainqueur du ${tournamentStructure.message.toLowerCase()}`}
                        </p>
                      </div>
                    </div>
                  );
                })()}
                <Button
                  onClick={() => resetMutation.mutate()}
                  className="mt-6"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, ${secondaryColor})`, color: 'white' }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Recommencer
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Setup Screen */
            <div className="text-center py-20">
              {isDark ? (
                <Skull className="w-24 h-24 mx-auto mb-6 opacity-20" style={{ color: accentColor }} />
              ) : (
                <Trophy className="w-24 h-24 mx-auto mb-6 opacity-20" style={{ color: accentColor }} />
              )}
              <h3 className="text-3xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                Lancez le tournoi {selectedYear} !
              </h3>
              <p className="text-xl mb-2" style={{ color: 'var(--warm-pink)' }}>
                {eligibleBooks.length} livre{eligibleBooks.length > 1 ? 's' : ''} éligible{eligibleBooks.length > 1 ? 's' : ''}
              </p>
              <p className="text-sm mb-2" style={{ color: '#999' }}>
                {tournamentStructure.message}
              </p>
              <p className="text-xs mb-8 italic" style={{ color: 'var(--warm-pink)' }}>
                {eligibleBooks.length === 1 
                  ? "Même une seule histoire, c'est déjà une victoire 💖" 
                  : eligibleBooks.length <= 3
                  ? "Ton univers de l'année est plus petit, mais tout aussi magique 🌙"
                  : "Que le meilleur livre gagne ! ✨"}
              </p>
              {eligibleBooks.length >= 1 ? (
                <div className="flex gap-4 justify-center flex-wrap">
                  <Button 
                    onClick={() => createTournamentMutation.mutate()}
                    disabled={createTournamentMutation.isPending}
                    className="shadow-xl text-white font-bold px-10 py-8 text-xl rounded-2xl"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${secondaryColor})` }}
                  >
                    <Play className="w-7 h-7 mr-3" />
                    {tournamentStructure.type === "auto" ? "Désigner le gagnant" : "Commencer le tournoi"}
                  </Button>
                  
                  {eligibleBooks.length > 1 && eligibleBooks.length <= 10 && (
                    <Button 
                      onClick={() => autoTournamentMutation.mutate()}
                      disabled={autoTournamentMutation.isPending}
                      variant="outline"
                      className="shadow-xl font-bold px-10 py-8 text-xl rounded-2xl"
                      style={{ borderColor: accentColor, color: accentColor }}
                    >
                      <Zap className="w-7 h-7 mr-3" />
                      Auto-tournoi
                    </Button>
                  )}
                </div>
              ) : (
                <div className="max-w-md mx-auto p-6 rounded-xl" style={{ backgroundColor: 'var(--beige)' }}>
                  <p className="text-sm" style={{ color: 'var(--dark-text)' }}>
                    Vous n'avez pas encore terminé de livre cette année.
                    <br />
                    Revenez quand vous aurez lu au moins un livre !
                  </p>
                </div>
              )}
            </div>
          )
        ) : nextMatchToVote ? (
          /* Voting Screen */
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-2xl border-0 overflow-hidden">
              <div className="h-3" style={{ background: `linear-gradient(90deg, ${accentColor}, ${secondaryColor})` }} />
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-center mb-8" style={{ color: 'var(--dark-text)' }}>
                  {ROUND_NAMES[nextMatchToVote.round]}
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {[nextMatchToVote.book_1_id, nextMatchToVote.book_2_id].map((bookId) => {
                    const userBook = myBooks.find(ub => ub.book_id === bookId);
                    const book = allBooks.find(b => b.id === bookId);
                    if (!book) return null;

                    return (
                      <button
                        key={bookId}
                        onClick={() => voteMutation.mutate({ matchId: nextMatchToVote.id, winnerBookId: bookId })}
                        disabled={voteMutation.isPending}
                        className="group p-6 rounded-2xl shadow-lg transition-all hover:shadow-2xl hover:-translate-y-2"
                        style={{
                          backgroundColor: 'white',
                          border: `3px solid ${isDark ? '#ccc' : 'var(--beige)'}`,
                          opacity: voteMutation.isPending ? 0.5 : 1
                        }}
                      >
                        <div className={`aspect-[2/3] rounded-xl overflow-hidden shadow-lg mb-4 ${isDark ? 'grayscale group-hover:grayscale-0' : ''}`}
                             style={{ backgroundColor: 'var(--beige)' }}>
                          {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {isDark ? (
                                <Skull className="w-16 h-16" style={{ color: 'var(--warm-pink)' }} />
                              ) : (
                                <Trophy className="w-16 h-16" style={{ color: 'var(--warm-pink)' }} />
                              )}
                            </div>
                          )}
                        </div>
                        
                        <h3 className="font-bold text-xl mb-2 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                          {book.title}
                        </h3>
                        <p className="text-sm mb-3" style={{ color: 'var(--warm-pink)' }}>
                          {book.author}
                        </p>
                        
                        {userBook?.rating && (
                          <div className="flex items-center justify-center gap-1 mb-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className={i < userBook.rating ? 'text-yellow-500' : 'text-gray-300'}>
                                ⭐
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 px-4 py-3 rounded-xl font-bold text-white"
                             style={{ background: `linear-gradient(135deg, ${accentColor}, ${secondaryColor})` }}>
                          Voter pour ce livre
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Waiting for next round */
          <div className="text-center py-20">
            <Trophy className="w-20 h-20 mx-auto mb-6 opacity-20 animate-pulse" style={{ color: accentColor }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              Préparation du tour suivant...
            </h3>
          </div>
        )}

        {/* History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                <History className="w-6 h-6" />
                Historique des Tournois
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {allTournaments.length === 0 ? (
                <p className="text-center py-8" style={{ color: 'var(--warm-pink)' }}>
                  Aucun tournoi terminé
                </p>
              ) : (
                allTournaments
                  .sort((a, b) => b.year - a.year)
                  .map((tournament) => {
                    const book = allBooks.find(b => b.id === tournament.winner_book_id);
                    const isBest = tournament.type === "best";
                    
                    return (
                      <Card key={tournament.id} className="shadow-lg border-0">
                        <div className="h-2" style={{ 
                          background: isBest 
                            ? 'linear-gradient(90deg, var(--gold), var(--deep-pink))' 
                            : 'linear-gradient(90deg, #666, #999)' 
                        }} />
                        <CardContent className="p-6">
                          <div className="flex gap-4">
                            <div className="w-24 h-36 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                                 style={{ backgroundColor: 'var(--beige)' }}>
                              {book?.cover_url ? (
                                <img 
                                  src={book.cover_url} 
                                  alt={book.title} 
                                  className={`w-full h-full object-cover ${!isBest ? 'grayscale' : ''}`} 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  {isBest ? <Trophy className="w-8 h-8" /> : <Skull className="w-8 h-8" />}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {isBest ? (
                                  <Trophy className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                                ) : (
                                  <Skull className="w-5 h-5 text-gray-600" />
                                )}
                                <h3 className="text-lg font-bold" style={{ color: 'var(--dark-text)' }}>
                                  {isBest ? "Meilleure" : "Pire"} lecture {tournament.year}
                                </h3>
                              </div>
                              {book && (
                                <>
                                  <p className="font-bold text-lg mb-1" style={{ color: 'var(--dark-text)' }}>
                                    {book.title}
                                  </p>
                                  <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                                    {book.author}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
