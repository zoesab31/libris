import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Check, Clock, ShoppingCart, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Series() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [newSeries, setNewSeries] = useState({
    series_name: "",
    author: "",
    total_books: "",
    description: "",
    cover_url: "",
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: allSeries = [], isLoading } = useQuery({
    queryKey: ['bookSeries'],
    queryFn: () => base44.entities.BookSeries.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const createSeriesMutation = useMutation({
    mutationFn: (data) => base44.entities.BookSeries.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookSeries'] });
      toast.success("✅ Saga ajoutée !");
      setShowAddDialog(false);
      setNewSeries({ series_name: "", author: "", total_books: "", description: "", cover_url: "" });
    },
  });

  const getSeriesProgress = (series) => {
    const readCount = (series.books_read || []).length;
    const palCount = (series.books_in_pal || []).length;
    const wishlistCount = (series.books_wishlist || []).length;
    const total = series.total_books || 0;
    const percentage = total > 0 ? (readCount / total) * 100 : 0;

    return { readCount, palCount, wishlistCount, total, percentage };
  };

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--lavender), var(--soft-pink))' }}>
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Mes Séries
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                {allSeries.length} saga{allSeries.length > 1 ? 's' : ''} à suivre
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="shadow-lg text-white font-medium px-6 rounded-xl"
            style={{ background: 'linear-gradient(135deg, var(--lavender), var(--soft-pink))' }}>
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle saga
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin" style={{ color: 'var(--warm-pink)' }} />
          </div>
        ) : allSeries.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              Aucune série suivie
            </h3>
            <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
              Ajoutez vos sagas préférées pour suivre votre progression
            </p>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="font-medium"
              style={{ background: 'linear-gradient(135deg, var(--lavender), var(--soft-pink))', color: 'white' }}
            >
              Ajouter ma première saga
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allSeries.map((series) => {
              const progress = getSeriesProgress(series);
              
              return (
                <div
                  key={series.id}
                  className="group cursor-pointer bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-2"
                  onClick={() => setSelectedSeries(series)}
                >
                  <div className="w-full h-48 overflow-hidden relative"
                       style={{ backgroundColor: 'var(--beige)' }}>
                    {series.cover_url ? (
                      <img 
                        src={series.cover_url} 
                        alt={series.series_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-16 h-16 opacity-30" style={{ color: 'var(--warm-pink)' }} />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-4"
                         style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                      <div className="flex items-center justify-between text-white text-sm font-bold mb-2">
                        <span>{progress.readCount}/{progress.total} lus</span>
                        <span>{Math.round(progress.percentage)}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-500"
                          style={{ 
                            width: `${progress.percentage}%`,
                            background: 'linear-gradient(90deg, var(--gold), var(--warm-pink))'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 line-clamp-1" style={{ color: 'var(--dark-text)' }}>
                      {series.series_name}
                    </h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--warm-pink)' }}>
                      {series.author}
                    </p>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--cream)' }}>
                        <Check className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--deep-pink)' }} />
                        <p className="text-xs font-bold" style={{ color: 'var(--dark-text)' }}>{progress.readCount} lus</p>
                      </div>
                      <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--cream)' }}>
                        <Clock className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--warm-pink)' }} />
                        <p className="text-xs font-bold" style={{ color: 'var(--dark-text)' }}>{progress.palCount} PAL</p>
                      </div>
                      <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--cream)' }}>
                        <ShoppingCart className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--lavender)' }} />
                        <p className="text-xs font-bold" style={{ color: 'var(--dark-text)' }}>{progress.wishlistCount} envies</p>
                      </div>
                    </div>

                    {progress.percentage === 100 && (
                      <div className="mt-4 p-2 rounded-lg text-center font-bold"
                           style={{ background: 'linear-gradient(135deg, var(--gold), var(--warm-pink))', color: 'white' }}>
                        🎉 Saga complétée !
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle style={{ color: 'var(--dark-text)' }}>Ajouter une saga</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Nom de la saga *</Label>
                <Input
                  value={newSeries.series_name}
                  onChange={(e) => setNewSeries({...newSeries, series_name: e.target.value})}
                  placeholder="Ex: Keleana"
                />
              </div>
              <div>
                <Label>Auteur</Label>
                <Input
                  value={newSeries.author}
                  onChange={(e) => setNewSeries({...newSeries, author: e.target.value})}
                  placeholder="Ex: Sarah J. Maas"
                />
              </div>
              <div>
                <Label>Nombre total de livres *</Label>
                <Input
                  type="number"
                  min="1"
                  value={newSeries.total_books}
                  onChange={(e) => setNewSeries({...newSeries, total_books: e.target.value})}
                  placeholder="Ex: 6"
                />
              </div>
              <div>
                <Label>URL de la couverture</Label>
                <Input
                  value={newSeries.cover_url}
                  onChange={(e) => setNewSeries({...newSeries, cover_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newSeries.description}
                  onChange={(e) => setNewSeries({...newSeries, description: e.target.value})}
                  placeholder="Résumé de la saga..."
                  rows={3}
                />
              </div>
              <Button
                onClick={() => createSeriesMutation.mutate({
                  ...newSeries,
                  total_books: parseInt(newSeries.total_books)
                })}
                disabled={!newSeries.series_name || !newSeries.total_books || createSeriesMutation.isPending}
                className="w-full font-medium"
                style={{ background: 'linear-gradient(135deg, var(--lavender), var(--soft-pink))', color: 'white' }}
              >
                Ajouter la saga
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}