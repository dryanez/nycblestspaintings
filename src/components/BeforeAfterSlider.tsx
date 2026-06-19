import React, { useState, useRef, useEffect } from 'react';
import { Eye, ChevronsLeftRight } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export default function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Before Restoration',
  afterLabel = 'After Blest Finish',
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage (0 to 100)
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Attach global event listeners during drag so slider remains responsive even if mouse goes outside
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  return (
    <div
      id="before-after-container"
      ref={containerRef}
      className="relative w-full h-[320px] md:h-[450px] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 select-none cursor-ew-resize group"
      onMouseDown={startDrag}
      onTouchStart={startDrag}
    >
      {/* AFTER IMAGE (Background - occupies entire width) */}
      <img
        id="after-image"
        src={afterUrl}
        alt="After Paint Finish"
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        referrerPolicy="no-referrer"
      />
      <div className="absolute right-4 bottom-4 bg-[#0B0B0C]/80 backdrop-blur-xs px-3 py-1.5 rounded-md text-xs font-semibold tracking-wider text-brand-gold border border-brand-gold/30 pointer-events-none transition-opacity duration-300 group-hover:opacity-100 opacity-90">
        {afterLabel}
      </div>

      {/* BEFORE IMAGE (Foreground - clipped by width) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          id="before-image"
          src={beforeUrl}
          alt="Before Paint Condition"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover max-w-none"
          style={{ width: containerRef.current?.offsetWidth || '100vw', height: '100%' }}
          referrerPolicy="no-referrer"
        />
        <div className="absolute left-4 bottom-4 bg-neutral-900/85 backdrop-blur-xs px-3 py-1.5 rounded-md text-xs font-semibold tracking-wider text-neutral-300 border border-neutral-700 pointer-events-none opacity-90">
          {beforeLabel}
        </div>
      </div>

      {/* VERSTICAL DIVIDER BAR */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-brand-gold z-10 transition-colors pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        {/* DRAG HANDLE */}
        <div
          id="slider-drag-handle"
          className={`absolute -translate-x-1/2 -translate-y-1/2 top-1/2 w-10 h-10 rounded-full bg-brand-gold text-[#0B0B0C] shadow-lg border-2 border-white flex items-center justify-center pointer-events-auto transition-all ${
            isDragging ? 'scale-110 bg-[#f7d667]' : 'hover:scale-105 hover:bg-[#f7d667]'
          }`}
        >
          <ChevronsLeftRight className="w-5 h-5 stroke-[2.5]" />
        </div>
      </div>

      {/* Instruction Hover Guide */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] text-white tracking-widest uppercase font-medium pointer-events-none transition-all duration-300 group-hover:opacity-0 flex items-center gap-1.5 shadow-sm">
        <Eye className="w-3 h-3" />
        <span>Drag center slider</span>
      </div>
    </div>
  );
}
