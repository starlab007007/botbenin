import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DateTimeFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const DateTimeField: React.FC<DateTimeFieldProps> = ({
  value,
  onChange,
  placeholder
}) => {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [time, setTime] = React.useState<string>(
    value ? format(new Date(value), 'HH:mm') : '12:00'
  );

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      const [hours, minutes] = time.split(':');
      selectedDate.setHours(parseInt(hours), parseInt(minutes));
      onChange(selectedDate.toISOString());
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (date) {
      const [hours, minutes] = newTime.split(':');
      const newDate = new Date(date);
      newDate.setHours(parseInt(hours), parseInt(minutes));
      onChange(newDate.toISOString());
    }
  };

  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'flex-1 justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'PPP', { locale: fr }) : <span>{placeholder || 'Choisir une date'}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      <div className="relative w-32">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="time"
          value={time}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
};
