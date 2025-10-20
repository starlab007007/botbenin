import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { StructuralField } from '@/types/knowledge-base';

interface StructuralInfoFormProps {
  fields: StructuralField[];
  values: Record<string, string>;
  onChange: (fieldName: string, value: string) => void;
}

export const StructuralInfoForm: React.FC<StructuralInfoFormProps> = ({
  fields,
  values,
  onChange
}) => {
  return (
    <Card className="border-2 border-primary">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Info className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Informations Essentielles</CardTitle>
            <CardDescription>
              Ces informations seront utilisées pour répondre automatiquement aux questions fréquentes
            </CardDescription>
          </div>
          <Badge>Requis</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
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
                className={field.required && !values[field.name] ? 'border-destructive' : ''}
              />
              {field.required && !values[field.name] && (
                <p className="text-xs text-destructive">Ce champ est requis</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
