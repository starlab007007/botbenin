
import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  companyName: string;
  location: string;
  coordinates?: [number, number];
  phone?: string;
  website?: string;
  email?: string;
  category?: string;
  rating?: number;
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
  const [googleApiKey, setGoogleApiKey] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  console.log('GoogleMap rendered with:', {
    contactsCount: contacts.length,
    userLocation,
    contacts: contacts.slice(0, 3) // Log first 3 for debugging
  });

  const loadGoogleMapsScript = (apiKey: string) => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
        return;
      }

      window.initGoogleMap = () => {
        resolve(window.google.maps);
      };

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error('Failed to load Google Maps API'));
      document.head.appendChild(script);
    });
  };

  const initializeMap = async () => {
    if (!mapContainer.current || !googleApiKey) return;

    setIsLoading(true);
    setError('');

    try {
      await loadGoogleMapsScript(googleApiKey);

      // Déterminer le centre de la carte
      let mapCenter;
      if (userLocation) {
        mapCenter = { lat: userLocation[1], lng: userLocation[0] };
      } else if (contacts.length > 0 && contacts[0].coordinates) {
        mapCenter = { lat: contacts[0].coordinates[1], lng: contacts[0].coordinates[0] };
      } else {
        mapCenter = { lat: 6.4023, lng: 2.3522 }; // Cotonou, Benin par défaut
      }

      console.log('Initializing map with center:', mapCenter);

      const newMap = new window.google.maps.Map(mapContainer.current, {
        zoom: 12,
        center: mapCenter,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          }
        ]
      });

      // Ajouter le marqueur de position utilisateur
      if (userLocation) {
        const userMarker = new window.google.maps.Marker({
          position: { lat: userLocation[1], lng: userLocation[0] },
          map: newMap,
          title: 'Votre position',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="#3B82F6" stroke="white" stroke-width="3"/>
                <circle cx="16" cy="16" r="4" fill="white"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 16)
          }
        });

        const userInfoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 12px; max-width: 200px;">
              <div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">📍 Votre Position</div>
              <div style="font-size: 12px; color: #6b7280;">Coordonnées: ${userLocation[1].toFixed(4)}, ${userLocation[0].toFixed(4)}</div>
            </div>
          `
        });

        userMarker.addListener('click', () => {
          userInfoWindow.open(newMap, userMarker);
        });
      }

      // Ajouter les marqueurs des entreprises
      let validMarkersCount = 0;
      const bounds = new window.google.maps.LatLngBounds();

      contacts.forEach((contact, index) => {
        if (contact.coordinates && contact.coordinates.length === 2) {
          const [lng, lat] = contact.coordinates;
          
          // Vérifier que les coordonnées sont valides
          if (typeof lat === 'number' && typeof lng === 'number' && 
              lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            
            console.log(`Adding marker for ${contact.companyName} at [${lat}, ${lng}]`);
            
            const marker = new window.google.maps.Marker({
              position: { lat, lng },
              map: newMap,
              title: contact.companyName,
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.732-6.268-14-14-14z" fill="#DC2626"/>
                    <circle cx="14" cy="14" r="6" fill="white"/>
                    <circle cx="14" cy="14" r="3" fill="#DC2626"/>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(28, 36),
                anchor: new window.google.maps.Point(14, 36)
              }
            });

            // Créer le contenu de l'info-bulle
            const infoWindowContent = `
              <div style="padding: 12px; max-width: 300px; font-family: system-ui, -apple-system, sans-serif;">
                <div style="font-weight: bold; color: #1f2937; font-size: 16px; margin-bottom: 8px;">
                  ${contact.companyName}
                </div>
                <div style="color: #374151; margin-bottom: 6px;">
                  <strong>Contact:</strong> ${contact.name}
                </div>
                ${contact.category ? `
                  <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">
                    <span style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${contact.category}</span>
                  </div>
                ` : ''}
                <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">
                  📍 ${contact.location}
                </div>
                ${contact.phone ? `
                  <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">
                    📞 <a href="tel:${contact.phone}" style="color: #2563eb; text-decoration: none;">${contact.phone}</a>
                  </div>
                ` : ''}
                ${contact.email ? `
                  <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">
                    📧 <a href="mailto:${contact.email}" style="color: #2563eb; text-decoration: none;">${contact.email}</a>
                  </div>
                ` : ''}
                ${contact.website ? `
                  <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">
                    🌐 <a href="https://${contact.website}" target="_blank" style="color: #2563eb; text-decoration: none;">${contact.website}</a>
                  </div>
                ` : ''}
                ${contact.rating ? `
                  <div style="color: #6b7280; font-size: 14px;">
                    ⭐ ${contact.rating.toFixed(1)} étoiles
                  </div>
                ` : ''}
              </div>
            `;

            const infoWindow = new window.google.maps.InfoWindow({
              content: infoWindowContent
            });

            marker.addListener('click', () => {
              infoWindow.open(newMap, marker);
            });

            // Ajouter aux limites pour ajuster le zoom
            bounds.extend({ lat, lng });
            validMarkersCount++;
          } else {
            console.warn(`Invalid coordinates for ${contact.companyName}:`, contact.coordinates);
          }
        } else {
          console.warn(`Missing coordinates for ${contact.companyName}:`, contact);
        }
      });

      // Ajuster la vue pour inclure tous les marqueurs
      if (validMarkersCount > 0) {
        if (userLocation) {
          bounds.extend({ lat: userLocation[1], lng: userLocation[0] });
        }
        newMap.fitBounds(bounds);
        
        // Limiter le zoom maximum
        const listener = window.google.maps.event.addListener(newMap, 'idle', () => {
          if (newMap.getZoom() > 15) {
            newMap.setZoom(15);
          }
          window.google.maps.event.removeListener(listener);
        });
      }

      setMap(newMap);
      setShowApiKeyInput(false);
      
      console.log(`Google Map initialized successfully with ${validMarkersCount} markers out of ${contacts.length} contacts`);

    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      setError('Erreur lors de l\'initialisation de Google Maps. Vérifiez votre clé API.');
    } finally {
      setIsLoading(false);
    }
  };

  // Réinitialiser la carte quand les contacts changent
  useEffect(() => {
    if (map && !showApiKeyInput) {
      console.log('Contacts changed, reinitializing map...');
      setShowApiKeyInput(true);
      setMap(null);
    }
  }, [contacts]);

  if (showApiKeyInput) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-lg border border-gray-300 max-w-md w-full">
          <div className="text-center mb-4">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-600" />
            <h3 className="text-lg font-semibold text-black">Configuration Google Maps</h3>
            <p className="text-sm text-gray-600">
              Entrez votre clé API Google Maps pour visualiser les entreprises sur la carte
            </p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Clé API Google Maps"
              value={googleApiKey}
              onChange={(e) => setGoogleApiKey(e.target.value)}
              className="border-gray-300 text-black"
            />
            <Button 
              onClick={initializeMap}
              disabled={!googleApiKey || isLoading}
              className="w-full bg-gray-800 text-white hover:bg-gray-700"
            >
              {isLoading ? (
                'Chargement...'
              ) : (
                <>
                  <MapPin className="w-4 h-4 mr-2" />
                  Activer la carte ({contacts.length} entreprises)
                </>
              )}
            </Button>
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            <p>
              Obtenez votre clé API sur{' '}
              <a 
                href="https://console.cloud.google.com/apis/credentials" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Cloud Console
              </a>
            </p>
            <p className="mt-1">
              Activez l'API "Maps JavaScript API" et "Places API"
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-full" />;
};
