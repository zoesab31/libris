import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tantml:react-query';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';

export default function EditProfileModal({ 
  isOpen, 
  onClose, 
  profileUser,
  userBooks,
  allBooks
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('basic');
  
  const [formData, setFormData] = useState({
    full_name: '',
    pseudo: '',
    bio: '',
    favorite_quote: '',
    profile_picture: '',
    profile_banner: '',
    books_to_know_me: [],
    favorite_books_2024: [],
  });

  useEffect(() => {
    if (profileUser) {
      setFormData({
        full_name: profileUser.full_name || '',
        pseudo: profileUser.pseudo || '',
        bio: profileUser.bio || '',
        favorite_quote: profileUser.favorite_quote || '',
        profile_picture: profileUser.profile_picture || '',
        profile_banner: profileUser.profile_banner || '',
        books_to_know_me: profileUser.books_to_know_me || [],
        favorite_books_2024: profileUser.favorite_books_2024 || [],
      });
    }
  }, [profileUser]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      toast.success('Profil mis à jour ! ✨');
      onClose();
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  });

  const handleSubmit = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleImageUpload = async (file, field) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, [field]: file_url }));
      toast.success('Image uploadée !');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erreur lors de l\'upload');
    }
  };

  const readBooks = userBooks?.filter(ub => ub.status === 'Lu') || [];
  const readBooksWithDetails = readBooks
    .map(ub => {
      const book = allBooks.find(b => b.id === ub.book_id);
      return { ...ub, ...book };
    })
    .filter(b => b.title);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Éditer mon profil
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Infos</TabsTrigger>
            <TabsTrigger value="books">Livres</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div>
              <Label htmlFor="full_name">Nom complet</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Votre nom"
              />
            </div>

            <div>
              <Label htmlFor="pseudo">Pseudo</Label>
              <div className="flex items-center">
                <span className="mr-2 text-gray-500">@</span>
                <Input
                  id="pseudo"
                  value={formData.pseudo}
                  onChange={(e) => setFormData({ ...formData, pseudo: e.target.value.replace(/[^a-z0-9_]/gi, '') })}
                  placeholder="pseudo_unique"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Lettres, chiffres et underscores uniquement
              </p>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Parlez de vous en quelques mots..."
                rows={4}
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.bio.length}/200 caractères
              </p>
            </div>

            <div>
              <Label htmlFor="favorite_quote">Citation favorite</Label>
              <Textarea
                id="favorite_quote"
                value={formData.favorite_quote}
                onChange={(e) => setFormData({ ...formData, favorite_quote: e.target.value })}
                placeholder="Une citation qui vous inspire..."
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="books" className="space-y-6">
            <div>
              <Label className="text-lg font-bold mb-3 block">
                📚 En 4 livres pour me connaître
              </Label>
              <p className="text-sm text-gray-600 mb-4">
                Sélectionnez 4 livres qui définissent votre personnalité
              </p>
              <BookSelector
                selectedIds={formData.books_to_know_me}
                availableBooks={readBooksWithDetails}
                maxBooks={4}
                onChange={(ids) => setFormData({ ...formData, books_to_know_me: ids })}
              />
            </div>

            <div>
              <Label className="text-lg font-bold mb-3 block">
                ⭐ Mes 4 coups de cœur 2024
              </Label>
              <p className="text-sm text-gray-600 mb-4">
                Vos lectures préférées de cette année
              </p>
              <BookSelector
                selectedIds={formData.favorite_books_2024}
                availableBooks={readBooksWithDetails.filter(b => {
                  if (!b.end_date) return false;
                  const readYear = new Date(b.end_date).getFullYear();
                  return readYear === new Date().getFullYear();
                })}
                maxBooks={4}
                onChange={(ids) => setFormData({ ...formData, favorite_books_2024: ids })}
              />
            </div>
          </TabsContent>

          <TabsContent value="images" className="space-y-6">
            <div>
              <Label className="text-lg font-bold mb-3 block">
                Photo de profil
              </Label>
              <div className="flex items-center gap-4">
                {formData.profile_picture && (
                  <div className="relative w-24 h-24 rounded-full overflow-hidden">
                    <img
                      src={formData.profile_picture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setFormData({ ...formData, profile_picture: '' })}
                      className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, 'profile_picture');
                    }}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors">
                    <Upload className="w-4 h-4" />
                    Choisir une photo
                  </div>
                </label>
              </div>
            </div>

            <div>
              <Label className="text-lg font-bold mb-3 block">
                Bannière de profil
              </Label>
              {formData.profile_banner && (
                <div className="relative w-full h-32 rounded-lg overflow-hidden mb-3">
                  <img
                    src={formData.profile_banner}
                    alt="Banner"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setFormData({ ...formData, profile_banner: '' })}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'profile_banner');
                  }}
                  className="hidden"
                />
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors inline-flex">
                  <Upload className="w-4 h-4" />
                  Choisir une bannière
                </div>
              </label>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateProfileMutation.isPending}
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
          >
            {updateProfileMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookSelector({ selectedIds = [], availableBooks, maxBooks, onChange }) {
  const toggleBook = (bookId) => {
    if (selectedIds.includes(bookId)) {
      onChange(selectedIds.filter(id => id !== bookId));
    } else if (selectedIds.length < maxBooks) {
      onChange([...selectedIds, bookId]);
    } else {
      toast.error(`Vous ne pouvez sélectionner que ${maxBooks} livres`);
    }
  };

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-2">
      {availableBooks.map(book => {
        const isSelected = selectedIds.includes(book.id);
        
        return (
          <div
            key={book.id}
            onClick={() => toggleBook(book.id)}
            className={`cursor-pointer relative group ${
              isSelected ? 'ring-4 ring-pink-500' : ''
            }`}
          >
            <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-2xl">📚</span>
                </div>
              )}
              
              {isSelected && (
                <>
                  <div className="absolute top-2 right-2 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="absolute top-2 left-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {selectedIds.indexOf(book.id) + 1}
                    </span>
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-center mt-1 line-clamp-2 font-medium">
              {book.title}
            </p>
          </div>
        );
      })}
    </div>
  );
}