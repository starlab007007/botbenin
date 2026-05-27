import { useEffect, useMemo, useState } from 'react';
import { Clock, Phone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import NativeSelectSheet from '../native/NativeSelectSheet';

/** Normalise une chaîne (sans accents, minuscules) pour un matching tolérant. */
export const norm = (s: string) =>
  (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export type SmartKind =
  | 'phone-bj'
  | 'hours-range'
  | 'delivery-delay'
  | 'payment-modes'
  | 'days-range'
  | null;

/** Détecte un champ "intelligent" via son nom + description. */
export function detectSmartKind(field: { name?: string; description?: string; type?: string }): SmartKind {
  const txt = `${norm(field.description || '')} ${norm(field.name || '')}`;
  if (field.type === 'phone' || /telephone|tel\b|phone|numero|whatsapp|momo|wave|moov/.test(txt)) {
    // garder le format BJ uniquement pour les champs de téléphone
    if (/telephone|tel\b|phone|numero|whatsapp|momo|wave|moov/.test(txt)) return 'phone-bj';
  }
  if (/horaire|ouverture|fermeture|heure/.test(txt)) return 'hours-range';
  if (/delai.*livraison|temps.*livraison|delai/.test(txt)) return 'delivery-delay';
  if (/mode.*paiement|moyen.*paiement|paiement.*accepte/.test(txt)) return 'payment-modes';
  if (/jours.*ouverture|jours.*ouverts/.test(txt)) return 'days-range';
  return null;
}

/* --------------------------------- Phone --------------------------------- */

const BJ_PREFIX = '+229';

function formatBjDigits(d: string) {
  // groupe par 2
  return d.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

export function PhoneBjInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  // value attendue stockée: "+229XXXXXXXX" (sans espaces)
  const digits = useMemo(() => {
    const raw = (value || '').replace(/\D/g, '');
    return raw.startsWith('229') ? raw.slice(3) : raw;
  }, [value]);

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const only = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(only ? `${BJ_PREFIX}${only}` : '');
  };

  return (
    <div className="flex items-stretch rounded-lg border border-input bg-background overflow-hidden focus-within:border-primary">
      <div className="flex items-center gap-1.5 px-3 bg-muted/60 text-[15px] font-medium text-foreground/80 border-r border-input">
        <Phone className="h-3.5 w-3.5 opacity-70" /> {BJ_PREFIX}
      </div>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={placeholder || '97 00 00 00'}
        value={formatBjDigits(digits)}
        onChange={onInput}
        className="flex-1 h-12 px-3 bg-transparent text-[15px] outline-none tracking-wide"
      />
    </div>
  );
}

/* --------------------------------- Hours --------------------------------- */

const DAY_PRESETS = [
  'Lun-Ven',
  'Lun-Sam',
  'Lun-Dim',
  'Sam-Dim',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];

function parseHours(v: string): { days: string; start: string; end: string } {
  if (!v) return { days: '', start: '', end: '' };
  // patterns: "Lun-Ven: 08h00 – 18h00" / "08:00 - 18:00"
  const m = v.match(/^\s*([^:]+):\s*(\d{1,2})[h:](\d{2})\s*[–-]\s*(\d{1,2})[h:](\d{2})/i);
  if (m) {
    return { days: m[1].trim(), start: `${m[2].padStart(2,'0')}:${m[3]}`, end: `${m[4].padStart(2,'0')}:${m[5]}` };
  }
  const m2 = v.match(/(\d{1,2})[h:](\d{2})\s*[–-]\s*(\d{1,2})[h:](\d{2})/);
  if (m2) {
    return { days: '', start: `${m2[1].padStart(2,'0')}:${m2[2]}`, end: `${m2[3].padStart(2,'0')}:${m2[4]}` };
  }
  return { days: '', start: '', end: '' };
}

function serializeHours(days: string, start: string, end: string) {
  const fmt = (t: string) => (t ? t.replace(':', 'h') : '');
  if (!start && !end && !days) return '';
  const time = start && end ? `${fmt(start)} – ${fmt(end)}` : fmt(start) || fmt(end);
  return days ? `${days}: ${time}` : time;
}

export function HoursRangeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const init = useMemo(() => parseHours(value || ''), [value]);
  const [days, setDays] = useState(init.days);
  const [start, setStart] = useState(init.start);
  const [end, setEnd] = useState(init.end);

  useEffect(() => {
    onChange(serializeHours(days, start, end));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, start, end]);

  return (
    <div className="space-y-2 rounded-lg border border-input bg-background p-2.5">
      <NativeSelectSheet
        value={days}
        onChange={setDays}
        options={DAY_PRESETS}
        placeholder="Jours (ex: Lun-Ven)"
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 h-11 px-3 rounded-md border border-input bg-background">
          <Clock className="h-4 w-4 opacity-60" />
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[15px]"
          />
        </label>
        <label className="flex items-center gap-2 h-11 px-3 rounded-md border border-input bg-background">
          <Clock className="h-4 w-4 opacity-60" />
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[15px]"
          />
        </label>
      </div>
    </div>
  );
}

/* ----------------------------- Delivery delay ----------------------------- */

const DELAY_PRESETS = [
  '15-30 min',
  '30-45 min',
  '45-60 min',
  '1-2 h',
  '2-4 h',
  '4-8 h',
  'Le jour même',
  '24 h',
  '48 h',
  '2-3 jours',
];

export function DeliveryDelayInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <NativeSelectSheet
      value={value || ''}
      onChange={onChange}
      options={DELAY_PRESETS}
      placeholder={placeholder || 'Choisir un délai'}
    />
  );
}

/* ----------------------------- Payment modes ----------------------------- */

const PAYMENT_OPTIONS = [
  'Espèces',
  'MTN Mobile Money',
  'Moov Money',
  'Wave',
  'Celtiis Cash',
  'Carte bancaire',
  'Virement bancaire',
  'À la livraison',
  'PayPal',
];

export function PaymentModesInput({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const selected: string[] = Array.isArray(value)
    ? value
    : value
      ? String(value).split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt];
    // Stocker en chaîne CSV pour rester compatible Google Sheets / texte
    onChange(next.join(', '));
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PAYMENT_OPTIONS.map(opt => {
          const on = selected.includes(opt);
          return (
            <button
              type="button"
              key={opt}
              onClick={() => toggle(opt)}
              className={cn(
                'px-3 py-2 rounded-full border text-xs active:scale-95 transition',
                on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input'
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>{selected.length} sélectionné(s)</span>
          <button type="button" onClick={() => onChange('')} className="inline-flex items-center gap-0.5 hover:text-foreground">
            <X className="h-3 w-3" /> tout effacer
          </button>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Days range ----------------------------- */

export function DaysRangeInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <NativeSelectSheet
      value={value || ''}
      onChange={onChange}
      options={DAY_PRESETS}
      placeholder={placeholder || 'Choisir les jours'}
    />
  );
}
