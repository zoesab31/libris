import { motion } from 'framer-motion';
import { Heart, Plus, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import AddCharacterDialog from './AddCharacterDialog';

export default function FavoriteCharacters({ 
  characters = [], 
  allBooks, 
  isOwnProfile,
  userId,
  onEdit
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const sortedCharacters = [...characters]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .slice(0, 4);

  const placeholders = Array(4 - sortedCharacters.length).fill(null);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl shadow-lg p-6 border-2 border-pink-200"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Heart className="w-6 h-6 text-pink-500" />
              Mes 4 personnages préférés
            </h2>
            <p className="text-sm text-gray-600">
              Les héros et héroïnes qui ont marqué mon cœur
            </p>
          </div>
          {isOwnProfile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDialog(true)}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Modifier
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedCharacters.map((character, index) => {
            const book = allBooks.find(b => b.id === character.book_id);
            
            return (
              <motion.div
                key={character.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 shadow-md">
                    {character.image_url ? (
                      <img
                        src={character.image_url}
                        alt={character.character_name}
                        className="w-full h-full object-cover"
                      />
                    ) : book?.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center">
                        <Heart className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 mb-1">
                      {character.character_name}
                    </h3>
                    {book && (
                      <p className="text-xs text-gray-600 mb-2">
                        De "{book.title}"
                      </p>
                    )}
                    {character.description && (
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {character.description}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {placeholders.map((_, index) => (
            <motion.div
              key={`placeholder-${index}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: (sortedCharacters.length + index) * 0.1 }}
              onClick={isOwnProfile ? () => setShowAddDialog(true) : undefined}
              className={`bg-white rounded-xl p-4 border-2 border-dashed border-pink-300 flex items-center justify-center min-h-[100px] ${
                isOwnProfile ? 'cursor-pointer hover:border-pink-500 hover:bg-pink-50' : ''
              } transition-colors`}
            >
              {isOwnProfile && (
                <div className="text-center">
                  <Plus className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Ajouter un personnage</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {sortedCharacters.length === 0 && isOwnProfile && (
          <div className="text-center py-8">
            <Heart className="w-16 h-16 text-pink-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Partagez vos personnages favoris !
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter mes personnages
            </Button>
          </div>
        )}
      </motion.div>

      <AddCharacterDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        userId={userId}
        existingCharacters={sortedCharacters}
        allBooks={allBooks}
      />
    </>
  );
}