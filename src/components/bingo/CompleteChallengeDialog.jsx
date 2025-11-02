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

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email, status: "Lu" }),
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.BingoChallenge.update(challenge.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bingoChallenges'] });
      toast.success(challenge.is_completed ? "Défi marqué comme incomplet" : "Défi validé !");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--deep-brown)' }}>
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
                    <SelectValue placeholder="Choisir un livre lu" />
                  </SelectTrigger>
                  <SelectContent>
                    {readBooks.map((book) => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.title} - {book.author}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleComplete}
              disabled={updateMutation.isPending || (!challenge.is_completed && !selectedBookId)}
              className="flex-1 text-white font-medium"
              style={{ 
                background: challenge.is_completed 
                  ? 'linear-gradient(135deg, #dc2626, #991b1b)' 
                  : 'linear-gradient(135deg, var(--gold), var(--warm-brown))' 
              }}
            >
              {challenge.is_completed ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Marquer incomplet
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
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