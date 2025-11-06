
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Check, ShoppingCart, Clock, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SeriesDetailsDialog({ series, open, onOpenChange, myBooks, allBooks }) {
  const queryClient = useQueryClient();

  // Calculate books read based on actual user books status
  const calculateBooksRead = () => {
    if (!series.reading_order) return 0;
    
    return series.reading_order.filter(item => {
      if (!item.book_id) return false; // Not released books don't count
      const userBook = myBooks.find(ub => ub.book_id === item.book_id);
      return userBook && userBook.status === 'Lu';
    }).length;
  };

  const markAsCompleteMutation = useMutation({
    mutationFn: async () => {
      const booksReadIds = series.reading_order
        .filter(ro => ro.book_id)
        .map(ro => ro.book_id);
      
      await base44.entities.BookSeries.update(series.id, {
        books_read: booksReadIds
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookSeries'] });
      toast.success("🎉 Série marquée comme complète !");
    }
  });

  const deleteSeriesMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.BookSeries.delete(series.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookSeries'] });
      toast.success("✅ Série supprimée !");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error deleting series:", error);
      toast.error("Erreur lors de la suppression de la série");
    }
  });

  const handleDelete = () => {
    if (window.confirm(`Êtes-vous sûre de vouloir supprimer la série "${series.series_name}" ?`)) {
      deleteSeriesMutation.mutate();
    }
  };

  const getBookStatus = (bookId) => {
    if (!bookId) return 'not_released';
    const userBook = myBooks.find(ub => ub.book_id === bookId);
    if (!userBook) return 'not_owned';
    
    if (userBook.status === 'Lu') return 'read';
    if (userBook.status === 'À lire' || userBook.status === 'En cours') return 'unread';
    if (userBook.status === 'Wishlist') return 'wishlist';
    return 'not_owned';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'read':
        return <Check className="w-4 h-4 text-white" />;
      case 'wishlist':
        return <ShoppingCart className="w-4 h-4 text-white" />;
      case 'not_released':
        return <Clock className="w-4 h-4" style={{ color: '#000000' }} />;
      default:
        return <BookOpen className="w-4 h-4 text-white" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'read':
        return '#B8E6D5';
      case 'unread':
        return '#E0E7FF';
      case 'wishlist':
        return '#FFB6C8';
      default:
        return '#F3F4F6';
    }
  };

  const totalBooks = series.total_books;
  const booksRead = calculateBooksRead(); // Use calculated value
  const progressPercent = (booksRead / totalBooks) * 100;
  const isComplete = booksRead === totalBooks;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-2xl font-bold" style={{ color: 'var(--dark-text)' }}>
              {series.series_name} 📖
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={deleteSeriesMutation.isPending}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex gap-6">
            {series.cover_url && (
              <div className="w-32 h-48 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
                <img src={series.cover_url} alt={series.series_name} className="w-full h-full object-cover" />
              </div>
            )}
            
            <div className="flex-1">
              {series.author && (
                <p className="text-lg mb-2" style={{ color: 'var(--warm-pink)' }}>
                  par {series.author}
                </p>
              )}
              
              {series.description && (
                <p className="text-sm mb-4" style={{ color: 'var(--dark-text)' }}>
                  {series.description}
                </p>
              )}

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold" style={{ color: 'var(--dark-text)' }}>
                    Progression
                  </span>
                  <span className="text-2xl font-bold" style={{ color: isComplete ? '#4ADE80' : '#A8D5E5' }}>
                    {booksRead}/{totalBooks}
                  </span>
                </div>
                
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${progressPercent}%`,
                      background: isComplete 
                        ? 'linear-gradient(90deg, #B8E6D5, #98D8C8)' 
                        : 'linear-gradient(90deg, #A8D5E5, #B8E6D5)'
                    }}
                  />
                </div>
                
                <p className="text-sm text-center" style={{ color: 'var(--warm-pink)' }}>
                  {Math.round(progressPercent)}% complété{isComplete ? " 🎉" : ""}
                </p>
              </div>

              {!isComplete && (
                <Button
                  onClick={() => markAsCompleteMutation.mutate()}
                  disabled={markAsCompleteMutation.isPending}
                  className="w-full mt-4 text-white"
                  style={{ background: 'linear-gradient(135deg, #B8E6D5, #98D8C8)' }}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Marquer comme complète
                </Button>
              )}
            </div>
          </div>

          {/* Timeline of books */}
          <div>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
              Ordre de lecture
            </h3>
            
            <div className="space-y-4">
              {series.reading_order?.map((item, index) => {
                const book = item.book_id ? allBooks.find(b => b.id === item.book_id) : null;
                const status = getBookStatus(item.book_id);
                const userBook = item.book_id ? myBooks.find(ub => ub.book_id === item.book_id) : null;

                return (
                  <div
                    key={index}
                    className="flex gap-4 items-center p-4 rounded-xl transition-all hover:shadow-md"
                    style={{
                      backgroundColor: status === 'read' ? '#F0FDF4' : 'white',
                      border: '2px solid',
                      borderColor: status === 'read' ? '#B8E6D5' : '#F3F4F6'
                    }}
                  >
                    {/* Order number */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold"
                      style={{
                        backgroundColor: getStatusColor(status),
                        color: status === 'not_released' ? '#9CA3AF' : 'white'
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Book cover */}
                    {book?.cover_url && (
                      <div className="w-12 h-18 rounded-md overflow-hidden shadow-md flex-shrink-0">
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Book info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm mb-1 truncate" style={{ color: 'var(--dark-text)' }}>
                        {item.title || `Tome ${index + 1}`}
                      </h4>
                      {book && (
                        <>
                          <p className="text-xs mb-1" style={{ color: 'var(--warm-pink)' }}>
                            {book.author}
                          </p>
                          {book.publication_year && (
                            <p className="text-xs" style={{ color: '#9CA3AF' }}>
                              📅 {book.publication_year}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Status badge */}
                    <div className="flex flex-col items-end gap-1">
                      <div
                        className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                        style={{
                          backgroundColor: getStatusColor(status),
                          color: status === 'not_released' ? '#000000' : 'white'
                        }}
                      >
                        {getStatusIcon(status)}
                        {status === 'read' && 'Lu'}
                        {status === 'unread' && <span style={{ color: '#000000' }}>Non lu</span>}
                        {status === 'wishlist' && 'Envie'}
                        {status === 'not_released' && <span style={{ color: '#000000' }}>Non sorti</span>}
                        {status === 'not_owned' && <span style={{ color: '#000000' }}>Non lu</span>}
                      </div>
                      
                      {userBook?.rating && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs">⭐</span>
                          <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>
                            {userBook.rating}/5
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
