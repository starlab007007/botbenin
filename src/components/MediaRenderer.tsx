
import React from 'react';
import DOMPurify from 'dompurify';
import { UrlDetector, UrlInfo } from '@/utils/urlDetection';
import { OptimizedImageDisplay } from '@/components/OptimizedImageDisplay';

interface MediaRendererProps {
  content: string;
}

export const MediaRenderer: React.FC<MediaRendererProps> = ({ content }) => {
  // Enhanced email processing
  const processEmails = (text: string): React.ReactNode[] => {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = emailRegex.exec(text)) !== null) {
      const email = match[0];
      const startIndex = match.index;

      if (startIndex > lastIndex) {
        parts.push(text.substring(lastIndex, startIndex));
      }

      parts.push(
        <a 
          key={`email-${startIndex}`}
          href={`mailto:${email}`}
          className="text-blue-600 hover:text-blue-800 underline font-medium transition-colors duration-200"
        >
          {email}
        </a>
      );

      lastIndex = emailRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  // Enhanced WhatsApp processing
  const processWhatsApp = (text: string): React.ReactNode[] => {
    const whatsappLinkRegex = /(https:\/\/wa\.me\/[0-9]+)/g;
    const whatsappTextRegex = /WhatsApp\s*:?\s*([+]?[0-9\s-()]+)/gi;
    
    const parts: React.ReactNode[] = [];
    let processedText = text;
    
    const whatsappMatches = [...processedText.matchAll(whatsappLinkRegex)];
    if (whatsappMatches.length > 0) {
      let lastIndex = 0;
      
      whatsappMatches.forEach((match, index) => {
        const url = match[0];
        const startIndex = match.index!;
        const phoneNumber = url.replace('https://wa.me/', '');

        if (startIndex > lastIndex) {
          parts.push(processedText.substring(lastIndex, startIndex));
        }

        parts.push(
          <a 
            key={`whatsapp-link-${index}`}
            href={url}
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center bg-green-50 border border-green-200 rounded-lg px-3 py-2 my-1 hover:bg-green-100 transition-all duration-200 hover:scale-[1.02]"
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
        parts.push(processedText.substring(lastIndex));
      }

      return parts;
    }
    
    // Handle text-based WhatsApp numbers
    const textMatches = [...processedText.matchAll(whatsappTextRegex)];
    if (textMatches.length > 0) {
      let lastIndex = 0;
      
      textMatches.forEach((match, index) => {
        const fullMatch = match[0];
        const phoneNumber = match[1];
        const startIndex = match.index!;
        const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
        const whatsappUrl = `https://wa.me/${cleanNumber.replace('+', '')}`;

        if (startIndex > lastIndex) {
          parts.push(processedText.substring(lastIndex, startIndex));
        }

        parts.push(
          <a 
            key={`whatsapp-text-${index}`}
            href={whatsappUrl}
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center bg-green-50 border border-green-200 rounded-lg px-3 py-2 my-1 hover:bg-green-100 transition-all duration-200 hover:scale-[1.02]"
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
        parts.push(processedText.substring(lastIndex));
      }

      return parts;
    }

    return [text];
  };

  // Enhanced content cleaning
  const cleanContent = (text: string): string => {
    let cleanedText = text;
    
    // Remove HTML elements more aggressively
    cleanedText = cleanedText.replace(/<[^>]*>/g, '');
    
    // Remove JSON structures
    cleanedText = cleanedText.replace(/\{[^{}]*"Image_URL"[^{}]*\}/g, '');
    cleanedText = cleanedText.replace(/"Image_URL"\s*:\s*"[^"]*"/g, '');
    cleanedText = cleanedText.replace(/\{[^{}]*\}/g, '');
    cleanedText = cleanedText.replace(/\[[^\[\]]*\]/g, '');
    
    // Clean whitespace
    cleanedText = cleanedText.replace(/\s{2,}/g, ' ').trim();
    
    return cleanedText;
  };

  // Enhanced URL processing with media detection
  const processUrlsWithMediaDetection = (text: string): React.ReactNode[] => {
    const cleanedText = cleanContent(text);
    
    if (!cleanedText || cleanedText.trim().length < 3) {
      return [];
    }
    
    const urlInfos = UrlDetector.extractUrls(cleanedText);
    
    if (urlInfos.length === 0) {
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
      const urlInfo = urlInfos.find(info => info.url === url);

      // Add text before URL
      if (startIndex > lastIndex) {
        const beforeText = cleanedText.substring(lastIndex, startIndex);
        if (beforeText.trim()) {
          const processedBefore = processContent(beforeText);
          parts.push(...processedBefore);
        }
      }

      // Process URL based on type
      if (urlInfo && (urlInfo.type === 'image' || urlInfo.type === 'google_sheet' || urlInfo.type === 'google_doc')) {
        parts.push(
          <OptimizedImageDisplay 
            key={`image-${startIndex}-${urlIndex}`}
            urlInfo={urlInfo}
            content={cleanedText}
            showPrice={true}
          />
        );
      } else {
        // Regular URL
        parts.push(
          <a 
            key={`url-${startIndex}-${urlIndex}`}
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-600 hover:text-blue-800 underline break-all font-medium transition-colors duration-200"
          >
            {url}
          </a>
        );
      }

      lastIndex = urlRegex.lastIndex;
      urlIndex++;
    }

    // Add remaining text
    if (lastIndex < cleanedText.length) {
      const remainingText = cleanedText.substring(lastIndex);
      if (remainingText.trim()) {
        const processedRemaining = processContent(remainingText);
        parts.push(...processedRemaining);
      }
    }

    return parts;
  };

  // Process content for emails and WhatsApp
  const processContent = (text: string): React.ReactNode[] => {
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

  // Enhanced text formatting with better markdown support
  const formatText = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      let formattedLine = line;
      
      // Enhanced markdown formatting
      formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
      formattedLine = formattedLine.replace(/__(.*?)__/g, '<strong class="font-bold text-gray-900">$1</strong>');
      formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<em class="italic text-gray-800">$1</em>');
      formattedLine = formattedLine.replace(/_(.*?)_/g, '<em class="italic text-gray-800">$1</em>');
      formattedLine = formattedLine.replace(/~~(.*?)~~/g, '<span class="line-through text-gray-600">$1</span>');
      
      // Enhanced headers
      if (formattedLine.startsWith('### ')) {
        formattedLine = `<h3 class="text-lg font-bold text-blue-700 mt-4 mb-2 border-b border-blue-200 pb-1">${formattedLine.substring(4)}</h3>`;
      } else if (formattedLine.startsWith('## ')) {
        formattedLine = `<h2 class="text-xl font-bold text-blue-800 mt-5 mb-3 border-b-2 border-blue-300 pb-2">${formattedLine.substring(3)}</h2>`;
      } else if (formattedLine.startsWith('# ')) {
        formattedLine = `<h1 class="text-2xl font-bold text-blue-900 mt-6 mb-4 border-b-2 border-blue-400 pb-2">${formattedLine.substring(2)}</h1>`;
      }
      
      // Enhanced lists
      if (formattedLine.trim().startsWith('- ')) {
        formattedLine = `<div class="ml-4 mb-2 flex items-start"><span class="text-blue-600 font-bold mt-1 mr-2">•</span><span class="flex-1">${formattedLine.trim().substring(2)}</span></div>`;
      } else if (formattedLine.trim().startsWith('* ')) {
        formattedLine = `<div class="ml-4 mb-2 flex items-start"><span class="text-blue-600 font-bold mt-1 mr-2">•</span><span class="flex-1">${formattedLine.trim().substring(2)}</span></div>`;
      }
      
      // Enhanced numbered lists
      const numberedMatch = formattedLine.match(/^(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        formattedLine = `<div class="ml-4 mb-2 flex items-start"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-bold mr-3 mt-0.5 min-w-[2rem] text-center">${numberedMatch[1]}</span><span class="flex-1 pt-1">${numberedMatch[2]}</span></div>`;
      }
      
      // Enhanced quotes
      if (formattedLine.trim().startsWith('> ')) {
        formattedLine = `<blockquote class="border-l-4 border-blue-400 bg-gradient-to-r from-blue-50 to-transparent pl-4 py-3 my-3 italic text-gray-700 rounded-r-lg">${formattedLine.trim().substring(2)}</blockquote>`;
      }
      
      // Empty lines
      if (formattedLine.trim() === '') {
        return <div key={`empty-${index}`} className="h-3"></div>;
      }
      
      // Check for URLs in the line
      const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]\(\)]+)/gi;
      if (urlRegex.test(formattedLine)) {
        return (
          <div key={`line-${index}`} className="leading-relaxed mb-1">
            {processUrlsWithMediaDetection(formattedLine)}
          </div>
        );
      }
      
      // Process for emails and WhatsApp
      const processedContent = processContent(formattedLine);
      
      // If HTML formatted, sanitize and use dangerouslySetInnerHTML
      if (typeof processedContent[0] === 'string' && processedContent.length === 1 && 
          (formattedLine.includes('<') || formattedLine.includes('>'))) {
        return (
          <div 
            key={`formatted-${index}`}
            className="leading-relaxed mb-1"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedLine) }}
          />
        );
      }
      
      // Normal content
      return (
        <div key={`content-${index}`} className="leading-relaxed mb-1">
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
