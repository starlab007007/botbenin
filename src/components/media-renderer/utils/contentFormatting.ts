
import { formatTextStyles, formatHeaders, formatLists, formatQuotes } from './textProcessing';

export const formatLineContent = (line: string): string => {
  let formattedLine = line;
  
  // Apply various formatting rules
  formattedLine = formatTextStyles(formattedLine);
  formattedLine = formatHeaders(formattedLine);
  formattedLine = formatLists(formattedLine);
  formattedLine = formatQuotes(formattedLine);
  
  return formattedLine;
};

export const hasHtmlFormatting = (text: string): boolean => {
  return text.includes('<') || text.includes('strong>') || text.includes('<em>');
};

export { cleanHtmlSyntax } from './textProcessing';
