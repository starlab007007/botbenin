
export const cleanHtmlSyntax = (text: string): string => {
  let cleanedText = text;
  
  // Supprimer les balises HTML visibles dans le texte
  cleanedText = cleanedText.replace(/<\/?div[^>]*>/g, '');
  cleanedText = cleanedText.replace(/<\/?span[^>]*>/g, '');
  cleanedText = cleanedText.replace(/<\/?strong[^>]*>/g, '');
  cleanedText = cleanedText.replace(/class=['"][^'"]*['"]/g, '');
  
  // Nettoyer les attributs de classe orphelins
  cleanedText = cleanedText.replace(/\s*class\s*=\s*['"][^'"]*['"]/g, '');
  
  return cleanedText;
};

export const formatTextStyles = (line: string): string => {
  let formattedLine = line;
  
  // Gras avec **texte** ou __texte__
  formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formattedLine = formattedLine.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // Italique avec *texte* ou _texte_
  formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
  formattedLine = formattedLine.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Souligné avec ~~texte~~
  formattedLine = formattedLine.replace(/~~(.*?)~~/g, '<u>$1</u>');
  
  return formattedLine;
};

export const formatHeaders = (line: string): string => {
  if (line.startsWith('### ')) {
    return `<h3 class="text-lg font-bold text-blue-700 mt-3 mb-2">${line.substring(4)}</h3>`;
  } else if (line.startsWith('## ')) {
    return `<h2 class="text-xl font-bold text-blue-800 mt-4 mb-2">${line.substring(3)}</h2>`;
  } else if (line.startsWith('# ')) {
    return `<h1 class="text-2xl font-bold text-blue-900 mt-4 mb-3">${line.substring(2)}</h1>`;
  }
  return line;
};

export const formatLists = (line: string): string => {
  if (line.trim().startsWith('- ')) {
    return `<div class="ml-4 mb-1"><span class="text-blue-600 font-bold">•</span> ${line.trim().substring(2)}</div>`;
  } else if (line.trim().startsWith('* ')) {
    return `<div class="ml-4 mb-1"><span class="text-blue-600 font-bold">•</span> ${line.trim().substring(2)}</div>`;
  }
  
  const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
  if (numberedMatch) {
    return `<div class="ml-4 mb-2"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-bold mr-2">${numberedMatch[1]}</span>${numberedMatch[2]}</div>`;
  }
  
  return line;
};

export const formatQuotes = (line: string): string => {
  if (line.trim().startsWith('> ')) {
    return `<blockquote class="border-l-4 border-blue-300 pl-4 py-2 bg-blue-50 italic text-gray-700 my-2">${line.trim().substring(2)}</blockquote>`;
  }
  return line;
};
