
import React from 'react';

interface ImageDisplayProps {
  url: string;
  index: number;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ url, index }) => {
  return (
    <div key={index} className="my-4 flex justify-center">
      <img 
        src={url} 
        alt="Image du bot" 
        className="max-w-full max-h-96 rounded-lg shadow-md border border-gray-200 object-contain"
        loading="lazy"
        onLoad={() => console.log('[MediaRenderer] Image chargée:', url)}
        onError={(e) => {
          console.error('[MediaRenderer] Erreur chargement image:', url);
          const img = e.target as HTMLImageElement;
          img.style.display = 'none';
          const errorDiv = document.createElement('div');
          errorDiv.className = 'p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm';
          errorDiv.textContent = 'Impossible de charger l\'image';
          img.parentNode?.appendChild(errorDiv);
        }}
      />
    </div>
  );
};
