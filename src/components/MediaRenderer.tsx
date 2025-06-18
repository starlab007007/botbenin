import React from 'react';
import { MessageCircle } from 'lucide-react';

interface MediaRendererProps {
  content: string;
}

export const MediaRenderer: React.FC<MediaRendererProps> = ({ content }) => {
  // Fonction pour détecter si un lien est une image
  const isImageUrl = (url: string): boolean => {
    const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i;
    return imageExtensions.test(url) || url.includes('imgur.com') || url.includes('imagekit.io');
  };

  // Fonction pour détecter et formater les emails
  const processEmails = (text: string): React.ReactNode[] => {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = emailRegex.exec(text)) !== null) {
      const email = match[0];
      const startIndex = match.index;

      // Ajouter le texte avant l'email
      if (startIndex > lastIndex) {
        const beforeText = text.substring(lastIndex, startIndex);
        parts.push(beforeText);
      }

      // Ajouter l'email comme lien cliquable
      parts.push(
        <a 
          key={startIndex}
          href={`mailto:${email}`}
          className="text-blue-600 hover:text-blue-800 underline font-medium"
        >
          {email}
        </a>
      );

      lastIndex = emailRegex.lastIndex;
    }

    // Ajouter le texte restant
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      parts.push(remainingText);
    }

    return parts.length > 0 ? parts : [text];
  };

  // Fonction pour détecter et formater les numéros WhatsApp
  const processWhatsApp = (text: string): React.ReactNode[] => {
    // Détecter les liens WhatsApp
    const whatsappLinkRegex = /(https:\/\/wa\.me\/[0-9]+)/g;
    const whatsappTextRegex = /WhatsApp\s*:?\s*([+]?[0-9\s-()]+)/gi;
    
    const parts: React.ReactNode[] = [];
    let processedText = text;
    
    // Traiter les liens WhatsApp directs
    const whatsappMatches = [...processedText.matchAll(whatsappLinkRegex)];
    if (whatsappMatches.length > 0) {
      let lastIndex = 0;
      
      whatsappMatches.forEach((match) => {
        const url = match[0];
        const startIndex = match.index!;
        const phoneNumber = url.replace('https://wa.me/', '');

        // Ajouter le texte avant le lien
        if (startIndex > lastIndex) {
          const beforeText = processedText.substring(lastIndex, startIndex);
          parts.push(beforeText);
        }

        // Ajouter l'icône WhatsApp cliquable
        parts.push(
          <a 
            key={startIndex}
            href={url}
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center bg-green-50 border border-green-200 rounded-lg px-3 py-2 my-1 hover:bg-green-100 transition-colors"
          >
            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.685"/>
            </svg>
            <span className="text-green-700 font-medium">+{phoneNumber}</span>
          </a>
        );

        lastIndex = startIndex + url.length;
      });

      // Ajouter le texte restant
      if (lastIndex < processedText.length) {
        const remainingText = processedText.substring(lastIndex);
        parts.push(remainingText);
      }

      return parts;
    }
    
    // Traiter les mentions de WhatsApp avec numéro
    const textMatches = [...processedText.matchAll(whatsappTextRegex)];
    if (textMatches.length > 0) {
      let lastIndex = 0;
      
      textMatches.forEach((match) => {
        const fullMatch = match[0];
        const phoneNumber = match[1];
        const startIndex = match.index!;
        const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
        const whatsappUrl = `https://wa.me/${cleanNumber.replace('+', '')}`;

        // Ajouter le texte avant la mention WhatsApp
        if (startIndex > lastIndex) {
          const beforeText = processedText.substring(lastIndex, startIndex);
          parts.push(beforeText);
        }

        // Ajouter l'icône WhatsApp cliquable
        parts.push(
          <a 
            key={startIndex}
            href={whatsappUrl}
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center bg-green-50 border border-green-200 rounded-lg px-3 py-2 my-1 hover:bg-green-100 transition-colors"
          >
            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.685"/>
            </svg>
            <span className="text-green-700 font-medium">{cleanNumber}</span>
          </a>
        );

        lastIndex = startIndex + fullMatch.length;
      });

      // Ajouter le texte restant
      if (lastIndex < processedText.length) {
        const remainingText = processedText.substring(lastIndex);
        parts.push(remainingText);
      }

      return parts;
    }

    return [text];
  };

  // Fonction pour nettoyer le HTML indésirable
  const cleanHtmlSyntax = (text: string): string => {
    // Supprimer les balises HTML visibles dans le texte
    let cleanedText = text;
    
    // Supprimer les balises div, span, strong qui apparaissent comme du texte
    cleanedText = cleanedText.replace(/<\/?div[^>]*>/g, '');
    cleanedText = cleanedText.replace(/<\/?span[^>]*>/g, '');
    cleanedText = cleanedText.replace(/<\/?strong[^>]*>/g, '');
    cleanedText = cleanedText.replace(/class=['"][^'"]*['"]/g, '');
    
    // Nettoyer les attributs de classe orphelins
    cleanedText = cleanedText.replace(/\s*class\s*=\s*['"][^'"]*['"]/g, '');
    
    return cleanedText;
  };

  // Fonction pour extraire et traiter les liens d'images - CORRIGÉE pour résoudre les problèmes de chargement
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
        const beforeText = text.substring(lastIndex, startIndex);
        const processedBefore = processContent(beforeText);
        parts.push(...processedBefore);
      }

      // Si c'est une image, l'afficher directement
      if (isImageUrl(url)) {
        console.log('Détection d\'image:', url);
        
        parts.push(
          <div key={startIndex} className="my-4">
            <div className="relative">
              <img 
                src={url} 
                alt="Image" 
                className="max-w-full h-auto rounded-lg shadow-lg border border-gray-200"
                crossOrigin="anonymous"
                loading="lazy"
                onLoad={(e) => {
                  console.log('Image chargée avec succès:', url);
                  const target = e.target as HTMLImageElement;
                  target.style.opacity = '1';
                }}
                onError={(e) => {
                  console.error('Erreur de chargement de l\'image:', url);
                  const target = e.target as HTMLImageElement;
                  const container = target.closest('.relative');
                  if (container) {
                    container.innerHTML = `
                      <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div class="flex items-center space-x-2">
                          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <span class="text-blue-800 font-medium">Image</span>
                        </div>
                        <p class="text-sm text-blue-600 mt-2">Cliquez pour voir l'image</p>
                        <a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-block mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                          Ouvrir l'image
                        </a>
                      </div>
                    `;
                  }
                }}
                style={{ opacity: '0', transition: 'opacity 0.3s ease' }}
              />
            </div>
          </div>
        );
      } else {
        // Pour les autres liens (non-images), les afficher normalement
        parts.push(
          <a 
            key={startIndex}
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 hover:text-blue-800 underline break-all font-medium"
          >
            {url}
          </a>
        );
      }

      lastIndex = urlRegex.lastIndex;
    }

    // Ajouter le texte restant
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      const processedRemaining = processContent(remainingText);
      parts.push(...processedRemaining);
    }

    return parts;
  };

  // Fonction principale pour traiter le contenu
  const processContent = (text: string): React.ReactNode[] => {
    // Nettoyer d'abord le HTML indésirable
    const cleanedText = cleanHtmlSyntax(text);
    
    // Traiter les WhatsApp d'abord
    const whatsappProcessed = processWhatsApp(cleanedText);
    
    // Si le traitement WhatsApp a retourné des éléments React, les traiter individuellement
    if (whatsappProcessed.length > 1 || React.isValidElement(whatsappProcessed[0])) {
      return whatsappProcessed.map((part, index) => {
        if (typeof part === 'string') {
          return processEmails(part);
        }
        return part;
      }).flat();
    }
    
    // Sinon, traiter directement les emails
    return processEmails(whatsappProcessed[0] as string);
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
      
      // Traiter le contenu pour les emails et WhatsApp
      const processedContent = processContent(formattedLine);
      
      // Si on a du contenu formaté avec du HTML, l'afficher avec dangerouslySetInnerHTML
      if (typeof processedContent[0] === 'string' && processedContent.length === 1 && 
          (formattedLine.includes('<') || formattedLine.includes('strong>') || formattedLine.includes('<em>'))) {
        return (
          <div 
            key={index} 
            className="leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formattedLine }}
          />
        );
      }
      
      // Sinon, afficher le contenu traité normalement
      return (
        <div key={index} className="leading-relaxed">
          {processedContent}
        </div>
      );
    });
  };

  return (
    <div className="space-y-1">
      {formatText(content)}
    </div>
  );
};
