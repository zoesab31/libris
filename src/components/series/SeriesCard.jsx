
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Trash2, Ban } from 'lucide-react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function SeriesCard({ series, myBooks, allBooks, onClick }) {
  const queryClient = useQueryClient();

  const deleteSeriesMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.BookSeries.delete(series.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookSeries'] });
      toast.success("✅ Série supprimée !");
    },
    onError: (error) => {
      console.error("Error deleting series:", error);
      toast.error("Erreur lors de la suppression");
    }
  });

  const toggleAbandonMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.BookSeries.update(series.id, {
        is_abandoned: !series.is_abandoned
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookSeries'] });
      toast.success(series.is_abandoned ? "Série réactivée !" : "Série marquée comme abandonnée");
    },
    onError: (error) => {
      console.error("Error toggling series abandon status:", error);
      toast.error("Erreur lors de la mise à jour du statut d'abandon");
    }
  });

  const handleDelete = (e) => {
    e.stopPropagation(); // Prevent card onClick from firing
    if (window.confirm(`Êtes-vous sûre de vouloir supprimer la série "${series.series_name}" ?`)) {
      deleteSeriesMutation.mutate();
    }
  };

  const handleToggleAbandon = (e) => {
    e.stopPropagation();
    toggleAbandonMutation.mutate();
  };

  // Calculate books read based on actual user books status
  const calculateBooksRead = () => {
    if (!series.reading_order) return 0;
    
    return series.reading_order.filter(item => {
      if (!item.book_id) return false; // Not released books don't count
      const userBook = myBooks.find(ub => ub.book_id === item.book_id);
      return userBook && userBook.status === 'Lu';
    }).length;
  };

  // Get book statuses
  const getBookStatus = (bookId) => {
    const userBook = myBooks.find(ub => ub.book_id === bookId);
    if (!userBook) return 'not_owned';
    
    if (userBook.status === 'Lu') return 'read';
    if (userBook.status === 'À lire' || userBook.status === 'En cours') return 'unread';
    if (userBook.status === 'Wishlist') return 'wishlist';
    return 'not_owned';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'read':
        return '#B8E6D5';
      case 'unread':
        return '#E0E7FF';
      case 'wishlist':
        return '#FFB6C8';
      case 'not_released':
        return 'transparent';
      default:
        return '#F3F4F6';
    }
  };

  const getStatusBorder = (status) => {
    return status === 'not_released' ? '2px solid #D1D5DB' : 'none';
  };

  const totalBooks = series.total_books;
  const booksRead = calculateBooksRead(); // Use calculated value
  const progressPercent = (totalBooks > 0) ? (booksRead / totalBooks) * 100 : 0;


  // Generate dots for each book
  const bookDots = Array.from({ length: totalBooks }, (_, i) => {
    const bookId = series.reading_order?.[i]?.book_id;
    const status = bookId ? getBookStatus(bookId) : 'not_released';
    
    return {
      index: i,
      status,
      bookId,
      title: series.reading_order?.[i]?.title || `Tome ${i + 1}`
    };
  });

  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-0 shadow-lg overflow-hidden relative group ${
        series.is_abandoned ? 'opacity-50 grayscale' : ''
      }`}
      style={{ backgroundColor: 'white' }}
    >
      {/* Action buttons - visible on hover */}
      <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleToggleAbandon}
          disabled={toggleAbandonMutation.isPending}
          className={`w-8 h-8 rounded-full ${
            series.is_abandoned 
              ? 'bg-green-500 hover:bg-green-600' 
              : 'bg-orange-500 hover:bg-orange-600'
          } text-white shadow-lg`}
          title={series.is_abandoned ? "Réactiver la série" : "Marquer comme abandonnée"}
        >
          <Ban className="w-4 h-4" />
        </Button>
        
        <Button
          size="icon"
          variant="ghost"
          onClick={handleDelete}
          disabled={deleteSeriesMutation.isPending}
          className="w-8 h-8 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg"
          title="Supprimer la série"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="h-2" style={{ 
        background: series.is_abandoned 
          ? 'linear-gradient(90deg, #9CA3AF, #6B7280)'
          : progressPercent === 100 
          ? 'linear-gradient(90deg, #B8E6D5, #98D8C8)' 
          : 'linear-gradient(90deg, #A8D5E5, #B8E6D5)' 
      }} />
      
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Cover */}
          <div className="w-20 h-28 rounded-lg overflow-hidden shadow-md flex-shrink-0"
               style={{ backgroundColor: 'var(--beige)' }}>
            {series.cover_url ? (
              <img src={series.cover_url} alt={series.series_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-8 h-8" style={{ color: 'var(--warm-pink)' }} />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0">
                <h3 className={`text-xl font-bold mb-1 truncate ${series.is_abandoned ? 'line-through' : ''}`} 
                    style={{ color: 'var(--dark-text)' }}>
                  {series.series_name}
                </h3>
                {series.author && (
                  <p className="text-sm mb-2" style={{ color: 'var(--warm-pink)' }}>
                    {series.author}
                  </p>
                )}
                {series.is_abandoned && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-400 text-white font-medium">
                    Abandonnée
                  </span>
                )}
              </div>
              
              {/* Progress Badge */}
              {!series.is_abandoned && (
                <div className="flex flex-col items-end ml-4">
                  <div className="text-sm font-bold mb-1" style={{ color: progressPercent === 100 ? '#4ADE80' : '#A8D5E5' }}>
                    {booksRead}/{totalBooks}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                    {Math.round(progressPercent)}%
                  </div>
                </div>
              )}
            </div>

            {/* Book dots */}
            <div className="flex flex-wrap gap-2 mb-3">
              {bookDots.map((dot) => {
                const book = dot.bookId ? allBooks.find(b => b.id === dot.bookId) : null;
                
                return (
                  <div
                    key={dot.index}
                    className="relative group"
                    title={dot.title}
                  >
                    <div
                      className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center text-xs font-bold"
                      style={{
                        backgroundColor: getStatusColor(dot.status),
                        border: getStatusBorder(dot.status),
                        color: dot.status === 'not_released' ? '#9CA3AF' : 'white'
                      }}
                    >
                      {dot.index + 1}
                    </div>
                    
                    {/* Tooltip on hover */}
                    {book && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-nowrap shadow-lg">
                          {book.title}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            {!series.is_abandoned && (
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    background: progressPercent === 100 
                      ? 'linear-gradient(90deg, #B8E6D5, #98D8C8)' 
                      : 'linear-gradient(90deg, #A8D5E5, #B8E6D5)'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
