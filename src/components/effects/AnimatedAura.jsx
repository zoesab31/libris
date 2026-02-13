import React from "react";
import { motion } from "framer-motion";

export default function AnimatedAura() {
  // Blobs configuration (big soft gradients)
  const blobs = [
    { x: '10%', y: '15%', size: 420, colorFrom: 'rgba(255,105,180,0.25)', colorTo: 'rgba(255,182,193,0.18)', duration: 18, delay: 0 },
    { x: '70%', y: '10%', size: 520, colorFrom: 'rgba(156,39,176,0.22)', colorTo: 'rgba(233,30,99,0.18)', duration: 22, delay: 2 },
    { x: '20%', y: '65%', size: 500, colorFrom: 'rgba(255,20,147,0.20)', colorTo: 'rgba(255,182,193,0.16)', duration: 20, delay: 1.5 },
    { x: '75%', y: '70%', size: 440, colorFrom: 'rgba(233,30,99,0.20)', colorTo: 'rgba(156,39,176,0.16)', duration: 26, delay: 0.8 },
  ];

  // Sparkle dust configuration (tiny radial dots)
  const sparkles = React.useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3 + 1.2,
      opacity: Math.random() * 0.25 + 0.05,
      duration: Math.random() * 6 + 6,
      delay: Math.random() * 4,
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base soft gradient layer */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #FFF5F8 0%, #FFE9F0 50%, #FFDCE5 100%)'
        }}
      />

      {/* Animated blurred blobs */}
      {blobs.map((b, idx) => (
        <motion.div
          key={idx}
          className="absolute rounded-full"
          style={{
            left: b.x,
            top: b.y,
            width: b.size,
            height: b.size,
            filter: 'blur(60px)',
            background: `radial-gradient(circle at 30% 30%, ${b.colorFrom}, ${b.colorTo})`,
            transform: 'translate(-50%, -50%)'
          }}
          animate={{
            x: [0, 25, -15, 20, 0],
            y: [0, -20, 10, -15, 0],
            scale: [1, 1.08, 0.95, 1.05, 1],
            rotate: [0, 5, -5, 8, 0]
          }}
          transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Sparkle dust layer */}
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          className="absolute"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            borderRadius: '9999px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.05) 70%, transparent 100%)',
            opacity: s.opacity,
            mixBlendMode: 'screen',
            boxShadow: '0 0 12px rgba(255,255,255,0.25)'
          }}
          animate={{
            opacity: [s.opacity * 0.8, s.opacity * 1.2, s.opacity * 0.6, s.opacity * 1.0],
            y: [0, -6, -2, 0]
          }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}