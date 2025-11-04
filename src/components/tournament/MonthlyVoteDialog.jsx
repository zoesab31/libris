import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function MonthlyVoteDialog({ month, monthName, year, books, currentVote, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [selectedBookId, setSelectedBookId] = useState(currentVote?.book_id || "");

  const voteMutation = useMutation({
    mutationFn: async (bookId) => {
      if (currentVote) {
        await base44.entities.MonthlyBookVote.update(currentVote.id, { book_id: bookId });
      } else {
        await base44.entities.MonthlyBookVote.create({
          year,
          month,
          book_id: bookId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyVotes'] });
      toast.success(`Vote enregistré pour ${monthName} !`);
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--dark-text)' }}>
            📚 Meilleur livre de {monthName} {year}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="mb-6" style={{ color: 'var(--warm-pink)' }}>
            Sélectionnez votre livre préféré du mois parmi les {books.length} livre{books.length > 1 ? 's' : ''} lu{books.length > 1 ? 's' : ''}
          </p>

          <div className="grid md:grid-cols-3 gap-4">
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
                  borderColor: selectedBookId === book.id ? 'var(--gold)' : 'transparent'
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
                    <Star className="w-4 h-4 fill-current" style={{ color: 'var(--gold)' }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>
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
              disabled={!selectedBookId || voteMutation.isPending}
              className="text-white font-medium"
              style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--deep-pink))' }}
            >
              {voteMutation.isPending ? "Enregistrement..." : "Valider mon vote"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}