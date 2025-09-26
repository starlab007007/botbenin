import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  ExternalLink, 
  Download, 
  FileText, 
  Loader2,
  AlertCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface DocumentPreviewProps {
  documentUrl: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  documentUrl,
  isOpen,
  onClose,
  title = "Aperçu du document"
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (!isOpen) return null;

  // Convertir l'URL Google Docs en URL d'aperçu
  const getPreviewUrl = (url: string) => {
    if (url.includes('docs.google.com')) {
      // Extraire l'ID du document et créer une URL d'aperçu
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        return `https://docs.google.com/document/d/${match[1]}/preview`;
      }
    }
    return url;
  };

  const getPdfUrl = (url: string) => {
    if (url.includes('docs.google.com')) {
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        return `https://docs.google.com/document/d/${match[1]}/export?format=pdf`;
      }
    }
    return url;
  };

  const previewUrl = getPreviewUrl(documentUrl);
  const pdfUrl = getPdfUrl(documentUrl);

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-[60] ${
      isFullscreen ? 'p-0' : 'p-4'
    }`}>
      <div className={`bg-white shadow-xl flex flex-col ${
        isFullscreen 
          ? 'w-full h-full' 
          : 'w-full max-w-6xl h-[90vh] rounded-lg'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <Badge variant="secondary" className="text-xs">
                Google Document
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
            
            <Button variant="outline" size="sm" asChild>
              <a href={pdfUrl} download>
                <Download className="w-4 h-4 mr-2" />
                PDF
              </a>
            </Button>
            
            <Button variant="outline" size="sm" asChild>
              <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Ouvrir
              </a>
            </Button>
            
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Document Preview */}
        <div className="flex-1 relative overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-gray-600">Chargement du document...</p>
              </div>
            </div>
          )}
          
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Impossible de charger l'aperçu
                </h3>
                <p className="text-gray-600 mb-4">
                  Le document ne peut pas être affiché en aperçu. Vous pouvez l'ouvrir directement ou le télécharger.
                </p>
                <div className="flex justify-center gap-3">
                  <Button asChild>
                    <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ouvrir le document
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={pdfUrl} download>
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger PDF
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            title="Aperçu du document"
          />
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>Document généré automatiquement par l'IA</p>
            <div className="flex items-center gap-4">
              <span>Mise à jour en temps réel</span>
              <Badge variant="outline" className="text-xs">
                Collaboratif
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};