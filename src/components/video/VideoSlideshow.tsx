import { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoSlideshowProps {
  frames: string[];
  duration?: number; // Durée par frame en secondes
  autoPlay?: boolean;
  className?: string;
}

export const VideoSlideshow = ({ 
  frames, 
  duration = 2.5, 
  autoPlay = false,
  className = "" 
}: VideoSlideshowProps) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentFrame((prev) => {
          if (prev >= frames.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, duration * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, frames.length, duration]);

  const togglePlay = () => {
    if (currentFrame >= frames.length - 1 && !isPlaying) {
      setCurrentFrame(0);
    }
    setIsPlaying(!isPlaying);
  };

  if (frames.length === 0) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <p className="text-muted-foreground">Aucune frame disponible</p>
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      <img 
        src={frames[currentFrame]} 
        alt={`Frame ${currentFrame + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
      />
      
      {/* Overlay de contrôle */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button
          size="lg"
          variant="secondary"
          onClick={togglePlay}
          className="rounded-full h-16 w-16 p-0"
        >
          {isPlaying ? (
            <Pause className="h-8 w-8" />
          ) : (
            <Play className="h-8 w-8 ml-1" />
          )}
        </Button>
      </div>

      {/* Indicateur de progression */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ 
            width: `${((currentFrame + (isPlaying ? 0.5 : 0)) / frames.length) * 100}%` 
          }}
        />
      </div>

      {/* Compteur de frames */}
      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
        {currentFrame + 1}/{frames.length}
      </div>
    </div>
  );
};
