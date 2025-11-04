import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function YearSelector({ currentYear, onYearChange }) {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => thisYear - i);

  return (
    <div className="flex items-center justify-center gap-2 p-4 rounded-xl shadow-md"
         style={{ backgroundColor: 'white' }}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onYearChange(currentYear - 1)}
        disabled={currentYear <= thisYear - 9}
        style={{ color: 'var(--deep-pink)' }}
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      <div className="flex gap-2">
        {years.slice(0, 5).map((year) => (
          <button
            key={year}
            onClick={() => onYearChange(year)}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              currentYear === year ? 'shadow-lg scale-105' : 'hover:scale-105'
            }`}
            style={{
              backgroundColor: currentYear === year ? 'var(--soft-pink)' : 'var(--cream)',
              color: currentYear === year ? 'white' : 'var(--dark-text)',
              border: '2px solid',
              borderColor: currentYear === year ? 'var(--deep-pink)' : 'var(--beige)'
            }}
          >
            {year}
          </button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onYearChange(currentYear + 1)}
        disabled={currentYear >= thisYear}
        style={{ color: 'var(--deep-pink)' }}
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}