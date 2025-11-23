import React from 'react';
import { Check, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function BingoGrid({ challenges, books, onChallengeClick, isLoading, year }) {
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
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
      {sortedChallenges.map((challenge, index) => {
        const book = books.find(b => b.id === challenge.book_id);
        const isCenterCell = challenge.position === 12; // Center of 5x5 grid (0-indexed)
        const isFreeSpace = challenge.title.includes("LIBRE") || challenge.title.includes("FREE");
        
        return (
          <button
            key={challenge.id}
            onClick={() => !isCenterCell && onChallengeClick(challenge)}
            className={`aspect-square rounded-lg md:rounded-xl p-2 md:p-4 transition-all duration-300 active:scale-95 md:hover:scale-105 hover:shadow-xl
                       border-2 flex flex-col items-center justify-center text-center relative overflow-hidden
                       ${isCenterCell 
                         ? 'bg-gradient-to-br from-pink-200 to-purple-200 border-pink-300 cursor-default'
                         : challenge.is_completed 
                         ? 'border-green-500 shadow-lg' 
                         : 'border-transparent shadow-md hover:border-gray-300'
                       }
                       ${!isCenterCell && isFreeSpace ? 'bg-gradient-to-br from-yellow-100 to-yellow-200' : !isCenterCell ? 'bg-white' : ''}`}
          >
            {challenge.is_completed && (
              <div className="absolute top-1 right-1 md:top-2 md:right-2 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center"
                   style={{ backgroundColor: 'var(--gold)' }}>
                <Check className="w-4 h-4 md:w-5 md:h-5 text-white" />
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
              {isCenterCell ? (
                <div className="text-3xl md:text-5xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                  {year}
                </div>
              ) : isFreeSpace ? (
                <div className="text-2xl md:text-4xl mb-1 md:mb-2">✨</div>
              ) : (
                <BookOpen className="w-5 h-5 md:w-8 md:h-8 mb-1 md:mb-2 mx-auto" 
                         style={{ color: challenge.is_completed ? 'var(--gold)' : 'var(--warm-pink)' }} />
              )}
              {!isCenterCell && (
                <p className={`text-[10px] md:text-xs font-medium leading-tight line-clamp-3 md:line-clamp-4
                              ${challenge.is_completed ? 'font-bold' : ''}`}
                   style={{ color: 'var(--dark-text)' }}>
                  {challenge.title}
                </p>
              )}
              {book && (
                <p className="text-[9px] md:text-xs mt-1 md:mt-2 font-semibold line-clamp-1" 
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