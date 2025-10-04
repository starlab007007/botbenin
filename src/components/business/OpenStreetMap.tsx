import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix pour les icônes Leaflet par défaut
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Icône personnalisée pour la position de l'utilisateur
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iIzM4OTVGRiIgZmlsbC1vcGFjaXR5PSIwLjIiLz4KICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI4IiBmaWxsPSIjMzg5NUZGIi8+CiAgPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iNCIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

interface Contact {
  id: string;
  name: string;
  companyName: string;
  location: string;
  coordinates?: [number, number];
  phone?: string;
  email?: string;
  linkedinUrl?: string;
  industry?: string;
}

interface OpenStreetMapProps {
  contacts: Contact[];
  userLocation: [number, number] | null;
  center?: [number, number];
  zoom?: number;
}

const MapUpdater: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
};

export const OpenStreetMap: React.FC<OpenStreetMapProps> = ({ 
  contacts, 
  userLocation,
  center,
  zoom = 13
}) => {
  // Déterminer le centre de la carte
  const mapCenter: [number, number] = center || userLocation || [2.3522, 6.4023]; // Fallback sur Cotonou
  
  // Filtrer les contacts avec coordonnées valides
  const validContacts = contacts.filter(c => 
    c.coordinates && 
    Array.isArray(c.coordinates) && 
    c.coordinates.length === 2 &&
    !isNaN(c.coordinates[0]) && 
    !isNaN(c.coordinates[1])
  );

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
        scrollWheelZoom={true}
      >
        <MapUpdater center={mapCenter} zoom={zoom} />
        
        {/* Couche de tuiles OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marqueur de position de l'utilisateur */}
        {userLocation && (
          <Marker 
            position={[userLocation[1], userLocation[0]]} 
            icon={userIcon}
          >
            <Popup>
              <div className="p-2">
                <p className="font-semibold text-blue-600">📍 Votre position</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marqueurs des contacts */}
        {validContacts.map((contact) => {
          const [lng, lat] = contact.coordinates!;
          
          return (
            <Marker 
              key={contact.id}
              position={[lat, lng]}
            >
              <Popup maxWidth={300}>
                <div className="p-3 space-y-2">
                  <h3 className="font-bold text-gray-900 text-lg">{contact.companyName}</h3>
                  {contact.name && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Contact:</span> {contact.name}
                    </p>
                  )}
                  {contact.industry && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Secteur:</span> {contact.industry}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">📍</span> {contact.location}
                  </p>
                  {contact.phone && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">📞</span> {contact.phone}
                    </p>
                  )}
                  {contact.email && (
                    <p className="text-sm text-gray-600 break-all">
                      <span className="font-medium">✉️</span> {contact.email}
                    </p>
                  )}
                  {contact.linkedinUrl && (
                    <a 
                      href={contact.linkedinUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline block"
                    >
                      🔗 Site web
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
