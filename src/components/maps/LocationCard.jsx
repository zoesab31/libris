import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, MapPin, Calendar, BookOpen, User } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function LocationCard({ location, book, friend, friendUser, showFriendInfo }) {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

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

  const canDelete = !showFriendInfo || location.created_by === user?.email;

  return (
    <Card className="shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all" 
          style={{ backgroundColor: 'white' }}>
      {location.photo_url && (
        <div className="h-48 overflow-hidden relative">
          <img src={location.photo_url} alt={location.location_name} 
               className="w-full h-full object-cover" />
          {showFriendInfo && (
            <div className="absolute top-2 left-2 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg"
                 style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0"
                   style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
                {friendUser?.profile_picture ? (
                  <img src={friendUser.profile_picture} 
                       alt={friend?.friend_name || location.created_by} 
                       className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
                    {(friend?.friend_name || location.created_by)?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-xs font-bold" style={{ color: 'var(--dark-text)' }}>
                {friend?.friend_name || location.created_by?.split('@')[0]}
              </span>
            </div>
          )}
        </div>
      )}
      
      <CardContent className="p-4">
        {showFriendInfo && !location.photo_url && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg" 
               style={{ backgroundColor: 'var(--cream)' }}>
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
              {friendUser?.profile_picture ? (
                <img src={friendUser.profile_picture} 
                     alt={friend?.friend_name || location.created_by} 
                     className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                  {(friend?.friend_name || location.created_by)?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: 'var(--dark-text)' }}>
                {friend?.friend_name || location.created_by?.split('@')[0]}
              </p>
            </div>
          </div>
        )}

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
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
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