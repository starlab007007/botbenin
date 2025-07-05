
import React from 'react';
import { GoogleMap } from './GoogleMap';

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

// This component now uses Google Maps instead of Mapbox
export const MapboxMap: React.FC<MapboxMapProps> = ({ contacts, userLocation }) => {
  return <GoogleMap contacts={contacts} userLocation={userLocation} />;
};
