import React from 'react';
import { isImageUrl, detectUrls, detectWhatsAppLinks, detectWhatsAppText, detectEmails } from './media-renderer/utils/urlDetection';
import { cleanHtmlSyntax, formatLineContent, hasHtmlFormatting } from './media-renderer/utils/contentFormatting';
import { EmailLink } from './media-renderer/components/EmailLink';
import { WhatsAppLink } from './media-renderer/components/WhatsAppLink';
import { ImageDisplay } from './media-renderer/components/ImageDisplay';
import { RegularLink } from './media-renderer/components/RegularLink';

interface MediaRendererProps {
  content: string;
}

export const MediaRenderer: React.FC<MediaRendererProps> = ({ content }) => {
  // Process emails in text
  const processEmails = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    const emailMatches = detectEmails(text);

    while ((match = emailMatches.next()) && !match.done) {
      const email = match.value[0];
      const startIndex = match.value.index!;

      if (startIndex > lastIndex) {
        const beforeText = text.substring(lastIndex, startIndex);
        parts.push(beforeText);
      }

      parts.push(<EmailLink key={startIndex} email={email} index={startIndex} />);
      lastIndex = startIndex + email.length;
    }

    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      parts.push(remainingText);
    }

    return parts.length > 0 ? parts : [text];
  };

  // Process WhatsApp numbers and links
  const processWhatsApp = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let processedText = text;
    
    // Process direct WhatsApp links
    const whatsappMatches = detectWhatsAppLinks(processedText);
    if (whatsappMatches.length > 0) {
      let lastIndex = 0;
      
      whatsappMatches.forEach((match) => {
        const url = match[0];
        const startIndex = match.index!;
        const phoneNumber = `+${url.replace('https://wa.me/', '')}`;

        if (startIndex > lastIndex) {
          const beforeText = processedText.substring(lastIndex, startIndex);
          parts.push(beforeText);
        }

        parts.push(<WhatsAppLink key={startIndex} url={url} phoneNumber={phoneNumber} index={startIndex} />);
        lastIndex = startIndex + url.length;
      });

      if (lastIndex < processedText.length) {
        const remainingText = processedText.substring(lastIndex);
        parts.push(remainingText);
      }

      return parts;
    }
    
    // Process WhatsApp text mentions
    const textMatches = detectWhatsAppText(processedText);
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

        parts.push(<WhatsAppLink key={startIndex} url={whatsappUrl} phoneNumber={cleanNumber} index={startIndex} />);
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

  // Process images and links
  const processImageLinks = (text: string): React.ReactNode[] => {
    console.log('[MediaRenderer] Processing text for images:', text);
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    const urlMatches = detectUrls(text);

    while ((match = urlMatches.next()) && !match.done) {
      const url = match.value[0];
      const startIndex = match.value.index!;

      if (startIndex > lastIndex) {
        const beforeText = text.substring(lastIndex, startIndex);
        parts.push(beforeText);
      }

      if (isImageUrl(url)) {
        console.log('[MediaRenderer] Image détectée - affichage direct:', url);
        parts.push(<ImageDisplay key={startIndex} url={url} index={startIndex} />);
      } else {
        parts.push(<RegularLink key={startIndex} url={url} index={startIndex} />);
      }

      lastIndex = startIndex + url.length;
    }

    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      parts.push(remainingText);
    }

    return parts.length > 0 ? parts : [text];
  };

  // Main content processing function
  const processContent = (text: string): React.ReactNode[] => {
    const cleanedText = cleanHtmlSyntax(text);
    const whatsappProcessed = processWhatsApp(cleanedText);
    
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

  // Format text with markdown-like syntax
  const formatText = (text: string) => {
    console.log('[MediaRenderer] Formatting text:', text.substring(0, 100) + '...');
    
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      const formattedLine = formatLineContent(line);
      
      // Empty lines for spacing
      if (formattedLine.trim() === '') {
        return <div key={index} className="h-2"></div>;
      }
      
      // Check for URLs/images - PRIORITY TO IMAGES
      const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
      if (urlRegex.test(formattedLine)) {
        console.log('[MediaRenderer] Ligne avec URL détectée:', formattedLine);
        return (
          <div key={index} className="leading-relaxed">
            {processImageLinks(formattedLine)}
          </div>
        );
      }
      
      // Process content for emails and WhatsApp
      const processedContent = processContent(formattedLine);
      
      // If we have formatted HTML content, display with dangerouslySetInnerHTML
      if (typeof processedContent[0] === 'string' && processedContent.length === 1 && 
          hasHtmlFormatting(formattedLine)) {
        return (
          <div 
            key={index} 
            className="leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formattedLine }}
          />
        );
      }
      
      // Otherwise, display processed content normally
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
