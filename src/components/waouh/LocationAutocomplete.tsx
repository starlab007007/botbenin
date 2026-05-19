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
}

export function LocationAutocomplete({
  ville, quartier, onChange,
  showLabels = true, villeLabel = 'Ville', quartierLabel = 'Quartier',
}: LocationAutocompleteProps) {
  const quartiers = React.useMemo(() => getQuartiersForCity(ville), [ville]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        {showLabels && (
          <Label className="flex items-center gap-1">
            <span className="text-base leading-none">🇧🇯</span>
            {villeLabel}
          </Label>
        )}
        <SmartCombobox
          value={ville}
          onChange={v => onChange({ ville: v, quartier: '' })}
          options={BENIN_CITY_NAMES}
          placeholder="Sélectionner une ville"
          allowCustom
        />
      </div>
      <div className="space-y-2">
        {showLabels && <Label>{quartierLabel}</Label>}
        <SmartCombobox
          value={quartier}
          onChange={v => onChange({ ville, quartier: v })}
          options={quartiers}
          placeholder={quartiers.length ? 'Sélectionner un quartier' : 'Saisir le quartier'}
          allowCustom
        />
      </div>
    </div>
  );
}
