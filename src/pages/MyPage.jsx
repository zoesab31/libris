import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, BookOpen, Heart, Frown, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import AnimatedCard from '@/components/animations/AnimatedCard';
import BadgeShowcase from '@/components/profile/BadgeShowcase';
import { ALL_BADGES } from '@/components/utils/badgeDefinitions';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { BookGridSkeleton } from '@/components/animations/SkeletonLoader';

export default function MyPage() {
  const [user, setUser] = useState(null);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState('');
  const [addCollectionOpen, setAddCollectionOpen] = useState(false);
  const [editCollectionId, setEditCollectionId] = useState(null);
  const [collectionTitle, setCollectionTitle] = useState('');
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [bookSearch, setBookSearch] = useState("");
  const [selectedBadgeId, setSelectedBadgeId] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setBio(u.bio || '');
    });
  }, []);

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['myCollections'],
    queryFn: async () => {
      const colls = await base44.entities.BookCollection.filter({ created_by: user?.email }, 'order');
      return colls;
    },
    enabled: !!user
  });

  const { data: userBooks = [] } = useQuery({
    queryKey: ['userBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user
  });

  const { data: books = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list()
  });

  const { data: userBadges = [] } = useQuery({
    queryKey: ['userBadges', user?.email],
    queryFn: () => base44.entities.UserBadge.filter({ created_by: user?.email }),
    enabled: !!user
  });

  const updateBioMutation = useMutation({
    mutationFn: (newBio) => base44.auth.updateMe({ bio: newBio }),
    onSuccess: () => {
      toast.success('Bio mise à jour');
      setIsEditingBio(false);
      setUser(prev => ({ ...prev, bio }));
    }
  });

  const createCollectionMutation = useMutation({
    mutationFn: (data) => base44.entities.BookCollection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myCollections']);
      toast.success('Collection ajoutée');
      resetForm();
    }
  });

  const updateCollectionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BookCollection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myCollections']);
      toast.success('Collection mise à jour');
      resetForm();
    }
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: (id) => base44.entities.BookCollection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['myCollections']);
      toast.success('Collection supprimée');
    }
  });

  const resetForm = () => {
    setCollectionTitle('');
    setSelectedBooks([]);
    setEditCollectionId(null);
    setAddCollectionOpen(false);
  };

  const handleSaveCollection = () => {
    if (!collectionTitle || selectedBooks.length === 0) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const data = {
      title: collectionTitle,
      book_ids: selectedBooks,
      order: editCollectionId ? collections.find(c => c.id === editCollectionId)?.order : collections.length
    };

    if (editCollectionId) {
      updateCollectionMutation.mutate({ id: editCollectionId, data });
    } else {
      createCollectionMutation.mutate(data);
    }
  };

  const openEditCollection = (collection) => {
    setEditCollectionId(collection.id);
    setCollectionTitle(collection.title);
    setSelectedBooks(collection.book_ids || []);
    setAddCollectionOpen(true);
  };

  const toggleBookSelection = (bookId) => {
    if (selectedBooks.includes(bookId)) {
      setSelectedBooks(selectedBooks.filter(id => id !== bookId));
    } else if (selectedBooks.length < 3) {
      setSelectedBooks([...selectedBooks, bookId]);
    } else {
      toast.error('Maximum 3 livres par collection');
    }
  };

  const getBookById = (bookId) => books.find(b => b.id === bookId);

  const availableBooks = books.filter(book => 
    userBooks.some(ub => ub.book_id === book.id)
  );
  const availableBooksFiltered = availableBooks.filter(b => {
    if (!bookSearch) return true;
    const q = bookSearch.toLowerCase();
    return (b.title || '').toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q);
  });

  const suggestedTitles = [
    '📚 3 livres pour me connaître',
    '💔 3 livres qui m\'ont déçu(e)',
    '😭 3 livres qui m\'ont fait pleurer',
    '😂 3 livres qui m\'ont fait rire',
    '🔥 3 livres que je recommande',
    '👑 Mes 3 favoris de tous les temps',
    '🌙 3 livres réconfortants',
    '⚡ 3 livres intenses'
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-6 flex items-center justify-center">
        <BookGridSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
           Mon profil
          </h1>
          <p className="text-gray-600">Créez votre vitrine littéraire personnelle</p>
        </motion.div>

        {/* Bio Section */}
        <AnimatedCard delay={0.1} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {user.profile_picture ? (
                  <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (user.display_name?.[0] || user.username?.[0] || 'L').toUpperCase()
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{user.display_name || user.username || 'Lectrice'}</h2>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingBio(!isEditingBio)}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Modifier
            </Button>
          </div>

          {isEditingBio ? (
            <div className="space-y-3">
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Parlez de vous, vos goûts littéraires, ce qui vous inspire..."
                rows={4}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button onClick={() => updateBioMutation.mutate(bio)} className="bg-pink-500 hover:bg-pink-600">
                  Enregistrer
                </Button>
                <Button variant="outline" onClick={() => {
                  setBio(user.bio || '');
                  setIsEditingBio(false);
                }}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 leading-relaxed">
              {bio || "Ajoutez une bio pour vous présenter..."}
            </p>
          )}
        </AnimatedCard>

        {/* Badges (discret) */}
        <BadgeShowcase userBadges={userBadges} isOwnProfile={true} />

        {/* Admin unlock badge */}
        {user?.role === 'admin' && (
          <div className="bg-white/70 border rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <span className="text-sm font-medium text-gray-700">Admin · Débloquer un badge</span>
              <div className="flex-1">
                <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Choisir un badge"/></SelectTrigger>
                  <SelectContent>
                    {ALL_BADGES.filter(b => !userBadges.some(ub => ub.badge_id === b.id)).map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.icon} {b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={!selectedBadgeId}
                onClick={async ()=>{
                  await base44.entities.UserBadge.create({ badge_id: selectedBadgeId, unlocked_at: new Date().toISOString(), is_new: true });
                  setSelectedBadgeId("");
                  queryClient.invalidateQueries({ queryKey: ['userBadges', user?.email] });
                }}
                className="bg-pink-500 hover:bg-pink-600"
              >Débloquer</Button>
            </div>
          </div>
        )}

        {/* Collections */}
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold text-gray-800">Mes collections</h3>
          <Dialog open={addCollectionOpen} onOpenChange={setAddCollectionOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle collection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editCollectionId ? 'Modifier la collection' : 'Nouvelle collection'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Titre de la collection</label>
                  <Input
                    value={collectionTitle}
                    onChange={(e) => setCollectionTitle(e.target.value)}
                    placeholder="Ex: 3 livres pour me connaître"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestedTitles.map(title => (
                      <button
                        key={title}
                        onClick={() => setCollectionTitle(title)}
                        className="text-xs px-2 py-1 rounded-full bg-pink-100 text-pink-700 hover:bg-pink-200 transition"
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                 <label className="text-sm font-medium mb-2 block">
                   Sélectionnez 3 livres maximum ({selectedBooks.length}/3)
                 </label>
                 <div className="mb-3">
                   <Input value={bookSearch} onChange={(e)=>setBookSearch(e.target.value)} placeholder="Rechercher dans ma bibliothèque..." />
                 </div>
                 <div className="grid grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-2 border rounded-lg">
                   {availableBooksFiltered.map(book => {
                      const isSelected = selectedBooks.includes(book.id);
                      return (
                        <motion.div
                          key={book.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleBookSelection(book.id)}
                          className={`cursor-pointer rounded-lg overflow-hidden border-2 transition ${
                            isSelected ? 'border-pink-500 ring-2 ring-pink-200' : 'border-transparent'
                          }`}
                        >
                          {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} className="w-full aspect-[2/3] object-cover" />
                          ) : (
                            <div className="w-full aspect-[2/3] bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center">
                              <BookOpen className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">{selectedBooks.indexOf(book.id) + 1}</span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveCollection} className="flex-1 bg-pink-500 hover:bg-pink-600">
                    {editCollectionId ? 'Mettre à jour' : 'Créer'}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>Annuler</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <BookGridSkeleton count={3} />
        ) : collections.length === 0 ? (
          <AnimatedCard delay={0.2} className="p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">Vous n'avez pas encore de collection</p>
            <Button onClick={() => setAddCollectionOpen(true)} className="bg-pink-500 hover:bg-pink-600">
              <Plus className="w-4 h-4 mr-2" />
              Créer ma première collection
            </Button>
          </AnimatedCard>
        ) : (
          <div className="grid gap-6">
            <AnimatePresence>
              {collections.map((collection, index) => (
                <AnimatedCard key={collection.id} delay={0.2 + index * 0.1} hover={false}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl">{collection.title}</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditCollection(collection)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Supprimer cette collection ?')) {
                            deleteCollectionMutation.mutate(collection.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {collection.book_ids?.map(bookId => {
                        const book = getBookById(bookId);
                        if (!book) return null;
                        return (
                          <motion.div
                            key={bookId}
                            whileHover={{ y: -4 }}
                            className="space-y-2"
                          >
                            {book.cover_url ? (
                              <img
                                src={book.cover_url}
                                alt={book.title}
                                className="w-full aspect-[2/3] object-cover rounded-lg shadow-lg"
                              />
                            ) : (
                              <div className="w-full aspect-[2/3] bg-gradient-to-br from-pink-200 to-purple-200 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-12 h-12 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-sm line-clamp-2">{book.title}</p>
                              <p className="text-xs text-gray-500">{book.author}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </AnimatedCard>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}