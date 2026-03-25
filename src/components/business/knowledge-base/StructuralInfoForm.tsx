import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { StructuralField } from '@/types/knowledge-base';
import { useIsMobile } from '@/hooks/use-mobile';

interface StructuralInfoFormProps {
  fields: StructuralField[];
  values: Record<string, string>;
  onChange: (fieldName: string, value: string) => void;
}

export const StructuralInfoForm: React.FC<StructuralInfoFormProps> = ({ fields, values, onChange }) => {
  const isMobile = useIsMobile();

  return (
    <Card className="border-2 border-primary/30 shadow-sm overflow-hidden">
      <CardHeader className="p-3.5 sm:p-5 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm sm:text-base">Informations Essentielles</CardTitle>
              <Badge className="shrink-0 text-[10px] h-5">Requis</Badge>
            </div>
            <CardDescription className="text-[10px] sm:text-xs mt-0.5">
              Utilisées pour répondre aux questions fréquentes
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3.5 sm:p-5">
        <div className={`grid gap-3 sm:gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {fields.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={field.name} className="text-xs sm:text-sm">
                {field.description || field.name}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                id={field.name}
                type={field.type}
                placeholder={field.placeholder}
                value={values[field.name] || ''}
                onChange={(e) => onChange(field.name, e.target.value)}
                required={field.required}
                className={`h-9 sm:h-10 text-sm ${field.required && !values[field.name] ? 'border-destructive/50 focus:border-destructive' : ''}`}
              />
              {field.required && !values[field.name] && (
                <p className="text-[10px] text-destructive">Ce champ est requis</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
