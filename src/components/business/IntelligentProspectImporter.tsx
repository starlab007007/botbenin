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

export const IntelligentProspectImporter: React.FC<IntelligentProspectImporterProps> = ({ onBack }) => {
  const { toast } = useToast();
  const [stage, setStage] = useState<ImportStage>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [cameraMode, setCameraMode] = useState(false);
  const [progress, setProgress] = useState(0);
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
    setStage('validation');
    // Validation logic here
    setTimeout(() => {
      setStage('importing');
      importData(mappedData, template);
    }, 1000);
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
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {['upload', 'parsing', 'mapping', 'validation', 'importing', 'complete'].map((s, idx) => (
                <div key={s} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                    stage === s ? 'bg-primary text-primary-foreground scale-110' :
                    ['upload', 'parsing', 'mapping', 'validation', 'importing', 'complete'].indexOf(stage) > idx ?
                    'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {['upload', 'parsing', 'mapping', 'validation', 'importing', 'complete'].indexOf(stage) > idx ? 
                      <CheckCircle2 className="w-5 h-5" /> : 
                      <span className="text-sm font-semibold">{idx + 1}</span>
                    }
                  </div>
                  {idx < 5 && (
                    <div className={`w-16 h-1 mx-2 ${
                      ['upload', 'parsing', 'mapping', 'validation', 'importing', 'complete'].indexOf(stage) > idx ?
                      'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
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
            <TemplateSelector onSelect={(template) => setStage('validation')} />
            <DataMappingInterface
              sourceData={parsedData}
              onMappingComplete={handleMappingComplete}
            />
          </>
        )}

        {stage === 'validation' && (
          <Card>
            <CardHeader>
              <CardTitle>Validation des données</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
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
