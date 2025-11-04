
import React, { useState } from 'react';
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

export default function AddBookBoyfriendDialog({ open, onOpenChange, books, existingCharacters }) {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState(null);
  const [uploading, setUploading] = useState(false);
  const [characterData, setCharacterData] = useState({
    character_name: "",
    book_id: "",
    rank: existingCharacters.length + 1,
    gender: "male",
    why_i_love_him: "",
    best_quote: "",
    image_url: "",
  });

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooksForCharacters'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  // Filter to only show books that user has in their library
  const availableBooks = books.filter(book =>
    myBooks.some(ub => ub.book_id === book.id)
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BookBoyfriend.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookBoyfriends'] });
      toast.success("Personnage ajouté !");
      onOpenChange(false);
      setCharacterData({
        character_name: "",
        book_id: "",
        rank: existingCharacters.length + 1,
        gender: "male",
        why_i_love_him: "",
        best_quote: "",
        image_url: ""
      });
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setCharacterData({ ...characterData, image_url: result.file_url });
      toast.success("Image uploadée !");
    } catch (error) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--deep-brown)' }}>
            💕 Ajouter un personnage préféré
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Nom du personnage *</Label>
            <Input
              id="name"
              value={characterData.character_name}
              onChange={(e) => setCharacterData({...characterData, character_name: e.target.value})}
              placeholder="Ex: Rhysand, Feyre..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="book">Livre *</Label>
              <Select value={characterData.book_id} onValueChange={(value) => setCharacterData({...characterData, book_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
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
              <Label htmlFor="gender">Genre</Label>
              <Select value={characterData.gender} onValueChange={(value) => setCharacterData({...characterData, gender: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculin</SelectItem>
                  <SelectItem value="female">Féminin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="rank">Classement (1 = préféré) *</Label>
            <Input
              id="rank"
              type="number"
              min="1"
              value={characterData.rank}
              onChange={(e) => setCharacterData({...characterData, rank: parseInt(e.target.value)})}
            />
          </div>

          <div>
            <Label>Photo du personnage</Label>
            <div className="flex gap-3">
              <Input
                value={characterData.image_url}
                onChange={(e) => setCharacterData({...characterData, image_url: e.target.value})}
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

          {characterData.image_url && (
            <div className="rounded-xl overflow-hidden">
              <img src={characterData.image_url} alt="Preview" className="w-full h-64 object-cover" />
            </div>
          )}

          <div>
            <Label htmlFor="why">Pourquoi vous l'adorez</Label>
            <Textarea
              id="why"
              value={characterData.why_i_love_him}
              onChange={(e) => setCharacterData({...characterData, why_i_love_him: e.target.value})}
              placeholder="Ce qui vous fait craquer chez ce personnage..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="quote">Citation préférée</Label>
            <Textarea
              id="quote"
              value={characterData.best_quote}
              onChange={(e) => setCharacterData({...characterData, best_quote: e.target.value})}
              placeholder="Une citation mémorable du personnage..."
              rows={3}
            />
          </div>

          <Button
            onClick={() => createMutation.mutate(characterData)}
            disabled={!characterData.character_name || !characterData.book_id || createMutation.isPending}
            className="w-full font-medium py-6"
            style={{ background: 'linear-gradient(135deg, var(--rose-gold), var(--gold))', color: '#000000' }}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              "Ajouter le personnage"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
