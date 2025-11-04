import React from 'react';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function StatsCard({ title, value, icon: Icon, gradient }) {
  return (
    <Card className="relative overflow-hidden shadow-lg border-0 transition-all hover:shadow-xl hover:-translate-y-1" 
          style={{ backgroundColor: 'white' }}>
      <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 transform translate-x-8 -translate-y-8 rounded-full opacity-10"
           style={{ background: gradient }} />
      <CardHeader className="p-4 md:p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs md:text-sm font-medium mb-1 md:mb-2" style={{ color: 'var(--warm-brown)' }}>
              {title}
            </p>
            <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-bold" style={{ color: 'var(--deep-brown)' }}>
              {value}
            </CardTitle>
          </div>
          <div className="p-2 md:p-3 rounded-xl shadow-sm" style={{ background: gradient }}>
            <Icon className="w-4 h-4 md:w-6 md:h-6 text-white" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}