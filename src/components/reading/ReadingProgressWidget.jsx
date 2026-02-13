import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Book, Clock, TrendingUp, Target, Plus, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import confetti from 'canvas-confetti';

export default function ReadingProgressWidget({ userBook, book, onUpdate, onFinished }) {
  const [currentPage, setCurrentPage] = useState(userBook.current_page || 0);
  const [showQuickUpdate, setShowQuickUpdate] = useState(false);

  const totalPages = book.page_count || 0;
  const progressPercentage = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  const estimatedTimeLeft = calculateEstimatedTime(currentPage, totalPages, userBook.start_date);

  const handleQuickUpdate = async (pagesToAdd) => {
    const newPage = Math.min(Math.max(currentPage + pagesToAdd, 0), totalPages);
    setCurrentPage(newPage);
    
    try {
      await base44.entities.UserBook.update(userBook.id, {
        current_page: newPage,
        last_read_date: new Date().toISOString()
      });

      toast.success(`📖 Page ${newPage}/${totalPages}`);
      
      if (onUpdate) onUpdate(newPage);

      if (newPage === totalPages) {
        handleBookFinished();
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleBookFinished = async () => {
    try {
      await base44.entities.UserBook.update(userBook.id, {
        status: 'Lu',
        end_date: new Date().toISOString(),
        current_page: totalPages
      });

      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FFB3D9', '#FF69B4', '#FFD700']
      });

      toast.success('🎉 Livre terminé ! Félicitations !');
      
      if (onFinished) onFinished();
    } catch (error) {
      console.error('Error finishing book:', error);
      toast.error('Erreur');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 bg-gradient-to-br from-white to-pink-50 rounded-2xl shadow-lg border border-pink-100"
    >
      <div className="flex items-start gap-4 mb-6">
        {book.cover_url && (
          <motion.img
            whileHover={{ scale: 1.05 }}
            src={book.cover_url}
            alt={book.title}
            className="w-20 h-28 object-cover rounded-lg shadow-md cursor-pointer"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-gray-900 line-clamp-2 mb-1">
            {book.title}
          </h3>
          <p className="text-sm text-gray-600 mb-2">{book.author}</p>
          <Badge variant="secondary">
            <Book className="w-3 h-3 mr-1" />
            En cours
          </Badge>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progression
          </span>
          <span className="text-sm font-bold text-pink-600">
            {Math.round(progressPercentage)}%
          </span>
        </div>
        
        <Progress 
          value={progressPercentage} 
          className="h-3 mb-2"
        />
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>Page {currentPage}</span>
          <span>{totalPages} pages</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickUpdate(10)}
          className="flex flex-col items-center py-3 h-auto"
        >
          <Plus className="w-4 h-4 mb-1" />
          <span className="text-xs">+10 pages</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickUpdate(20)}
          className="flex flex-col items-center py-3 h-auto"
        >
          <Plus className="w-4 h-4 mb-1" />
          <span className="text-xs">+20 pages</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowQuickUpdate(!showQuickUpdate)}
          className="flex flex-col items-center py-3 h-auto"
        >
          <Target className="w-4 h-4 mb-1" />
          <span className="text-xs">Personnalisé</span>
        </Button>
      </div>

      {showQuickUpdate && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mb-4 p-4 bg-white rounded-xl border border-gray-200"
        >
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              max={totalPages}
              value={currentPage}
              onChange={(e) => setCurrentPage(parseInt(e.target.value) || 0)}
              placeholder="Page actuelle"
              className="flex-1"
            />
            <Button onClick={() => handleQuickUpdate(0)}>
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatBox
          icon={<Clock className="w-4 h-4" />}
          label="Temps estimé"
          value={estimatedTimeLeft}
        />
        <StatBox
          icon={<TrendingUp className="w-4 h-4" />}
          label="Pages restantes"
          value={`${totalPages - currentPage}`}
        />
      </div>

      {progressPercentage >= 95 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mt-4"
        >
          <Button
            onClick={handleBookFinished}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3"
          >
            <Check className="w-5 h-5 mr-2" />
            Marquer comme terminé
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

function StatBox({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-100">
      <div className="text-pink-500">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function calculateEstimatedTime(currentPage, totalPages, startDate) {
  if (!startDate || currentPage === 0) return '—';

  const daysReading = Math.ceil((new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24));
  const pagesPerDay = currentPage / daysReading;
  const pagesLeft = totalPages - currentPage;
  const daysLeft = Math.ceil(pagesLeft / pagesPerDay);

  if (daysLeft === 0) return 'Bientôt fini !';
  if (daysLeft === 1) return '1 jour';
  if (daysLeft < 7) return `${daysLeft} jours`;
  if (daysLeft < 30) return `${Math.ceil(daysLeft / 7)} semaines`;
  return `${Math.ceil(daysLeft / 30)} mois`;
}