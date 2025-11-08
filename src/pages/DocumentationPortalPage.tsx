import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { documentationIndex, categories } from '@/config/documentation';
import { DocumentationService } from '@/services/documentationService';
import { MarkdownViewer } from '@/components/documentation/MarkdownViewer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Share2,
  Download,
  Menu,
  X,
  FileText,
  ChevronRight,
  Home
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

export const DocumentationPortalPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Charger le document depuis l'URL au montage
  useEffect(() => {
    const docId = searchParams.get('doc');
    if (docId) {
      const doc = documentationIndex.find(d => d.id === docId);
      if (doc) {
        setSelectedDoc(doc.id);
        loadDocument(doc.file);
      }
    } else if (documentationIndex.length > 0) {
      // Charger le premier document par défaut
      const firstDoc = documentationIndex[0];
      setSelectedDoc(firstDoc.id);
      setSearchParams({ doc: firstDoc.id });
      loadDocument(firstDoc.file);
    }
  }, []);

  const loadDocument = async (filePath: string) => {
    setIsLoading(true);
    try {
      const content = await DocumentationService.loadDocument(filePath);
      setDocumentContent(content);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le document',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentSelect = (docId: string) => {
    const doc = documentationIndex.find(d => d.id === docId);
    if (doc) {
      setSelectedDoc(doc.id);
      setSearchParams({ doc: doc.id });
      loadDocument(doc.file);
      if (isMobile) {
        setSidebarOpen(false);
      }
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/documentation?doc=${selectedDoc}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Lien copié !',
      description: 'Le lien vers ce document a été copié dans le presse-papier',
    });
  };

  const handleExportPDF = () => {
    toast({
      title: 'Export PDF',
      description: 'Fonctionnalité à venir : Export en PDF',
    });
  };

  const filteredDocs = DocumentationService.searchDocuments(
    selectedCategory
      ? DocumentationService.filterByCategory(documentationIndex, selectedCategory)
      : documentationIndex,
    searchTerm
  );

  const groupedDocs = DocumentationService.groupByCategory(filteredDocs);

  const currentDoc = documentationIndex.find(d => d.id === selectedDoc);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
              <FileText className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground hidden sm:block">
                Documentation Bot BJ
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="hidden sm:flex"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Partager
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportPDF}
                className="hidden sm:flex"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/'}
              >
                <Home className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Accueil</span>
              </Button>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher dans la documentation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          {(sidebarOpen || !isMobile) && (
            <aside className={`${isMobile ? 'fixed inset-y-0 left-0 z-40 w-80 bg-card border-r border-border shadow-lg' : 'w-80 flex-shrink-0'}`}>
              <ScrollArea className="h-[calc(100vh-180px)]">
                <div className="p-4 space-y-4">
                  {/* Filtres par catégorie */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Catégories</h3>
                    <Button
                      variant={!selectedCategory ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedCategory(null)}
                      className="w-full justify-start"
                    >
                      Toutes les catégories
                    </Button>
                    {categories.map(category => (
                      <Button
                        key={category}
                        variant={selectedCategory === category ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setSelectedCategory(category)}
                        className="w-full justify-start"
                      >
                        {category}
                      </Button>
                    ))}
                  </div>

                  <Separator />

                  {/* Liste des documents */}
                  <div className="space-y-1">
                    {Object.entries(groupedDocs).map(([category, docs]) => (
                      <div key={category} className="space-y-1">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                          {category}
                        </h4>
                        {docs.map(doc => (
                          <button
                            key={doc.id}
                            onClick={() => handleDocumentSelect(doc.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                              selectedDoc === doc.id
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted text-foreground'
                            }`}
                          >
                            <span className="text-lg">{doc.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {doc.title}
                              </div>
                              <div className="text-xs opacity-80 truncate">
                                {doc.description}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </aside>
          )}

          {/* Zone de contenu principale */}
          <main className="flex-1 min-w-0">
            <div className="bg-card rounded-lg shadow-sm border border-border p-6 lg:p-8">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : currentDoc ? (
                <div>
                  {/* En-tête du document */}
                  <div className="mb-6 pb-6 border-b border-border">
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-3xl">{currentDoc.icon}</span>
                      <div>
                        <h2 className="text-2xl font-bold text-foreground">
                          {currentDoc.title}
                        </h2>
                        <p className="text-muted-foreground mt-1">
                          {currentDoc.description}
                        </p>
                        {currentDoc.lastUpdated && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Dernière mise à jour : {currentDoc.lastUpdated}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contenu du document */}
                  <MarkdownViewer content={documentContent} />
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Aucun document sélectionné
                  </h3>
                  <p className="text-muted-foreground">
                    Sélectionnez un document dans la barre latérale pour commencer
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Overlay mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
