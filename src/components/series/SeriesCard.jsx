import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from 'lucide-react';

export default function SeriesCard({ series, myBooks, allBooks, onClick }) {
  // Get book statuses
  const getBookStatus = (bookId) => {
    const userBook = myBooks.find(ub => ub.book_id === bookId);
    if (!userBook) return 'not_owned';
    
    if (userBook.status === 'Lu') return 'read';
    if (userBook.status === 'À lire' || userBook.status === 'En cours') return 'unread';
    if (userBook.status === 'Mes envies') return 'wishlist';
    return 'not_owned';
  };

  const totalBooks = series.total_books;
  const booksRead = series.books_read?.length || 0;
  const progressPercent = (booksRead / totalBooks) * 100;

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

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 border-0 shadow-lg overflow-hidden"
      style={{ backgroundColor: 'white' }}
    >
      <div className="h-2" style={{ 
        background: progressPercent === 100 
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
                <h3 className="text-xl font-bold mb-1 truncate" style={{ color: 'var(--dark-text)' }}>
                  {series.series_name}
                </h3>
                {series.author && (
                  <p className="text-sm mb-2" style={{ color: 'var(--warm-pink)' }}>
                    {series.author}
                  </p>
                )}
              </div>
              
              {/* Progress Badge */}
              <div className="flex flex-col items-end ml-4">
                <div className="text-sm font-bold mb-1" style={{ color: progressPercent === 100 ? '#4ADE80' : '#A8D5E5' }}>
                  {booksRead}/{totalBooks}
                </div>
                <div className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                  {Math.round(progressPercent)}%
                </div>
              </div>
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}