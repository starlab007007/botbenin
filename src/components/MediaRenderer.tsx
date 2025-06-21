
import React from 'react';
import { UrlDetector, UrlInfo } from '@/utils/urlDetection';
import { ImageDisplay } from '@/components/ImageDisplay';

interface MediaRendererProps {
  content: string;
}

export const MediaRenderer: React.FC<MediaRendererProps> = ({ content }) => {
  // Fonction pour détecter et formater les emails
  const processEmails = (text: string): React.ReactNode[] => {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = emailRegex.exec(text)) !== null) {
      const email = match[0];
      const startIndex = match.index;

      if (startIndex > lastIndex) {
        const beforeText = text.substring(lastIndex, startIndex);
        parts.push(beforeText);
      }

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

    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      parts.push(remainingText);
    }

    return parts.length > 0 ? parts : [text];
  };

  // Fonction pour détecter et formater les numéros WhatsApp
  const processWhatsApp = (text: string): React.ReactNode[] => {
    const whatsappLinkRegex = /(https:\/\/wa\.me\/[0-9]+)/g;
    const whatsappTextRegex = /WhatsApp\s*:?\s*([+]?[0-9\s-()]+)/gi;
    
    const parts: React.ReactNode[] = [];
    let processedText = text;
    
    const whatsappMatches = [...processedText.matchAll(whatsappLinkRegex)];
    if (whatsappMatches.length > 0) {
      let lastIndex = 0;
      
      whatsappMatches.forEach((match) => {
        const url = match[0];
        const startIndex = match.index!;
        const phoneNumber = url.replace('https://wa.me/', '');

        if (startIndex > lastIndex) {
          const beforeText = processedText.substring(lastIndex, startIndex);
          parts.push(beforeText);
        }

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

      if (lastIndex < processedText.length) {
        const remainingText = processedText.substring(lastIndex);
        parts.push(remainingText);
      }

      return parts;
    }
    
    const textMatches = [...processedText.matchAll(whatsappTextRegex)];
    if (textMatches.length > 0) {
      let lastIndex = 0;
      
      textMatches.forEach((match) => {
        const fullMatch = match[0];
        const phoneNumber = match[1];
        const startIndex = match.index!;
        const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
        const whatsappUrl = `https://wa.me/${cleanNumber.replace('+', '')}`;

        if (startIndex > lastIndex) {
          const beforeText = processedText.substring(lastIndex, startIndex);
          parts.push(beforeText);
        }

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

      if (lastIndex < processedText.length) {
        const remainingText = processedText.substring(lastIndex);
        parts.push(remainingText);
      }

      return parts;
    }

    return [text];
  };

  // Fonction pour nettoyer le contenu des codes JSON et syntaxes indésirables
  const cleanContent = (text: string): string => {
    // Supprimer les blocs JSON complets
    let cleanedText = text.replace(/\{[^{}]*"Image_URL"[^{}]*\}/g, '');
    
    // Supprimer les patterns comme "Image_URL": "..."
    cleanedText = cleanedText.replace(/"Image_URL"\s*:\s*"[^"]*"/g, '');
    
    // Supprimer les patterns de code avec des crochets et accolades
    cleanedText = cleanedText.replace(/\{[^{}]*\}/g, '');
    cleanedText = cleanedText.replace(/\[[^\[\]]*\]/g, '');
    
    // Supprimer les mots-clés techniques isolés
    cleanedText = cleanedText.replace(/\b(Image_URL|Source|Description|json)\b\s*[:=]?\s*/gi, '');
    
    // Nettoyer les espaces multiples et retours à la ligne
    cleanedText = cleanedText.replace(/\s{2,}/g, ' ').trim();
    
    // Supprimer les lignes qui ne contiennent que des caractères spéciaux
    cleanedText = cleanedText.replace(/^[{}\[\]:,"'\s]*$/gm, '');
    
    return cleanedText;
  };

  // Fonction principale pour traiter les URLs avec détection intelligente
  const processUrlsWithMediaDetection = (text: string): React.ReactNode[] => {
    // Nettoyer d'abord le contenu
    const cleanedText = cleanContent(text);
    
    const urlInfos = UrlDetector.extractUrls(cleanedText);
    
    if (urlInfos.length === 0) {
      // Pas d'URLs trouvées, traiter pour emails et WhatsApp seulement
      return processContent(cleanedText);
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]\(\)]+)/gi;
    let match;
    let urlIndex = 0;

    while ((match = urlRegex.exec(cleanedText)) !== null) {
      const url = match[0];
      const startIndex = match.index;
      const urlInfo = urlInfos[urlIndex++];

      // Ajouter le texte avant l'URL (s'il y en a)
      if (startIndex > lastIndex) {
        const beforeText = cleanedText.substring(lastIndex, startIndex);
        if (beforeText.trim()) {
          const processedBefore = processContent(beforeText);
          parts.push(...processedBefore);
        }
      }

      // Traiter l'URL selon son type
      if (urlInfo.type === 'image' || urlInfo.type === 'google_sheet' || urlInfo.type === 'google_doc') {
        // Afficher comme image/media - ne pas afficher l'URL
        parts.push(
          <ImageDisplay 
            key={startIndex} 
            urlInfo={urlInfo}
          />
        );
      } else {
        // URL normale, afficher comme lien
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
    if (lastIndex < cleanedText.length) {
      const remainingText = cleanedText.substring(lastIndex);
      if (remainingText.trim()) {
        const processedRemaining = processContent(remainingText);
        parts.push(...processedRemaining);
      }
    }

    return parts;
  };

  // Fonction principale pour traiter le contenu (emails et WhatsApp)
  const processContent = (text: string): React.ReactNode[] => {
    // Traiter les WhatsApp d'abord
    const whatsappProcessed = processWhatsApp(text);
    
    if (whatsappProcessed.length > 1 || React.isValidElement(whatsappProcessed[0])) {
      return whatsappProcessed.map((part, index) => {
        if (typeof part === 'string') {
          return processEmails(part);
        }
        return part;
      }).flat();
    }
    
    return processEmails(whatsappProcessed[0] as string);
  };

  // Fonction pour formatter le texte avec markdown-like syntax
  const formatText = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
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
      
      // Vérifier si la ligne contient des liens/images - utiliser la nouvelle fonction
      const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]\(\)]+)/gi;
      if (urlRegex.test(formattedLine)) {
        return (
          <div key={index} className="leading-relaxed">
            {processUrlsWithMediaDetection(formattedLine)}
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
