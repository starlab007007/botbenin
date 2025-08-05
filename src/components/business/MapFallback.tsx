import React from 'react';
import { MapPin, Navigation, Users } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  companyName: string;
  jobTitle: string;
  location: string;
  email: string;
  phone: string;
  coordinates?: [number, number];
}

interface MapFallbackProps {
  contacts: Contact[];
  userLocation: [number, number] | null;
}

export const MapFallback: React.FC<MapFallbackProps> = ({ contacts, userLocation }) => {
  const locationsCount = contacts.filter(c => c.coordinates).length;
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border border-blue-200">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 bg-blue-600 rounded-full flex items-center justify-center">
          <MapPin className="h-8 w-8 text-white" />
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          Carte non disponible
        </h3>
        
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          La carte Google Maps ne peut pas être chargée actuellement. 
          Voici un aperçu de la répartition géographique de vos contacts.
        </p>
        
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-medium text-gray-900">Contacts géolocalisés</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">{locationsCount}</span>
            </div>
            
            <div className="space-y-2">
              {contacts.slice(0, 5).map((contact, index) => (
                <div key={contact.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 flex-shrink-0"></div>
                    <span className="text-gray-700 truncate">{contact.location}</span>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">{contact.companyName}</span>
                </div>
              ))}
              {contacts.length > 5 && (
                <div className="text-xs text-gray-500 text-center pt-2">
                  ... et {contacts.length - 5} autres emplacements
                </div>
              )}
            </div>
          </div>
          
          {userLocation && (
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center">
                <Navigation className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">
                  Votre position détectée
                </span>
              </div>
              <div className="text-xs text-green-600 mt-1">
                Latitude: {userLocation[1].toFixed(4)}, Longitude: {userLocation[0].toFixed(4)}
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-6 text-xs text-gray-500">
          💡 Conseil: Vérifiez votre connexion internet ou réessayez plus tard
        </div>
      </div>
    </div>
  );
};