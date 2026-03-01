import { motion } from 'framer-motion';
import { Plus, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FourBooksSection({
  title,
  description,
  bookIds = [],
  allBooks,
  isOwnProfile,
  onEdit,
  emptyMessage
}) {
  const books = bookIds
    .map(id => allBooks.find(b => b.id === id))
    .filter(Boolean)
    .slice(0, 4);

  const placeholders = Array(4 - books.length).fill(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {title}
          </h2>
          <p className="text-sm text-gray-600">
            {description}
          </p>
        </div>
        {isOwnProfile && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Modifier
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {books.map((book, index) => (
          <motion.div
            key={book.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="group cursor-pointer"
          >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow mb-2">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                  <span className="text-4xl">📚</span>
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3">
                <p className="text-white text-xs text-center font-medium line-clamp-3">
                  {book.title}
                </p>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-900 line-clamp-2 text-center">
              {book.title}
            </p>
            <p className="text-xs text-gray-600 text-center">
              {book.author}
            </p>
          </motion.div>
        ))}

        {placeholders.map((_, index) => (
          <motion.div
            key={`placeholder-${index}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: (books.length + index) * 0.1 }}
            onClick={isOwnProfile ? onEdit : undefined}
            className={`aspect-[2/3] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center ${
              isOwnProfile ? 'cursor-pointer hover:border-pink-400 hover:bg-pink-50' : ''
            } transition-colors`}
          >
            {isOwnProfile && (
              <Plus className="w-8 h-8 text-gray-400" />
            )}
          </motion.div>
        ))}
      </div>

      {books.length === 0 && isOwnProfile && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">{emptyMessage}</p>
          <Button onClick={onEdit}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter mes livres
          </Button>
        </div>
      )}

      {books.length === 0 && !isOwnProfile && (
        <div className="text-center py-6">
          <p className="text-sm text-gray-400 italic">Pas encore renseigné 📚</p>
        </div>
      )}
    </motion.div>
  );
}