import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookOpen, Plus, Trash2, Share2, Smile } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const ENTRY_TYPES = [
  { value: "note", label: "📝 Note", color: "#FF69B4" },
  { value: "citation", label: "💬 Citation", color: "#9C27B0" },
  { value: "réflexion", label: "💭 Réflexion", color: "#FF1493" },
  { value: "question", label: "❓ Question", color: "#E91E63" },
  { value: "théorie", label: "🔮 Théorie", color: "#C2185B" }
];

const MOODS = ["😊", "😍", "😢", "😱", "🤔", "😡", "🥰", "😭", "🔥"];

export default function ReadingJournal({ userBook, book }) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({
    entry_type: "note",
    content: "",
    page_number: "",
    chapter: "",
    mood: "",
    is_shared: false
  });

  const { data: entries = [] } = useQuery({
    queryKey: ['journalEntries', userBook.id],
    queryFn: () => base44.entities.ReadingJournalEntry.filter({ user_book_id: userBook.id }),
  });

  const createEntryMutation = useMutation({
    mutationFn: (entryData) => base44.entities.ReadingJournalEntry.create({
      ...entryData,
      book_id: book.id,
      user_book_id: userBook.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      setShowAddDialog(false);
      setNewEntry({
        entry_type: "note",
        content: "",
        page_number: "",
        chapter: "",
        mood: "",
        is_shared: false
      });
      toast.success("Entrée ajoutée au journal !");
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (entryId) => base44.entities.ReadingJournalEntry.delete(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      toast.success("Entrée supprimée");
    },
  });

  const toggleShareMutation = useMutation({
    mutationFn: ({ entryId, isShared }) => 
      base44.entities.ReadingJournalEntry.update(entryId, { is_shared: !isShared }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] });
      toast.success("Partage mis à jour");
    },
  });

  const sortedEntries = [...entries].sort((a, b) => {
    const pageA = a.page_number || 0;
    const pageB = b.page_number || 0;
    return pageB - pageA;
  });

  const getTypeConfig = (type) => ENTRY_TYPES.find(t => t.value === type) || ENTRY_TYPES[0];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
          <BookOpen className="w-5 h-5" style={{ color: 'var(--warm-pink)' }} />
          Journal de lecture
        </h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="text-white"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle entrée
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter une entrée</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Type d'entrée</label>
                  <Select value={newEntry.entry_type} onValueChange={(value) => setNewEntry({...newEntry, entry_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTRY_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Humeur</label>
                  <div className="flex gap-2 flex-wrap">
                    {MOODS.map(mood => (
                      <button
                        key={mood}
                        type="button"
                        onClick={() => setNewEntry({...newEntry, mood: newEntry.mood === mood ? "" : mood})}
                        className={`text-2xl p-2 rounded-lg transition-all ${
                          newEntry.mood === mood ? 'bg-pink-100 scale-110' : 'hover:bg-gray-100'
                        }`}
                      >
                        {mood}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Page</label>
                  <Input
                    type="number"
                    placeholder="Numéro de page"
                    value={newEntry.page_number}
                    onChange={(e) => setNewEntry({...newEntry, page_number: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Chapitre</label>
                  <Input
                    placeholder="Ex: Chapitre 5"
                    value={newEntry.chapter}
                    onChange={(e) => setNewEntry({...newEntry, chapter: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Contenu</label>
                <Textarea
                  placeholder="Écrivez votre note, citation, réflexion..."
                  value={newEntry.content}
                  onChange={(e) => setNewEntry({...newEntry, content: e.target.value})}
                  rows={6}
                />
              </div>

              {userBook.is_shared_reading && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="share-entry"
                    checked={newEntry.is_shared}
                    onChange={(e) => setNewEntry({...newEntry, is_shared: e.target.checked})}
                    className="rounded"
                  />
                  <label htmlFor="share-entry" className="text-sm">
                    Partager avec la lecture commune
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={() => createEntryMutation.mutate(newEntry)}
                  disabled={!newEntry.content || createEntryMutation.isPending}
                  className="text-white"
                  style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                >
                  Ajouter
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sortedEntries.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
          <p style={{ color: 'var(--dark-text)' }}>
            Aucune entrée dans votre journal de lecture
          </p>
          <p className="text-sm mt-2" style={{ color: 'var(--warm-pink)' }}>
            Ajoutez vos notes, citations et réflexions au fil de votre lecture
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedEntries.map(entry => {
            const typeConfig = getTypeConfig(entry.entry_type);
            return (
              <div
                key={entry.id}
                className="p-4 rounded-xl border-2 relative"
                style={{ borderColor: 'var(--beige)', backgroundColor: 'white' }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium text-white"
                      style={{ backgroundColor: typeConfig.color }}
                    >
                      {typeConfig.label}
                    </span>
                    {entry.page_number && (
                      <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                        Page {entry.page_number}
                      </span>
                    )}
                    {entry.chapter && (
                      <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                        {entry.chapter}
                      </span>
                    )}
                    {entry.mood && (
                      <span className="text-2xl">{entry.mood}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {userBook.is_shared_reading && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleShareMutation.mutate({ entryId: entry.id, isShared: entry.is_shared })}
                        className={entry.is_shared ? "text-pink-500" : "text-gray-400"}
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteEntryMutation.mutate(entry.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm whitespace-pre-wrap mb-2" style={{ color: 'var(--dark-text)' }}>
                  {entry.content}
                </p>

                <div className="flex justify-between items-center text-xs" style={{ color: 'var(--warm-pink)' }}>
                  <span>
                    {format(new Date(entry.created_date), 'dd MMMM yyyy', { locale: fr })}
                  </span>
                  {entry.is_shared && (
                    <span className="flex items-center gap-1">
                      <Share2 className="w-3 h-3" />
                      Partagé
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}