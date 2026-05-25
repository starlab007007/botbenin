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
  const quartierOptions = React.useMemo(() => [...quartiers, 'Autre'], [quartiers]);
  const isCustomQuartier = !!quartier && !quartiers.includes(quartier);

  const handleVille = React.useCallback((v: string) => onChange({ ville: v, quartier: '' }), [onChange]);
  const handleQuartier = React.useCallback((v: string) => {
    onChange({ ville, quartier: v === 'Autre' ? ' ' : v });
  }, [onChange, ville]);

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
          value={isCustomQuartier ? 'Autre' : quartier}
          onChange={handleQuartier}
          options={quartierOptions}
          placeholder={quartiers.length ? 'Sélectionner un quartier' : 'Saisir le quartier'}
          allowCustom
        />
        {(quartier === ' ' || isCustomQuartier) && (
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Précisez le quartier"
            value={quartier.trim()}
            onChange={e => onChange({ ville, quartier: e.target.value })}
            autoFocus
          />
        )}
      </div>
    </div>
  );
});
