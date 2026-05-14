import React, { useState } from "react";
import { MapPin, Loader2, Pencil } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { GeoState } from "@/hooks/useWaouhGeolocation";

interface Props {
  geo: GeoState;
  loading: boolean;
  onSetCity: (c: string) => void;
  onRefresh: () => void;
  compact?: boolean;
}

export const WaouhCityBadge: React.FC<Props> = ({ geo, loading, onSetCity, onRefresh, compact }) => {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge variant="secondary" className="cursor-pointer gap-1 bg-white/15 text-white hover:bg-white/25 border-0">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
          {geo.city}
          {!compact && <Pencil className="w-3 h-3 opacity-70" />}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Ville détectée par GPS. Vous pouvez la corriger.</p>
          <form onSubmit={(e) => { e.preventDefault(); if (val.trim()) { onSetCity(val.trim()); setOpen(false); setVal(""); } }} className="flex gap-2">
            <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="ex: Calavi, Porto-Novo…" />
            <Button type="submit" size="sm">OK</Button>
          </form>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => { onRefresh(); setOpen(false); }}>
            <MapPin className="w-3.5 h-3.5 mr-1.5" /> Réutiliser ma position GPS
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default WaouhCityBadge;
