
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Globe } from 'lucide-react';
import { GoogleMapsView } from './GoogleMapsView';

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

interface GeoLocationMapProps {
  contacts: Contact[];
  userLocation: [number, number] | null;
}

const SimpleMap: React.FC<GeoLocationMapProps> = ({ contacts, userLocation }) => {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    console.log('Contact selected on map:', contact.name);
  };

  const getMarkerPosition = (coordinates: [number, number]) => {
    if (!coordinates) return { top: '50%', left: '50%' };
    
    // Simple projection for France (approximate)
    const [lng, lat] = coordinates;
    const mapBounds = {
      north: 51.0,
      south: 42.0,
      west: -5.0,
      east: 8.0
    };
    
    const x = ((lng - mapBounds.west) / (mapBounds.east - mapBounds.west)) * 100;
    const y = ((mapBounds.north - lat) / (mapBounds.north - mapBounds.south)) * 100;
    
    return {
      left: `${Math.max(5, Math.min(95, x))}%`,
      top: `${Math.max(5, Math.min(95, y))}%`
    };
  };

  return (
    <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      {/* Map Background */}
      <div 
        className="w-full h-full relative bg-gradient-to-br from-blue-100 to-green-100"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)
          `
        }}
      >
        {/* User Location Marker */}
        {userLocation && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
            style={getMarkerPosition(userLocation)}
          >
            <div className="relative">
              <div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse flex items-center justify-center">
                <MapPin className="w-3 h-3 text-white" />
              </div>
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
                <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Votre position
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Markers */}
        {contacts.map((contact) => {
          if (!contact.coordinates) return null;
          
          const position = getMarkerPosition(contact.coordinates);
          const isSelected = selectedContact?.id === contact.id;
          
          return (
            <div
              key={contact.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
              style={position}
              onClick={() => handleContactClick(contact)}
            >
              <div className="relative">
                <div className={`w-5 h-5 rounded-full border-2 border-white shadow-lg transition-all hover:scale-110 ${
                  isSelected ? 'bg-red-600 scale-125' : 'bg-gray-700'
                } flex items-center justify-center`}>
                  <MapPin className="w-3 h-3 text-white" />
                </div>
                
                {/* Contact Info Popup */}
                {isSelected && (
                  <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 z-30">
                    <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg min-w-48">
                      <div className="text-sm font-semibold text-black">{contact.name}</div>
                      <div className="text-xs text-gray-600">{contact.companyName}</div>
                      <div className="text-xs text-gray-500 mt-1">{contact.location}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Map Grid Lines for better visualization */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Vertical lines */}
          {[...Array(5)].map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute top-0 bottom-0 border-l border-gray-300 opacity-20"
              style={{ left: `${20 * (i + 1)}%` }}
            />
          ))}
          {/* Horizontal lines */}
          {[...Array(5)].map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute left-0 right-0 border-t border-gray-300 opacity-20"
              style={{ top: `${20 * (i + 1)}%` }}
            />
          ))}
        </div>
      </div>

      {/* Click instruction */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">
        Cliquez sur un marqueur pour plus d'informations
      </div>
    </div>
  );
};

export const GeoLocationMap: React.FC<GeoLocationMapProps> = ({ contacts, userLocation }) => {
  const [useSimpleMap, setUseSimpleMap] = useState(false);

  if (useSimpleMap) {
    return (
      <div className="w-full h-full relative">
        <div className="absolute top-2 left-2 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUseSimpleMap(false)}
            className="bg-white text-black border-gray-300 hover:bg-gray-100"
          >
            <Globe className="w-4 h-4 mr-1" />
            Google Maps
          </Button>
        </div>
        <SimpleMap contacts={contacts} userLocation={userLocation} />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-2 left-2 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUseSimpleMap(true)}
          className="bg-white text-black border-gray-300 hover:bg-gray-100"
        >
          <MapPin className="w-4 h-4 mr-1" />
          Carte simple
        </Button>
      </div>
      <GoogleMapsView contacts={contacts} userLocation={userLocation} />
    </div>
  );
};
