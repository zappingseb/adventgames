import { memo, useRef } from 'react';
import { FlakeType } from './GameArea';
import './Snowflake.css';

interface SnowflakeProps {
  id: string;
  x: number;
  y: number;
  onGround: boolean;
  type: FlakeType;
  onCatch: (id: string) => void;
  random: number;
}

function Snowflake({ id, x, y, onGround, type, onCatch, random }: SnowflakeProps) {
  const processedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent duplicate processing
    if (processedRef.current || onGround) {
      return;
    }
    
    processedRef.current = true;
    
    // Reset after a short delay
    setTimeout(() => {
        console.log('onCatch in snowflake', id);
        onCatch(id);
      processedRef.current = false;
    }, 100);
  };

  return (
    <div
      className={`snowflake ${onGround ? 'ground' : ''}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
    >
      {type === 'figma' ? (
        <img 
          src={random < 0.5 ? "/figma.png" : "/webflow.png"} 
          alt={random < 0.5 ? "Figma" : "Webflow"} 
          className="flake-icon" 
        />
      ) : type === 'indesign' ? (
        <img
          src={random < 0.5 ? "/sketch.png" : "/indesign.png"}
          alt={random < 0.5 ? "Sketch" : "InDesign"}
          className="flake-icon"
        />
      ) : (
        '❄️'
      )}
    </div>
  );
}

export default memo(Snowflake);

