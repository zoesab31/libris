
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Star, Crown, Calendar, ThumbsDown, BookOpen, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [tournamentType, setTournamentType] = useState("best"); // "best" or "worst"
  const [showWorstDialog, setShowWorstDialog] = useState(false);
  const [worstBookId, setWorstBookId] = useState("");
  const [worstReason, setWorstReason] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: monthlyVotes = [] } = useQuery({
    queryKey: ['monthlyVotes', selectedYear],
    queryFn: () => base44.entities.MonthlyBookVote.filter({
      created_by: user?.email,
      year: selectedYear
    }, 'month'),
    enabled: !!user,
  });

  const { data: monthlyWorstVotes = [] } = useQuery({
    queryKey: ['monthlyWorstVotes', selectedYear],
    queryFn: async () => {
      const allVotes = await base44.entities.BookOfTheYear.filter({
        created_by: user?.email,
        year: selectedYear,
        is_worst: true
      });
      // Filter for monthly worst votes (those with month property)
      return allVotes.filter(v => v.month !== undefined);
    },
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

  const { data: worstBook } = useQuery({
    queryKey: ['worstBook', selectedYear],
    queryFn: async () => {
      const result = await base44.entities.BookOfTheYear.filter({
        created_by: user?.email,
        year: selectedYear,
        is_worst: true,
        month: null // Filter for the yearly worst, not monthly
      });
      return result[0] || null;
    },
    enabled: !!user,
  });

  const saveWorstBookMutation = useMutation({
    mutationFn: async () => {
      if (worstBook) {
        await base44.entities.BookOfTheYear.update(worstBook.id, {
          book_id: worstBookId || null,
          reason: worstReason,
          month: null, // Ensure it remains a yearly selection
        });
      } else {
        await base44.entities.BookOfTheYear.create({
          year: selectedYear, // Use selectedYear here
          book_id: worstBookId || null,
          reason: worstReason,
          is_worst: true,
          month: null, // Ensure it's created as a yearly selection
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worstBook'] });
      setShowWorstDialog(false);
      toast.success("Pire lecture enregistrée !");
    },
  });

  const deleteVoteMutation = useMutation({
    mutationFn: (voteId) => base44.entities.MonthlyBookVote.delete(voteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyVotes'] });
      toast.success("Vote modifié ou supprimé !");
    },
  });

  const deleteWorstVoteMutation = useMutation({
    mutationFn: (voteId) => base44.entities.BookOfTheYear.delete(voteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyWorstVotes'] });
      toast.success("Vote modifié ou supprimé !");
    },
  });

  // Get books read each month
  const booksReadByMonth = useMemo(() => {
    const result = {};
    for (let i = 1; i <= 12; i++) {
      result[i] = myBooks.filter(ub => {
        if (!ub.end_date) return false;
        const endDate = new Date(ub.end_date);
        return endDate.getFullYear() === selectedYear && endDate.getMonth() + 1 === i;
      }).map(ub => allBooks.find(b => b.id === ub.book_id)).filter(Boolean);
    }
    return result;
  }, [myBooks, allBooks, selectedYear]);

  // Get all read books for worst selection
  const allReadBooksThisYear = useMemo(() => {
    return myBooks.filter(ub => {
      if (!ub.end_date) return false;
      const endYear = new Date(ub.end_date).getFullYear();
      return endYear === selectedYear;
    }).map(ub => allBooks.find(b => b.id === ub.book_id)).filter(Boolean);
  }, [myBooks, allBooks, selectedYear]);

  const canStartTournament = monthlyVotes.length >= 4;
  const canStartWorstTournament = monthlyWorstVotes.length >= 4;

  const openWorstDialog = () => {
    setWorstBookId(worstBook?.book_id || "");
    setWorstReason(worstBook?.reason || "");
    setShowWorstDialog(true);
  };

  const selectedWorstBook = worstBookId ? allBooks.find(b => b.id === worstBookId) : null;

  // Generate available years (from 2020 to current year)
  const availableYears = Array.from(
    { length: currentYear - 2020 + 1 }, // +1 to include currentYear
    (_, i) => 2020 + i
  ).reverse(); // To show current year first

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
              Élisez vos meilleures et pires lectures de {selectedYear}
            </p>
          </div>
        </div>

        {/* Year Selector */}
        <div className="flex items-center justify-center gap-4 mb-8 p-4 rounded-xl shadow-md"
             style={{ backgroundColor: 'white' }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedYear(selectedYear - 1)}
            disabled={selectedYear <= Math.min(...availableYears)} // Disable if already at the earliest year
            style={{ color: 'var(--deep-pink)' }}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="flex gap-2 overflow-x-auto">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
                  selectedYear === year ? 'shadow-lg scale-105' : 'hover:scale-105'
                }`}
                style={{
                  backgroundColor: selectedYear === year ? 'var(--soft-pink)' : 'var(--cream)',
                  color: selectedYear === year ? 'white' : 'var(--dark-text)',
                  border: '2px solid',
                  borderColor: selectedYear === year ? 'var(--deep-pink)' : 'var(--beige)'
                }}
              >
                {year}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedYear(selectedYear + 1)}
            disabled={selectedYear >= currentYear}
            style={{ color: 'var(--deep-pink)' }}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="monthly">Votes mensuels</TabsTrigger>
            <TabsTrigger value="tournament">Tournois</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly">
            <Tabs value={tournamentType} onValueChange={setTournamentType}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="best">👑 Meilleure lecture</TabsTrigger>
                <TabsTrigger value="worst">👎 Pire lecture</TabsTrigger>
              </TabsList>

              <TabsContent value="best">
                <div>
                  <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                    📅 Meilleurs livres par mois ({monthlyVotes.length}/12)
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {MONTHS.map((monthName, idx) => {
                      const monthNum = idx + 1;
                      const vote = monthlyVotes.find(v => v.month === monthNum);
                      const book = vote ? allBooks.find(b => b.id === vote.book_id) : null;
                      // Can vote if it's the selected year and the month is not in the future relative to the *current* date
                      const canVote = selectedYear < currentYear || (selectedYear === currentYear && monthNum <= currentMonth);
                      const hasBooks = booksReadByMonth[monthNum]?.length > 0;

                      return (
                        <Card
                          key={monthNum}
                          className="shadow-md border-0 overflow-hidden transition-all hover:shadow-lg"
                          style={{ backgroundColor: 'white' }}
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
                                <div className="w-full h-32 rounded-lg overflow-hidden mb-2 shadow-sm cursor-pointer"
                                     style={{ backgroundColor: 'var(--beige)' }}
                                     onClick={() => setSelectedMonth(monthNum)}>
                                  {book.cover_url && (
                                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                  )}
                                </div>
                                <p className="text-xs font-medium line-clamp-2 mb-2" style={{ color: 'var(--dark-text)' }}>
                                  {book.title}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteVoteMutation.mutate(vote.id)}
                                  className="w-full text-xs"
                                  style={{ color: 'var(--warm-pink)' }}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Modifier
                                </Button>
                              </div>
                            ) : canVote && hasBooks ? (
                              <div onClick={() => setSelectedMonth(monthNum)} className="cursor-pointer">
                                <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                                  {booksReadByMonth[monthNum].length} livre{booksReadByMonth[monthNum].length > 1 ? 's' : ''} lu{booksReadByMonth[monthNum].length > 1 ? 's' : ''}
                                  <br />
                                  <span className="font-semibold">Cliquez pour voter</span>
                                </p>
                              </div>
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
              </TabsContent>

              <TabsContent value="worst">
                <div>
                  <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                    📅 Pires livres par mois ({monthlyWorstVotes.length}/12)
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {MONTHS.map((monthName, idx) => {
                      const monthNum = idx + 1;
                      const vote = monthlyWorstVotes.find(v => v.month === monthNum);
                      const book = vote?.book_id ? allBooks.find(b => b.id === vote.book_id) : null;
                      // Can vote if it's the selected year and the month is not in the future relative to the *current* date
                      const canVote = selectedYear < currentYear || (selectedYear === currentYear && monthNum <= currentMonth);
                      const hasBooks = booksReadByMonth[monthNum]?.length > 0;

                      return (
                        <Card
                          key={monthNum}
                          className="shadow-md border-0 overflow-hidden transition-all hover:shadow-lg"
                          style={{ backgroundColor: 'white' }}
                        >
                          <div className="h-2" style={{
                            backgroundColor: vote ? '#EF4444' : canVote && hasBooks ? 'var(--soft-pink)' : 'var(--beige)'
                          }} />
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold" style={{ color: 'var(--dark-text)' }}>
                                {monthName}
                              </h3>
                              {vote ? (
                                <ThumbsDown className="w-5 h-5 text-red-500" />
                              ) : (
                                <Calendar className="w-5 h-5" style={{ color: 'var(--warm-pink)' }} />
                              )}
                            </div>

                            {vote ? (
                              <div>
                                {vote.book_id && book ? (
                                  <>
                                    <div className="w-full h-32 rounded-lg overflow-hidden mb-2 shadow-sm cursor-pointer"
                                         style={{ backgroundColor: 'var(--beige)' }}
                                         onClick={() => setSelectedMonth(monthNum)}>
                                      {book.cover_url && (
                                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                      )}
                                    </div>
                                    <p className="text-xs font-medium line-clamp-2 mb-2" style={{ color: 'var(--dark-text)' }}>
                                      {book.title}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-sm mb-2 cursor-pointer" style={{ color: 'var(--warm-pink)' }} onClick={() => setSelectedMonth(monthNum)}>
                                    Aucun livre sélectionné
                                  </p>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteWorstVoteMutation.mutate(vote.id)}
                                  className="w-full text-xs"
                                  style={{ color: 'var(--warm-pink)' }}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Modifier
                                </Button>
                              </div>
                            ) : canVote && hasBooks ? (
                              <div onClick={() => setSelectedMonth(monthNum)} className="cursor-pointer">
                                <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                                  {booksReadByMonth[monthNum].length} livre{booksReadByMonth[monthNum].length > 1 ? 's' : ''} lu{booksReadByMonth[monthNum].length > 1 ? 's' : ''}
                                  <br />
                                  <span className="font-semibold">Cliquez pour voter</span>
                                </p>
                              </div>
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
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="tournament">
            <Tabs value={tournamentType} onValueChange={setTournamentType}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="best">👑 Meilleur livre</TabsTrigger>
                <TabsTrigger value="worst">👎 Pire livre</TabsTrigger>
              </TabsList>

              <TabsContent value="best">
                {canStartTournament ? (
                  <TournamentBracket
                    monthlyVotes={monthlyVotes}
                    allBooks={allBooks}
                    year={selectedYear} // Use selectedYear
                    isWorst={false}
                  />
                ) : (
                  <div className="text-center py-20 rounded-2xl" style={{ backgroundColor: 'white' }}>
                    <Trophy className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--gold)' }} />
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
              </TabsContent>

              <TabsContent value="worst">
                {canStartWorstTournament ? (
                  <TournamentBracket
                    monthlyVotes={monthlyWorstVotes}
                    allBooks={allBooks}
                    year={selectedYear} // Use selectedYear
                    isWorst={true}
                  />
                ) : (
                  <div className="text-center py-20 rounded-2xl" style={{ backgroundColor: 'white' }}>
                    <ThumbsDown className="w-20 h-20 mx-auto mb-6 opacity-20 text-red-500" />
                    <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                      Tournoi pas encore disponible
                    </h3>
                    <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                      Votez pour au moins 4 mois pour démarrer le tournoi
                      <br />
                      ({monthlyWorstVotes.length}/4 votes)
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* Monthly Vote Dialog */}
        {selectedMonth && (
          <MonthlyVoteDialog
            month={selectedMonth}
            monthName={MONTHS[selectedMonth - 1]}
            year={selectedYear} // Use selectedYear
            books={booksReadByMonth[selectedMonth]}
            currentVote={tournamentType === "best"
              ? monthlyVotes.find(v => v.month === selectedMonth)
              : monthlyWorstVotes.find(v => v.month === selectedMonth)
            }
            isWorst={tournamentType === "worst"}
            open={!!selectedMonth}
            onOpenChange={(open) => !open && setSelectedMonth(null)}
          />
        )}

        {/* Worst Book Dialog - This dialog is maintained as per the outline's explicit inclusion of its state and functions,
            even though the top-level "worst" tab is removed. */}
        <Dialog open={showWorstDialog} onOpenChange={setShowWorstDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: 'var(--dark-text)' }}>
                Pire lecture {selectedYear}
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-6">
              <div>
                <Label className="mb-4 block text-lg font-semibold" style={{ color: 'var(--dark-text)' }}>
                  Sélectionnez un livre (ou aucun)
                </Label>
                <div className="grid md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
                  {/* Option "Aucun livre" */}
                  <button
                    onClick={() => setWorstBookId("")}
                    className={`p-4 rounded-xl text-center transition-all ${
                      worstBookId === "" ? 'shadow-xl scale-105' : 'shadow-md hover:shadow-lg'
                    }`}
                    style={{
                      backgroundColor: 'white',
                      borderWidth: '3px',
                      borderStyle: 'solid',
                      borderColor: worstBookId === "" ? '#EF4444' : 'transparent'
                    }}
                  >
                    <div className="w-full aspect-[2/3] rounded-lg overflow-hidden mb-3 flex items-center justify-center"
                         style={{ backgroundColor: 'var(--beige)' }}>
                      <X className="w-16 h-16" style={{ color: 'var(--warm-pink)' }} />
                    </div>
                    <h3 className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
                      Aucun livre
                    </h3>
                  </button>

                  {/* Books */}
                  {allReadBooksThisYear.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => setWorstBookId(book.id)}
                      className={`p-4 rounded-xl text-left transition-all ${
                        worstBookId === book.id ? 'shadow-xl scale-105' : 'shadow-md hover:shadow-lg'
                      }`}
                      style={{
                        backgroundColor: 'white',
                        borderWidth: '3px',
                        borderStyle: 'solid',
                        borderColor: worstBookId === book.id ? '#EF4444' : 'transparent'
                      }}
                    >
                      <div className="w-full aspect-[2/3] rounded-lg overflow-hidden mb-3 shadow-md"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                      </div>
                      <h3 className="font-bold text-sm mb-1 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                        {book.title}
                      </h3>
                      <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                        {book.author}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="reason">Pourquoi ? (optionnel)</Label>
                <Textarea
                  id="reason"
                  value={worstReason}
                  onChange={(e) => setWorstReason(e.target.value)}
                  placeholder="Expliquez pourquoi ce livre vous a déçu..."
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowWorstDialog(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => saveWorstBookMutation.mutate()}
                  disabled={saveWorstBookMutation.isPending}
                  className="flex-1 text-white font-medium"
                  style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                >
                  {saveWorstBookMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
