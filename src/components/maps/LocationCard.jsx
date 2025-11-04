
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, MapPin, Calendar, BookOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function LocationCard({ location, book }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.ReadingLocation.delete(location.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingLocations'] });
      toast.success("Lieu supprimé");
    },
  });

  const categoryIcons = {
    "À la maison": "🏠",
    "Au parc": "🌳",
    "Au café": "☕",
    "Salle de sport": "🏋️",
    "En voiture": "🚗",
    "Autre": "📍"
  };

  return (
    <Card className="shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all" 
          style={{ backgroundColor: 'white' }}>
      {location.photo_url && (
        <div className="h-48 overflow-hidden">
          <img src={location.photo_url} alt={location.location_name} 
               className="w-full h-full object-cover" />
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{categoryIcons[location.category]}</span>
              <h3 className="font-bold text-lg" style={{ color: 'var(--dark-text)' }}>
                {location.location_name}
              </h3>
            </div>
            <p className="text-xs px-2 py-1 rounded-full inline-block mb-2" 
               style={{ backgroundColor: 'var(--beige)', color: 'var(--warm-pink)' }}>
              {location.category}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>

        {book && (
          <div className="flex items-center gap-2 mb-2 text-sm" style={{ color: 'var(--warm-pink)' }}>
            <BookOpen className="w-4 h-4" />
            <span>{book.title}</span>
          </div>
        )}

        {location.date && (
          <div className="flex items-center gap-2 mb-2 text-sm" style={{ color: 'var(--warm-pink)' }}>
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(location.date), 'dd MMMM yyyy', { locale: fr })}</span>
          </div>
        )}

        {location.note && (
          <p className="text-sm mt-3 pt-3 border-t" 
             style={{ color: 'var(--dark-text)', borderColor: 'var(--beige)' }}>
            {location.note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
