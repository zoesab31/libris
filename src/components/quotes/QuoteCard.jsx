import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Quote } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function QuoteCard({ quote }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Quote.delete(quote.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success("Citation supprimée");
    },
  });

  return (
    <Card className="shadow-2xl border-0 transition-all hover:shadow-2xl hover:-translate-y-2 rounded-3xl" style={{ backgroundColor: 'white' }}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <Quote className="w-8 h-8 opacity-20" style={{ color: 'var(--warm-pink)' }} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
        
        <p className="text-lg italic mb-4 leading-relaxed" style={{ color: 'var(--dark-text)' }}>
          "{quote.quote_text}"
        </p>
        
        {quote.page_number && (
          <p className="text-sm mb-2" style={{ color: 'var(--warm-pink)' }}>
            Page {quote.page_number}
          </p>
        )}
        
        {quote.note && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--beige)' }}>
            <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
              {quote.note}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}