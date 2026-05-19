import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { COUNTRIES, DEFAULT_COUNTRY, Country, parsePhone, formatLocal, toE164, isValidPhone } from '@/lib/phone';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (e164: string) => void;
  defaultCountryCode?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function PhoneInput({ value, onChange, defaultCountryCode = 'BJ', placeholder, className, disabled, id }: PhoneInputProps) {
  const parsed = React.useMemo(() => {
    if (value) return parsePhone(value);
    return { country: COUNTRIES.find(c => c.code === defaultCountryCode) || DEFAULT_COUNTRY, local: '' };
  }, [value, defaultCountryCode]);

  const [country, setCountry] = React.useState<Country>(parsed.country);
  const [local, setLocal] = React.useState(parsed.local);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    // sync externe
    setCountry(parsed.country);
    setLocal(parsed.local);
  }, [value]); // eslint-disable-line

  const emit = (c: Country, l: string) => {
    const digits = l.replace(/\D/g, '').slice(0, c.length);
    onChange(digits ? toE164(digits, c) : '');
  };

  const handleLocal = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, country.length);
    setLocal(digits);
    emit(country, digits);
  };

  const handleCountry = (c: Country) => {
    setCountry(c);
    setOpen(false);
    emit(c, local);
  };

  const valid = !local || isValidPhone(local, country);

  return (
    <div className={cn('flex gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" disabled={disabled} className="px-2 gap-1 shrink-0">
            <span className="text-lg leading-none">{country.flag}</span>
            <span className="text-xs font-medium">{country.dial}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-64" align="start">
          <Command>
            <CommandInput placeholder="Rechercher un pays..." />
            <CommandList>
              <CommandEmpty>Aucun pays.</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map(c => (
                  <CommandItem key={c.code} value={`${c.name} ${c.dial}`} onSelect={() => handleCountry(c)}>
                    <span className="text-lg mr-2">{c.flag}</span>
                    <span className="flex-1">{c.name}</span>
                    <span className="text-xs text-muted-foreground mr-2">{c.dial}</span>
                    {country.code === c.code && <Check className="h-4 w-4" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        id={id}
        inputMode="tel"
        value={formatLocal(local, country)}
        onChange={e => handleLocal(e.target.value)}
        placeholder={placeholder || (country.code === 'BJ' ? '97 12 34 56' : '')}
        disabled={disabled}
        className={cn(!valid && 'border-destructive focus-visible:ring-destructive')}
      />
    </div>
  );
}
