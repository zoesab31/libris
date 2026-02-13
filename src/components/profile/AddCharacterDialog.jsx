import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

export default function AddCharacterDialog({ isOpen, onClose, userId, existingCharacters, allBooks }) {
  const queryClient = useQueryClient();
  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setCharacters(existingCharacters.length > 0 ? existingCharacters : [{ 
        character_name: '', 
        book_id: '', 
        description: '', 
        order: 1 
      }]);
    }
  }, [isOpen, existingCharacters]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(existingCharacters.map(char => 
        base44.entities.FavoriteCharacter.delete(char.id)
      ));

      await Promise.all(
        characters
          .filter(char => char.character_name && char.book_id)
          .map((char, index) =>
            base44.entities.FavoriteCharacter.create({
              user_id: userId,
              character_name: char.character_name,
              book_id: char.book_id,
              description: char.description || '',
              image_url: char.image_url || '',
              order: index + 1
            })
          )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteCharacters'] });
      toast.success('Personnages enregistrés ! 💕');
      onClose();
    },
    onError: (error) => {
      console.error('Error saving characters:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  });

  const updateCharacter = (index, field, value) => {
    const updated = [...characters];
    updated[index] = { ...updated[index], [field]: value };
    setCharacters(updated);
  };

  const addCharacter = () => {
    if (characters.length < 4) {
      setCharacters([...characters, { 
        character_name: '', 
        book_id: '', 
        description: '', 
        order: characters.length + 1 
      }]);
    }
  };

  const removeCharacter = (index) => {
    setCharacters(characters.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Mes personnages préférés
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {characters.map((character, index) => (
            <div key={index} className="p-4 border-2 border-pink-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">Personnage #{index + 1}</h3>
                {characters.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCharacter(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>

              <div>
                <Label>Nom du personnage</Label>
                <Input
                  value={character.character_name}
                  onChange={(e) => updateCharacter(index, 'character_name', e.target.value)}
                  placeholder="Ex: Rhysand, Feyre..."
                />
              </div>

              <div>
                <Label>De quel livre ?</Label>
                <Select 
                  value={character.book_id} 
                  onValueChange={(value) => updateCharacter(index, 'book_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un livre..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allBooks.map(book => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.title} - {book.author}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Pourquoi ce personnage ? (optionnel)</Label>
                <Textarea
                  value={character.description}
                  onChange={(e) => updateCharacter(index, 'description', e.target.value)}
                  placeholder="Ce qui rend ce personnage spécial..."
                  rows={3}
                />
              </div>
            </div>
          ))}

          {characters.length < 4 && (
            <Button
              variant="outline"
              onClick={addCharacter}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un personnage
            </Button>
          )}
        </div>

        <div className="flex gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white"
          >
            {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}