import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function YearSelector({ currentYear, onYearChange }) {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => thisYear - i + 2);

  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="px-6 py-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all border-2"
            style={{
              backgroundColor: 'white',
              borderColor: 'var(--deep-pink)',
              color: '#000000'
            }}
          >
            <Calendar className="w-5 h-5 mr-2" style={{ color: 'var(--deep-pink)' }} />
            📅 {currentYear}
            <ChevronDown className="w-5 h-5 ml-2" style={{ color: 'var(--deep-pink)' }} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-64 overflow-y-auto">
          {years.map((year) => (
            <DropdownMenuItem
              key={year}
              onClick={() => onYearChange(year)}
              className={`cursor-pointer font-medium ${
                currentYear === year ? 'bg-pink-100 font-bold' : ''
              }`}
              style={{
                color: currentYear === year ? 'var(--deep-pink)' : '#000000'
              }}
            >
              {currentYear === year && '✓ '}{year}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}