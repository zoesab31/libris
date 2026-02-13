import { motion } from 'framer-motion';
import { Loader2, BookOpen, Heart, Sparkles } from 'lucide-react';

export default function LoadingSpinner({ 
  size = 'md',
  variant = 'default',
  message 
}) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const icons = {
    default: Loader2,
    book: BookOpen,
    heart: Heart,
    sparkle: Sparkles
  };

  const Icon = icons[variant] || icons.default;

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        }}
        className={sizes[size]}
      >
        <Icon className="w-full h-full text-pink-500" />
      </motion.div>
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-600"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}

export function LoadingOverlay({ message = "Chargement..." }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="bg-white rounded-2xl p-8 shadow-2xl">
        <LoadingSpinner size="lg" variant="sparkle" message={message} />
      </div>
    </motion.div>
  );
}