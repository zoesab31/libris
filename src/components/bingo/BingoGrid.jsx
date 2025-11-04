
import React from 'react';
import { Check, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function BingoGrid({ challenges, books, onChallengeClick, isLoading }) {
  const sortedChallenges = [...challenges].sort((a, b) => a.position - b.position);

  if (isLoading) {
    return (
      <div className="grid grid-cols-5 gap-3">
        {Array(25).fill(0).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {sortedChallenges.map((challenge) => {
        const book = books.find(b => b.id === challenge.book_id);
        const isFreeSpace = challenge.title.includes("LIBRE") || challenge.title.includes("FREE");
        
        return (
          <button
            key={challenge.id}
            onClick={() => onChallengeClick(challenge)}
            className={`aspect-square rounded-xl p-4 transition-all duration-300 hover:scale-105 hover:shadow-xl
                       border-2 flex flex-col items-center justify-center text-center relative overflow-hidden
                       ${challenge.is_completed 
                         ? 'border-green-500 shadow-lg' 
                         : 'border-transparent shadow-md hover:border-gray-300'
                       }
                       ${isFreeSpace ? 'bg-gradient-to-br from-yellow-100 to-yellow-200' : 'bg-white'}`}
          >
            {challenge.is_completed && (
              <div className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                   style={{ backgroundColor: 'var(--gold)' }}>
                <Check className="w-5 h-5 text-white" />
              </div>
            )}

            {book?.cover_url && challenge.is_completed && (
              <div className="absolute inset-0 opacity-20">
                <img 
                  src={book.cover_url} 
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="relative z-10">
              {isFreeSpace ? (
                <div className="text-4xl mb-2">✨</div>
              ) : (
                <BookOpen className="w-8 h-8 mb-2 mx-auto" 
                         style={{ color: challenge.is_completed ? 'var(--gold)' : 'var(--warm-pink)' }} />
              )}
              <p className={`text-xs font-medium leading-tight line-clamp-4
                            ${challenge.is_completed ? 'font-bold' : ''}`}
                 style={{ color: 'var(--dark-text)' }}>
                {challenge.title}
              </p>
              {book && (
                <p className="text-xs mt-2 font-semibold line-clamp-1" 
                   style={{ color: 'var(--warm-pink)' }}>
                  {book.title}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
