import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy, Calendar, History, Check, Sparkles, Skull, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import confetti from 'canvas-confetti';

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function BookTournament() {
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState("monthly");
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showMonthlyVoteDialog, setShowMonthlyVoteDialog] = useState(false);
  const [selectedBestBook, setSelectedBestBook] = useState(null);
  const [selectedWorstBook, setSelectedWorstBook] = useState(null);
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

  const { data: monthlyVotes = [] } = useQuery({
    queryKey: ['monthlyVotes', selectedYear],
    queryFn: () => base44.entities.MonthlyBookVote.filter({
      created_by: user?.email,
      year: selectedYear
    }),
    enabled: !!user,
  });

  const { data: yearlyWinners = [] } = useQuery({
    queryKey: ['yearlyWinners'],
    queryFn: () => base44.entities.BookOfTheYear.filter({
      created_by: user?.email
    }),
    enabled: !!user,
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

  // Get books read per month (including DNF >50%)
  const booksByMonth = useMemo(() => {
    const organized = {};
    for (let i = 0; i < 12; i++) {
      organized[i] = [];
    }

    myBooks.forEach(userBook => {
      if (!userBook.end_date) return;
      const endDate = new Date(userBook.end_date);
      if (endDate.getFullYear() !== selectedYear) return;
      
      const month = endDate.getMonth();
      
      if (userBook.status === "Lu") {
        organized[month].push(userBook);
      } else if (userBook.status === "Abandonné" && abandonedBookCounts(userBook)) {
        organized[month].push(userBook);
      }
    });

    return organized;
  }, [myBooks, selectedYear, allBooks]);

  // Get vote for specific month
  const getMonthVote = (monthIndex) => {
    return monthlyVotes.find(v => v.month === monthIndex + 1);
  };

  // Save monthly vote mutation
  const saveMonthlyVoteMutation = useMutation({
    mutationFn: async ({ month, bestBookId, worstBookId }) => {
      const existing = monthlyVotes.find(v => v.month === month);
      
      if (existing) {
        await base44.entities.MonthlyBookVote.update(existing.id, {
          best_book_id: bestBookId,
          worst_book_id: worstBookId
        });
      } else {
        await base44.entities.MonthlyBookVote.create({
          year: selectedYear,
          month,
          best_book_id: bestBookId,
          worst_book_id: worstBookId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyVotes'] });
      setShowMonthlyVoteDialog(false);
      setSelectedMonth(null);
      setSelectedBestBook(null);
      setSelectedWorstBook(null);
    }
  });

  // Save yearly best/worst
  const saveYearlyWinnerMutation = useMutation({
    mutationFn: async ({ isWorst, bookId, reason }) => {
      const existing = yearlyWinners.find(w => w.year === selectedYear && w.is_worst === isWorst);
      
      if (existing) {
        await base44.entities.BookOfTheYear.update(existing.id, {
          book_id: bookId,
          reason
        });
      } else {
        await base44.entities.BookOfTheYear.create({
          year: selectedYear,
          book_id: bookId,
          is_worst: isWorst,
          reason
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['yearlyWinners'] });
      
      if (!variables.isWorst) {
        // Confetti for best book
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FF1493', '#FF69B4']
        });
      }
    }
  });

  const currentYearBest = yearlyWinners.find(w => w.year === selectedYear && !w.is_worst);
  const currentYearWorst = yearlyWinners.find(w => w.year === selectedYear && w.is_worst);

  const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i + 2);
  
  const votedMonthsCount = monthlyVotes.length;
  const totalMonthsWithBooks = Object.values(booksByMonth).filter(books => books.length > 0).length;

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
                  className="px-6 py-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all border-2"
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
              <DropdownMenuContent className="max-h-64 overflow-y-auto">
                {years.map((year) => (
                  <DropdownMenuItem
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`cursor-pointer font-medium ${
                      selectedYear === year ? 'bg-pink-100 font-bold' : ''
                    }`}
                    style={{
                      color: selectedYear === year ? 'var(--deep-pink)' : '#000000'
                    }}
                  >
                    {selectedYear === year && '✓ '}{year}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* History Button */}
            <Button
              variant="outline"
              onClick={() => setShowHistoryDialog(true)}
              className="px-6 py-6 rounded-xl font-bold shadow-lg"
              style={{
                borderColor: 'var(--beige)',
                color: 'var(--deep-pink)'
              }}
            >
              <History className="w-5 h-5 mr-2" />
              Historique
            </Button>
          </div>
        </div>

        {/* Progress Counter */}
        <div className="mb-6 p-4 rounded-xl text-center shadow-md" style={{ backgroundColor: 'white' }}>
          <p className="font-bold" style={{ color: 'var(--dark-text)' }}>
            Votes mensuels enregistrés : {votedMonthsCount}/{totalMonthsWithBooks}
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white shadow-sm p-1 rounded-xl border-0 mb-8">
            <TabsTrigger
              value="monthly"
              className="rounded-lg font-bold"
              style={activeTab === "monthly" ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                color: '#FFFFFF'
              } : { color: '#000000' }}
            >
              Votes mensuels
            </TabsTrigger>
            <TabsTrigger
              value="best"
              className="rounded-lg font-bold"
              style={activeTab === "best" ? {
                background: 'linear-gradient(135deg, var(--gold), var(--warm-pink))',
                color: '#FFFFFF'
              } : { color: '#000000' }}
            >
              👑 Meilleure lecture
            </TabsTrigger>
            <TabsTrigger
              value="worst"
              className="rounded-lg font-bold"
              style={activeTab === "worst" ? {
                background: 'linear-gradient(135deg, #666, #999)',
                color: '#FFFFFF'
              } : { color: '#000000' }}
            >
              💀 Pire lecture
            </TabsTrigger>
          </TabsList>

          {/* Monthly Votes Tab */}
          <TabsContent value="monthly">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MONTHS.map((monthName, monthIndex) => {
                const booksInMonth = booksByMonth[monthIndex];
                const vote = getMonthVote(monthIndex);
                const hasVote = !!vote;

                return (
                  <Card
                    key={monthIndex}
                    className={`shadow-lg border-2 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer ${
                      hasVote ? 'border-green-400' : 'border-transparent'
                    }`}
                    style={{
                      backgroundColor: hasVote ? '#e8f5e9' : 'white'
                    }}
                    onClick={() => {
                      if (booksInMonth.length > 0) {
                        setSelectedMonth(monthIndex);
                        setShowMonthlyVoteDialog(true);
                      }
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg" style={{ color: 'var(--dark-text)' }}>
                          {monthName}
                        </CardTitle>
                        {hasVote ? (
                          <Check className="w-6 h-6 text-green-600" />
                        ) : (
                          <Calendar className="w-5 h-5" style={{ color: 'var(--warm-pink)' }} />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-3" style={{ color: 'var(--warm-pink)' }}>
                        {booksInMonth.length} livre{booksInMonth.length > 1 ? 's' : ''} lu{booksInMonth.length > 1 ? 's' : ''}
                      </p>
                      {booksInMonth.length > 0 ? (
                        <p className="text-sm font-medium" style={{ color: hasVote ? '#2e7d32' : 'var(--deep-pink)' }}>
                          {hasVote ? '✅ Vote enregistré' : '👉 Cliquez pour voter'}
                        </p>
                      ) : (
                        <p className="text-sm" style={{ color: '#999' }}>
                          Aucune lecture disponible
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
            <div className="max-w-2xl mx-auto">
              {currentYearBest ? (
                <Card className="shadow-xl border-0 overflow-hidden">
                  <div className="h-3" style={{ background: 'linear-gradient(90deg, var(--gold), var(--deep-pink))' }} />
                  <CardContent className="p-8 text-center">
                    <Sparkles className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--gold)' }} />
                    <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                      ✨ Votre meilleure lecture de {selectedYear}
                    </h2>
                    {(() => {
                      const book = allBooks.find(b => b.id === currentYearBest.book_id);
                      if (!book) return null;
                      return (
                        <div className="flex flex-col items-center gap-4">
                          {book.cover_url && (
                            <img src={book.cover_url} alt={book.title} className="w-40 h-60 object-cover rounded-xl shadow-lg" />
                          )}
                          <div>
                            <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                              {book.title}
                            </h3>
                            <p className="text-sm mb-3" style={{ color: 'var(--warm-pink)' }}>
                              {book.author}
                            </p>
                            {currentYearBest.reason && (
                              <p className="text-sm italic" style={{ color: '#666' }}>
                                "{currentYearBest.reason}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-xl border-0">
                  <CardContent className="p-8 text-center">
                    <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--gold)' }} />
                    <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                      Élisez votre meilleure lecture de {selectedYear}
                    </h2>
                    <p className="mb-6" style={{ color: 'var(--warm-pink)' }}>
                      Choisissez le livre qui vous a le plus marqué cette année
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Object.values(booksByMonth).flat().map(userBook => {
                        const book = allBooks.find(b => b.id === userBook.book_id);
                        if (!book) return null;
                        return (
                          <button
                            key={userBook.id}
                            onClick={() => {
                              saveYearlyWinnerMutation.mutate({
                                isWorst: false,
                                bookId: book.id,
                                reason: ""
                              });
                            }}
                            className="group"
                          >
                            <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-lg transition-all group-hover:shadow-2xl group-hover:-translate-y-2"
                                 style={{ backgroundColor: 'var(--beige)' }}>
                              {book.cover_url ? (
                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Trophy className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                                </div>
                              )}
                            </div>
                            <p className="text-xs mt-2 font-bold line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                              {book.title}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Worst Book Tab */}
          <TabsContent value="worst">
            <div className="max-w-2xl mx-auto">
              {currentYearWorst ? (
                <Card className="shadow-xl border-0 overflow-hidden">
                  <div className="h-3 bg-gradient-to-r from-gray-400 to-gray-600" />
                  <CardContent className="p-8 text-center">
                    <Skull className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                      💀 Votre pire lecture de {selectedYear}
                    </h2>
                    {(() => {
                      const book = allBooks.find(b => b.id === currentYearWorst.book_id);
                      if (!book) return null;
                      return (
                        <div className="flex flex-col items-center gap-4">
                          {book.cover_url && (
                            <img src={book.cover_url} alt={book.title} className="w-40 h-60 object-cover rounded-xl shadow-lg grayscale" />
                          )}
                          <div>
                            <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                              {book.title}
                            </h3>
                            <p className="text-sm mb-3" style={{ color: 'var(--warm-pink)' }}>
                              {book.author}
                            </p>
                            {currentYearWorst.reason && (
                              <p className="text-sm italic" style={{ color: '#666' }}>
                                "{currentYearWorst.reason}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-xl border-0">
                  <CardContent className="p-8 text-center">
                    <Skull className="w-16 h-16 mx-auto mb-4 opacity-20 text-gray-600" />
                    <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                      Désignez votre pire lecture de {selectedYear}
                    </h2>
                    <p className="mb-6" style={{ color: 'var(--warm-pink)' }}>
                      Le livre qui vous a le plus déçu cette année
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Object.values(booksByMonth).flat().map(userBook => {
                        const book = allBooks.find(b => b.id === userBook.book_id);
                        if (!book) return null;
                        return (
                          <button
                            key={userBook.id}
                            onClick={() => {
                              saveYearlyWinnerMutation.mutate({
                                isWorst: true,
                                bookId: book.id,
                                reason: ""
                              });
                            }}
                            className="group"
                          >
                            <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-lg transition-all group-hover:shadow-2xl group-hover:-translate-y-2 grayscale hover:grayscale-0"
                                 style={{ backgroundColor: 'var(--beige)' }}>
                              {book.cover_url ? (
                                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Skull className="w-12 h-12 text-gray-600" />
                                </div>
                              )}
                            </div>
                            <p className="text-xs mt-2 font-bold line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                              {book.title}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Monthly Vote Dialog */}
        {showMonthlyVoteDialog && selectedMonth !== null && (
          <Dialog open={showMonthlyVoteDialog} onOpenChange={setShowMonthlyVoteDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold" style={{ color: 'var(--dark-text)' }}>
                  Votes pour {MONTHS[selectedMonth]}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Best Book Selection */}
                <div>
                  <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--dark-text)' }}>
                    👑 Meilleure lecture du mois
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {booksByMonth[selectedMonth].map(userBook => {
                      const book = allBooks.find(b => b.id === userBook.book_id);
                      if (!book) return null;
                      const isSelected = selectedBestBook === book.id;
                      return (
                        <button
                          key={userBook.id}
                          onClick={() => setSelectedBestBook(book.id)}
                          className={`p-2 rounded-xl border-2 transition-all ${
                            isSelected ? 'border-green-500 bg-green-50' : 'border-transparent hover:border-pink-300'
                          }`}
                        >
                          <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-md mb-2"
                               style={{ backgroundColor: 'var(--beige)' }}>
                            {book.cover_url ? (
                              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Trophy className="w-8 h-8" style={{ color: 'var(--warm-pink)' }} />
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-bold line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                            {book.title}
                          </p>
                          {isSelected && <Check className="w-5 h-5 mx-auto mt-1 text-green-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Worst Book Selection */}
                <div>
                  <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--dark-text)' }}>
                    💀 Pire lecture du mois
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {booksByMonth[selectedMonth].map(userBook => {
                      const book = allBooks.find(b => b.id === userBook.book_id);
                      if (!book) return null;
                      const isSelected = selectedWorstBook === book.id;
                      return (
                        <button
                          key={userBook.id}
                          onClick={() => setSelectedWorstBook(book.id)}
                          className={`p-2 rounded-xl border-2 transition-all ${
                            isSelected ? 'border-red-500 bg-red-50' : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-md mb-2 grayscale"
                               style={{ backgroundColor: 'var(--beige)' }}>
                            {book.cover_url ? (
                              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Skull className="w-8 h-8 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-bold line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                            {book.title}
                          </p>
                          {isSelected && <Check className="w-5 h-5 mx-auto mt-1 text-red-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowMonthlyVoteDialog(false);
                      setSelectedMonth(null);
                      setSelectedBestBook(null);
                      setSelectedWorstBook(null);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedBestBook || selectedWorstBook) {
                        saveMonthlyVoteMutation.mutate({
                          month: selectedMonth + 1,
                          bestBookId: selectedBestBook,
                          worstBookId: selectedWorstBook
                        });
                      }
                    }}
                    disabled={!selectedBestBook && !selectedWorstBook}
                    className="text-white"
                    style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                  >
                    Enregistrer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
              {yearlyWinners.length === 0 ? (
                <p className="text-center py-8" style={{ color: 'var(--warm-pink)' }}>
                  Aucun résultat enregistré pour le moment
                </p>
              ) : (
                [...new Set(yearlyWinners.map(w => w.year))].sort((a, b) => b - a).map(year => {
                  const bestBook = yearlyWinners.find(w => w.year === year && !w.is_worst);
                  const worstBook = yearlyWinners.find(w => w.year === year && w.is_worst);
                  
                  return (
                    <Card key={year} className="shadow-lg border-0">
                      <CardHeader className="pb-3" style={{ backgroundColor: 'var(--cream)' }}>
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="w-6 h-6" style={{ color: 'var(--gold)' }} />
                          {year}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          {/* Best */}
                          {bestBook && (() => {
                            const book = allBooks.find(b => b.id === bestBook.book_id);
                            return book ? (
                              <div>
                                <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                                  <Sparkles className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                                  Meilleure lecture
                                </h4>
                                <div className="flex gap-3">
                                  <img src={book.cover_url} alt={book.title} className="w-16 h-24 object-cover rounded-lg shadow-md" />
                                  <div>
                                    <p className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>{book.title}</p>
                                    <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>{book.author}</p>
                                  </div>
                                </div>
                              </div>
                            ) : null;
                          })()}

                          {/* Worst */}
                          {worstBook && (() => {
                            const book = allBooks.find(b => b.id === worstBook.book_id);
                            return book ? (
                              <div>
                                <h4 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                                  <Skull className="w-5 h-5 text-gray-600" />
                                  Pire lecture
                                </h4>
                                <div className="flex gap-3">
                                  <img src={book.cover_url} alt={book.title} className="w-16 h-24 object-cover rounded-lg shadow-md grayscale" />
                                  <div>
                                    <p className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>{book.title}</p>
                                    <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>{book.author}</p>
                                  </div>
                                </div>
                              </div>
                            ) : null;
                          })()}
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