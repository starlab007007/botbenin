import React from 'react';

interface MediaRendererProps {
  content: string;
}

export const MediaRenderer: React.FC<MediaRendererProps> = ({ content }) => {
  // Fonction pour détecter si un lien est une image
  const isImageUrl = (url: string): boolean => {
    const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i;
    return imageExtensions.test(url) || url.includes('imgur.com');
  };

  // Fonction pour extraire et traiter les liens d'images
  const processImageLinks = (text: string): React.ReactNode[] => {
    // Regex pour détecter les URLs (http/https)
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[0];
      const startIndex = match.index;

      // Ajouter le texte avant l'URL
      if (startIndex > lastIndex) {
        parts.push(text.substring(lastIndex, startIndex));
      }

      // Si c'est une image, l'afficher directement
      if (isImageUrl(url)) {
        parts.push(
          <div key={startIndex} className="my-4">
            <img 
              src={url} 
              alt="Image partagée" 
              className="max-w-full h-auto rounded-lg shadow-lg border border-gray-200 hover:scale-105 transition-transform duration-300"
              style={{ maxHeight: '500px', minHeight: '200px' }}
              onError={(e) => {
                // En cas d'erreur de chargement, afficher le lien à la place
                const target = e.target as HTMLImageElement;
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p class="text-sm text-gray-600 mb-2">Impossible de charger l'image</p>
                      <a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all font-medium">${url}</a>
                    </div>
                  `;
                }
              }}
            />
          </div>
        );
      } else {
        // Pour les autres liens, les afficher normalement
        parts.push(
          <a 
            key={startIndex}
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 hover:text-blue-800 underline break-all font-medium"
            onClick={(e) => {
              // Permettre l'ouverture sans restrictions de sécurité
              e.preventDefault();
              const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
              if (newWindow) {
                newWindow.focus();
              }
            }}
          >
            {url}
          </a>
        );
      }

      lastIndex = urlRegex.lastIndex;
    }

    // Ajouter le texte restant
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  // Fonction pour formatter le texte avec markdown-like syntax
  const formatText = (text: string) => {
    // Diviser le texte en lignes pour traiter chaque ligne
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      // Traitement des différents styles de formatage
      let formattedLine = line;
      
      // Gras avec **texte** ou __texte__
      formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formattedLine = formattedLine.replace(/__(.*?)__/g, '<strong>$1</strong>');
      
      // Italique avec *texte* ou _texte_
      formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
      formattedLine = formattedLine.replace(/_(.*?)_/g, '<em>$1</em>');
      
      // Souligné avec ~~texte~~
      formattedLine = formattedLine.replace(/~~(.*?)~~/g, '<u>$1</u>');
      
      // Titres avec ###
      if (formattedLine.startsWith('### ')) {
        formattedLine = `<h3 class="text-lg font-bold text-blue-700 mt-3 mb-2">${formattedLine.substring(4)}</h3>`;
      } else if (formattedLine.startsWith('## ')) {
        formattedLine = `<h2 class="text-xl font-bold text-blue-800 mt-4 mb-2">${formattedLine.substring(3)}</h2>`;
      } else if (formattedLine.startsWith('# ')) {
        formattedLine = `<h1 class="text-2xl font-bold text-blue-900 mt-4 mb-3">${formattedLine.substring(2)}</h1>`;
      }
      
      // Listes avec - ou *
      if (formattedLine.trim().startsWith('- ')) {
        formattedLine = `<div class="ml-4 mb-1"><span class="text-blue-600 font-bold">•</span> ${formattedLine.trim().substring(2)}</div>`;
      } else if (formattedLine.trim().startsWith('* ')) {
        formattedLine = `<div class="ml-4 mb-1"><span class="text-blue-600 font-bold">•</span> ${formattedLine.trim().substring(2)}</div>`;
      }
      
      // Numérotation avec 1., 2., etc.
      const numberedMatch = formattedLine.match(/^(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        formattedLine = `<div class="ml-4 mb-2"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-bold mr-2">${numberedMatch[1]}</span>${numberedMatch[2]}</div>`;
      }
      
      // Citations avec >
      if (formattedLine.trim().startsWith('> ')) {
        formattedLine = `<blockquote class="border-l-4 border-blue-300 pl-4 py-2 bg-blue-50 italic text-gray-700 my-2">${formattedLine.trim().substring(2)}</blockquote>`;
      }
      
      // Lignes vides pour l'espacement
      if (formattedLine.trim() === '') {
        return <div key={index} className="h-2"></div>;
      }
      
      // Vérifier si la ligne contient des liens/images
      const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
      if (urlRegex.test(formattedLine)) {
        return (
          <div key={index} className="leading-relaxed">
            {processImageLinks(formattedLine)}
          </div>
        );
      }
      
      return (
        <div 
          key={index} 
          className="leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    });
  };

  return (
    <div className="space-y-1">
      {formatText(content)}
    </div>
  );
};
