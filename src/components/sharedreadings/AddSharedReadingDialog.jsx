import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Users, Search, Check, Calendar, BookOpen, X, Upload, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, addDays, format } from "date-fns";

export default function AddSharedReadingDialog({ open, onOpenChange, books }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [bookSearchQuery, setBookSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    book_id: "",
    start_date: "",
    end_date: "",
    duration_days: 14,
    total_chapters: 0,
    chapters_per_day: 0,
    use_custom_plan: false,
    custom_plan: [],
    status: "À venir",
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImage, setAiImage] = useState("");
  const aiFileRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Compute end_date from start_date + duration and chapters/day
  useEffect(() => {
    if (formData.start_date && formData.duration_days > 0) {
      const end = addDays(new Date(formData.start_date), formData.duration_days - 1);
      const endStr = end.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, end_date: endStr }));
    }
  }, [formData.start_date, formData.duration_days]);

  // Calculate chapters per day automatically (when not using custom plan)
  useEffect(() => {
    if (!formData.use_custom_plan && formData.duration_days > 0 && formData.total_chapters > 0) {
      const chaptersPerDay = Math.ceil(formData.total_chapters / formData.duration_days);
      setFormData(prev => ({ ...prev, chapters_per_day: chaptersPerDay }));
    }
  }, [formData.duration_days, formData.total_chapters, formData.use_custom_plan]);

  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ created_by: user?.email, status: "Acceptée" }),
    enabled: !!user && open,
  });

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooksForSharedReadings'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user && open,
  });

  // Filter to only show books that user has in their library
  const availableBooks = books.filter(book => 
    myBooks.some(ub => ub.book_id === book.id)
  );

  // Filter books based on search query
  const filteredBooks = bookSearchQuery 
    ? availableBooks.filter(book => 
        book.title.toLowerCase().includes(bookSearchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(bookSearchQuery.toLowerCase())
      )
    : availableBooks;

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Ensure title uses the selected book title
      const bookTitle = books.find(b => b.id === data.book_id)?.title || data.title || '';
      const payload = {
        ...data,
        title: bookTitle,
        participants: [user.email, ...selectedFriends],
      };
      const reading = await base44.entities.SharedReading.create(payload);

      // Create notifications for invited friends
      const notificationPromises = selectedFriends.map(friendEmail =>
        base44.entities.Notification.create({
          type: "shared_reading_update",
          title: "Nouvelle lecture commune",
          message: `${user?.display_name || user?.full_name || 'Une amie'} vous a invitée à lire "${books.find(b => b.id === data.book_id)?.title}"`,
          link_type: "shared_reading",
          link_id: reading.id,
          created_by: friendEmail,
          from_user: user.email,
        })
      );

      await Promise.all(notificationPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadings'] });
      toast.success("✅ Lecture commune créée !");
      onOpenChange(false);
      setFormData({
        title: "",
        book_id: "",
        start_date: "",
        end_date: "",
        duration_days: 14,
        total_chapters: 0,
        chapters_per_day: 0,
        use_custom_plan: false,
        custom_plan: [],
        status: "À venir",
      });
      setSelectedFriends([]);
      setSearchQuery("");
      setBookSearchQuery("");
      setAiImage("");
      setAiLoading(false);
    },
  });

  const toggleFriend = (friendEmail) => {
    setSelectedFriends(prev =>
      prev.includes(friendEmail)
        ? prev.filter(email => email !== friendEmail)
        : [...prev, friendEmail]
    );
  };

  const filteredFriends = myFriends.filter(f =>
    f.friend_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.friend_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedBook = availableBooks.find(b => b.id === formData.book_id);

  // Calculate program details
  const numberOfDays = formData.duration_days || (formData.start_date && formData.end_date 
    ? differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1
    : 0);

  const handleAiImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiLoading(true);
    try {
      const upload = await base44.integrations.Core.UploadFile({ file });
      setAiImage(upload.file_url);
      const schema = {
        type: 'object',
        properties: {
          days: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day_number: { type: 'number' },
                chapters_text: { type: 'string' }
              },
              required: ['day_number','chapters_text']
            }
          }
        },
        required: ['days']
      };
      const res = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: upload.file_url, json_schema: schema });
      if (res.status === 'success' && res.output?.days?.length) {
        const custom = res.output.days
          .filter(d => d.day_number && d.chapters_text)
          .map(d => ({ day_number: Number(d.day_number), chapters_text: String(d.chapters_text) }));
        setFormData(prev => ({ ...prev, custom_plan: custom, duration_days: prev.duration_days || custom.length, ai_plan_source_image: upload.file_url, use_custom_plan: true }));
        toast.success('Répartition importée');
      } else {
        toast.error("Impossible d'extraire la répartition");
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la lecture IA');
    } finally {
      setAiLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--dark-text)' }}>
            Nouvelle lecture commune
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Book selection with search */}
          <div>
            <Label htmlFor="book">Livre *</Label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                        style={{ color: 'var(--warm-pink)' }} />
                <Input
                  value={bookSearchQuery}
                  onChange={(e) => setBookSearchQuery(e.target.value)}
                  placeholder="Rechercher un livre par titre ou auteur..."
                  className="pl-10"
                />
              </div>
              
              {bookSearchQuery && filteredBooks.length > 0 && (
                <div className="max-h-64 overflow-y-auto border rounded-lg" style={{ borderColor: 'var(--beige)' }}>
                  {filteredBooks.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => {
                        setFormData({ ...formData, book_id: book.id, title: book.title });
                        setBookSearchQuery("");
                      }}
                      className="w-full p-3 text-left hover:bg-opacity-50 transition-colors flex items-center gap-3 border-b last:border-b-0"
                      style={{ 
                        backgroundColor: formData.book_id === book.id ? 'var(--soft-pink)' : 'white',
                        borderColor: 'var(--beige)'
                      }}
                    >
                      <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--beige)' }}>
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-5 h-5" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm line-clamp-1" 
                           style={{ color: formData.book_id === book.id ? 'white' : 'var(--dark-text)' }}>
                          {book.title}
                        </p>
                        <p className="text-xs" 
                           style={{ color: formData.book_id === book.id ? 'rgba(255,255,255,0.8)' : 'var(--warm-pink)' }}>
                          {book.author}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedBook && (
                <div className="p-3 rounded-lg flex items-center gap-3" style={{ backgroundColor: 'var(--cream)', border: '2px solid var(--soft-pink)' }}>
                  <div className="w-12 h-16 rounded overflow-hidden" style={{ backgroundColor: 'var(--beige)' }}>
                    {selectedBook.cover_url ? (
                      <img src={selectedBook.cover_url} alt={selectedBook.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-6 h-6" style={{ color: 'var(--warm-pink)' }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
                      {selectedBook.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                      {selectedBook.author}
                    </p>
                  </div>
                  <button
                    onClick={() => setFormData({ ...formData, book_id: "" })}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" style={{ color: 'var(--deep-pink)' }} />
                  </button>
                </div>
              )}

              {myBooks.length === 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--warm-pink)' }}>
                  💡 Ajoutez d'abord des livres à votre bibliothèque
                </p>
              )}
            </div>
          </div>

          {/* Le titre est automatiquement le titre du livre sélectionné */}

          {/* Date de début + durée (calcule automatiquement la date de fin) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Label htmlFor="start_date">Date de début *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="md:col-span-1">
              <Label>Durée</Label>
              <Select
                value={String(formData.duration_days || 14)}
                onValueChange={(v) => setFormData({ ...formData, duration_days: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">1 semaine (7 jours)</SelectItem>
                  <SelectItem value="14">2 semaines (14 jours)</SelectItem>
                  <SelectItem value="15">15 jours</SelectItem>
                  <SelectItem value="21">3 semaines (21 jours)</SelectItem>
                  <SelectItem value="28">4 semaines (28 jours)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Label>Date de fin (calculée)</Label>
              <Input value={formData.end_date ? format(new Date(formData.end_date), 'yyyy-MM-dd') : ''} disabled />
            </div>
          </div>

          {/* Total chapters */}
          <div>
            <Label htmlFor="total_chapters">Nombre total de chapitres</Label>
            <Input
              id="total_chapters"
              type="number"
              min="1"
              value={formData.total_chapters || ''}
              onChange={(e) => setFormData({ ...formData, total_chapters: parseInt(e.target.value) || 0 })}
              placeholder="Ex: 45"
            />
          </div>

          {/* Répartition personnalisée */}
          <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: 'var(--cream)' }}>
            <div className="flex items-center justify-between">
              <Label>Répartition des chapitres par jour</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="use_custom"
                  checked={!!formData.use_custom_plan}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, use_custom_plan: !!v }))}
                />
                <label htmlFor="use_custom" className="text-sm">Personnalisée</label>
              </div>
            </div>

            {formData.use_custom_plan ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" className="gap-2" onClick={() => aiFileRef.current?.click()}>
                    <Upload className="w-4 h-4" /> Importer une feuille
                  </Button>
                  <input ref={aiFileRef} type="file" accept="image/*" className="hidden" onChange={handleAiImport} />
                  <Button type="button" variant="outline" disabled className="gap-2" title="Utilise l'import image ci‑dessus">
                    <Wand2 className="w-4 h-4" /> Remplir via IA
                  </Button>
                  {aiLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 bg-white rounded-lg border" style={{ borderColor: 'var(--beige)' }}>
                  {Array.from({ length: numberOfDays || 0 }, (_, i) => i + 1).map((day) => {
                    const current = formData.custom_plan?.find(p => p.day_number === day)?.chapters_text || '';
                    return (
                      <div key={day} className="flex items-center gap-2">
                        <div className="w-14 text-xs font-bold text-center px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                          Jour {day}
                        </div>
                        <Input
                          placeholder="Ex: 1 à 4"
                          value={current}
                          onChange={(e) => {
                            const txt = e.target.value;
                            setFormData(prev => {
                              const others = (prev.custom_plan || []).filter(p => p.day_number !== day);
                              return { ...prev, custom_plan: [...others, { day_number: day, chapters_text: txt }] };
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                Répartition automatique: environ {formData.chapters_per_day || '-'} chapitres/jour
              </p>
            )}
          </div>

          {/* Program summary */}
          {numberOfDays > 0 && formData.total_chapters > 0 && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)', border: '2px solid var(--soft-pink)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5" style={{ color: 'var(--deep-pink)' }} />
                <h3 className="font-bold" style={{ color: 'var(--dark-text)' }}>
                  📋 Programme généré automatiquement
                </h3>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="text-center p-3 rounded-lg bg-white">
                  <p className="text-2xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                    {numberOfDays}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                    jour{numberOfDays > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-white">
                  <p className="text-2xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                    {formData.total_chapters || (formData.use_custom_plan ? formData.custom_plan.length ? '—' : 0 : 0)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                    chapitres (total)
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-white">
                  <p className="text-2xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                    {formData.use_custom_plan ? 'perso' : formData.chapters_per_day}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                    chap/jour
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white">
                <p className="text-sm text-center font-medium" style={{ color: 'var(--dark-text)' }}>
                  📖 Vous lirez <span className="font-bold" style={{ color: 'var(--deep-pink)' }}>
                    {formData.chapters_per_day} chapitre{formData.chapters_per_day > 1 ? 's' : ''}
                  </span> par jour pendant <span className="font-bold" style={{ color: 'var(--deep-pink)' }}>
                    {numberOfDays} jour{numberOfDays > 1 ? 's' : ''}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Friends selection */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5" style={{ color: 'var(--deep-pink)' }} />
              <h3 className="font-bold" style={{ color: 'var(--dark-text)' }}>
                Inviter des amies
              </h3>
              <span className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                ({selectedFriends.length} sélectionnée{selectedFriends.length > 1 ? 's' : ''})
              </span>
            </div>

            {myFriends.length > 0 ? (
              <>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                          style={{ color: 'var(--warm-pink)' }} />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher une amie..."
                    className="pl-10 bg-white"
                  />
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.id}
                      onClick={() => toggleFriend(friend.friend_email)}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:shadow-md"
                      style={{
                        backgroundColor: selectedFriends.includes(friend.friend_email) ? 'var(--soft-pink)' : 'white',
                        border: '2px solid',
                        borderColor: selectedFriends.includes(friend.friend_email) ? 'var(--deep-pink)' : 'var(--beige)',
                      }}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                           style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
                        {friend.friend_name?.[0]?.toUpperCase() || friend.friend_email?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm"
                           style={{ color: selectedFriends.includes(friend.friend_email) ? 'white' : 'var(--dark-text)' }}>
                          {friend.friend_name}
                        </p>
                        <p className="text-xs"
                           style={{ color: selectedFriends.includes(friend.friend_email) ? 'rgba(255,255,255,0.8)' : 'var(--warm-pink)' }}>
                          {friend.friend_email}
                        </p>
                      </div>
                      {selectedFriends.includes(friend.friend_email) && (
                        <Check className="w-5 h-5 text-white" />
                      )}
                    </div>
                  ))}

                  {filteredFriends.length === 0 && (
                    <p className="text-center py-4 text-sm" style={{ color: 'var(--warm-pink)' }}>
                      Aucune amie trouvée
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                  Ajoutez des amies pour créer des lectures communes
                </p>
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            onClick={() => createMutation.mutate(formData)}
            disabled={!formData.book_id || !formData.start_date || (!formData.total_chapters && !formData.use_custom_plan) || createMutation.isPending}
            className="w-full text-white font-medium py-6"
            style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
          >
            {createMutation.isPending ? (
              "Création..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Créer la lecture commune
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}