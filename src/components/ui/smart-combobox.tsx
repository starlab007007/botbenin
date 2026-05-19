import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
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
}

export function SmartCombobox({
  value, onChange, options, placeholder = 'Sélectionner...',
  emptyText = 'Aucun résultat', allowCustom = true, className, disabled, id,
}: SmartComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    setSearch('');
  };

  const showCustom = allowCustom && search.trim() &&
    !options.some(o => o.toLowerCase() === search.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground', className)}
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
                <CommandItem value={`__custom_${search}`} onSelect={() => select(search.trim())}>
                  <Plus className="h-4 w-4 mr-2" />
                  Utiliser « {search.trim()} »
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
