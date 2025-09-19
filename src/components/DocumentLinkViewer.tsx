import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  ExternalLink, 
  Download, 
  Eye, 
  Copy, 
  FileText, 
  Link as LinkIcon,
  Share2,
  Globe
} from 'lucide-react';

interface DocumentLinkViewerProps {
  url: string;
  title?: string;
  description?: string;
  className?: string;
}

export const DocumentLinkViewer: React.FC<DocumentLinkViewerProps> = ({
  url,
  title = "Document",
  description,
  className = ""
}) => {
  const [showPreview, setShowPreview] = useState(false);

  // Convertir le lien Google Docs en lien public accessible
  const makePublicUrl = (originalUrl: string) => {
    if (originalUrl.includes('docs.google.com/document')) {
      // Extraire l'ID du document
      const match = originalUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        const documentId = match[1];
        return `https://docs.google.com/document/d/${documentId}/edit?usp=sharing`;
      }
    }
    return originalUrl;
  };

  // Générer les URLs de téléchargement
  const getDownloadUrl = (format: 'pdf' | 'docx' | 'odt' | 'txt') => {
    const publicUrl = makePublicUrl(url);
    if (publicUrl.includes('docs.google.com/document')) {
      return publicUrl.replace('/edit?usp=sharing', `/export?format=${format}`);
    }
    return publicUrl;
  };

  // Générer l'URL d'aperçu (embedded) - Version sans CSP
  const getEmbedUrl = () => {
    const publicUrl = makePublicUrl(url);
    if (publicUrl.includes('docs.google.com/document')) {
      return publicUrl.replace('/edit?usp=sharing', '/preview?embedded=true');
    }
    return publicUrl;
  };

  const handleCopyLink = async () => {
    try {
      const publicUrl = makePublicUrl(url);
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Lien copié dans le presse-papier');
    } catch (error) {
      toast.error('Erreur lors de la copie du lien');
    }
  };

  const handleDownload = (format: 'pdf' | 'docx' | 'odt' | 'txt') => {
    const downloadUrl = getDownloadUrl(format);
    window.open(downloadUrl, '_blank');
    toast.success(`Téléchargement ${format.toUpperCase()} démarré`);
  };

  const handleView = () => {
    const publicUrl = makePublicUrl(url);
    window.open(publicUrl, '_blank');
  };

  const handleShare = () => {
    const publicUrl = makePublicUrl(url);
    const message = `📄 ${title}\n\n${description ? description + '\n\n' : ''}Accédez au document :\n${publicUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <>
      <Card className={`border-l-4 border-l-blue-500 ${className}`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* En-tête du document */}
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-gray-900">{title}</span>
                  <Badge variant="outline" className="text-xs">
                    <Globe className="w-3 h-3 mr-1" />
                    Public
                  </Badge>
                </div>
                {description && (
                  <p className="text-sm text-gray-600">{description}</p>
                )}
              </div>
            </div>

            {/* URL cliquable */}
            <div className="bg-gray-50 p-2 rounded border">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-3 h-3 text-gray-500" />
                <a 
                  href={makePublicUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-xs break-all flex-1"
                >
                  {makePublicUrl(url)}
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyLink}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-wrap gap-2">
              {/* Visualisation */}
              <Button
                size="sm"
                onClick={handleView}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Eye className="w-4 h-4 mr-2" />
                Visualiser
              </Button>

              {/* Aperçu intégré */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPreview(true)}
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Aperçu
              </Button>

              {/* Téléchargements */}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDownload('pdf')}
              >
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDownload('docx')}
              >
                <Download className="w-4 h-4 mr-2" />
                Word
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownload('odt')}
              >
                <Download className="w-4 h-4 mr-2" />
                ODT
              </Button>

              {/* Partage */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleShare}
                className="border-green-200 text-green-600 hover:bg-green-50"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Partager
              </Button>
            </div>

            {/* Informations additionnelles */}
            <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span>Document accessible publiquement - Aucune autorisation requise</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal d'aperçu - Sans iframe pour éviter CSP */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Accès au document - {title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-5 h-5 text-blue-600" />
                <span className="text-blue-800 font-medium">Document accessible publiquement</span>
              </div>
              <p className="text-blue-700 text-sm mb-4">
                Ce document est configuré pour être accessible à tous sans demande d'autorisation.
              </p>
              
              {/* Lien direct cliquable */}
              <div className="bg-white p-3 rounded border border-blue-200 mb-4">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-gray-500" />
                  <a 
                    href={makePublicUrl(url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm break-all flex-1 underline"
                  >
                    {makePublicUrl(url)}
                  </a>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyLink}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Actions rapides */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleView}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ouvrir le document
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleDownload('pdf')}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger PDF
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleDownload('docx')}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger Word
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};