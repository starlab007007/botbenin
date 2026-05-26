import NativeCategoryPicker from './NativeCategoryPicker';
import { BENIN_CITY_NAMES, getQuartiersForCity } from '@/data/beninLocations';

interface Props {
  ville: string;
  quartier: string;
  onChange: (v: { ville: string; quartier: string }) => void;
  villeInvalid?: boolean;
  villeError?: string;
}

export default function NativeVilleQuartierPicker({
  ville,
  quartier,
  onChange,
  villeInvalid,
  villeError,
}: Props) {
  const quartiers = getQuartiersForCity(ville);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <NativeCategoryPicker
          label="🇧🇯 Ville"
          value={ville}
          onChange={v => onChange({ ville: v, quartier: '' })}
          options={BENIN_CITY_NAMES}
          placeholder="Sélectionner"
          allowCustom
          onCreate={() => {}}
          invalid={villeInvalid}
          errorMessage={villeError}
        />
      </div>
      <div>
        <NativeCategoryPicker
          label="Quartier"
          value={quartier}
          onChange={v => onChange({ ville, quartier: v })}
          options={quartiers}
          placeholder={ville ? 'Saisir...' : 'Ville d\'abord'}
          allowCustom
          onCreate={() => {}}
        />
      </div>
    </div>
  );
}
