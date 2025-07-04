
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

interface GeoLocationMapProps {
  contacts: Contact[];
  userLocation: [number, number] | null;
}

export const GeoLocationMap: React.FC<GeoLocationMapProps> = ({ contacts, userLocation }) => {
  console.log('GeoLocationMap: Rendering with', contacts.length, 'contacts');
  
  // S'assurer que les contacts ont le bon format
  const formattedContacts = contacts.map(contact => ({
    ...contact,
    // S'assurer que les coordonnées sont dans le bon format [lng, lat]
    coordinates: contact.coordinates && contact.coordinates.length === 2 
      ? contact.coordinates 
      : undefined
  }));

  return <GoogleMap contacts={formattedContacts} userLocation={userLocation} />;
};
