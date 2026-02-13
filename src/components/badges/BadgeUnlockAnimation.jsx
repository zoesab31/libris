import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function BadgeUnlockAnimation({ badge, onClose }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }

    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [badge, onClose]);

  const handleShare = () => {
    const text = `Je viens de débloquer le badge "${badge.name}" ${badge.icon} sur Libris ! 🎉`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Nouveau badge débloqué !',
        text: text,
        url: window.location.origin
      });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Texte copié !');
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setShow(false);
            setTimeout(onClose, 500);
          }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20
            }}
            className="relative max-w-md p-8 rounded-3xl text-center"
            style={{
              background: `linear-gradient(135deg, ${badge.color_primary}, ${badge.color_secondary})`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1
              }}
              className="text-8xl mb-4"
            >
              {badge.icon}
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white mb-2"
            >
              Badge Débloqué !
            </motion.h2>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl font-semibold text-white/90 mb-2"
            >
              {badge.name}
            </motion.p>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white/80 mb-4"
            >
              {badge.description}
            </motion.p>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
              className="inline-block px-6 py-2 bg-white/20 rounded-full text-white font-bold"
            >
              +{badge.points} points
            </motion.div>

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 px-8 py-3 bg-white text-gray-900 font-bold rounded-xl hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
              onClick={handleShare}
            >
              <Share2 className="w-5 h-5" />
              Partager
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}