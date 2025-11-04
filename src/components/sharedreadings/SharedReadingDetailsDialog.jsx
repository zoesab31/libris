import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, AlertTriangle, Trash2, Eye, EyeOff, UserPlus, Mail } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export default function SharedReadingDetailsDialog({ reading, book, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState(1);
  const [newMessage, setNewMessage] = useState({
    message: "",
    chapter: "",
    is_spoiler: false,
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [revealedSpoilers, setRevealedSpoilers] = useState(new Set());

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['sharedReadingMessages', reading.id],
    queryFn: () => base44.entities.SharedReadingMessage.filter({ 
      shared_reading_id: reading.id 
    }, '-created_date'),
    enabled: !!reading.id,
  });

  // Calculate number of days for the reading
  const numberOfDays = reading.start_date && reading.end_date 
    ? differenceInDays(new Date(reading.end_date), new Date(reading.start_date)) + 1
    : 0;

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.SharedReadingMessage.create({
      ...data,
      shared_reading_id: reading.id,
      day_number: selectedDay,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadingMessages', reading.id] });
      setNewMessage({ message: "", chapter: "", is_spoiler: false });
      toast.success("Message envoyé !");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (id) => base44.entities.SharedReadingMessage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadingMessages', reading.id] });
      toast.success("Message supprimé");
    },
  });

  const inviteFriendMutation = useMutation({
    mutationFn: async (email) => {
      const currentInvitations = reading.pending_invitations || [];
      await base44.entities.SharedReading.update(reading.id, {
        pending_invitations: [...currentInvitations, email]
      });
      
      // Create notification for the friend
      await base44.entities.Notification.create({
        type: "shared_reading_update",
        title: "Invitation à une lecture commune",
        message: `${user?.full_name || 'Une amie'} vous invite à lire "${book?.title}"`,
        link_type: "shared_reading",
        link_id: reading.id,
        created_by: email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadings'] });
      setInviteEmail("");
      toast.success("Invitation envoyée !");
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi de l'invitation");
    }
  });

  const toggleSpoiler = (messageId) => {
    setRevealedSpoilers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const messagesForDay = messages.filter(m => m.day_number === selectedDay);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--deep-brown)' }}>
            {reading.title}
          </DialogTitle>
          <p style={{ color: 'var(--warm-brown)' }}>
            {book?.title} - {book?.author}
          </p>
        </DialogHeader>

        <Tabs defaultValue="discussion" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discussion">Discussion</TabsTrigger>
            <TabsTrigger value="program">Programme</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
          </TabsList>

          <TabsContent value="discussion" className="space-y-4 py-4">
            {/* Day selector */}
            {numberOfDays > 0 && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                <Label className="text-sm font-bold mb-2 block" style={{ color: 'var(--dark-text)' }}>
                  📅 Sélectionner un jour
                </Label>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: numberOfDays }, (_, i) => i + 1).map(day => (
                    <Button
                      key={day}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDay(day)}
                      className={`${selectedDay === day ? 'font-bold' : ''}`}
                      style={{
                        backgroundColor: selectedDay === day ? 'var(--soft-pink)' : 'white',
                        color: selectedDay === day ? 'white' : 'var(--dark-text)',
                        borderColor: 'var(--beige)'
                      }}
                    >
                      J{day}
                    </Button>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--warm-pink)' }}>
                  {reading.chapters_per_day && `${reading.chapters_per_day} chapitre${reading.chapters_per_day > 1 ? 's' : ''} par jour`}
                </p>
              </div>
            )}

            {/* New message form */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
              <h3 className="font-semibold mb-3" style={{ color: 'var(--deep-brown)' }}>
                💬 Envoyer un message - Jour {selectedDay}
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="chapter">Chapitre (optionnel)</Label>
                  <Input
                    id="chapter"
                    value={newMessage.chapter}
                    onChange={(e) => setNewMessage({...newMessage, chapter: e.target.value})}
                    placeholder="Ex: Chapitre 5"
                  />
                </div>
                <div>
                  <Textarea
                    value={newMessage.message}
                    onChange={(e) => setNewMessage({...newMessage, message: e.target.value})}
                    placeholder="Votre message, théorie, impression..."
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="spoiler"
                      checked={newMessage.is_spoiler}
                      onCheckedChange={(checked) => setNewMessage({...newMessage, is_spoiler: checked})}
                    />
                    <Label htmlFor="spoiler" className="text-sm cursor-pointer">
                      Contient des spoilers
                    </Label>
                  </div>
                  <Button
                    onClick={() => sendMessageMutation.mutate(newMessage)}
                    disabled={!newMessage.message || sendMessageMutation.isPending}
                    className="text-white"
                    style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages list for selected day */}
            <div className="space-y-3">
              <h3 className="font-bold text-lg" style={{ color: 'var(--dark-text)' }}>
                Messages du Jour {selectedDay} ({messagesForDay.length})
              </h3>
              
              {messagesForDay.length > 0 ? (
                messagesForDay.map((msg) => {
                  const isSpoilerRevealed = revealedSpoilers.has(msg.id);
                  
                  return (
                    <div
                      key={msg.id}
                      className="p-4 rounded-xl border"
                      style={{ 
                        backgroundColor: 'white',
                        borderColor: 'var(--beige)'
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs font-medium" style={{ color: 'var(--warm-pink)' }}>
                            {msg.created_by?.split('@')[0] || 'Une lectrice'}
                          </p>
                          {msg.chapter && (
                            <p className="text-sm font-medium mb-1" style={{ color: 'var(--deep-brown)' }}>
                              {msg.chapter}
                            </p>
                          )}
                          <p className="text-xs" style={{ color: 'var(--soft-brown)' }}>
                            {format(new Date(msg.created_date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {msg.is_spoiler && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleSpoiler(msg.id)}
                              className="text-xs"
                              style={{ color: 'var(--deep-pink)' }}
                            >
                              {isSpoilerRevealed ? (
                                <>
                                  <EyeOff className="w-3 h-3 mr-1" />
                                  Masquer
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3 mr-1" />
                                  Révéler
                                </>
                              )}
                            </Button>
                          )}
                          {msg.created_by === user?.email && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMessageMutation.mutate(msg.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {msg.is_spoiler && !isSpoilerRevealed ? (
                        <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--cream)' }}>
                          <p className="text-sm font-medium" style={{ color: 'var(--warm-pink)' }}>
                            ⚠️ Contenu masqué (spoiler)
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: 'var(--deep-brown)' }}>
                          {msg.message}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--warm-brown)' }}>
                  Aucun message pour le jour {selectedDay}. Soyez la première à écrire !
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="program" className="py-4">
            <div className="space-y-4">
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--deep-brown)' }}>
                  📅 Programme de lecture
                </h3>
                {reading.start_date && reading.end_date ? (
                  <div className="space-y-2 text-sm">
                    <p style={{ color: 'var(--warm-brown)' }}>
                      <strong>Début :</strong> {format(new Date(reading.start_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                    <p style={{ color: 'var(--warm-brown)' }}>
                      <strong>Fin :</strong> {format(new Date(reading.end_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                    <p style={{ color: 'var(--warm-brown)' }}>
                      <strong>Durée :</strong> {numberOfDays} jour{numberOfDays > 1 ? 's' : ''}
                    </p>
                    {reading.chapters_per_day && (
                      <p style={{ color: 'var(--warm-brown)' }}>
                        <strong>Rythme :</strong> {reading.chapters_per_day} chapitre{reading.chapters_per_day > 1 ? 's' : ''} par jour
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--warm-brown)' }}>
                    Aucun programme défini
                  </p>
                )}
              </div>

              {book && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                  <h3 className="font-semibold mb-3" style={{ color: 'var(--deep-brown)' }}>
                    📖 À propos du livre
                  </h3>
                  <div className="flex gap-4">
                    {book.cover_url && (
                      <div className="w-24 h-36 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-bold mb-1" style={{ color: 'var(--deep-brown)' }}>
                        {book.title}
                      </p>
                      <p className="text-sm mb-2" style={{ color: 'var(--warm-brown)' }}>
                        par {book.author}
                      </p>
                      {book.synopsis && (
                        <p className="text-xs line-clamp-4" style={{ color: 'var(--warm-brown)' }}>
                          {book.synopsis}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="participants" className="py-4">
            <div className="space-y-4">
              {/* Invite friends */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--deep-brown)' }}>
                  <UserPlus className="w-5 h-5" />
                  Inviter une amie
                </h3>
                <div className="flex gap-2">
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Email de votre amie..."
                    type="email"
                  />
                  <Button
                    onClick={() => inviteFriendMutation.mutate(inviteEmail)}
                    disabled={!inviteEmail || inviteFriendMutation.isPending}
                    style={{ backgroundColor: 'var(--deep-pink)', color: 'white' }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Inviter
                  </Button>
                </div>
              </div>

              {/* Current participants */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--deep-brown)' }}>
                  👥 Participantes ({(reading.participants || []).length})
                </h3>
                <div className="space-y-2">
                  {(reading.participants || []).map((email, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg"
                         style={{ backgroundColor: 'white' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                           style={{ backgroundColor: 'var(--deep-pink)' }}>
                        {email[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                        {email}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending invitations */}
              {reading.pending_invitations && reading.pending_invitations.length > 0 && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                  <h3 className="font-semibold mb-3" style={{ color: 'var(--deep-brown)' }}>
                    ⏳ Invitations en attente ({reading.pending_invitations.length})
                  </h3>
                  <div className="space-y-2">
                    {reading.pending_invitations.map((email, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded-lg"
                           style={{ backgroundColor: 'white' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                             style={{ backgroundColor: 'var(--warm-pink)' }}>
                          {email[0].toUpperCase()}
                        </div>
                        <span className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                          {email}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}