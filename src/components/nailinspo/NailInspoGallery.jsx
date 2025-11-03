import React from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Check, Palette } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function NailInspoGallery({ nailInspos, allBooks, isLoading }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NailInspo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nailInspos'] });
      toast.success("Inspiration supprimée");
    },
  });

  const toggleDoneMutation = useMutation({
    mutationFn: ({ id, is_done }) => base44.entities.NailInspo.update(id, { is_done }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nailInspos'] });
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array(8).fill(0).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    );
  }

  if (nailInspos.length === 0) {
    return (
      <div className="text-center py-20">
        <Palette className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-brown)' }} />
        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--deep-brown)' }}>
          Aucune inspiration
        </h3>
        <p className="text-lg" style={{ color: 'var(--warm-brown)' }}>
          Ajoutez vos inspirations nail art préférées
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {nailInspos.map((inspo) => {
        const book = inspo.book_id ? allBooks.find(b => b.id === inspo.book_id) : null;
        
        return (
          <div key={inspo.id} className="group relative rounded-xl overflow-hidden shadow-lg 
                                         transition-all hover:shadow-2xl hover:-translate-y-1">
            <div className="aspect-square relative">
              <img 
                src={inspo.image_url} 
                alt={inspo.title || "Nail inspo"}
                className="w-full h-full object-cover"
              />
              {inspo.is_done && (
                <div className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                     style={{ backgroundColor: 'var(--gold)' }}>
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent 
                           opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                {inspo.title && (
                  <p className="font-medium mb-1">{inspo.title}</p>
                )}
                {inspo.colors && (
                  <p className="text-xs mb-1">🎨 {inspo.colors}</p>
                )}
                {book && (
                  <p className="text-xs mb-2">📚 {book.title}</p>
                )}
                {inspo.note && (
                  <p className="text-xs line-clamp-2 mb-2">{inspo.note}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={inspo.is_done ? "secondary" : "default"}
                    onClick={() => toggleDoneMutation.mutate({ id: inspo.id, is_done: !inspo.is_done })}
                    disabled={toggleDoneMutation.isPending}
                    className="flex-1"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    {inspo.is_done ? "Fait" : "À faire"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(inspo.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}