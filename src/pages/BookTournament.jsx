import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Calendar, ChevronDown, History, Check, Sparkles, Skull, BookOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export default function BookTournament() {
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState("monthly");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [votingBook, setVotingBook] = useState(null);
  const [votingType, setVotingType] = useState(null); // 'best' or 'worst'
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

  const { data: votes = [] } = useQuery({
    queryKey: ['bookOfYearVotes', selectedYear],
    queryFn: () => base44.entities.BookOfTheYear.filter({ 
      created_by: user?.email,
      year: selectedYear 
    }),
    enabled: !!user,
  });

  const { data: allVotes = [] } = useQuery({
    queryKey: ['allBookOfYearVotes'],
    queryFn: () => base44.entities.BookOfTheYear.filter({ created_by: user?.email }),
    enabled: !!user,
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

  // Get books by month for selected year
  const booksByMonth = useMemo(() => {
    const months = {};
    for (let i = 0; i < 12; i++) {
      months[i + 1] = [];
    }

    myBooks.forEach(userBook => {
      if (!userBook.end_date) return;
      const endDate = new Date(userBook.end_date);
      if (endDate.getFullYear() !== selectedYear) return;

      const isLu = userBook.status === "Lu";
      const isQualifiedDNF = abandonedBookCounts(userBook);

      if (!isLu && !isQualifiedDNF) return;

      const month = endDate.getMonth() + 1; // 1-12
      months[month].push(userBook);
    });

    return months;
  }, [myBooks, selectedYear, allBooks]);

  // Get vote for specific month
  const getMonthVote = (month, isWorst) => {
    return votes.find(v => v.month === month && v.is_worst === isWorst);
  };

  // Get annual vote (no month)
  const getAnnualVote = (isWorst) => {
    return votes.find(v => !v.month && v.is_worst === isWorst);
  };

  const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i + 2);

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (data) => {
      // Check if vote already exists
      const existing = votes.find(v => 
        v.month === data.month && 
        v.is_worst === data.is_worst
      );

      if (existing) {
        await base44.entities.BookOfTheYear.update(existing.id, data);
      } else {
        await base44.entities.BookOfTheYear.create({
          ...data,
          year: selectedYear
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookOfYearVotes'] });
      queryClient.invalidateQueries({ queryKey: ['allBookOfYearVotes'] });
      toast.success("Vote enregistré !");
      setSelectedMonth(null);
      setVotingBook(null);
      setVotingType(null);
    },
  });

  // Render monthly voting dialog
  const renderMonthVotingDialog = () => {
    if (!selectedMonth) return null;

    const monthBooks = booksByMonth[selectedMonth];
    const bestVote = getMonthVote(selectedMonth, false);
    const worstVote = getMonthVote(selectedMonth, true);

    return (
      <Dialog open={!!selectedMonth} onOpenChange={() => setSelectedMonth(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ color: 'var(--dark-text)' }}>
              📅 {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </DialogTitle>
            <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
              {monthBooks.length} livre{monthBooks.length > 1 ? 's' : ''} lu{monthBooks.length > 1 ? 's' : ''}
            </p>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Best book section */}
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                <Trophy className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                Meilleure lecture du mois
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {monthBooks.map(userBook => {
                  const book = allBooks.find(b => b.id === userBook.book_id);
                  if (!book) return null;
                  const isSelected = bestVote?.book_id === book.id;

                  return (
                    <button
                      key={userBook.id}
                      onClick={() => voteMutation.mutate({
                        month: selectedMonth,
                        book_id: book.id,
                        is_worst: false
                      })}
                      className={`flex gap-3 p-3 rounded-xl border-2 transition-all hover:shadow-md ${
                        isSelected ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-yellow-200'
                      }`}
                    >
                      <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 shadow-md" 
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-6 h-6" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-bold text-sm line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                          {book.title}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--warm-pink)' }}>
                          {book.author}
                        </p>
                        {isSelected && (
                          <div className="flex items-center gap-1 mt-2">
                            <Check className="w-4 h-4 text-yellow-600" />
                            <span className="text-xs font-bold text-yellow-600">Sélectionné</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Worst book section */}
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                <Skull className="w-5 h-5 text-gray-600" />
                Pire lecture du mois
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {monthBooks.map(userBook => {
                  const book = allBooks.find(b => b.id === userBook.book_id);
                  if (!book) return null;
                  const isSelected = worstVote?.book_id === book.id;
                  const isDNF = userBook.status === "Abandonné";

                  return (
                    <button
                      key={userBook.id}
                      onClick={() => voteMutation.mutate({
                        month: selectedMonth,
                        book_id: book.id,
                        is_worst: true
                      })}
                      className={`flex gap-3 p-3 rounded-xl border-2 transition-all hover:shadow-md ${
                        isSelected ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {isDNF && (
                        <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-lg">
                          <span className="text-lg">💀</span>
                        </div>
                      )}
                      <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 shadow-md" 
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-6 h-6" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-bold text-sm line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                          {book.title}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--warm-pink)' }}>
                          {book.author}
                        </p>
                        {isSelected && (
                          <div className="flex items-center gap-1 mt-2">
                            <Check className="w-4 h-4 text-gray-600" />
                            <span className="text-xs font-bold text-gray-600">Sélectionné</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Render annual voting dialog
  const renderAnnualVotingDialog = () => {
    if (!votingType) return null;

    const isWorst = votingType === 'worst';
    const allYearBooks = Object.values(booksByMonth).flat();
    const currentVote = getAnnualVote(isWorst);

    return (
      <Dialog open={!!votingType} onOpenChange={() => setVotingType(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
              {isWorst ? <Skull className="w-7 h-7 text-gray-600" /> : <Trophy className="w-7 h-7" style={{ color: 'var(--gold)' }} />}
              {isWorst ? `💀 Pire lecture de ${selectedYear}` : `🏆 Meilleure lecture de ${selectedYear}`}
            </DialogTitle>
            <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
              Choisissez parmi vos {allYearBooks.length} livres lus cette année
            </p>
          </DialogHeader>

          <div className="grid md:grid-cols-3 gap-4 py-4">
            {allYearBooks.map(userBook => {
              const book = allBooks.find(b => b.id === userBook.book_id);
              if (!book) return null;
              const isSelected = currentVote?.book_id === book.id;
              const isDNF = userBook.status === "Abandonné";

              return (
                <button
                  key={userBook.id}
                  onClick={() => {
                    voteMutation.mutate({
                      book_id: book.id,
                      is_worst: isWorst
                    });
                    // Animation confetti for best book
                    if (!isWorst) {
                      toast.success("✨ Félicitations, vous avez élu votre meilleure lecture de " + selectedYear + " !", {
                        duration: 5000
                      });
                    }
                  }}
                  className={`relative p-4 rounded-xl border-2 transition-all hover:shadow-lg ${
                    isSelected 
                      ? (isWorst ? 'border-gray-400 bg-gray-50' : 'border-yellow-400 bg-yellow-50')
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isDNF && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-lg z-10">
                      <span className="text-lg">💀</span>
                    </div>
                  )}
                  {isSelected && !isWorst && (
                    <div className="absolute -top-2 -left-2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg z-10"
                         style={{ background: 'linear-gradient(135deg, var(--gold), var(--warm-pink))' }}>
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="w-full aspect-[2/3] rounded-lg overflow-hidden shadow-md mb-3" 
                       style={{ backgroundColor: 'var(--beige)' }}>
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                      </div>
                    )}
                  </div>
                  <p className="font-bold text-sm line-clamp-2 mb-1" style={{ color: 'var(--dark-text)' }}>
                    {book.title}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                    {book.author}
                  </p>
                  {isSelected && (
                    <div className="flex items-center justify-center gap-1 mt-3 py-2 rounded-lg"
                         style={{ backgroundColor: isWorst ? '#f3f4f6' : '#fef3c7' }}>
                      <Check className={`w-4 h-4 ${isWorst ? 'text-gray-600' : 'text-yellow-600'}`} />
                      <span className={`text-xs font-bold ${isWorst ? 'text-gray-600' : 'text-yellow-600'}`}>
                        Sélectionné
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Render history dialog
  const renderHistoryDialog = () => {
    const votesByYear = {};
    allVotes.forEach(vote => {
      if (!votesByYear[vote.year]) {
        votesByYear[vote.year] = { best: null, worst: null };
      }
      if (!vote.month) { // Annual votes only
        if (vote.is_worst) {
          votesByYear[vote.year].worst = vote;
        } else {
          votesByYear[vote.year].best = vote;
        }
      }
    });

    const sortedYears = Object.keys(votesByYear).sort((a, b) => b - a);

    return (
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
              <History className="w-7 h-7" />
              Historique des tournois
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {sortedYears.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-20 h-20 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p className="text-lg font-medium" style={{ color: 'var(--dark-text)' }}>
                  Aucun historique disponible
                </p>
                <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                  Vos votes annuels apparaîtront ici
                </p>
              </div>
            ) : (
              sortedYears.map(year => {
                const { best, worst } = votesByYear[year];
                const bestBook = best ? allBooks.find(b => b.id === best.book_id) : null;
                const worstBook = worst ? allBooks.find(b => b.id === worst.book_id) : null;

                return (
                  <Card key={year} className="border-0 shadow-lg">
                    <CardHeader className="pb-3" style={{ backgroundColor: 'var(--cream)' }}>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        📅 {year}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Best book */}
                        {bestBook && (
                          <div>
                            <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                              <Trophy className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                              Meilleure lecture
                            </h4>
                            <div className="flex gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                              <div className="w-20 h-28 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                                   style={{ backgroundColor: 'var(--beige)' }}>
                                {bestBook.cover_url ? (
                                  <img src={bestBook.cover_url} alt={bestBook.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <BookOpen className="w-8 h-8" style={{ color: 'var(--warm-pink)' }} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm line-clamp-2 mb-1" style={{ color: 'var(--dark-text)' }}>
                                  {bestBook.title}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                                  {bestBook.author}
                                </p>
                                {best.reason && (
                                  <p className="text-xs mt-2 line-clamp-2" style={{ color: '#666' }}>
                                    {best.reason}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Worst book */}
                        {worstBook && (
                          <div>
                            <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                              <Skull className="w-4 h-4 text-gray-600" />
                              Pire lecture
                            </h4>
                            <div className="flex gap-3 p-3 rounded-xl bg-gray-50">
                              <div className="w-20 h-28 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                                   style={{ backgroundColor: 'var(--beige)' }}>
                                {worstBook.cover_url ? (
                                  <img src={worstBook.cover_url} alt={worstBook.title} className="w-full h-full object-cover grayscale" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <BookOpen className="w-8 h-8" style={{ color: 'var(--warm-pink)' }} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm line-clamp-2 mb-1" style={{ color: 'var(--dark-text)' }}>
                                  {worstBook.title}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                                  {worstBook.author}
                                </p>
                                {worst.reason && (
                                  <p className="text-xs mt-2 line-clamp-2" style={{ color: '#666' }}>
                                    {worst.reason}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const totalBooksThisYear = Object.values(booksByMonth).flat().length;

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--gold), var(--deep-pink))' }}>
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                🏆 Tournoi du Livre
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                Élisez vos meilleures et pires lectures de {selectedYear}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {/* Year Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="px-6 py-6 rounded-xl font-bold text-lg shadow-lg border-2"
                  style={{
                    backgroundColor: 'white',
                    borderColor: 'var(--deep-pink)',
                    color: '#000000'
                  }}
                >
                  <Calendar className="w-5 h-5 mr-2" style={{ color: 'var(--deep-pink)' }} />
                  📅 {selectedYear}
                  <ChevronDown className="w-5 h-5 ml-2" style={{ color: 'var(--deep-pink)' }} />
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

            {/* History Button */}
            <Button
              onClick={() => setShowHistory(true)}
              variant="outline"
              className="px-6 py-6 rounded-xl font-bold text-lg shadow-lg border-2"
              style={{
                backgroundColor: 'white',
                borderColor: 'var(--beige)',
                color: '#000000'
              }}
            >
              <History className="w-5 h-5 mr-2" />
              Historique
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white shadow-md p-1 rounded-xl border-0 w-full mb-8">
            <TabsTrigger
              value="monthly"
              className="flex-1 rounded-lg font-bold data-[state=active]:text-white"
              style={activeTab === "monthly" ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                color: '#FFFFFF'
              } : { color: '#000000' }}
            >
              📅 Votes mensuels
            </TabsTrigger>
            <TabsTrigger
              value="best"
              className="flex-1 rounded-lg font-bold data-[state=active]:text-white"
              style={activeTab === "best" ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                color: '#FFFFFF'
              } : { color: '#000000' }}
            >
              👑 Meilleure lecture
            </TabsTrigger>
            <TabsTrigger
              value="worst"
              className="flex-1 rounded-lg font-bold data-[state=active]:text-white"
              style={activeTab === "worst" ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                color: '#FFFFFF'
              } : { color: '#000000' }}
            >
              💀 Pire lecture
            </TabsTrigger>
          </TabsList>

          {/* Monthly Votes Tab */}
          <TabsContent value="monthly">
            <div className="grid md:grid-cols-3 gap-4">
              {MONTH_NAMES.map((monthName, idx) => {
                const month = idx + 1;
                const monthBooks = booksByMonth[month] || [];
                const bestVote = getMonthVote(month, false);
                const worstVote = getMonthVote(month, true);
                const hasVotes = bestVote || worstVote;

                return (
                  <Card
                    key={month}
                    className={`cursor-pointer border-2 shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 ${
                      hasVotes ? 'border-green-400 bg-green-50' : 'border-gray-200'
                    }`}
                    onClick={() => monthBooks.length > 0 && setSelectedMonth(month)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <span style={{ color: 'var(--dark-text)' }}>{monthName}</span>
                        {hasVotes ? (
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        ) : (
                          <Calendar className="w-5 h-5" style={{ color: 'var(--warm-pink)' }} />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-2" style={{ color: 'var(--warm-pink)' }}>
                        {monthBooks.length} livre{monthBooks.length > 1 ? 's' : ''} lu{monthBooks.length > 1 ? 's' : ''}
                      </p>
                      {monthBooks.length > 0 ? (
                        hasVotes ? (
                          <p className="text-xs font-bold text-green-600">
                            ✅ Votes enregistrés
                          </p>
                        ) : (
                          <p className="text-xs font-bold" style={{ color: 'var(--deep-pink)' }}>
                            Cliquez pour voter
                          </p>
                        )
                      ) : (
                        <p className="text-xs" style={{ color: '#999' }}>
                          Aucune lecture
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Best Book Tab */}
          <TabsContent value="best">
            {(() => {
              const bestVote = getAnnualVote(false);
              const bestBook = bestVote ? allBooks.find(b => b.id === bestVote.book_id) : null;

              return bestBook ? (
                <Card className="max-w-2xl mx-auto border-0 shadow-2xl overflow-hidden">
                  <div className="h-3" style={{ background: 'linear-gradient(90deg, var(--gold), var(--deep-pink))' }} />
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                         style={{ background: 'linear-gradient(135deg, var(--gold), var(--warm-pink))' }}>
                      <Trophy className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-6" style={{ color: 'var(--dark-text)' }}>
                      🏆 Meilleure lecture de {selectedYear}
                    </h2>
                    <div className="flex flex-col items-center gap-4">
                      {bestBook.cover_url && (
                        <img 
                          src={bestBook.cover_url} 
                          alt={bestBook.title} 
                          className="w-48 h-72 object-cover rounded-xl shadow-lg" 
                        />
                      )}
                      <div>
                        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                          {bestBook.title}
                        </h3>
                        <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                          {bestBook.author}
                        </p>
                      </div>
                      <Button
                        onClick={() => setVotingType('best')}
                        variant="outline"
                        className="mt-4"
                      >
                        Modifier mon choix
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-20">
                  <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
                       style={{ background: 'linear-gradient(135deg, var(--gold), var(--warm-pink))' }}>
                    <Trophy className="w-14 h-14 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                    Élisez votre meilleure lecture de {selectedYear}
                  </h3>
                  <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
                    {totalBooksThisYear} livre{totalBooksThisYear > 1 ? 's' : ''} lu{totalBooksThisYear > 1 ? 's' : ''} cette année
                  </p>
                  <Button
                    onClick={() => setVotingType('best')}
                    disabled={totalBooksThisYear === 0}
                    className="px-8 py-6 text-lg font-bold text-white shadow-xl"
                    style={{ background: 'linear-gradient(135deg, var(--gold), var(--deep-pink))' }}
                  >
                    <Sparkles className="w-6 h-6 mr-2" />
                    Choisir mon livre préféré
                  </Button>
                </div>
              );
            })()}
          </TabsContent>

          {/* Worst Book Tab */}
          <TabsContent value="worst">
            {(() => {
              const worstVote = getAnnualVote(true);
              const worstBook = worstVote ? allBooks.find(b => b.id === worstVote.book_id) : null;

              return worstBook ? (
                <Card className="max-w-2xl mx-auto border-0 shadow-2xl overflow-hidden">
                  <div className="h-3 bg-gradient-to-r from-gray-500 to-gray-700" />
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-gray-600">
                      <Skull className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-6" style={{ color: 'var(--dark-text)' }}>
                      💀 Pire lecture de {selectedYear}
                    </h2>
                    <div className="flex flex-col items-center gap-4">
                      {worstBook.cover_url && (
                        <img 
                          src={worstBook.cover_url} 
                          alt={worstBook.title} 
                          className="w-48 h-72 object-cover rounded-xl shadow-lg grayscale" 
                        />
                      )}
                      <div>
                        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                          {worstBook.title}
                        </h3>
                        <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                          {worstBook.author}
                        </p>
                      </div>
                      <Button
                        onClick={() => setVotingType('worst')}
                        variant="outline"
                        className="mt-4"
                      >
                        Modifier mon choix
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-20">
                  <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center bg-gray-600">
                    <Skull className="w-14 h-14 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                    Désignez votre pire lecture de {selectedYear}
                  </h3>
                  <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
                    {totalBooksThisYear} livre{totalBooksThisYear > 1 ? 's' : ''} lu{totalBooksThisYear > 1 ? 's' : ''} cette année
                  </p>
                  <Button
                    onClick={() => setVotingType('worst')}
                    disabled={totalBooksThisYear === 0}
                    className="px-8 py-6 text-lg font-bold text-white shadow-xl bg-gradient-to-r from-gray-500 to-gray-700"
                  >
                    <Skull className="w-6 h-6 mr-2" />
                    Choisir ma pire lecture
                  </Button>
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        {renderMonthVotingDialog()}
        {renderAnnualVotingDialog()}
        {renderHistoryDialog()}
      </div>
    </div>
  );
}