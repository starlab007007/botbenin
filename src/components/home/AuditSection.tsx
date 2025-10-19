
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Video } from 'lucide-react';
import { BookingModal } from '@/components/BookingModal';

export const AuditSection: React.FC = () => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const handleOpenBooking = () => {
    setIsBookingModalOpen(true);
  };

  const handleCloseBooking = () => {
    setIsBookingModalOpen(false);
  };

  return (
    <>
      <Card className="bg-gradient-to-r from-indigo-50 via-white to-cyan-50 border-indigo-200">
        <CardHeader className="text-center pb-4 px-4 sm:px-6">
          <div className="flex justify-center mb-4">
            <Badge variant="secondary" className="bg-green-100 text-green-800 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium">
              Audit offert
            </Badge>
          </div>
          <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-4 leading-tight">
            Prêt à transformer votre business ? Découvrez en 30 minutes comment l'IA peut multiplier votre productivité et booster vos résultats. C'est gratuit, c'est maintenant !
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-6 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 text-sm text-gray-600 mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              <span className="text-xs sm:text-sm">30 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              <span className="text-xs sm:text-sm">Google Meet</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                Gratuit
              </Badge>
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <Button 
              onClick={handleOpenBooking}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 sm:py-3 px-6 sm:px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
              size="lg"
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Réserver mon audit
            </Button>
            
            <CardDescription className="mt-4 text-gray-600 text-xs sm:text-sm px-2">
              Réservez votre créneau en quelques clics et découvrez le potentiel de l'IA pour votre activité
            </CardDescription>
          </div>
        </CardContent>
      </Card>

      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={handleCloseBooking} 
      />
    </>
  );
};
