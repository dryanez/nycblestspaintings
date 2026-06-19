import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  aspectRatio?: string;
  className?: string;
}

export default function LazyImage({
  src,
  alt,
  className = '',
  aspectRatio = 'aspect-4/3',
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorOccurred, setErrorOccurred] = useState(false);

  useEffect(() => {
    // Reset states if URL switches
    setIsLoaded(false);
    setErrorOccurred(false);
  }, [src]);

  return (
    <div className={`relative overflow-hidden w-full bg-neutral-900 ${aspectRatio}`}>
      {/* SHIMMER SKELETON PLACEHOLDER */}
      {!isLoaded && !errorOccurred && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0B0C] animate-pulse">
          <div className="w-10 h-10 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin mb-2" />
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 uppercase tracking-widest font-mono">
            <Sparkles className="w-3 h-3 text-brand-gold animate-bounce" />
            <span>Chroma Load...</span>
          </div>
        </div>
      )}

      {/* ERROR FALLBACK */}
      {errorOccurred && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 p-4 border border-red-950/45 rounded-lg text-center">
          <span className="text-xs text-red-400 font-mono">Image load failed</span>
          <span className="text-[9px] text-neutral-500 mt-1 max-w-[150px] truncate">{alt}</span>
        </div>
      )}

      {/* ACTUAL IMAGE */}
      {!errorOccurred && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setErrorOccurred(true)}
          className={`w-full h-full object-cover transition-all duration-700 ease-out ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          } ${className}`}
          referrerPolicy="no-referrer"
          {...props}
        />
      )}
    </div>
  );
}
