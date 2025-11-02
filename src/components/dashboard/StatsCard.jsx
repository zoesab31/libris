import React from 'react';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function StatsCard({ title, value, icon: Icon, gradient }) {
  return (
    <Card className="relative overflow-hidden shadow-lg border-0 transition-all hover:shadow-xl hover:-translate-y-1" 
          style={{ backgroundColor: 'white' }}>
      <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 rounded-full opacity-10"
           style={{ background: gradient }} />
      <CardHeader className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--warm-brown)' }}>
              {title}
            </p>
            <CardTitle className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--deep-brown)' }}>
              {value}
            </CardTitle>
          </div>
          <div className="p-3 rounded-xl shadow-sm" style={{ background: gradient }}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}