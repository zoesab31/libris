import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function FadeIn({ 
  children, 
  delay = 0, 
  duration = 0.5,
  y = 20,
  className 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration,
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FadeInStagger({ children, staggerDelay = 0.1, className }) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <FadeIn key={index} delay={index * staggerDelay}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
}