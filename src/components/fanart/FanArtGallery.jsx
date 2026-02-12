import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, ExternalLink, Image as ImageIcon, Share2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function FanArtGallery({ fanArts, isLoading }) {
  const queryClient = useQueryClient();
  const [sharingId, setSharingId] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FanArt.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fanArts'] });
      toast.success("Fan art supprimé");
    },
  });

  const shareMutation = useMutation({
    mutationFn: async (fanArt) => {
      const response = await base44.functions.invoke('shareFanArtToPinterest', {
        image_url: fanArt.image_url,
        description: fanArt.note,
        book_title: 'Nos Livres'
      });
      return response.data;
    },
    onSuccess: (data) => {
      setSharingId(null);
      toast.success(`✅ Partagé sur Pinterest ! ${data.pin_url}`);
    },
    onError: (error) => {
      setSharingId(null);
      toast.error('Erreur: ' + error.message);
    }
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

  if (fanArts.length === 0) {
    return (
      <div className="text-center py-20">
        <ImageIcon className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
          Aucun fan art
        </h3>
        <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
          Ajoutez vos fan arts préférés pour les organiser ici
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {fanArts.map((fanArt) => (
        <div key={fanArt.id} className="group relative rounded-xl overflow-hidden shadow-lg 
                                       transition-all hover:shadow-2xl hover:-translate-y-1">
          <div className="aspect-square">
            <img 
              src={fanArt.image_url} 
              alt={fanArt.note || "Fan art"}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent 
                         opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              {fanArt.artist_name && (
                <p className="text-sm font-medium mb-1">Par {fanArt.artist_name}</p>
              )}
              {fanArt.note && (
                <p className="text-xs line-clamp-2 mb-2">{fanArt.note}</p>
              )}
              <div className="flex gap-2">
                {fanArt.source_url && (
                  <Button
                    size="sm"
                    variant="secondary"
                    asChild
                    className="flex-1"
                  >
                    <a href={fanArt.source_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Source
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSharingId(fanArt.id);
                    shareMutation.mutate(fanArt);
                  }}
                  disabled={shareMutation.isPending || sharingId === fanArt.id}
                  title="Partager sur Pinterest"
                >
                  {sharingId === fanArt.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Share2 className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(fanArt.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}