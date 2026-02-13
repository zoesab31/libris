import { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { RefreshCw, Sparkles } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children, threshold = 80 }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canPull, setCanPull] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);
  const controls = useAnimation();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartY = 0;

    const handleTouchStart = (e) => {
      if (container.scrollTop === 0) {
        setCanPull(true);
        touchStartY = e.touches[0].clientY;
        startY.current = touchStartY;
      }
    };

    const handleTouchMove = (e) => {
      if (!canPull || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY;

      if (diff > 0 && container.scrollTop === 0) {
        e.preventDefault();
        const distance = Math.min(diff * 0.5, threshold * 1.5);
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = async () => {
      if (!canPull) return;

      setCanPull(false);

      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        controls.start({
          rotate: 360,
          transition: { duration: 0.6, repeat: Infinity, ease: "linear" }
        });

        if (navigator.vibrate) {
          navigator.vibrate(30);
        }

        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh error:', error);
        }

        await controls.start({ rotate: 0, transition: { duration: 0 } });
        setIsRefreshing(false);
      }

      setPullDistance(0);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canPull, isRefreshing, pullDistance, threshold, onRefresh, controls]);

  const progress = Math.min(pullDistance / threshold, 1);
  const opacity = Math.min(progress * 2, 1);
  const scale = 0.5 + (progress * 0.5);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-auto">
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-50"
        style={{
          height: pullDistance,
          opacity: opacity
        }}
      >
        <motion.div
          animate={controls}
          style={{ scale }}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-lg"
        >
          {isRefreshing ? (
            <RefreshCw className="w-6 h-6 text-white" />
          ) : (
            <Sparkles className="w-6 h-6 text-white" />
          )}
        </motion.div>
      </motion.div>

      <div style={{ paddingTop: pullDistance }}>
        {children}
      </div>
    </div>
  );
}