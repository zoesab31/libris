import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AnimatedCard({ 
  children, 
  className,
  delay = 0,
  hover = true,
  onClick,
  ...props 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4,
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
      whileHover={hover ? { 
        y: -4,
        transition: { duration: 0.2 }
      } : undefined}
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl shadow-lg transition-shadow",
        hover && "hover:shadow-xl cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCardGrid({ children, className }) {
  return (
    <div className={cn("grid gap-4", className)}>
      {children}
    </div>
  );
}