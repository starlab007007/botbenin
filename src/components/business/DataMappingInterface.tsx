import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Wand2, CheckCircle2 } from 'lucide-react';
import { useDataMapper } from '@/hooks/useDataMapper';

interface DataMappingInterfaceProps {
  sourceData: any;
  onMappingComplete: (mappedData: any, template: string) => void;
}

export const DataMappingInterface: React.FC<DataMappingInterfaceProps> = ({
  sourceData,
  onMappingComplete
}) => {
  const { templates, analyzeAndSuggestTemplate, autoMapFields, mapToTemplate, validateMapping } = useDataMapper();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (sourceData?.headers) {
      const suggested = analyzeAndSuggestTemplate(sourceData.headers);
      setSelectedTemplate(suggested);
      const autoMapping = autoMapFields(sourceData.headers, suggested);
      setFieldMapping(autoMapping);
    }
  }, [sourceData, analyzeAndSuggestTemplate, autoMapFields]);

  const handleAutoMap = () => {
    if (selectedTemplate) {
      const autoMapping = autoMapFields(sourceData.headers, selectedTemplate);
      setFieldMapping(autoMapping);
    }
  };

  const handleFieldMappingChange = (templateField: string, sourceField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [templateField]: sourceField
    }));
  };

  const handleComplete = () => {
    if (!selectedTemplate) return;

    const mapped = mapToTemplate(sourceData, selectedTemplate, fieldMapping);
    const validation = validateMapping(mapped, selectedTemplate);
    
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    onMappingComplete(mapped, selectedTemplate.id);
  };

  if (!sourceData) return null;

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Configuration du Mapping</CardTitle>
            <CardDescription>
              Associez les colonnes de votre fichier aux champs du template
            </CardDescription>
          </div>
          <Button onClick={handleAutoMap} variant="outline" size="sm">
            <Wand2 className="w-4 h-4 mr-2" />
            Mapping automatique
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Template de destination</label>
          <Select
            value={selectedTemplate?.id}
            onValueChange={(value) => {
              const template = templates.find(t => t.id === value);
              setSelectedTemplate(template);
              if (template) {
                const autoMapping = autoMapFields(sourceData.headers, template);
                setFieldMapping(autoMapping);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-2">
                    <span>{template.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate && (
            <p className="text-xs text-muted-foreground mt-2">
              {selectedTemplate.description}
            </p>
          )}
        </div>

        {/* Field Mapping */}
        {selectedTemplate && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Mapping des champs</h4>
            {selectedTemplate.fields.map((field: any) => (
              <div key={field.name} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{field.name}</span>
                    {field.required && (
                      <Badge variant="destructive" className="text-xs">Requis</Badge>
                    )}
                  </div>
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
                
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                
                <div className="flex-1">
                  <Select
                    value={fieldMapping[field.name] || ''}
                    onValueChange={(value) => handleFieldMappingChange(field.name, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner une colonne..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Non mappé</SelectItem>
                      {sourceData.headers.map((header: string) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {fieldMapping[field.name] && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
            <h4 className="font-medium text-sm text-destructive mb-2">Erreurs de validation</h4>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx} className="text-sm text-destructive">{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Complete Button */}
        <Button onClick={handleComplete} className="w-full" size="lg">
          Valider le mapping et continuer
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};
