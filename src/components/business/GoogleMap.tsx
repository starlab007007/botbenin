
import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  id: string;
  name: string;
  companyName: string;
  location: string;
  coordinates?: [number, number];
}

interface GoogleMapProps {
  contacts: Contact[];
  userLocation: [number, number] | null;
}

declare global {
  interface Window {
    google: any;
    initGoogleMap: () => void;
  }
}

export const GoogleMap: React.FC<GoogleMapProps> = ({ contacts, userLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const { toast } = useToast();

  const initializeMap = async () => {
    if (!mapContainer.current) return;

    setIsLoading(true);
    try {
      // Call our backend to get Google Maps configuration
      const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
        body: { action: 'test' }
      });

      if (error) {
        throw new Error('Google Maps API not configured on backend');
      }

      // Load Google Maps script dynamically
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_FRONTEND_KEY&callback=initGoogleMap&libraries=places`;
      script.async = true;
      script.defer = true;
      
      window.initGoogleMap = () => {
        const defaultCenter = userLocation ? 
          { lat: userLocation[1], lng: userLocation[0] } : 
          { lat: 6.4023, lng: 2.3522 }; // Cotonou, Benin

        const newMap = new window.google.maps.Map(mapContainer.current, {
          zoom: 10,
          center: defaultCenter,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        // Add user location marker
        if (userLocation) {
          new window.google.maps.Marker({
            position: { lat: userLocation[1], lng: userLocation[0] },
            map: newMap,
            title: 'Votre position',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
                  <circle cx="12" cy="12" r="3" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(24, 24),
              anchor: new window.google.maps.Point(12, 12)
            }
          });
        }

        // Add contact markers
        contacts.forEach((contact) => {
          if (contact.coordinates) {
            const marker = new window.google.maps.Marker({
              position: { lat: contact.coordinates[1], lng: contact.coordinates[0] },
              map: newMap,
              title: contact.name,
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#374151" stroke="white" stroke-width="1"/>
                    <circle cx="12" cy="9" r="2.5" fill="white"/>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(24, 24),
                anchor: new window.google.maps.Point(12, 24)
              }
            });

            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="padding: 8px;">
                  <div style="font-weight: bold; color: #1f2937;">${contact.name}</div>
                  <div style="font-size: 14px; color: #6b7280;">${contact.companyName}</div>
                  <div style="font-size: 12px; color: #9ca3af;">${contact.location}</div>
                </div>
              `
            });

            marker.addListener('click', () => {
              infoWindow.open(newMap, marker);
            });
          }
        });

        setMap(newMap);
        setIsConfigured(true);
        console.log('Google Map initialized with', contacts.length, 'contacts');
      };

      script.onerror = () => {
        throw new Error('Failed to load Google Maps API');
      };

      document.head.appendChild(script);

    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      toast({
        title: "Configuration requise",
        description: "La clé API Google Maps doit être configurée côté serveur",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (contacts.length > 0) {
      initializeMap();
    }
  }, [contacts, userLocation]);

  if (!isConfigured && !isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-lg border border-gray-300 max-w-md w-full">
          <div className="text-center mb-4">
            <Settings className="w-12 h-12 mx-auto mb-2 text-gray-600" />
            <h3 className="text-lg font-semibold text-black">Configuration Google Maps</h3>
            <p className="text-sm text-gray-600">
              La clé API Google Maps doit être configurée par l'administrateur
            </p>
          </div>
          <div className="space-y-4">
            <Button 
              onClick={initializeMap}
              disabled={isLoading}
              className="w-full bg-gray-800 text-white hover:bg-gray-700"
            >
              {isLoading ? 'Vérification...' : 'Réessayer'}
            </Button>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <p>Contactez votre administrateur pour configurer l'API Google Maps</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-full" />;
};
