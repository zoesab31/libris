import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function CurrentlyReading({ books, allBooks, isLoading, user, friendsBooks = [], myFriends = [] }) {
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
    ...books.map(b => ({ ...b, reader: user?.display_name || user?.full_name?.split(' ')[0] || 'Vous', isYou: true })),
    ...friendsBooks.map(fb => {
      const friend = myFriends.find(f => f.friend_email === fb.created_by);
      return { ...fb, reader: friend?.friend_name?.split(' ')[0] || 'Ami(e)', isYou: false };
    })
  ];

  return (
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
              
              return (
                <div key={userBook.id} 
                     className="flex gap-4 p-4 rounded-xl transition-all hover:shadow-md relative"
                     style={{ backgroundColor: 'var(--cream)' }}>
                  <div className="w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 shadow-md relative"
                       style={{ backgroundColor: 'var(--beige)' }}>
                    {/* Reader name ABOVE the cover */}
                    <div className="absolute -top-6 left-0 right-0 text-center">
                      <span className="text-xs font-bold px-2 py-1 rounded-full shadow-sm"
                            style={{ 
                              backgroundColor: userBook.isYou ? 'var(--deep-pink)' : 'var(--soft-pink)',
                              color: 'white'
                            }}>
                        {userBook.reader}
                      </span>
                    </div>
                    
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8" style={{ color: 'var(--warm-pink)' }} />
                      </div>
                    )}
                    
                    {/* En cours tag on cover */}
                    <div className="absolute top-1 left-1 bg-gradient-to-r from-yellow-400/75 to-orange-500/75 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg">
                      En cours
                    </div>
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
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--dark-text)', minHeight: '20px' }}>
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        Début : {format(new Date(userBook.start_date), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    )}
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
  );
}