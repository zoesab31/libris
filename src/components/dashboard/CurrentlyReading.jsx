import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Calendar, Edit2, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function CurrentlyReading({ books, allBooks, isLoading, user, friendsBooks = [], myFriends = [], getTimeBasedProgress }) {
  const [selectedBook, setSelectedBook] = useState(null);
  const [currentPage, setCurrentPage] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [editingBookId, setEditingBookId] = useState(null);
  const [inlineCurrentPage, setInlineCurrentPage] = useState("");
  const queryClient = useQueryClient();
  const inputRef = useRef(null);

  const updateProgressMutation = useMutation({
    mutationFn: async ({ userBookId, bookId, currentPage, totalPages }) => {
      // Update current page in UserBook
      await base44.entities.UserBook.update(userBookId, {
        current_page: parseInt(currentPage)
      });

      // Update total pages in Book if provided
      if (totalPages) {
        await base44.entities.Book.update(bookId, {
          page_count: parseInt(totalPages)
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast.success("Progression mise à jour !");
      setSelectedBook(null);
      setCurrentPage("");
      setTotalPages("");
    },
    onError: (error) => {
      console.error("Error updating progress:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  });

  const handleOpenDialog = (userBook, book) => {
    setSelectedBook({ userBook, book });
    setCurrentPage(userBook.current_page?.toString() || "");
    // Only show total pages input if it's the first time (no current_page set)
    if (!userBook.current_page) {
      setTotalPages(book.page_count?.toString() || "");
    } else {
      setTotalPages("");
    }
  };

  const handleSave = () => {
    if (!currentPage || parseInt(currentPage) < 0) {
      toast.error("Veuillez entrer une page valide");
      return;
    }

    const totalPagesToUse = totalPages ? parseInt(totalPages) : selectedBook.book.page_count;
    
    if (parseInt(currentPage) > totalPagesToUse) {
      toast.error("La page ne peut pas dépasser le nombre total de pages");
      return;
    }

    updateProgressMutation.mutate({
      userBookId: selectedBook.userBook.id,
      bookId: selectedBook.book.id,
      currentPage: currentPage,
      totalPages: totalPages || null
    });
  };

  const handleInlineEdit = (userBook, book) => {
    setEditingBookId(userBook.id);
    setInlineCurrentPage((userBook.current_page || 0).toString());
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleInlineSave = async (userBook, book) => {
    const page = parseInt(inlineCurrentPage);
    if (isNaN(page) || page < 0) {
      toast.error("Veuillez entrer une page valide");
      return;
    }

    if (book.page_count && page > book.page_count) {
      toast.error("La page ne peut pas dépasser le nombre total de pages");
      return;
    }

    try {
      await base44.entities.UserBook.update(userBook.id, {
        current_page: page
      });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("Progression mise à jour !");
      setEditingBookId(null);
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg border-0" style={{ backgroundColor: 'white' }}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const allCurrentlyReading = [
    ...books.map(b => ({ ...b, reader: user?.full_name?.split(' ')[0] || 'Vous', isYou: true })),
    ...friendsBooks.map(fb => {
      const friend = myFriends.find(f => f.friend_email === fb.created_by);
      return { ...fb, reader: friend?.friend_name?.split(' ')[0] || 'Ami(e)', isYou: false };
    })
  ];

  const isFirstUpdate = selectedBook && !selectedBook.userBook.current_page;

  return (
    <>
      <Card className="shadow-lg border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
        <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--warm-pink), var(--soft-pink))' }} />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl" style={{ color: 'var(--dark-text)' }}>
            <BookOpen className="w-6 h-6" />
            En cours de lecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allCurrentlyReading.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {allCurrentlyReading.map((userBook) => {
                const book = allBooks.find(b => b.id === userBook.book_id);
                if (!book) return null;

                const progress = userBook.isYou && getTimeBasedProgress 
                  ? getTimeBasedProgress(userBook) 
                  : 0;
                
                return (
                  <div key={userBook.id} 
                       className="flex flex-col gap-3 p-4 rounded-xl transition-all hover:shadow-md"
                       style={{ backgroundColor: 'var(--cream)' }}>
                    {/* Reader name above everything */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold px-2 py-1 rounded-full"
                            style={{ 
                              backgroundColor: userBook.isYou ? 'var(--deep-pink)' : 'var(--soft-pink)',
                              color: 'white'
                            }}>
                        {userBook.reader} 📖
                      </span>
                      {userBook.isYou && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDialog(userBook, book)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4" style={{ color: 'var(--deep-pink)' }} />
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 shadow-md"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-8 h-8" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 
                          className="font-bold mb-1 book-title-display" 
                          style={{ 
                            color: 'var(--dark-text)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-word',
                            fontSize: 'clamp(14px, 2.4vw, 16px)',
                            lineHeight: '1.2'
                          }}
                          title={book.title}
                        >
                          {book.title}
                        </h3>
                        <p 
                          className="text-sm mb-2 book-author-display" 
                          style={{ 
                            color: 'var(--warm-pink)',
                            overflowWrap: 'anywhere',
                            whiteSpace: 'normal',
                            fontSize: 'clamp(12px, 2vw, 14px)',
                            lineHeight: '1.2',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                          title={book.author}
                        >
                          {book.author}
                        </p>
                        {userBook.start_date && (
                          <p className="text-xs flex items-center gap-1 mb-2" style={{ color: 'var(--dark-text)', minHeight: '20px' }}>
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            Début : {format(new Date(userBook.start_date), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        )}
                        {userBook.isYou && (
                          <div className="mt-2">
                            {editingBookId === userBook.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  ref={inputRef}
                                  type="number"
                                  min="0"
                                  max={book.page_count || 9999}
                                  value={inlineCurrentPage}
                                  onChange={(e) => setInlineCurrentPage(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleInlineSave(userBook, book);
                                    if (e.key === 'Escape') setEditingBookId(null);
                                  }}
                                  className="h-8 text-sm flex-1"
                                  placeholder="Page actuelle"
                                />
                                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--dark-text)' }}>
                                  / {book.page_count || '?'}
                                </span>
                                <button
                                  onClick={() => handleInlineSave(userBook, book)}
                                  className="p-1.5 rounded-md hover:bg-green-50 transition-colors"
                                >
                                  <Check className="w-4 h-4" style={{ color: 'var(--deep-pink)' }} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between text-xs mb-1">
                                  <button
                                    onClick={() => handleInlineEdit(userBook, book)}
                                    className="hover:underline flex items-center gap-1"
                                    style={{ color: 'var(--dark-text)' }}
                                  >
                                    <span>{userBook.current_page || 0} / {book.page_count || '?'} pages</span>
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  {progress > 0 && (
                                    <span className="font-bold" style={{ color: 'var(--deep-pink)' }}>{progress}%</span>
                                  )}
                                </div>
                                {progress > 0 && (
                                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--beige)' }}>
                                    <div 
                                      className="h-full rounded-full transition-all duration-500 ease-out"
                                      style={{ 
                                        width: `${progress}%`,
                                        background: 'linear-gradient(90deg, var(--deep-pink), var(--warm-pink))',
                                        boxShadow: '0 0 8px rgba(255, 20, 147, 0.3)'
                                      }}
                                    />
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
              <p className="text-lg font-medium" style={{ color: 'var(--dark-text)' }}>
                Aucune lecture en cours
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--warm-pink)' }}>
                Commencez un nouveau livre pour le voir ici
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Progress Dialog */}
      <Dialog open={!!selectedBook} onOpenChange={(open) => !open && setSelectedBook(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--dark-text)' }}>
              Mettre à jour la progression
            </DialogTitle>
            <DialogDescription>
              {selectedBook?.book.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {isFirstUpdate && (
              <div>
                <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--dark-text)' }}>
                  Nombre total de pages réel
                  <span className="text-xs ml-2" style={{ color: 'var(--warm-pink)' }}>
                    (Actuellement : {selectedBook?.book.page_count || '?'})
                  </span>
                </Label>
                <Input
                  type="number"
                  value={totalPages}
                  onChange={(e) => setTotalPages(e.target.value)}
                  placeholder="Entrez le nombre réel de pages"
                  className="w-full"
                  min="1"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--warm-pink)' }}>
                  💡 Si votre livre a moins de pages que prévu, corrigez-le ici
                </p>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--dark-text)' }}>
                Page actuelle
              </Label>
              <Input
                type="number"
                value={currentPage}
                onChange={(e) => setCurrentPage(e.target.value)}
                placeholder="À quelle page êtes-vous ?"
                className="w-full"
                min="0"
                max={totalPages || selectedBook?.book.page_count || 9999}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedBook(null)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateProgressMutation.isPending || !currentPage}
                className="flex-1 text-white"
                style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
              >
                {updateProgressMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}