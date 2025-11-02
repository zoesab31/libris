import React, { useState } from 'react';
import { BookOpen, Star, Music, Users, Edit, MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import BookDetailsDialog from "./BookDetailsDialog";

export default function BookGrid({ userBooks, allBooks, customShelves, isLoading }) {
  const [selectedUserBook, setSelectedUserBook] = useState(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {Array(10).fill(0).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="w-full aspect-[2/3] rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (userBooks.length === 0) {
    return (
      <div className="text-center py-20">
        <BookOpen className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-brown)' }} />
        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--deep-brown)' }}>
          Aucun livre ici
        </h3>
        <p className="text-lg" style={{ color: 'var(--warm-brown)' }}>
          Ajoutez votre premier livre pour commencer votre collection
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {userBooks.map((userBook) => {
          const book = allBooks.find(b => b.id === userBook.book_id);
          if (!book) return null;
          
          const shelf = customShelves.find(s => s.name === userBook.custom_shelf);

          return (
            <div 
              key={userBook.id}
              onClick={() => setSelectedUserBook(userBook)}
              className="group cursor-pointer"
            >
              <div className="relative mb-3">
                <div className="w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg 
                              transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-2"
                     style={{ backgroundColor: 'var(--beige)' }}>
                  {book.cover_url ? (
                    <img 
                      src={book.cover_url} 
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-brown)' }} />
                    </div>
                  )}
                </div>
                
                <div className="absolute top-2 right-2 flex flex-col gap-2">
                  {userBook.is_shared_reading && (
                    <div className="bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-md">
                      <Users className="w-4 h-4" style={{ color: 'var(--warm-brown)' }} />
                    </div>
                  )}
                  {userBook.music && (
                    <div className="bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-md">
                      <Music className="w-4 h-4" style={{ color: 'var(--warm-brown)' }} />
                    </div>
                  )}
                  {userBook.rating && (
                    <div className="bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 shadow-md 
                                  flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" style={{ color: 'var(--gold)' }} />
                      <span className="text-xs font-bold" style={{ color: 'var(--deep-brown)' }}>
                        {userBook.rating}
                      </span>
                    </div>
                  )}
                </div>

                {shelf && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 text-xs font-medium text-center"
                         style={{ color: 'var(--deep-brown)' }}>
                      {shelf.icon} {shelf.name}
                    </div>
                  </div>
                )}
              </div>

              <h3 className="font-bold text-sm mb-1 line-clamp-2 group-hover:underline" 
                  style={{ color: 'var(--deep-brown)' }}>
                {book.title}
              </h3>
              <p className="text-xs line-clamp-1" style={{ color: 'var(--warm-brown)' }}>
                {book.author}
              </p>
              {book.genre && (
                <p className="text-xs mt-1" style={{ color: 'var(--soft-brown)' }}>
                  {book.genre}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {selectedUserBook && (
        <BookDetailsDialog
          userBook={selectedUserBook}
          book={allBooks.find(b => b.id === selectedUserBook.book_id)}
          open={!!selectedUserBook}
          onOpenChange={(open) => !open && setSelectedUserBook(null)}
        />
      )}
    </>
  );
}