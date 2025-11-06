import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, X, Upload, Loader2 } from 'lucide-react';

export default function AddSeriesDialog({ open, onOpenChange, myBooks, allBooks }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  const [seriesData, setSeriesData] = useState({
    series_name: "",
    author: "",
    total_books: "",
    cover_url: "",
    description: ""
  });

  const [readingOrder, setReadingOrder] = useState([]);

  const createSeriesMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.BookSeries.create({
        ...seriesData,
        total_books: parseInt(seriesData.total_books),
        reading_order: readingOrder,
        books_read: readingOrder.filter(ro => {
          const userBook = myBooks.find(ub => ub.book_id === ro.book_id);
          return userBook?.status === "Lu";
        }).map(ro => ro.book_id),
        books_in_pal: readingOrder.filter(ro => {
          const userBook = myBooks.find(ub => ub.book_id === ro.book_id);
          return userBook?.status === "À lire" || userBook?.status === "En cours";
        }).map(ro => ro.book_id),
        books_wishlist: readingOrder.filter(ro => {
          const userBook = myBooks.find(ub => ub.book_id === ro.book_id);
          return userBook?.status === "Mes envies";
        }).map(ro => ro.book_id)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookSeries'] });
      toast.success("✨ Série ajoutée avec succès !");
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error creating series:", error);
      toast.error("Erreur lors de l'ajout de la série");
    }
  });

  const resetForm = () => {
    setStep(1);
    setSeriesData({
      series_name: "",
      author: "",
      total_books: "",
      cover_url: "",
      description: ""
    });
    setReadingOrder([]);
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setSeriesData({ ...seriesData, cover_url: result.file_url });
      toast.success("Couverture uploadée !");
    } catch (error) {
      console.error("Error uploading cover:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingCover(false);
    }
  };

  const addBookToOrder = () => {
    setReadingOrder([...readingOrder, { order: readingOrder.length + 1, book_id: "", title: "" }]);
  };

  const updateBookInOrder = (index, field, value) => {
    const newOrder = [...readingOrder];
    newOrder[index][field] = value;
    
    // If book_id is selected, auto-fill title
    if (field === 'book_id' && value) {
      const book = allBooks.find(b => b.id === value);
      if (book) {
        newOrder[index].title = book.title;
      }
    }
    
    setReadingOrder(newOrder);
  };

  const removeBookFromOrder = (index) => {
    setReadingOrder(readingOrder.filter((_, i) => i !== index));
  };

  // Get books that match the series (same author or similar title)
  const suggestedBooks = myBooks
    .map(ub => allBooks.find(b => b.id === ub.book_id))
    .filter(book => book && (
      book.author?.toLowerCase().includes(seriesData.author?.toLowerCase()) ||
      book.title?.toLowerCase().includes(seriesData.series_name?.toLowerCase())
    ))
    .filter(book => !readingOrder.some(ro => ro.book_id === book.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold" style={{ color: 'var(--dark-text)' }}>
            {step === 1 ? "Créer une série 🌿" : "Organiser les tomes 📚"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="series_name">Nom de la série *</Label>
              <Input
                id="series_name"
                value={seriesData.series_name}
                onChange={(e) => setSeriesData({ ...seriesData, series_name: e.target.value })}
                placeholder="ex: A Court of Thorns and Roses"
              />
            </div>

            <div>
              <Label htmlFor="author">Auteur *</Label>
              <Input
                id="author"
                value={seriesData.author}
                onChange={(e) => setSeriesData({ ...seriesData, author: e.target.value })}
                placeholder="ex: Sarah J. Maas"
              />
            </div>

            <div>
              <Label htmlFor="total_books">Nombre de tomes *</Label>
              <Input
                id="total_books"
                type="number"
                min="1"
                value={seriesData.total_books}
                onChange={(e) => setSeriesData({ ...seriesData, total_books: e.target.value })}
                placeholder="ex: 5"
              />
            </div>

            <div>
              <Label htmlFor="cover">Couverture de la série</Label>
              <div className="flex gap-3 items-start">
                <Input
                  id="cover"
                  value={seriesData.cover_url}
                  onChange={(e) => setSeriesData({ ...seriesData, cover_url: e.target.value })}
                  placeholder="URL de la couverture ou..."
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                    disabled={uploadingCover}
                  />
                  <Button type="button" variant="outline" disabled={uploadingCover}>
                    {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </Button>
                </label>
              </div>
              {seriesData.cover_url && (
                <div className="mt-3 relative w-32">
                  <img
                    src={seriesData.cover_url}
                    alt="Aperçu"
                    className="w-32 h-48 object-cover rounded-lg shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => setSeriesData({ ...seriesData, cover_url: "" })}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                value={seriesData.description}
                onChange={(e) => setSeriesData({ ...seriesData, description: e.target.value })}
                placeholder="Une brève description de la série..."
                rows={3}
              />
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!seriesData.series_name || !seriesData.author || !seriesData.total_books}
              className="w-full text-white font-medium"
              style={{ background: 'linear-gradient(135deg, #A8D5E5, #B8E6D5)' }}
            >
              Suivant : Organiser les tomes
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
              Ajoutez les tomes de la série dans l'ordre. Vous pouvez lier des livres de votre bibliothèque ou ajouter des titres manuellement.
            </p>

            {/* Suggested books */}
            {suggestedBooks.length > 0 && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#F0F9FF' }}>
                <Label className="text-sm font-bold mb-2 block">
                  📚 Livres suggérés de votre bibliothèque
                </Label>
                <div className="flex flex-wrap gap-2">
                  {suggestedBooks.slice(0, 5).map(book => (
                    <button
                      key={book.id}
                      onClick={() => {
                        addBookToOrder();
                        const newIndex = readingOrder.length;
                        setTimeout(() => {
                          updateBookInOrder(newIndex, 'book_id', book.id);
                        }, 0);
                      }}
                      className="text-xs px-3 py-1 rounded-full transition-all hover:shadow-md"
                      style={{
                        backgroundColor: '#A8D5E5',
                        color: 'white'
                      }}
                    >
                      + {book.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reading order */}
            <div className="space-y-3">
              {readingOrder.map((item, index) => (
                <div key={index} className="flex gap-3 items-start p-3 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                       style={{ backgroundColor: '#A8D5E5', color: 'white' }}>
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <Select
                      value={item.book_id}
                      onValueChange={(value) => updateBookInOrder(index, 'book_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un livre de votre bibliothèque" />
                      </SelectTrigger>
                      <SelectContent>
                        {allBooks
                          .filter(book => myBooks.some(ub => ub.book_id === book.id))
                          .map(book => (
                            <SelectItem key={book.id} value={book.id}>
                              {book.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <Input
                      value={item.title}
                      onChange={(e) => updateBookInOrder(index, 'title', e.target.value)}
                      placeholder="ou entrez le titre manuellement"
                    />
                  </div>

                  <button
                    onClick={() => removeBookFromOrder(index)}
                    className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              onClick={addBookToOrder}
              variant="outline"
              className="w-full"
              style={{ borderColor: '#A8D5E5', color: 'var(--dark-text)' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un tome
            </Button>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
              >
                Retour
              </Button>
              <Button
                onClick={() => createSeriesMutation.mutate()}
                disabled={createSeriesMutation.isPending || readingOrder.length === 0}
                className="text-white font-medium"
                style={{ background: 'linear-gradient(135deg, #A8D5E5, #B8E6D5)' }}
              >
                {createSeriesMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer la série"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}