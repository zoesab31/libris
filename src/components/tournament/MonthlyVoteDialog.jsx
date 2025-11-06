
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Star, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Label } from "@/components/ui/label"; // Added Label
import { Textarea } from "@/components/ui/textarea"; // Added Textarea

export default function MonthlyVoteDialog({ month, monthName, year, books, currentVote, isWorst = false, open, onOpenChange }) {
  const queryClient = useQueryClient();
  // Initialize selectedBookId. For worst book, currentVote?.book_id can be null, which correctly maps to "" for "Aucun livre".
  const [selectedBookId, setSelectedBookId] = useState(currentVote?.book_id || "");
  const [reason, setReason] = useState(currentVote?.reason || ""); // Added reason state
  const [allowNoSelection] = useState(true); // Always allow "Aucun livre" option
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Get user's books for the month (to identify abandoned books for worst vote)
  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooksForTournament', year, month],
    queryFn: () => base44.entities.UserBook.list(),
    enabled: open, // Fetch when the dialog is open
  });

  // Get all book details (to check page_count for abandoned books)
  const { data: allBooks = [] } = useQuery({
    queryKey: ['allBooksForTournament'],
    queryFn: () => base44.entities.Book.list(),
    enabled: open, // Fetch when the dialog is open
  });

  // Filter abandoned books >50% for this month
  const abandonedBooksThisMonth = useMemo(() => {
    if (!isWorst) return []; // Only relevant for worst book selection

    return myBooks.filter(ub => {
      // Must be abandoned and have an end_date
      if (ub.status !== "Abandonné" || !ub.end_date) return false;

      const endDate = new Date(ub.end_date);
      const bookYear = endDate.getFullYear();
      const bookMonth = endDate.getMonth() + 1;

      // Check if the abandonment happened in the current month/year
      if (bookYear !== year || bookMonth !== month) return false;

      // Find the book to get its total page count
      const bookDetails = allBooks.find(b => b.id === ub.book_id);
      if (!bookDetails) return false; // Book details not found

      // Check if abandonment was >50%
      if (ub.abandon_percentage && ub.abandon_percentage >= 50) return true;
      if (ub.abandon_page && bookDetails.page_count && ub.abandon_page >= bookDetails.page_count / 2) return true;

      return false;
    }).map(ub => allBooks.find(b => b.id === ub.book_id)).filter(Boolean); // Map to book details and filter out any nulls
  }, [myBooks, allBooks, year, month, isWorst]);

  // Combine regular books with abandoned books if it's for worst vote
  const allAvailableBooks = useMemo(() => {
    if (isWorst) {
      const uniqueBooks = new Map();
      // Add initially passed books (usually read books)
      books.forEach(book => {
        if (book) uniqueBooks.set(book.id, book);
      });
      // Add abandoned books, overwriting if a book was already present (shouldn't happen often)
      abandonedBooksThisMonth.forEach(book => {
        if (book) uniqueBooks.set(book.id, book);
      });
      return Array.from(uniqueBooks.values());
    }
    return books; // For best: only use the initially passed books (read books)
  }, [books, abandonedBooksThisMonth, isWorst]);


  const voteMutation = useMutation({
    mutationFn: async (bookId) => {
      if (isWorst) {
        const payload = {
          book_id: bookId || null, // Allow null for "Aucun livre" option
          reason: reason || null, // Include the reason if provided
        };

        if (currentVote) {
          // If currentVote exists, update it.
          await base44.entities.BookOfTheYear.update(currentVote.id, payload);
        } else {
          // If no currentVote, create a new one.
          await base44.entities.BookOfTheYear.create({
            year,
            month,
            is_worst: true,
            ...payload,
          });
        }
      } else {
        // Handle best book voting (original logic)
        if (currentVote) {
          await base44.entities.MonthlyBookVote.update(currentVote.id, { book_id: bookId });
        } else {
          await base44.entities.MonthlyBookVote.create({
            year,
            month,
            book_id: bookId,
          });

          // Award 10 points for voting
          const existingPoints = await base44.entities.ReadingPoints.filter({ created_by: user?.email });
          if (existingPoints.length > 0) {
            await base44.entities.ReadingPoints.update(existingPoints[0].id, {
              total_points: (existingPoints[0].total_points || 0) + 10
            });
          } else {
            await base44.entities.ReadingPoints.create({ total_points: 10, points_spent: 0 });
          }
        }
      }
    },
    onSuccess: () => {
      if (isWorst) {
        queryClient.invalidateQueries({ queryKey: ['monthlyWorstVotes'] }); // Invalidate specific query key for worst votes
      } else {
        queryClient.invalidateQueries({ queryKey: ['monthlyVotes'] }); // Original query key for best votes
        queryClient.invalidateQueries({ queryKey: ['readingPoints'] }); // Invalidate reading points only for best votes
      }
      // Adjust toast message based on isWorst and if it's a new vote
      toast.success(`Vote enregistré pour ${monthName} ! ${!currentVote && !isWorst ? '+10 points 🌟' : ''}`);
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--dark-text)' }}>
            {isWorst ? "👎 Pire" : "👑 Meilleure"} lecture de {monthName} {year}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <p className="mb-6" style={{ color: 'var(--warm-pink)' }}>
            Sélectionnez votre livre {isWorst ? "le plus décevant" : "préféré"} du mois parmi les {allAvailableBooks.length} livre{allAvailableBooks.length !== 1 ? 's' : ''} lu{allAvailableBooks.length !== 1 ? 's' : ''}
          </p>

          {/* Option "Aucun livre" */}
          {allowNoSelection && (
            <div className="pb-4 border-b" style={{ borderColor: 'var(--beige)' }}>
              <button
                onClick={() => setSelectedBookId("")} // Set selectedBookId to empty string for "Aucun livre"
                className={`w-full p-4 rounded-xl text-center transition-all flex items-center justify-center gap-3 ${
                  selectedBookId === "" ? 'shadow-xl scale-105' : 'shadow-md hover:shadow-lg'
                }`}
                style={{
                  backgroundColor: 'white',
                  borderWidth: '3px',
                  borderStyle: 'solid',
                  borderColor: selectedBookId === "" ? (isWorst ? '#EF4444' : 'var(--gold)') : 'transparent'
                }}
              >
                <X className="w-8 h-8" style={{ color: 'var(--warm-pink)' }} />
                <div>
                  <p className="font-bold text-lg" style={{ color: 'var(--dark-text)' }}>
                    Aucun livre
                  </p>
                  <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                    Aucun livre ne mérite cette distinction ce mois-ci
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Books Grid */}
          <div>
            <Label className="mb-4 block text-lg font-semibold" style={{ color: 'var(--dark-text)' }}>
              Livres de {monthName} {year}
              {isWorst && abandonedBooksThisMonth.length > 0 && (
                <span className="ml-2 text-sm font-normal" style={{ color: 'var(--warm-pink)' }}>
                  (incluant {abandonedBooksThisMonth.length} livre{abandonedBooksThisMonth.length !== 1 ? 's' : ''} abandonné{abandonedBooksThisMonth.length !== 1 ? 's' : ''} après 50%)
                </span>
              )}
            </Label>
            <div className="grid md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
              {allAvailableBooks.map((book) => (
                <button
                  key={book.id}
                  onClick={() => setSelectedBookId(book.id)}
                  className={`p-4 rounded-xl text-left transition-all ${
                    selectedBookId === book.id
                      ? 'shadow-xl scale-105'
                      : 'shadow-md hover:shadow-lg'
                  }`}
                  style={{
                    backgroundColor: 'white',
                    borderWidth: '3px',
                    borderStyle: 'solid',
                    borderColor: selectedBookId === book.id ? (isWorst ? '#EF4444' : 'var(--gold)') : 'transparent' // Conditional border color
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
                  <p className="text-xs mb-2" style={{ color: 'var(--warm-pink)' }}>
                    {book.author}
                  </p>
                  {selectedBookId === book.id && (
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-4 h-4 fill-current" style={{ color: isWorst ? '#EF4444' : 'var(--gold)' }} /> {/* Conditional star color */}
                      <span className="text-xs font-bold" style={{ color: isWorst ? '#EF4444' : 'var(--gold)' }}>
                        Sélectionné
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {isWorst && selectedBookId !== "" && (
            <div className="mt-6">
              <Label htmlFor="reason" className="mb-2 block text-lg font-semibold" style={{ color: 'var(--dark-text)' }}>
                Pourquoi avez-vous choisi ce livre comme le pire ?
              </Label>
              <Textarea
                id="reason"
                placeholder="Partagez vos raisons (facultatif)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px]"
                style={{ backgroundColor: 'white', borderColor: 'var(--beige)', color: 'var(--dark-text)' }}
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={() => voteMutation.mutate(selectedBookId)}
              // Disable if not isWorst AND no book selected, or if mutation is pending
              // For isWorst, "" is a valid selectedBookId (Aucun livre), so `!selectedBookId` is only relevant for best book vote
              disabled={(!isWorst && !selectedBookId) || voteMutation.isPending}
              className="text-white font-medium"
              style={{
                background: isWorst
                  ? 'linear-gradient(135deg, #EF4444, #DC2626)' // Red gradient for worst book
                  : 'linear-gradient(135deg, var(--warm-pink), var(--deep-pink))' // Original pink gradient for best book
              }}
            >
              {voteMutation.isPending ? "Enregistrement..." : "Valider mon vote"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
