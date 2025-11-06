
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Star, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function MonthlyVoteDialog({ month, monthName, year, books, currentVote, isWorst = false, open, onOpenChange }) {
  const queryClient = useQueryClient();
  // Initialize selectedBookId. For worst book, currentVote?.book_id can be null, which correctly maps to "" for "Aucun livre".
  const [selectedBookId, setSelectedBookId] = useState(currentVote?.book_id || "");
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const voteMutation = useMutation({
    mutationFn: async (bookId) => {
      if (isWorst) {
        // Handle worst book voting
        if (currentVote) {
          // If currentVote exists, update it. bookId can be "" or null for "no book".
          await base44.entities.BookOfTheYear.update(currentVote.id, { book_id: bookId || null });
        } else {
          // If no currentVote, create a new one. bookId can be "" or null for "no book".
          await base44.entities.BookOfTheYear.create({
            year,
            month,
            book_id: bookId || null, // Allow null for "Aucun livre" option
            is_worst: true,
          });
        }
      } else {
        // Best book voting - allow null for "no book"
        if (currentVote) {
          await base44.entities.MonthlyBookVote.update(currentVote.id, { book_id: bookId || null });
        } else {
          await base44.entities.MonthlyBookVote.create({
            year,
            month,
            book_id: bookId || null, // Allow null
          });
          
          if (bookId) { // Only award points if a book is selected
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
      }
    },
    onSuccess: (_, bookId) => { // Added bookId as second argument to onSuccess
      if (isWorst) {
        queryClient.invalidateQueries({ queryKey: ['monthlyWorstVotes'] }); // Invalidate specific query key for worst votes
      } else {
        queryClient.invalidateQueries({ queryKey: ['monthlyVotes'] }); // Original query key for best votes
        if (bookId) { // Only invalidate points if book was selected
          queryClient.invalidateQueries({ queryKey: ['readingPoints'] });
        }
      }
      // Adjust toast message based on isWorst and if it's a new vote
      toast.success(`Vote enregistré pour ${monthName} ! ${!currentVote && !isWorst && bookId ? '+10 points 🌟' : ''}`);
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--dark-text)' }}>
            {isWorst ? "👎" : "📚"} {isWorst ? "Pire" : "Meilleur"} livre de {monthName} {year}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="mb-6" style={{ color: 'var(--warm-pink)' }}>
            Sélectionnez votre livre {isWorst ? "le plus décevant" : "préféré"} du mois parmi les {books.length} livre{books.length > 1 ? 's' : ''} lu{books.length > 1 ? 's' : ''}
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {/* "Aucun livre" option for ALL votes (best and worst) */}
            <button
              onClick={() => setSelectedBookId("")} // Set selectedBookId to empty string for "Aucun livre"
              className={`p-4 rounded-xl text-center transition-all ${
                selectedBookId === "" ? 'shadow-xl scale-105' : 'shadow-md hover:shadow-lg'
              }`}
              style={{ 
                backgroundColor: 'white',
                borderWidth: '3px',
                borderStyle: 'solid',
                borderColor: selectedBookId === "" ? (isWorst ? '#EF4444' : 'var(--gold)') : 'transparent'
              }}
            >
              <div className="w-full aspect-[2/3] rounded-lg overflow-hidden mb-3 flex items-center justify-center" // Centering icon
                   style={{ backgroundColor: 'var(--beige)' }}>
                <X className="w-16 h-16" style={{ color: 'var(--warm-pink)' }} />
              </div>
              <h3 className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
                Aucun livre
              </h3>
            </button>

            {books.map((book) => (
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

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={() => voteMutation.mutate(selectedBookId)}
              // Disable if mutation is pending
              disabled={voteMutation.isPending}
              className="text-white font-medium"
              style={{ background: isWorst 
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
