import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartComboboxProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  emptyText?: string;
  allowCustom?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
  invalid?: boolean;
  errorMessage?: string;
}

export const SmartCombobox = React.memo(function SmartCombobox({
  value, onChange, options, placeholder = 'Sélectionner...',
  emptyText = 'Aucun résultat', allowCustom = true, className, disabled, id,
  invalid, errorMessage,
}: SmartComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);

  const select = React.useCallback((v: string) => {
    onChange(v);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  const showCustom = allowCustom && deferredSearch.trim() &&
    !options.some(o => o.toLowerCase() === deferredSearch.trim().toLowerCase());

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            className={cn(
              'w-full justify-between font-normal',
              !value && 'text-muted-foreground',
              invalid && 'border-destructive focus-visible:ring-destructive',
              className,
            )}
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
          <Command shouldFilter={true}>
            <CommandInput placeholder="Rechercher..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map(o => (
                  <CommandItem key={o} value={o} onSelect={() => select(o)}>
                    <Check className={cn('h-4 w-4 mr-2', value === o ? 'opacity-100' : 'opacity-0')} />
                    {o}
                  </CommandItem>
                ))}
              </CommandGroup>
              {showCustom && (
                <CommandGroup heading="Personnalisé">
                  <CommandItem value={`__custom_${deferredSearch}`} onSelect={() => select(deferredSearch.trim())}>
                    <Plus className="h-4 w-4 mr-2" />
                    Utiliser « {deferredSearch.trim()} »
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {invalid && errorMessage && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />{errorMessage}
        </p>
      )}
    </div>
  );
});
