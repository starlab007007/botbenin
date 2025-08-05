import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapFallback } from './MapFallback';

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

interface GoogleMapsViewProps {
  contacts: Contact[];
  userLocation: [number, number] | null;
}

// Configuration Google Maps avec clé de démonstration
const GOOGLE_MAPS_API_KEY = 'AIzaSyBHNrKJDRs1D1qYs4aUAj0PKmVx6nD4qKY';

export const GoogleMapsView: React.FC<GoogleMapsViewProps> = ({ contacts, userLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loader = new Loader({
          apiKey: GOOGLE_MAPS_API_KEY,
          version: 'weekly',
          libraries: ['places'],
          region: 'FR',
          language: 'fr'
        });

        const google = await loader.load();

        if (!mapRef.current) return;

        // Déterminer le centre de la carte
        let center: google.maps.LatLngLiteral;
        if (userLocation) {
          center = { lat: userLocation[1], lng: userLocation[0] };
        } else if (contacts.length > 0 && contacts[0].coordinates) {
          center = { lat: contacts[0].coordinates[1], lng: contacts[0].coordinates[0] };
        } else {
          // Centre par défaut sur la France
          center = { lat: 46.603354, lng: 1.888334 };
        }

        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: userLocation ? 8 : 6,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: 'administrative',
              elementType: 'geometry',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'poi',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'road',
              elementType: 'labels.icon',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        mapInstance.current = map;

        // Ajouter le marqueur de l'utilisateur si disponible
        if (userLocation) {
          const userMarker = new google.maps.Marker({
            position: { lat: userLocation[1], lng: userLocation[0] },
            map,
            title: 'Votre position',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="#2563eb" stroke="#ffffff" stroke-width="2"/>
                  <circle cx="12" cy="12" r="3" fill="#ffffff"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(24, 24),
              anchor: new google.maps.Point(12, 12)
            }
          });

          const userInfoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; max-width: 200px;">
                <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #1f2937;">Votre position</h3>
                <p style="margin: 0; font-size: 12px; color: #6b7280;">Position actuelle détectée</p>
              </div>
            `
          });

          userMarker.addListener('click', () => {
            userInfoWindow.open(map, userMarker);
          });
        }

        // Ajouter les marqueurs des contacts
        const bounds = new google.maps.LatLngBounds();
        let hasValidCoordinates = false;

        contacts.forEach((contact, index) => {
          if (!contact.coordinates) return;

          const position = { lat: contact.coordinates[1], lng: contact.coordinates[0] };
          hasValidCoordinates = true;
          bounds.extend(position);

          const marker = new google.maps.Marker({
            position,
            map,
            title: `${contact.name} - ${contact.companyName}`,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 2C11.6 2 8 5.6 8 10c0 6 8 18 8 18s8-12 8-18c0-4.4-3.6-8-8-8z" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
                  <circle cx="16" cy="10" r="3" fill="#ffffff"/>
                  <text x="16" y="12" text-anchor="middle" fill="#dc2626" font-size="8" font-weight="bold">${index + 1}</text>
                </svg>
              `),
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(16, 32)
            }
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 12px; max-width: 280px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1f2937;">${contact.name}</h3>
                <div style="margin-bottom: 4px;">
                  <span style="font-weight: 600; color: #374151;">Entreprise:</span>
                  <span style="margin-left: 4px; color: #6b7280;">${contact.companyName}</span>
                </div>
                <div style="margin-bottom: 4px;">
                  <span style="font-weight: 600; color: #374151;">Poste:</span>
                  <span style="margin-left: 4px; color: #6b7280;">${contact.jobTitle}</span>
                </div>
                <div style="margin-bottom: 4px;">
                  <span style="font-weight: 600; color: #374151;">Localisation:</span>
                  <span style="margin-left: 4px; color: #6b7280;">${contact.location}</span>
                </div>
                <div style="margin-bottom: 4px;">
                  <span style="font-weight: 600; color: #374151;">Email:</span>
                  <a href="mailto:${contact.email}" style="margin-left: 4px; color: #2563eb; text-decoration: none;">${contact.email}</a>
                </div>
                <div>
                  <span style="font-weight: 600; color: #374151;">Téléphone:</span>
                  <a href="tel:${contact.phone}" style="margin-left: 4px; color: #2563eb; text-decoration: none;">${contact.phone}</a>
                </div>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
        });

        // Ajuster la vue pour inclure tous les marqueurs
        if (hasValidCoordinates) {
          if (userLocation) {
            bounds.extend({ lat: userLocation[1], lng: userLocation[0] });
          }
          map.fitBounds(bounds);
          
          // S'assurer que le zoom n'est pas trop élevé
          const listener = google.maps.event.addListener(map, 'idle', () => {
            if (map.getZoom()! > 12) {
              map.setZoom(12);
            }
            google.maps.event.removeListener(listener);
          });
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de Google Maps:', error);
        let errorMessage = 'Impossible de charger Google Maps. ';
        
        if (error instanceof Error) {
          if (error.message.includes('API key')) {
            errorMessage += 'Clé API invalide ou expirée.';
          } else if (error.message.includes('network')) {
            errorMessage += 'Vérifiez votre connexion internet.';
          } else if (error.message.includes('quota')) {
            errorMessage += 'Quota d\'utilisation dépassé.';
          } else {
            errorMessage += 'Erreur de configuration : ' + error.message;
          }
        } else {
          errorMessage += 'Erreur inconnue.';
        }
        
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    initializeMap();
  }, [contacts, userLocation]);

  if (error) {
    return <MapFallback contacts={contacts} userLocation={userLocation} />;
  }

  return (
    <div className="w-full h-full relative">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <div className="text-gray-600 text-sm">Chargement de la carte...</div>
          </div>
        </div>
      )}
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '400px' }}
      />
      {!isLoading && (
        <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-2 rounded-lg shadow-sm text-xs text-gray-600">
          {contacts.length} contact{contacts.length > 1 ? 's' : ''} géolocalisé{contacts.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};