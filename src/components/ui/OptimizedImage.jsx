import React, { useState } from 'react';

export default function OptimizedImage({ src, alt, className, style, onLoad }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
  };

  if (error || !src) {
    return (
      <div className={className} style={{ ...style, backgroundColor: '#FFE4EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#FF69B4', fontSize: '2rem' }}>📚</span>
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className={className} style={{ ...style, backgroundColor: '#FFE4EC' }}>
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-pulse w-8 h-8 rounded-full" style={{ backgroundColor: '#FF69B4' }} />
          </div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${!loaded ? 'hidden' : ''}`}
        style={style}
        loading="lazy"
        onLoad={handleLoad}
        onError={handleError}
      />
    </>
  );
}