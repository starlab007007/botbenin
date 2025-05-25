
import React from 'react';

interface MediaRendererProps {
  content: string;
}

export const MediaRenderer: React.FC<MediaRendererProps> = ({ content }) => {
  const renderContentWithMedia = (text: string) => {
    // Regex pour détecter les URLs d'images
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)|https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?[^\s]*)?/gi;
    
    // Regex pour détecter les URLs de vidéos
    const videoRegex = /https?:\/\/[^\s]+\.(mp4|webm|ogg|avi|mov)(\?[^\s]*)?/gi;
    
    // Regex pour détecter les liens YouTube
    const youtubeRegex = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/gi;

    let parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Fonction pour ajouter du texte simple
    const addTextPart = (text: string, start: number, end: number) => {
      if (start < end) {
        const textContent = text.slice(start, end);
        if (textContent.trim()) {
          parts.push(
            <span key={`text-${start}`} className="whitespace-pre-wrap">
              {textContent}
            </span>
          );
        }
      }
    };

    // Traiter les images (format markdown et URLs directes)
    let match;
    const allMatches: Array<{index: number, length: number, type: string, content: any}> = [];

    // Collecter toutes les correspondances d'images
    while ((match = imageRegex.exec(text)) !== null) {
      const isMarkdown = match[0].startsWith('![');
      allMatches.push({
        index: match.index,
        length: match[0].length,
        type: 'image',
        content: {
          url: isMarkdown ? match[2] : match[0],
          alt: isMarkdown ? match[1] : 'Image',
          isMarkdown
        }
      });
    }

    // Collecter toutes les correspondances de vidéos
    videoRegex.lastIndex = 0;
    while ((match = videoRegex.exec(text)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        type: 'video',
        content: {
          url: match[0]
        }
      });
    }

    // Collecter toutes les correspondances YouTube
    youtubeRegex.lastIndex = 0;
    while ((match = youtubeRegex.exec(text)) !== null) {
      const videoId = match[3];
      allMatches.push({
        index: match.index,
        length: match[0].length,
        type: 'youtube',
        content: {
          videoId,
          url: match[0]
        }
      });
    }

    // Trier par index
    allMatches.sort((a, b) => a.index - b.index);

    // Construire le rendu
    allMatches.forEach((mediaMatch, i) => {
      // Ajouter le texte avant ce média
      addTextPart(text, lastIndex, mediaMatch.index);

      // Ajouter le média
      if (mediaMatch.type === 'image') {
        parts.push(
          <div key={`image-${i}`} className="my-3">
            <img
              src={mediaMatch.content.url}
              alt={mediaMatch.content.alt}
              className="max-w-full h-auto rounded-lg shadow-md"
              style={{ maxHeight: '400px' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                // Afficher le lien original en cas d'erreur
                const parent = target.parentNode as HTMLElement;
                if (parent) {
                  const link = document.createElement('a');
                  link.href = mediaMatch.content.url;
                  link.textContent = mediaMatch.content.isMarkdown 
                    ? `[${mediaMatch.content.alt}](${mediaMatch.content.url})`
                    : mediaMatch.content.url;
                  link.className = 'text-blue-500 hover:text-blue-700 underline break-all';
                  link.target = '_blank';
                  link.rel = 'noopener noreferrer';
                  parent.appendChild(link);
                }
              }}
            />
          </div>
        );
      } else if (mediaMatch.type === 'video') {
        parts.push(
          <div key={`video-${i}`} className="my-3">
            <video
              src={mediaMatch.content.url}
              controls
              className="max-w-full h-auto rounded-lg shadow-md"
              style={{ maxHeight: '400px' }}
            >
              Votre navigateur ne supporte pas la lecture de vidéos.
              <a 
                href={mediaMatch.content.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 underline"
              >
                Voir la vidéo
              </a>
            </video>
          </div>
        );
      } else if (mediaMatch.type === 'youtube') {
        parts.push(
          <div key={`youtube-${i}`} className="my-3">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${mediaMatch.content.videoId}`}
                title="Vidéo YouTube"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full rounded-lg shadow-md"
              />
            </div>
          </div>
        );
      }

      lastIndex = mediaMatch.index + mediaMatch.length;
    });

    // Ajouter le texte restant
    addTextPart(text, lastIndex, text.length);

    return parts.length > 0 ? parts : [<span key="default" className="whitespace-pre-wrap">{text}</span>];
  };

  return <div className="media-content">{renderContentWithMedia(content)}</div>;
};
