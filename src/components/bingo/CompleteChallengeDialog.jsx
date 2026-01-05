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
      <DialogContent className="max-w-full md:max-w-md mx-2 md:mx-0 border-0 shadow-2xl" 
                     style={{ backgroundColor: 'white' }}>
        <div className="absolute top-0 left-0 right-0 h-2 rounded-t-xl"
             style={{ background: 'linear-gradient(90deg, var(--deep-pink), var(--warm-pink))' }} />
        
        <DialogHeader className="pt-4">
          <DialogTitle className="text-xl md:text-2xl font-bold text-center" 
                       style={{ color: 'var(--dark-text)' }}>
            {challenge.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
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

              {selectedBook && (
                <div className="flex gap-4 p-5 rounded-xl border-2 shadow-md" 
                     style={{ backgroundColor: 'white', borderColor: 'var(--soft-pink)' }}>
                  <div className="w-20 h-32 rounded-xl overflow-hidden flex-shrink-0 shadow-lg"
                       style={{ backgroundColor: 'var(--beige)' }}>
                    {selectedBook.cover_url ? (
                      <img src={selectedBook.cover_url} alt={selectedBook.title} 
                           className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8" style={{ color: 'var(--warm-pink)' }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-base mb-2" style={{ color: 'var(--dark-text)' }}>
                      {selectedBook.title}
                    </p>
                    <p className="text-sm mb-1" style={{ color: 'var(--warm-pink)' }}>
                      {selectedBook.author}
                    </p>
                    {selectedBook.genre && (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: 'var(--cream)', color: 'var(--deep-pink)' }}>
                        {selectedBook.genre}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg"
                   style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
                <Check className="w-12 h-12 text-white" strokeWidth={3} />
              </div>
              <p className="font-bold text-xl mb-3" style={{ color: 'var(--dark-text)' }}>
                🎉 Défi complété !
              </p>
              {selectedBook && (
                <div className="p-4 rounded-xl mx-auto max-w-xs" style={{ backgroundColor: 'var(--cream)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--warm-pink)' }}>
                    Validé avec :
                  </p>
                  <p className="text-base font-bold mt-1" style={{ color: 'var(--dark-text)' }}>
                    {selectedBook.title}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-base py-6 border-2"
              style={{ borderColor: 'var(--beige)' }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleComplete}
              disabled={updateMutation.isPending || (!challenge.is_completed && !selectedBookId)}
              className="flex-1 font-bold text-base py-6 text-white shadow-lg"
              style={{ 
                background: challenge.is_completed 
                  ? 'linear-gradient(135deg, #dc2626, #991b1b)' 
                  : 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))'
              }}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : challenge.is_completed ? (
                <>
                  <X className="w-5 h-5 mr-2" />
                  Marquer incomplet
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
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