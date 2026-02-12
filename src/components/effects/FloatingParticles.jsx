import React from "react";
import { motion } from "framer-motion";

export default function FloatingParticles({ count = 20 }) {
  const particles = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      size: Math.random() * 6 + 2,
      initialX: Math.random() * 100,
      initialY: Math.random() * 100,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
      color: ['#FF69B4', '#FFB6C1', '#FF1493', '#FFD700', '#E91E63', '#9C27B0'][Math.floor(Math.random() * 6)],
      opacity: Math.random() * 0.3 + 0.1,
    }));
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -999 }}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            opacity: particle.opacity,
            left: `${particle.initialX}%`,
            top: `${particle.initialY}%`,
            filter: 'blur(1px)',
          }}
          animate={{
            y: [0, -100, -200, -300, -400],
            x: [0, Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50, 0],
            opacity: [particle.opacity, particle.opacity * 1.5, particle.opacity * 0.8, particle.opacity * 1.2, 0],
            scale: [1, 1.2, 0.8, 1.1, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}