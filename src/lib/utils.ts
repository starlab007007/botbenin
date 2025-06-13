
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const copyToClipboard = async (text: string, description: string = 'Contenu') => {
  try {
    await navigator.clipboard.writeText(text);
    return { success: true, message: `${description} copié dans le presse-papiers` };
  } catch (error) {
    console.error('Erreur lors de la copie:', error);
    return { success: false, message: `Impossible de copier ${description.toLowerCase()}` };
  }
};
