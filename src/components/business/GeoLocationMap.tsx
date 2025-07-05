
import React from 'react';
import { GoogleMap } from './GoogleMap';

interface Contact {
  id: string;
  name: string;
  companyName: string;
  location: string;
  coordinates?: [number, number];
}

interface GeoLocationMapProps {
  contacts: Contact[];
  userLocation: [number, number] | null;
}

export const GeoLocationMap: React.FC<GeoLocationMapProps> = ({ contacts, userLocation }) => {
  return <GoogleMap contacts={contacts} userLocation={userLocation} />;
};
