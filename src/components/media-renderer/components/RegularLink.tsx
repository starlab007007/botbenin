
import React from 'react';

interface RegularLinkProps {
  url: string;
  index: number;
}

export const RegularLink: React.FC<RegularLinkProps> = ({ url, index }) => {
  return (
    <a 
      key={index}
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-blue-600 hover:text-blue-800 underline break-all font-medium"
    >
      {url}
    </a>
  );
};
