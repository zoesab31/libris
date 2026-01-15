import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, BookOpen, Loader2 } from "lucide-react";
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
      
      // Filter books read in the challenge year (including rereads)
      return allMyBooks.filter(ub => {
        // Check initial read
        if (ub.end_date && new Date(ub.end_date).getFullYear() === challenge.year) {
          return true;
        }
        
        // Check rereads
        if (ub.rereads && ub.rereads.length > 0) {
          return ub.rereads.some(reread => 
            reread.end_date && new Date(reread.end_date).getFullYear() === challenge.year
          );
        }
        
        return false;
      });
    },
    enabled: !!user && !!challenge,
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.BingoChallenge.update(challenge.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bingoChallenges'] });
      toast.success(challenge.is_completed ? "✨ Défi marqué comme incomplet" : "🎉 Défi validé avec succès !");
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
      <DialogContent className="max-w-md mx-auto border-0 shadow-2xl" 
                     style={{ backgroundColor: 'white' }}>
        <div className="absolute top-0 left-0 right-0 h-2 rounded-t-xl"
             style={{ background: 'linear-gradient(90deg, var(--deep-pink), var(--warm-pink))' }} />
        
        <DialogHeader className="pt-4 pb-2">
          <DialogTitle className="text-lg font-bold text-center px-4" 
                       style={{ color: 'var(--dark-text)' }}>
            {challenge.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 px-2">
          {challenge.description && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
              <p className="text-sm text-center" style={{ color: 'var(--warm-pink)' }}>
                {challenge.description}
              </p>
            </div>
          )}

          {!challenge.is_completed ? (
            <>
              <div className="space-y-3">
                <Label htmlFor="book" className="text-base font-bold" style={{ color: 'var(--dark-text)' }}>
                  📚 Quel livre valide ce défi ?
                </Label>
                <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                  <SelectTrigger className="h-12 border-2 text-base"
                                 style={{ borderColor: 'var(--soft-pink)' }}>
                    <SelectValue placeholder={`Choisir un livre lu en ${challenge.year}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {readBooks.length > 0 ? (
                      readBooks.map((book) => (
                        <SelectItem key={book.id} value={book.id} className="text-base py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold">{book.title}</span>
                            <span className="text-xs opacity-70">{book.author}</span>
                          </div>
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
                <div className="p-4 rounded-xl border-2" 
                     style={{ backgroundColor: '#FFF0F5', borderColor: 'var(--soft-pink)' }}>
                  <p className="text-sm text-center" style={{ color: 'var(--warm-pink)' }}>
                    💡 Vous devez avoir lu au moins un livre en {challenge.year} pour valider ce défi
                  </p>
                </div>
              )}


            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg"
                   style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <p className="font-bold text-base mb-2" style={{ color: 'var(--dark-text)' }}>
                🎉 Défi complété !
              </p>
              {selectedBook && (
                <div className="p-3 rounded-xl mx-auto" style={{ backgroundColor: 'var(--cream)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--warm-pink)' }}>
                    Validé avec :
                  </p>
                  <p className="text-sm font-bold mt-1 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                    {selectedBook.title}
                  </p>
                </div>
              )}
              <Button
                onClick={() => {
                  updateMutation.mutate({
                    is_completed: true,
                    book_id: undefined,
                    completed_date: undefined,
                  });
                }}
                variant="outline"
                className="mt-3 text-xs h-9"
                style={{ borderColor: 'var(--soft-pink)', color: 'var(--deep-pink)' }}
              >
                <X className="w-3 h-3 mr-1" />
                Retirer le livre
              </Button>
            </div>
          )}

          <div className="flex gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-sm h-11 border-2"
              style={{ borderColor: 'var(--beige)' }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleComplete}
              disabled={updateMutation.isPending || (!challenge.is_completed && !selectedBookId)}
              className="flex-1 font-bold text-sm h-11 text-white shadow-lg"
              style={{ 
                background: challenge.is_completed 
                  ? 'linear-gradient(135deg, #dc2626, #991b1b)' 
                  : 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))'
              }}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : challenge.is_completed ? (
                <>
                  <X className="w-4 h-4 mr-1" />
                  Marquer incomplet
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Valider le défi
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}