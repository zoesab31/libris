import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Edit3, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AnimatedCard from '@/components/animations/AnimatedCard';

export default function KnowMeBooks({ user, allBooks }) {
  const [selectedBook, setSelectedBook] = useState(null);
  
  const knowMeBookIds = user?.know_me_books || [];
  const knowMeBooks = knowMeBookIds
    .map(id => allBooks.find(b => b.id === id))
    .filter(Boolean)
    .slice(0, 4);

  const emptySlots = 4 - knowMeBooks.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative"
    >
      <Card className="p-6 border-0 shadow-xl" style={{ background: 'linear-gradient(135deg, #FFF0F6, #FFE4EC)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
              <BookOpen className="w-6 h-6" />
              Lisez ces 4 livres pour me connaître
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--warm-pink)' }}>
              Les livres qui définissent qui je suis
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Modifier
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {knowMeBooks.map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setSelectedBook(book)}
              className="cursor-pointer"
            >
              <div className="relative group">
                <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-lg">
                  {book.cover_url ? (
                    <img 
                      src={book.cover_url} 
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-400 to-purple-400">
                      <BookOpen className="w-12 h-12 text-white" />
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <p className="font-semibold text-sm line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                    {book.title}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--warm-pink)' }}>
                    {book.author}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

          {Array.from({ length: emptySlots }).map((_, index) => (
            <motion.div
              key={`empty-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-2 border-dashed rounded-xl aspect-[2/3] flex items-center justify-center cursor-pointer hover:bg-white/50 transition-colors"
              style={{ borderColor: 'var(--soft-pink)' }}
            >
              <div className="text-center">
                <Plus className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--soft-pink)' }} />
                <p className="text-xs font-medium" style={{ color: 'var(--warm-pink)' }}>
                  Ajouter un livre
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Book Detail Modal */}
      <Dialog open={!!selectedBook} onOpenChange={() => setSelectedBook(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedBook?.title}</DialogTitle>
          </DialogHeader>
          {selectedBook && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <img 
                  src={selectedBook.cover_url} 
                  alt={selectedBook.title}
                  className="w-32 h-48 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <p className="font-medium mb-2">{selectedBook.author}</p>
                  <p className="text-sm text-gray-600">{selectedBook.synopsis}</p>
                </div>
              </div>
              {user?.know_me_books_notes?.[selectedBook.id] && (
                <div className="p-4 rounded-lg bg-pink-50">
                  <p className="font-semibold mb-2" style={{ color: 'var(--dark-text)' }}>
                    Pourquoi ce livre me représente :
                  </p>
                  <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                    {user.know_me_books_notes[selectedBook.id]}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}