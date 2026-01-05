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
      <DialogContent className="max-w-full md:max-w-2xl mx-2 md:mx-auto rounded-3xl border-0 shadow-2xl">
        <style>{`
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
          }
        `}</style>

        <DialogHeader className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                 style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}>
              <Check className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl md:text-2xl font-bold mb-1" style={{ color: '#2D3748' }}>
                {challenge.title}
              </DialogTitle>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Défi Bingo {challenge.year}
              </p>
            </div>
          </div>
        </DialogHeader>

        {!challenge.is_completed ? (
          <div className="space-y-6">
            {challenge.description && (
              <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FFF9E6' }}>
                <p className="text-sm leading-relaxed" style={{ color: '#78350F' }}>
                  📖 {challenge.description}
                </p>
              </div>
            )}

            <div>
              <Label className="text-base font-bold mb-3 block" style={{ color: '#2D3748' }}>
                Sélectionner un livre pour valider ce défi
              </Label>
              
              {readBooks.length === 0 ? (
                <div className="text-center py-12 px-6 rounded-2xl" style={{ backgroundColor: '#FFF5F8' }}>
                  <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: '#FF1493' }} />
                  <p className="text-lg font-bold mb-2" style={{ color: '#2D3748' }}>
                    Aucun livre disponible
                  </p>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>
                    Vous devez avoir lu au moins un livre en {challenge.year} pour valider ce défi
                  </p>
                </div>
              ) : (
                <>
                  <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                    <SelectTrigger className="h-14 text-base border-2 rounded-xl"
                                   style={{ borderColor: '#E5E7EB' }}>
                      <SelectValue placeholder={`📚 Choisir parmi vos livres lus en ${challenge.year}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {readBooks.map((book) => (
                        <SelectItem key={book.id} value={book.id} className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{book.title}</span>
                            <span className="text-sm opacity-60">— {book.author}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedBook && (
                    <div className="mt-4 p-5 rounded-2xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-300"
                         style={{ background: 'linear-gradient(135deg, #FFF9E6 0%, #FFE9F0 100%)' }}>
                      <p className="text-xs font-bold mb-3" style={{ color: '#9CA3AF' }}>
                        LIVRE SÉLECTIONNÉ
                      </p>
                      <div className="flex gap-4">
                        <div className="w-20 h-32 rounded-xl overflow-hidden shadow-xl flex-shrink-0"
                             style={{ backgroundColor: '#E5E7EB' }}>
                          {selectedBook.cover_url ? (
                            <img src={selectedBook.cover_url} alt={selectedBook.title} 
                                 className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="w-8 h-8" style={{ color: '#9CA3AF' }} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg mb-2" style={{ color: '#2D3748' }}>
                            {selectedBook.title}
                          </h4>
                          <p className="text-sm mb-1" style={{ color: '#6B7280' }}>
                            par {selectedBook.author}
                          </p>
                          {selectedBook.page_count && (
                            <p className="text-xs" style={{ color: '#9CA3AF' }}>
                              📄 {selectedBook.page_count} pages
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-14 text-base font-medium rounded-xl border-2"
              >
                Annuler
              </Button>
              <Button
                onClick={handleComplete}
                disabled={updateMutation.isPending || !selectedBookId || readBooks.length === 0}
                className="flex-1 h-14 text-base font-bold rounded-xl text-white shadow-lg hover:shadow-xl transition-all"
                style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}
              >
                {updateMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Validation...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Valider le défi (+20 pts)
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center shadow-2xl animate-in zoom-in duration-500"
                   style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}>
                <Check className="w-12 h-12 text-white" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold mb-3" style={{ color: '#2D3748' }}>
              🎉 Défi complété !
            </h3>
            
            {selectedBook && (
              <div className="max-w-sm mx-auto mt-6 p-5 rounded-2xl" 
                   style={{ backgroundColor: '#FFF9E6' }}>
                <p className="text-sm font-medium mb-3" style={{ color: '#9CA3AF' }}>
                  Validé avec
                </p>
                <div className="flex gap-3 items-center justify-center">
                  <div className="w-12 h-16 rounded-lg overflow-hidden shadow-md"
                       style={{ backgroundColor: '#E5E7EB' }}>
                    {selectedBook.cover_url && (
                      <img src={selectedBook.cover_url} alt={selectedBook.title} 
                           className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm" style={{ color: '#2D3748' }}>
                      {selectedBook.title}
                    </p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>
                      {selectedBook.author}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-6 max-w-sm mx-auto">
              <Button
                onClick={() => onOpenChange(false)}
                className="flex-1 h-14 text-base font-bold rounded-xl text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                Parfait !
              </Button>
              <Button
                onClick={handleComplete}
                variant="outline"
                className="h-14 px-6 text-base font-medium rounded-xl border-2"
                style={{ borderColor: '#EF4444', color: '#EF4444' }}
              >
                <X className="w-5 h-5 mr-2" />
                Annuler
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}