import { motion } from "framer-motion";
import { useMemo } from "react";

export default function AnimatedLines() {
  const lines = useMemo(() => {
    const horizontal = Array.from({ length: 8 }, (_, i) => ({
      id: `h-${i}`,
      type: 'h',
      y: 10 + i * 12,
      width: 40 + Math.random() * 50,
      x: Math.random() * 60,
      dur: 6 + Math.random() * 8,
      delay: i * 0.7,
      opacity: 0.06 + Math.random() * 0.08,
    }));
    const diagonal = Array.from({ length: 6 }, (_, i) => ({
      id: `d-${i}`,
      type: 'd',
      x1: Math.random() * 100,
      y1: Math.random() * 40,
      x2: 20 + Math.random() * 80,
      y2: 60 + Math.random() * 40,
      dur: 8 + Math.random() * 6,
      delay: i * 1.1,
      opacity: 0.05 + Math.random() * 0.07,
    }));
    return [...horizontal, ...diagonal];
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0">
        {lines.filter(l => l.type === 'h').map(line => (
          <motion.line
            key={line.id}
            x1={`${line.x}%`}
            y1={`${line.y}%`}
            x2={`${line.x + line.width}%`}
            y2={`${line.y}%`}
            stroke="#C875B0"
            strokeWidth="1"
            strokeLinecap="round"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{
              opacity: [0, line.opacity, line.opacity * 1.5, line.opacity, 0],
              pathLength: [0, 1, 1, 0],
              x1: [`${line.x}%`, `${line.x + 5}%`, `${line.x - 3}%`, `${line.x + 5}%`],
              x2: [`${line.x + line.width}%`, `${line.x + line.width - 5}%`, `${line.x + line.width + 3}%`, `${line.x + line.width - 5}%`],
            }}
            transition={{ duration: line.dur, repeat: Infinity, ease: "easeInOut", delay: line.delay }}
          />
        ))}
        {lines.filter(l => l.type === 'd').map(line => (
          <motion.line
            key={line.id}
            x1={`${line.x1}%`}
            y1={`${line.y1}%`}
            x2={`${line.x2}%`}
            y2={`${line.y2}%`}
            stroke="#A070C8"
            strokeWidth="0.8"
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, line.opacity, line.opacity * 1.4, line.opacity * 0.6, 0],
              strokeDashoffset: [0, -30, 0, 30, 0],
            }}
            strokeDasharray="8 12"
            transition={{ duration: line.dur, repeat: Infinity, ease: "easeInOut", delay: line.delay }}
          />
        ))}
      </svg>

      {/* Lignes courbes ondulantes */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={`wave-${i}`}
          className="absolute w-full"
          style={{
            top: `${20 + i * 30}%`,
            height: '2px',
            background: `linear-gradient(90deg, transparent 0%, rgba(180,100,200,${0.07 + i * 0.03}) 30%, rgba(220,130,180,${0.1 + i * 0.02}) 60%, transparent 100%)`,
            borderRadius: '50%',
          }}
          animate={{
            scaleY: [1, 2.5, 0.8, 2, 1],
            y: [0, -6, 4, -8, 0],
            opacity: [0.4, 0.8, 0.5, 0.9, 0.4],
          }}
          transition={{
            duration: 7 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 1.5,
          }}
        />
      ))}
    </div>
  );
}