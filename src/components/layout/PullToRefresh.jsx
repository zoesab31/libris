import React, { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const threshold = 80;

  const handleTouchStart = (e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (refreshing || containerRef.current?.scrollTop > 0) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0 && distance < 150) {
      setPulling(true);
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      setPulling(false);
      setPullDistance(0);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error("Refresh error:", error);
      } finally {
        setRefreshing(false);
      }
    } else {
      setPulling(false);
      setPullDistance(0);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, refreshing]);

  const rotation = Math.min((pullDistance / threshold) * 360, 360);
  const opacity = Math.min(pullDistance / threshold, 1);

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex justify-center items-center pointer-events-none z-40"
        style={{
          height: pulling || refreshing ? '60px' : '0px',
          opacity: pulling || refreshing ? opacity : 0,
          transition: pulling ? 'none' : 'all 0.3s ease',
        }}
      >
        <div
          className="flex items-center justify-center w-10 h-10 rounded-full"
          style={{ 
            background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
            transform: refreshing ? 'none' : `rotate(${rotation}deg)`,
            transition: 'transform 0.1s ease'
          }}
        >
          <Loader2 
            className={`w-6 h-6 text-white ${refreshing ? 'animate-spin' : ''}`}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: pulling ? `translateY(${Math.min(pullDistance, 60)}px)` : 'none',
          transition: pulling ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}