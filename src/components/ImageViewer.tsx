
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, X, Maximize2, Minimize2 } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt: string;
  className?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src, alt, className }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const resetZoom = () => {
    setZoom(1);
  };

  return (
    <>
      {/* Image preview */}
      <div className="my-3 relative group">
        <img
          src={src}
          alt={alt}
          className={`max-w-full h-auto rounded-lg shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg ${className}`}
          style={{ maxHeight: '400px' }}
          onClick={() => setIsModalOpen(true)}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Maximize2 className="w-6 h-6 text-white drop-shadow-lg" />
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-[90vw] max-h-[90vh] overflow-auto">
            {/* Controls */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="bg-white/90 hover:bg-white text-gray-800"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={resetZoom}
                className="bg-white/90 hover:bg-white text-gray-800"
              >
                {Math.round(zoom * 100)}%
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="bg-white/90 hover:bg-white text-gray-800"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="bg-white/90 hover:bg-white text-gray-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Image */}
            <img
              src={src}
              alt={alt}
              className="rounded-lg shadow-2xl transition-transform duration-200"
              style={{ 
                transform: `scale(${zoom})`,
                transformOrigin: 'center'
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};
