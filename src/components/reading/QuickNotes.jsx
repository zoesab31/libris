import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Plus, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function QuickNotes({ userBookId }) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState({ page: '', content: '' });
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ['readingNotes', userBookId],
    queryFn: () => base44.entities.ReadingNote.filter({ user_book_id: userBookId }),
    enabled: !!userBookId
  });

  const addNoteMutation = useMutation({
    mutationFn: (noteData) => base44.entities.ReadingNote.create(noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingNotes'] });
      setNewNote({ page: '', content: '' });
      setShowAddNote(false);
      toast.success('Note ajoutée ! 📝');
    }
  });

  const handleAddNote = () => {
    if (!newNote.content.trim()) return;

    addNoteMutation.mutate({
      user_book_id: userBookId,
      page: parseInt(newNote.page) || null,
      content: newNote.content
    });
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-yellow-500" />
          Mes notes de lecture
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddNote(!showAddNote)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>

      <AnimatePresence>
        {showAddNote && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200"
          >
            <div className="mb-3">
              <Input
                type="number"
                placeholder="Page (optionnel)"
                value={newNote.page}
                onChange={(e) => setNewNote({ ...newNote, page: e.target.value })}
                className="mb-2"
              />
              <Textarea
                placeholder="Votre note..."
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddNote} size="sm" disabled={addNoteMutation.isPending}>
                <Save className="w-4 h-4 mr-1" />
                Enregistrer
              </Button>
              <Button
                onClick={() => setShowAddNote(false)}
                size="sm"
                variant="ghost"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">
            Aucune note pour le moment
          </p>
        ) : (
          notes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-3 bg-yellow-50 rounded-lg border border-yellow-200"
            >
              {note.page && (
                <p className="text-xs text-gray-500 mb-1">
                  📄 Page {note.page}
                </p>
              )}
              <p className="text-sm text-gray-900">{note.content}</p>
              <p className="text-xs text-gray-400 mt-2">
                {new Date(note.created_date).toLocaleDateString('fr-FR')}
              </p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}