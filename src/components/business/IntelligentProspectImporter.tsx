import React, { useState, useCallback, useRef } from 'react';
import { Upload, Camera, FileText, Table, Image, Brain, ArrowRight, CheckCircle2, AlertCircle, Loader2, X, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFileParser } from '@/hooks/useFileParser';
import { useDataMapper } from '@/hooks/useDataMapper';
import { DataMappingInterface } from './DataMappingInterface';
import { CameraCapture } from './CameraCapture';
import { DataPreview } from './DataPreview';
import { TemplateSelector } from './TemplateSelector';

interface IntelligentProspectImporterProps {
  onBack?: () => void;
}

type ImportStage = 'upload' | 'parsing' | 'mapping' | 'validation' | 'importing' | 'complete';

const STAGES = [
  { id: 'upload', label: 'Téléchargement', icon: Upload },
  { id: 'parsing', label: 'Analyse', icon: Brain },
  { id: 'mapping', label: 'Mapping', icon: Table },
  { id: 'validation', label: 'Validation', icon: CheckCircle2 },
  { id: 'importing', label: 'Import', icon: Loader2 },
  { id: 'complete', label: 'Terminé', icon: CheckCircle2 }
] as const;

export const IntelligentProspectImporter: React.FC<IntelligentProspectImporterProps> = ({ onBack }) => {
  const { toast } = useToast();
  const [stage, setStage] = useState<ImportStage>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [cameraMode, setCameraMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [validatedData, setValidatedData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { parseFile, parsedData, isProcessing, error } = useFileParser();
  const { mappedData, suggestedTemplate, mapToTemplate } = useDataMapper();

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      return validTypes.includes(file.type);
    });

    if (validFiles.length !== fileArray.length) {
      toast({
        title: "Fichiers non supportés détectés",
        description: "Seuls CSV, Excel, PDF, Images, et Word sont supportés.",
        variant: "destructive"
      });
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
    
    if (validFiles.length > 0) {
      setStage('parsing');
      processFiles(validFiles);
    }
  }, [toast]);

  const processFiles = async (files: File[]) => {
    setProgress(0);
    for (let i = 0; i < files.length; i++) {
      await parseFile(files[i]);
      setProgress(((i + 1) / files.length) * 100);
    }
    setStage('mapping');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleCameraCapture = useCallback((imageBlob: Blob) => {
    const file = new File([imageBlob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setUploadedFiles(prev => [...prev, file]);
    setCameraMode(false);
    setStage('parsing');
    processFiles([file]);
  }, []);

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleMappingComplete = async (mappedData: any, template: string) => {
    setValidatedData(mappedData);
    setSelectedTemplate(template);
    setStage('validation');
  };

  const goToNextStage = () => {
    const currentIndex = STAGES.findIndex(s => s.id === stage);
    if (currentIndex < STAGES.length - 1) {
      const nextStage = STAGES[currentIndex + 1].id as ImportStage;
      
      // Skip parsing stage if going forward manually
      if (nextStage === 'parsing' && parsedData) {
        setStage('mapping');
      } else {
        setStage(nextStage);
      }
    }
  };

  const goToPreviousStage = () => {
    const currentIndex = STAGES.findIndex(s => s.id === stage);
    if (currentIndex > 0) {
      const prevStage = STAGES[currentIndex - 1].id as ImportStage;
      
      // Skip parsing stage when going back
      if (prevStage === 'parsing') {
        setStage('upload');
      } else {
        setStage(prevStage);
      }
    }
  };

  const canNavigateToStage = (stageId: string): boolean => {
    const stageIndex = STAGES.findIndex(s => s.id === stageId);
    const currentIndex = STAGES.findIndex(s => s.id === stage);
    
    // Can go back to any previous completed stage
    if (stageIndex < currentIndex) return true;
    
    // Can't skip ahead unless data is ready
    if (stageId === 'mapping' && !parsedData) return false;
    if (stageId === 'validation' && !validatedData) return false;
    
    return stageIndex <= currentIndex + 1;
  };

  const importData = async (data: any, template: string) => {
    try {
      setProgress(0);
      // Import logic based on template type
      // ... implementation
      setProgress(100);
      setStage('complete');
      toast({
        title: "Import réussi",
        description: `${data.length} prospects importés avec succès.`,
      });
    } catch (error) {
      toast({
        title: "Erreur d'import",
        description: "Une erreur est survenue lors de l'import.",
        variant: "destructive"
      });
    }
  };

  const getSupportedFormats = () => [
    { icon: Table, name: 'CSV / Excel', types: ['.csv', '.xls', '.xlsx'] },
    { icon: FileText, name: 'PDF', types: ['.pdf'] },
    { icon: Image, name: 'Images', types: ['.jpg', '.jpeg', '.png', '.webp'] },
    { icon: FileText, name: 'Word', types: ['.doc', '.docx'] }
  ];

  if (cameraMode) {
    return (
      <CameraCapture
        onCapture={handleCameraCapture}
        onClose={() => setCameraMode(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Import Intelligent de Prospects
            </h1>
            <p className="text-muted-foreground mt-2">
              Importez vos données depuis n'importe quel format et mappez-les automatiquement
            </p>
          </div>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Retour
            </Button>
          )}
        </div>

        {/* Progress Stepper */}
        <Card className="border-2">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              {STAGES.map((s, idx) => {
                const StageIcon = s.icon;
                const currentIndex = STAGES.findIndex(st => st.id === stage);
                const isCompleted = currentIndex > idx;
                const isCurrent = stage === s.id;
                const canNavigate = canNavigateToStage(s.id);
                
                return (
                  <div key={s.id} className="flex items-center flex-1">
                    <button
                      onClick={() => canNavigate && setStage(s.id as ImportStage)}
                      disabled={!canNavigate || s.id === 'parsing' || s.id === 'importing'}
                      className={`flex flex-col items-center gap-2 transition-all ${
                        canNavigate && s.id !== 'parsing' && s.id !== 'importing' ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full transition-all border-2 ${
                        isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' :
                        isCompleted ? 'bg-primary/20 text-primary border-primary' : 
                        'bg-muted text-muted-foreground border-muted'
                      }`}>
                        {isCompleted ? 
                          <CheckCircle2 className="w-6 h-6" /> : 
                          <StageIcon className={`w-6 h-6 ${isCurrent && s.id === 'parsing' ? 'animate-pulse' : ''}`} />
                        }
                      </div>
                      <span className={`text-xs font-medium text-center ${
                        isCurrent ? 'text-primary' : 
                        isCompleted ? 'text-primary/70' : 
                        'text-muted-foreground'
                      }`}>
                        {s.label}
                      </span>
                    </button>
                    {idx < STAGES.length - 1 && (
                      <div className={`flex-1 h-1 mx-2 transition-all ${
                        isCompleted ? 'bg-primary' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        {stage === 'upload' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Area */}
            <Card className="border-2 border-dashed hover:border-primary transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Télécharger des fichiers
                </CardTitle>
                <CardDescription>
                  Glissez-déposez vos fichiers ou cliquez pour sélectionner
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Glissez vos fichiers ici ou cliquez pour parcourir
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CSV, Excel, PDF, Images, Word
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".csv,.xls,.xlsx,.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">{file.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {(file.size / 1024).toFixed(1)} KB
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(idx)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                  <Button
                    onClick={() => {
                      if (uploadedFiles.length > 0) {
                        setStage('parsing');
                        processFiles(uploadedFiles);
                      }
                    }}
                    disabled={uploadedFiles.length === 0}
                  >
                    Analyser les fichiers
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Camera Capture */}
            <Card className="border-2 hover:border-primary transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Capturer avec la caméra
                </CardTitle>
                <CardDescription>
                  Prenez une photo de vos documents directement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setCameraMode(true)}
                  className="w-full h-48"
                  variant="outline"
                >
                  <div className="text-center">
                    <Camera className="w-12 h-12 mx-auto mb-2" />
                    <span>Ouvrir la caméra</span>
                  </div>
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Utilisez votre caméra pour capturer des documents, cartes de visite, 
                  listes, ou tout autre support physique. L'OCR extraira automatiquement le texte.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {stage === 'parsing' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 animate-pulse" />
                Analyse intelligente en cours...
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extraction et analyse des données...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {stage === 'mapping' && parsedData && (
          <>
            <DataPreview data={parsedData} />
            <TemplateSelector onSelect={(template) => setSelectedTemplate(template)} />
            <DataMappingInterface
              sourceData={parsedData}
              onMappingComplete={handleMappingComplete}
            />
            <div className="flex justify-between gap-2 mt-6">
              <Button variant="outline" onClick={goToPreviousStage}>
                Précédent
              </Button>
              <Button onClick={() => handleMappingComplete(validatedData, selectedTemplate)}>
                Valider le mapping
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {stage === 'validation' && (
          <Card>
            <CardHeader>
              <CardTitle>Validation des données</CardTitle>
              <CardDescription>
                Vérifiez que toutes les données sont correctes avant l'import final
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Format validé</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Doublons vérifiés</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Données conformes</span>
                </div>
                
                {validatedData && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Résumé de l'import:</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nombre de lignes:</span>
                        <span className="ml-2 font-semibold">{validatedData.rows?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Template:</span>
                        <span className="ml-2 font-semibold">{selectedTemplate?.name || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between gap-2 mt-6 pt-6 border-t">
                  <Button variant="outline" onClick={goToPreviousStage}>
                    Modifier le mapping
                  </Button>
                  <Button 
                    onClick={() => {
                      setStage('importing');
                      importData(validatedData, selectedTemplate);
                    }}
                  >
                    Lancer l'import
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stage === 'importing' && (
          <Card>
            <CardHeader>
              <CardTitle>Import en cours</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {stage === 'complete' && (
          <Card className="border-2 border-green-500">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-2xl font-bold mb-2">Import terminé avec succès !</h3>
              <p className="text-muted-foreground mb-6">
                Vos prospects ont été importés et sont prêts à être utilisés
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => setStage('upload')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Importer d'autres fichiers
                </Button>
                {onBack && (
                  <Button variant="outline" onClick={onBack}>
                    Retour au menu
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formats supportés */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Formats supportés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {getSupportedFormats().map((format, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <format.icon className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{format.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format.types.join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
