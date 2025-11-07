import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export default function AddLocationDialog({ open, onOpenChange, books }) {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState(null);
  const [uploading, setUploading] = useState(false);
  const [locationData, setLocationData] = useState({
    location_name: "",
    category: "À la maison",
    photo_url: "",
    book_id: "",
    date: new Date().toISOString().split('T')[0],
    note: "",
  });

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooksForLocations'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  // Filter to only show books that are "En cours" (currently reading)
  const currentlyReadingBooks = useMemo(() => {
    return books.filter(book => 
      myBooks.some(ub => ub.book_id === book.id && ub.status === "En cours")
    );
  }, [books, myBooks]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReadingLocation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingLocations'] });
      toast.success("Lieu ajouté !");
      onOpenChange(false);
      setLocationData({ 
        location_name: "", 
        category: "À la maison", 
        photo_url: "", 
        book_id: "", 
        date: new Date().toISOString().split('T')[0], 
        note: "",
      });
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setLocationData({ ...locationData, photo_url: result.file_url });
      toast.success("Photo uploadée !");
    } catch (error) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--deep-brown)' }}>
            📍 Ajouter un lieu de lecture
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Nom du lieu *</Label>
            <Input
              id="name"
              value={locationData.location_name}
              onChange={(e) => setLocationData({...locationData, location_name: e.target.value})}
              placeholder="Ex: Café des Arts, Parc du centre..."
            />
          </div>

          <div>
            <Label htmlFor="category">Catégorie *</Label>
            <Select value={locationData.category} onValueChange={(value) => setLocationData({...locationData, category: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="À la maison">🏠 À la maison</SelectItem>
                <SelectItem value="Au parc">🌳 Au parc</SelectItem>
                <SelectItem value="Au café">☕ Au café</SelectItem>
                <SelectItem value="Salle de sport">🏋️ Salle de sport</SelectItem>
                <SelectItem value="En voiture">🚗 En voiture</SelectItem>
                <SelectItem value="Autre">📍 Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Photo du moment</Label>
            <div className="flex gap-3">
              <Input
                value={locationData.photo_url}
                onChange={(e) => setLocationData({...locationData, photo_url: e.target.value})}
                placeholder="URL de l'image ou..."
              />
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button type="button" variant="outline" disabled={uploading} asChild>
                  <span>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {locationData.photo_url && (
            <div className="rounded-xl overflow-hidden">
              <img src={locationData.photo_url} alt="Preview" className="w-full h-48 object-cover" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="book">Livre en cours de lecture</Label>
              <Select value={locationData.book_id} onValueChange={(value) => setLocationData({...locationData, book_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Optionnel" />
                </SelectTrigger>
                <SelectContent>
                  {currentlyReadingBooks.length > 0 ? (
                    currentlyReadingBooks.map((book) => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.title}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      Aucune lecture en cours
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={locationData.date}
                onChange={(e) => setLocationData({...locationData, date: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={locationData.note}
              onChange={(e) => setLocationData({...locationData, note: e.target.value})}
              placeholder="Comment était ce moment de lecture..."
              rows={3}
            />
          </div>

          <Button
            onClick={() => createMutation.mutate(locationData)}
            disabled={!locationData.location_name || createMutation.isPending}
            className="w-full font-medium py-6"
            style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))', color: '#000000' }}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              "Ajouter le lieu"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}