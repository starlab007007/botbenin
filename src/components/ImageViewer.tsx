
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, X, Maximize2, RotateCw, Download } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt: string;
  className?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src, alt, className }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = alt || 'image';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  return (
    <>
      {/* Image preview avec amélioration de qualité */}
      <div className="relative group cursor-pointer">
        <img
          src={src}
          alt={alt}
          className={`w-full h-auto object-contain transition-all duration-300 ${className}`}
          style={{ 
            imageRendering: 'high-quality',
            maxHeight: '500px'
          }}
          onClick={() => setIsModalOpen(true)}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>

      {/* Modal HD avec contrôles avancés */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center">
          {/* Barre d'outils supérieure */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 0.25}
                className="h-8 w-8 p-0 text-white hover:bg-white/20 disabled:opacity-50"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              
              <div className="px-3 py-1 bg-black/30 rounded-full text-white text-sm font-medium min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 5}
                className="h-8 w-8 p-0 text-white hover:bg-white/20 disabled:opacity-50"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              
              <div className="w-px h-6 bg-white/30 mx-1"></div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRotate}
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
              >
                <RotateCw className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
              >
                <Download className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={resetView}
                className="h-8 px-3 text-white hover:bg-white/20 text-xs"
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Bouton fermer */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 z-20 h-10 w-10 p-0 text-white hover:bg-white/20 bg-black/20 backdrop-blur-sm rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Container d'image avec gestion du drag */}
          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              ref={imageRef}
              src={src}
              alt={alt}
              className={`max-w-none transition-transform duration-200 select-none ${
                isDragging ? 'cursor-grabbing' : zoom > 1 ? 'cursor-grab' : 'cursor-default'
              }`}
              style={{ 
                transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
                transformOrigin: 'center',
                imageRendering: 'high-quality',
                maxHeight: zoom === 1 ? '90vh' : 'none',
                maxWidth: zoom === 1 ? '90vw' : 'none'
              }}
              onMouseDown={handleMouseDown}
              draggable={false}
            />
          </div>

          {/* Instructions d'utilisation */}
          {zoom > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
              <div className="bg-black/50 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full">
                Glissez pour déplacer l'image
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
