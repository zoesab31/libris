
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export default function AddNailInspoDialog({ open, onOpenChange, books }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [inspoData, setInspoData] = useState({
    title: "",
    image_url: "",
    book_id: "",
    colors: "",
    note: "",
    is_done: false,
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooksForNailInspo'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  // Filter to only show books that user has in their library
  const availableBooks = books.filter(book => 
    myBooks.some(ub => ub.book_id === book.id)
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.NailInspo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nailInspos'] });
      toast.success("Inspiration ajoutée !");
      onOpenChange(false);
      setInspoData({ title: "", image_url: "", book_id: "", colors: "", note: "", is_done: false });
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setInspoData({ ...inspoData, image_url: result.file_url });
      toast.success("Image uploadée !");
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
            💅 Ajouter une inspiration ongles
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={inspoData.title}
              onChange={(e) => setInspoData({...inspoData, title: e.target.value})}
              placeholder="Ex: Nail art galaxie"
            />
          </div>

          <div>
            <Label>Image *</Label>
            <div className="flex gap-3">
              <Input
                value={inspoData.image_url}
                onChange={(e) => setInspoData({...inspoData, image_url: e.target.value})}
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

          {inspoData.image_url && (
            <div className="rounded-xl overflow-hidden">
              <img src={inspoData.image_url} alt="Preview" className="w-full h-64 object-cover" />
            </div>
          )}

          <div>
            <Label htmlFor="book">Livre associé</Label>
            <Select value={inspoData.book_id} onValueChange={(value) => setInspoData({...inspoData, book_id: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Optionnel" />
              </SelectTrigger>
              <SelectContent>
                {availableBooks.map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="colors">Couleurs utilisées</Label>
            <Input
              id="colors"
              value={inspoData.colors}
              onChange={(e) => setInspoData({...inspoData, colors: e.target.value})}
              placeholder="Ex: Rose, doré, blanc"
            />
          </div>

          <div>
            <Label htmlFor="note">Notes</Label>
            <Textarea
              id="note"
              value={inspoData.note}
              onChange={(e) => setInspoData({...inspoData, note: e.target.value})}
              placeholder="Vos notes, idées..."
              rows={3}
            />
          </div>

          <Button
            onClick={() => createMutation.mutate(inspoData)}
            disabled={!inspoData.image_url || createMutation.isPending}
            className="w-full text-white font-medium py-6"
            style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              "Ajouter l'inspiration"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
