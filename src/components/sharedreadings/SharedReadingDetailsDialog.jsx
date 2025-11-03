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
import { Send, AlertTriangle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export default function SharedReadingDetailsDialog({ reading, book, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState({
    message: "",
    chapter: "",
    is_spoiler: false,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['sharedReadingMessages', reading.id],
    queryFn: () => base44.entities.SharedReadingMessage.filter({ shared_reading_id: reading.id }, '-created_date'),
    enabled: !!reading.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.SharedReadingMessage.create({
      ...data,
      shared_reading_id: reading.id,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--deep-brown)' }}>
            {reading.title}
          </DialogTitle>
          <p style={{ color: 'var(--warm-brown)' }}>
            {book?.title} - {book?.author}
          </p>
        </DialogHeader>

        <Tabs defaultValue="discussion" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="discussion">Discussion ({messages.length})</TabsTrigger>
            <TabsTrigger value="program">Programme</TabsTrigger>
          </TabsList>

          <TabsContent value="discussion" className="space-y-4 py-4">
            {/* New message form */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
              <h3 className="font-semibold mb-3" style={{ color: 'var(--deep-brown)' }}>
                Envoyer un message
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

            {/* Messages list */}
            <div className="space-y-3">
              {messages.length > 0 ? (
                messages.map((msg) => (
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
                          <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                                style={{ backgroundColor: 'var(--rose-gold)', color: 'var(--deep-brown)' }}>
                            <AlertTriangle className="w-3 h-3" />
                            Spoiler
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMessageMutation.mutate(msg.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--deep-brown)' }}>
                      {msg.message}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--warm-brown)' }}>
                  Aucun message pour le moment. Soyez la première à écrire !
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="program" className="py-4">
            <div className="space-y-4">
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--deep-brown)' }}>
                  Programme de lecture
                </h3>
                {reading.start_date && reading.end_date ? (
                  <div className="space-y-2 text-sm">
                    <p style={{ color: 'var(--warm-brown)' }}>
                      <strong>Début :</strong> {format(new Date(reading.start_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                    <p style={{ color: 'var(--warm-brown)' }}>
                      <strong>Fin :</strong> {format(new Date(reading.end_date), 'dd MMMM yyyy', { locale: fr })}
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
                    À propos du livre
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
                        <p className="text-xs" style={{ color: 'var(--warm-brown)' }}>
                          {book.synopsis}
                        </p>
                      )}
                    </div>
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