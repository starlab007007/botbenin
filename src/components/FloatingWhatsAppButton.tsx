import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

interface FloatingWhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
}

export const FloatingWhatsAppButton: React.FC<FloatingWhatsAppButtonProps> = ({
  phoneNumber = '22900000000', // Remplacer par le vrai numéro
  message = 'Bonjour, je souhaite en savoir plus sur Bot.BJ'
}) => {
  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Button
      onClick={handleWhatsAppClick}
      size="lg"
      className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 bg-[#25D366] hover:bg-[#20BA5A]"
      aria-label="Démarrer sur WhatsApp"
    >
      <FaWhatsapp className="h-7 w-7 text-white" />
    </Button>
  );
};
