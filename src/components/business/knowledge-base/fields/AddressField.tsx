import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';

interface AddressFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const AddressField: React.FC<AddressFieldProps> = ({
  value,
  onChange,
  placeholder
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Liste de suggestions communes pour le Bénin et l'Afrique francophone
  const commonLocations = [
    'Cotonou, Bénin',
    'Porto-Novo, Bénin',
    'Parakou, Bénin',
    'Abomey-Calavi, Bénin',
    'Akpakpa, Cotonou',
    'Cadjehoun, Cotonou',
    'Fidjrossè, Cotonou',
    'Haie Vive, Cotonou',
    'Zongo, Cotonou',
    'Godomey, Abomey-Calavi',
    'Dantokpa, Cotonou',
    'Ganhi, Cotonou',
    'Agla, Cotonou',
    'Sikècodji, Cotonou'
  ];

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (newValue.length >= 2) {
      timeoutRef.current = setTimeout(() => {
        const filtered = commonLocations.filter(location =>
          location.toLowerCase().includes(newValue.toLowerCase())
        );
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative" ref={inputRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          className="pl-9"
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm transition-colors"
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                {suggestion}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
