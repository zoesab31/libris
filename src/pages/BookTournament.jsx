
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Star, Crown, Calendar, ThumbsDown, BookOpen, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Added CardHeader, CardTitle
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
  const [showWorstDialog, setShowWorstDialog] = useState(false);
  const [worstBookId, setWorstBookId] = useState("");
  const [worstReason, setWorstReason] = useState("");
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

  const { data: worstBook } = useQuery({
    queryKey: ['worstBook', currentYear],
    queryFn: async () => {
      const result = await base44.entities.BookOfTheYear.filter({
        created_by: user?.email,
        year: currentYear,
        is_worst: true
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
        });
      } else {
        await base44.entities.BookOfTheYear.create({
          year: currentYear,
          book_id: worstBookId || null,
          reason: worstReason,
          is_worst: true,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worstBook'] });
      setShowWorstDialog(false);
      toast.success("Pire lecture enregistrée !");
    },
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

  // Get all read books for worst selection
  const allReadBooksThisYear = useMemo(() => {
    return myBooks.filter(ub => {
      if (!ub.end_date) return false;
      const endYear = new Date(ub.end_date).getFullYear();
      return endYear === currentYear;
    }).map(ub => allBooks.find(b => b.id === ub.book_id)).filter(Boolean);
  }, [myBooks, allBooks, currentYear]);

  const canStartTournament = monthlyVotes.length >= 4;

  const openWorstDialog = () => {
    setWorstBookId(worstBook?.book_id || "");
    setWorstReason(worstBook?.reason || "");
    setShowWorstDialog(true);
  };

  const selectedWorstBook = worstBookId ? allBooks.find(b => b.id === worstBookId) : null;

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
              Meilleur et pire livre de l'année {currentYear}
            </p>
          </div>
        </div>

        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="monthly">Votes mensuels</TabsTrigger>
            <TabsTrigger value="tournament">Tournoi</TabsTrigger>
            <TabsTrigger value="worst">Pire lecture</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly">
            <div>
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
          </TabsContent>

          <TabsContent value="tournament">
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
          </TabsContent>

          <TabsContent value="worst">
            <div className="max-w-4xl mx-auto">
              {worstBook ? (
                <Card className="shadow-xl border-0 overflow-hidden">
                  <div className="h-3 animate-pulse" style={{ background: 'linear-gradient(90deg, #EF4444, #DC2626, #EF4444)' }} />
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3" 
                               style={{ color: 'var(--dark-text)' }}>
                      <ThumbsDown className="w-10 h-10 text-red-500" />
                      Pire Lecture {currentYear}
                      <ThumbsDown className="w-10 h-10 text-red-500" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center pb-8">
                    {worstBook.book_id ? (
                      <>
                        {selectedWorstBook && (
                          <>
                            <div className="w-48 h-72 rounded-xl overflow-hidden shadow-2xl mb-6"
                                 style={{ backgroundColor: 'var(--beige)' }}>
                              {selectedWorstBook.cover_url ? (
                                <img src={selectedWorstBook.cover_url} alt={selectedWorstBook.title} 
                                     className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <BookOpen className="w-20 h-20" style={{ color: 'var(--warm-pink)' }} />
                                </div>
                              )}
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-center" style={{ color: 'var(--dark-text)' }}>
                              {selectedWorstBook.title}
                            </h2>
                            <p className="text-lg mb-4" style={{ color: 'var(--warm-pink)' }}>
                              par {selectedWorstBook.author}
                            </p>
                            {worstBook.reason && (
                              <div className="w-full max-w-lg p-6 rounded-xl mb-6" style={{ backgroundColor: 'var(--cream)' }}>
                                <p className="text-sm font-semibold mb-2 text-center" style={{ color: 'var(--dark-text)' }}>
                                  Pourquoi cette déception :
                                </p>
                                <p className="text-sm text-center" style={{ color: 'var(--warm-pink)' }}>
                                  {worstBook.reason}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
                             style={{ backgroundColor: 'var(--cream)' }}>
                          <X className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                        </div>
                        <p className="text-xl font-semibold mb-2" style={{ color: 'var(--dark-text)' }}>
                          Aucun livre sélectionné
                        </p>
                        <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
                          Vous avez choisi de ne pas désigner de pire lecture cette année
                        </p>
                      </div>
                    )}
                    <Button
                      onClick={openWorstDialog}
                      variant="outline"
                      style={{ borderColor: 'var(--soft-pink)', color: 'var(--deep-pink)' }}
                    >
                      Modifier la sélection
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12">
                  <ThumbsDown className="w-20 h-20 mx-auto mb-6" style={{ color: 'var(--warm-pink)', opacity: 0.3 }} />
                  <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                    Pire Lecture {currentYear}
                  </h2>
                  <p className="text-lg mb-8" style={{ color: 'var(--warm-pink)' }}>
                    Sélectionnez le livre qui vous a le plus déçu cette année
                  </p>
                  <Button
                    onClick={openWorstDialog}
                    size="lg"
                    className="text-white font-medium px-8 py-6 text-lg"
                    style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                  >
                    Sélectionner ma pire lecture
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Monthly Vote Dialog */}
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

        {/* Worst Book Dialog */}
        <Dialog open={showWorstDialog} onOpenChange={setShowWorstDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: 'var(--dark-text)' }}>
                Pire lecture {currentYear}
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
