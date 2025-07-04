
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  companyName: string;
  location: string;
  coordinates?: [number, number];
}

interface MapboxMapProps {
  contacts: Contact[];
  userLocation: [number, number] | null;
}

export const MapboxMap: React.FC<MapboxMapProps> = ({ contacts, userLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState(true);

  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: userLocation || [2.3522, 48.8566], // Default to Paris
        zoom: 6
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add user location marker if available
      if (userLocation) {
        const userMarker = new mapboxgl.Marker({ color: '#3B82F6' })
          .setLngLat(userLocation)
          .setPopup(new mapboxgl.Popup().setHTML('<div><strong>Votre position</strong></div>'))
          .addTo(map.current);
      }

      // Add contact markers
      contacts.forEach((contact) => {
        if (contact.coordinates && map.current) {
          const marker = new mapboxgl.Marker({ color: '#374151' })
            .setLngLat(contact.coordinates)
            .setPopup(
              new mapboxgl.Popup().setHTML(`
                <div class="p-2">
                  <div class="font-semibold">${contact.name}</div>
                  <div class="text-sm text-gray-600">${contact.companyName}</div>
                  <div class="text-xs text-gray-500">${contact.location}</div>
                </div>
              `)
            )
            .addTo(map.current);
        }
      });

      setShowTokenInput(false);
      console.log('Mapbox map initialized with', contacts.length, 'contacts');

    } catch (error) {
      console.error('Error initializing Mapbox:', error);
      alert('Erreur lors de l\'initialisation de la carte. Vérifiez votre token Mapbox.');
    }
  };

  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  if (showTokenInput) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-lg border border-gray-300 max-w-md w-full">
          <div className="text-center mb-4">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-600" />
            <h3 className="text-lg font-semibold text-black">Configuration Mapbox</h3>
            <p className="text-sm text-gray-600">
              Entrez votre token Mapbox pour activer la carte interactive
            </p>
          </div>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Token Mapbox (pk.eyJ1...)"
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="border-gray-300 text-black"
            />
            <Button 
              onClick={initializeMap}
              disabled={!mapboxToken}
              className="w-full bg-gray-800 text-white hover:bg-gray-700"
            >
              Activer la carte
            </Button>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <p>Obtenez votre token gratuit sur <a href="https://mapbox.com" target="_blank" className="text-blue-600 hover:underline">mapbox.com</a></p>
          </div>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-full" />;
};
