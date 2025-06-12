
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
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <Badge variant="secondary" className="bg-green-100 text-green-800 px-4 py-2 text-sm font-medium">
              Audit offert
            </Badge>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Découvrez gratuitement, en seulement 30 minutes, combien de temps et de ressources vous pouvez économiser grâce à l'IA.
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          <div className="flex justify-center items-center space-x-8 text-sm text-gray-600 mb-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>30 minutes</span>
            </div>
            <div className="flex items-center space-x-2">
              <Video className="w-5 h-5 text-indigo-600" />
              <span>Google Meet</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                Gratuit
              </Badge>
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <Button 
              onClick={handleOpenBooking}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              size="lg"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Réserver mon audit
            </Button>
            
            <CardDescription className="mt-4 text-gray-600">
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
