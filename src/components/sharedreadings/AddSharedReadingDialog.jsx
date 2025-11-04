import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Users, Search, Check } from "lucide-react";
import { toast } from "sonner";

export default function AddSharedReadingDialog({ open, onOpenChange, books }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    book_id: "",
    start_date: "",
    end_date: "",
    chapters_per_day: 0,
    status: "À venir",
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ created_by: user?.email, status: "Acceptée" }),
    enabled: !!user && open,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const reading = await base44.entities.SharedReading.create({
        ...data,
        participants: [user.email, ...selectedFriends],
      });

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
        chapters_per_day: 0,
        status: "À venir",
      });
      setSelectedFriends([]);
      setSearchQuery("");
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

  const selectedBook = books.find(b => b.id === formData.book_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--dark-text)' }}>
            Nouvelle lecture commune
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Book selection */}
          <div>
            <Label htmlFor="book">Livre *</Label>
            <select
              id="book"
              value={formData.book_id}
              onChange={(e) => setFormData({ ...formData, book_id: e.target.value })}
              className="w-full p-3 rounded-lg border"
              style={{ borderColor: 'var(--beige)' }}
            >
              <option value="">Sélectionnez un livre</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} - {book.author}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Titre de la lecture commune</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={selectedBook ? `Lecture de "${selectedBook.title}"` : "Ex: Lecture d'été 2025"}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Date de début</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="end_date">Date de fin</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          {/* Chapters per day */}
          <div>
            <Label htmlFor="chapters">Chapitres par jour (optionnel)</Label>
            <Input
              id="chapters"
              type="number"
              min="0"
              value={formData.chapters_per_day}
              onChange={(e) => setFormData({ ...formData, chapters_per_day: parseInt(e.target.value) || 0 })}
              placeholder="Ex: 3"
            />
          </div>

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
            disabled={!formData.book_id || createMutation.isPending}
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