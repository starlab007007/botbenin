import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { DEFAULT_COUNTRY, formatLocal, parsePhone, toE164 } from '@/lib/phone';
import { cn } from '@/lib/utils';

interface Props {
  label?: string;
  value: string;
  onChange: (e164: string) => void;
  invalid?: boolean;
  errorMessage?: string;
  placeholder?: string;
}

/**
 * Input téléphone natif simplifié : drapeau 🇧🇯 +229 figé,
 * input numérique avec formatage à la frappe (pas de Popover).
 */
export default function NativePhoneInput({
  label,
  value,
  onChange,
  invalid,
  errorMessage,
  placeholder = '01 97 12 34 56',
}: Props) {
  const { local } = useMemo(() => parsePhone(value), [value]);
  const display = formatLocal(local, DEFAULT_COUNTRY);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, DEFAULT_COUNTRY.length);
    if (!digits) return onChange('');
    onChange(toE164(digits, DEFAULT_COUNTRY));
  };

  return (
    <div>
      {label && <label className="text-sm font-medium block mb-1.5">{label}</label>}
      <div
        className={cn(
          'flex items-stretch h-12 rounded-lg border bg-background overflow-hidden',
          invalid ? 'border-destructive' : 'border-input',
        )}
      >
        <div className="flex items-center px-3 bg-muted/40 border-r border-input text-sm font-medium gap-1.5">
          <span>{DEFAULT_COUNTRY.flag}</span>
          <span>{DEFAULT_COUNTRY.dial}</span>
        </div>
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={display}
          onChange={e => handleChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 border-0 h-full focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
        />
      </div>
      {invalid && errorMessage && (
        <p className="text-xs text-destructive mt-1">{errorMessage}</p>
      )}
    </div>
  );
}
