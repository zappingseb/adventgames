import { useState, useRef, useEffect } from 'react';
import './TypographyGameArea.css';

interface TypographyCardProps {
  id: string;
  text: string;
  fontName: string;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  onSwipe: (direction: 'left' | 'right') => void;
  disabled?: boolean;
  showFontName?: boolean;
}

function TypographyCard({ 
  text, 
  fontName, 
  fontFamily, 
  fontWeight, 
  fontStyle,
  onSwipe,
  disabled = false,
  showFontName = true
}: TypographyCardProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) {
      // Reset position with animation
      setPosition({ x: 0, y: 0 });
    }
  }, [isDragging]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    
    // Only move horizontally
    setPosition({ x: deltaX, y: 0 });
  };

  const handleTouchEnd = () => {
    if (disabled || !touchStartRef.current) return;
    
    const deltaX = position.x;
    const deltaTime = Date.now() - touchStartRef.current.time;
    const velocity = Math.abs(deltaX) / deltaTime;
    
    // Check if swipe threshold is met
    if (Math.abs(deltaX) > 100 || velocity > 0.3) {
      if (deltaX > 0) {
        onSwipe('right');
      } else {
        onSwipe('left');
      }
    }
    
    setIsDragging(false);
    touchStartRef.current = null;
  };

  // Mouse events for desktop
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (disabled || !touchStartRef.current) return;
      const deltaX = e.clientX - touchStartRef.current.x;
      setPosition({ x: deltaX, y: 0 });
    };

    const handleMouseUp = () => {
      if (disabled || !touchStartRef.current) return;
      
      const deltaX = position.x;
      const deltaTime = Date.now() - touchStartRef.current.time;
      const velocity = Math.abs(deltaX) / deltaTime;
      
      if (Math.abs(deltaX) > 100 || velocity > 0.3) {
        if (deltaX > 0) {
          onSwipe('right');
        } else {
          onSwipe('left');
        }
      }
      
      setIsDragging(false);
      touchStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, disabled, position, onSwipe]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
    setIsDragging(true);
  };

  const rotation = position.x * 0.1;
  const opacity = 1 - Math.abs(position.x) / 300;

  return (
    <div
      ref={cardRef}
      className={`typography-card ${isDragging ? 'dragging' : ''}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
        opacity: Math.max(0.5, opacity),
        touchAction: 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      <div 
        className="typography-card-text"
        style={{
          fontFamily,
          fontWeight,
          fontStyle,
        }}
      >
        {text}
      </div>
      {
        showFontName && (
          <div className="typography-card-font-name">{fontName}</div>
        )
      }
    </div>
  );
}

export default TypographyCard;

