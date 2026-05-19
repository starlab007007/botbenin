import * as React from 'react';
import { SmartCombobox } from '@/components/ui/smart-combobox';
import { Label } from '@/components/ui/label';
import { BENIN_CITY_NAMES, getQuartiersForCity } from '@/data/beninLocations';

interface LocationAutocompleteProps {
  ville: string;
  quartier: string;
  onChange: (next: { ville: string; quartier: string }) => void;
  showLabels?: boolean;
  villeLabel?: string;
  quartierLabel?: string;
  villeInvalid?: boolean;
  villeError?: string;
}

export const LocationAutocomplete = React.memo(function LocationAutocomplete({
  ville, quartier, onChange,
  showLabels = true, villeLabel = 'Ville', quartierLabel = 'Quartier',
  villeInvalid, villeError,
}: LocationAutocompleteProps) {
  const quartiers = React.useMemo(() => getQuartiersForCity(ville), [ville]);

  const handleVille = React.useCallback((v: string) => onChange({ ville: v, quartier: '' }), [onChange]);
  const handleQuartier = React.useCallback((v: string) => onChange({ ville, quartier: v }), [onChange, ville]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        {showLabels && (
          <Label className="flex items-center gap-1">
            <span className="text-base leading-none">🇧🇯</span>
            {villeLabel}
          </Label>
        )}
        <SmartCombobox
          value={ville}
          onChange={handleVille}
          options={BENIN_CITY_NAMES}
          placeholder="Sélectionner une ville"
          allowCustom
          invalid={villeInvalid}
          errorMessage={villeError}
        />
      </div>
      <div className="space-y-2">
        {showLabels && <Label>{quartierLabel}</Label>}
        <SmartCombobox
          value={quartier}
          onChange={handleQuartier}
          options={quartiers}
          placeholder={quartiers.length ? 'Sélectionner un quartier' : 'Saisir le quartier'}
          allowCustom
        />
      </div>
    </div>
  );
});
