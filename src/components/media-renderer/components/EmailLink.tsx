
import React from 'react';

interface EmailLinkProps {
  email: string;
  index: number;
}

export const EmailLink: React.FC<EmailLinkProps> = ({ email, index }) => {
  return (
    <a 
      key={index}
      href={`mailto:${email}`}
      className="text-blue-600 hover:text-blue-800 underline font-medium"
    >
      {email}
    </a>
  );
};
