import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function CompleteChallengeDialog({ challenge, books, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [selectedBookId, setSelectedBookId] = useState(challenge.book_id || "");
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Only show books read in the current year (same year as the challenge)
  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks', user?.email, challenge?.year],
    queryFn: async () => {
      const allMyBooks = await base44.entities.UserBook.filter({ created_by: user?.email, status: "Lu" });
      
      // Filter books read in the challenge year
      return allMyBooks.filter(ub => {
        if (!ub.end_date) return false;
        const bookYear = new Date(ub.end_date).getFullYear();
        return bookYear === challenge.year;
      });
    },
    enabled: !!user && !!challenge,
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.BingoChallenge.update(challenge.id, data);
      
      // Award 20 points when completing a challenge
      if (!challenge.is_completed && data.is_completed && user?.email) { // Ensure user.email exists before proceeding
        const existingPoints = await base44.entities.ReadingPoints.filter({ created_by: user.email });
        if (existingPoints.length > 0) {
          await base44.entities.ReadingPoints.update(existingPoints[0].id, {
            total_points: (existingPoints[0].total_points || 0) + 20
          });
        } else {
          await base44.entities.ReadingPoints.create({ created_by: user.email, total_points: 20, points_spent: 0 });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bingoChallenges'] });
      queryClient.invalidateQueries({ queryKey: ['readingPoints'] }); // Invalidate reading points query
      toast.success(challenge.is_completed ? "Défi marqué comme incomplet" : "Défi validé ! +20 points 🌟");
      onOpenChange(false);
    },
  });

  const handleComplete = () => {
    if (!challenge.is_completed && !selectedBookId) {
      toast.error("Veuillez sélectionner un livre");
      return;
    }
    
    updateMutation.mutate({
      is_completed: !challenge.is_completed,
      book_id: challenge.is_completed ? undefined : selectedBookId,
      completed_date: challenge.is_completed ? undefined : new Date().toISOString().split('T')[0],
    });
  };

  const readBooks = myBooks
    .map(ub => books.find(b => b.id === ub.book_id))
    .filter(Boolean);

  const selectedBook = books.find(b => b.id === (selectedBookId || challenge.book_id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full md:max-w-md mx-2 md:mx-0">
        <DialogHeader>
          <DialogTitle className="text-base md:text-lg" style={{ color: 'var(--deep-brown)' }}>
            {challenge.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {challenge.description && (
            <p className="text-sm" style={{ color: 'var(--warm-brown)' }}>
              {challenge.description}
            </p>
          )}

          {!challenge.is_completed ? (
            <>
              <div>
                <Label htmlFor="book">Quel livre valide ce défi ?</Label>
                <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Choisir un livre lu en ${challenge.year}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {readBooks.length > 0 ? (
                      readBooks.map((book) => (
                        <SelectItem key={book.id} value={book.id}>
                          {book.title} - {book.author}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Aucun livre lu en {challenge.year}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {readBooks.length === 0 && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--cream)' }}>
                  <p className="text-xs" style={{ color: 'var(--warm-brown)' }}>
                    💡 Vous devez avoir lu au moins un livre en {challenge.year} pour valider ce défi
                  </p>
                </div>
              )}

              {selectedBook && (
                <div className="flex gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--cream)' }}>
                  <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 shadow-md"
                       style={{ backgroundColor: 'var(--beige)' }}>
                    {selectedBook.cover_url ? (
                      <img src={selectedBook.cover_url} alt={selectedBook.title} 
                           className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-6 h-6" style={{ color: 'var(--warm-brown)' }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--deep-brown)' }}>
                      {selectedBook.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--warm-brown)' }}>
                      {selectedBook.author}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                   style={{ backgroundColor: 'var(--gold)' }}>
                <Check className="w-8 h-8 text-white" />
              </div>
              <p className="font-semibold mb-2" style={{ color: 'var(--deep-brown)' }}>
                Défi complété !
              </p>
              {selectedBook && (
                <p className="text-sm" style={{ color: 'var(--warm-brown)' }}>
                  Validé avec : {selectedBook.title}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 md:gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-sm md:text-base py-5 md:py-3"
            >
              Annuler
            </Button>
            <Button
              onClick={handleComplete}
              disabled={updateMutation.isPending || (!challenge.is_completed && !selectedBookId)}
              className="flex-1 font-medium text-sm md:text-base py-5 md:py-3"
              style={{ 
                background: challenge.is_completed 
                  ? 'linear-gradient(135deg, #dc2626, #991b1b)' 
                  : 'linear-gradient(135deg, var(--gold), var(--warm-brown))',
                color: '#000000'
              }}
            >
              {challenge.is_completed ? (
                <>
                  <X className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="text-xs md:text-base">Incomplet</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="text-xs md:text-base">Valider</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}