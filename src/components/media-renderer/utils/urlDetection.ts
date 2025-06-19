
export const isImageUrl = (url: string): boolean => {
  const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i;
  return imageExtensions.test(url) || url.includes('imgur.com') || url.includes('imagekit.io') || url.includes('ik.imagekit.io');
};

export const detectUrls = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  return text.matchAll(urlRegex);
};

export const detectWhatsAppLinks = (text: string) => {
  const whatsappLinkRegex = /(https:\/\/wa\.me\/[0-9]+)/g;
  return [...text.matchAll(whatsappLinkRegex)];
};

export const detectWhatsAppText = (text: string) => {
  const whatsappTextRegex = /WhatsApp\s*:?\s*([+]?[0-9\s-()]+)/gi;
  return [...text.matchAll(whatsappTextRegex)];
};

export const detectEmails = (text: string) => {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  return text.matchAll(emailRegex);
};
