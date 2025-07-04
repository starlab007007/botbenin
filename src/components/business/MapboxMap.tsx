
import React from 'react';
import { GoogleMap } from './GoogleMap';

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

interface MapboxMapProps {
  contacts: Contact[];
  userLocation: [number, number] | null;
}

// This component now uses Google Maps instead of Mapbox for consistency
export const MapboxMap: React.FC<MapboxMapProps> = ({ contacts, userLocation }) => {
  console.log('MapboxMap: Redirecting to GoogleMap with', contacts.length, 'contacts');
  return <GoogleMap contacts={contacts} userLocation={userLocation} />;
};
