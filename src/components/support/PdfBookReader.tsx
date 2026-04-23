import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
// Worker local bundlé par Vite (évite les erreurs CDN / CORS)
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Menu,
  Download,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  BookOpen,
  Loader2,
  AlertCircle,
} from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface OutlineNode {
  title: string;
  dest?: any;
  items?: OutlineNode[];
  pageNumber?: number;
}

interface PdfBookReaderProps {
  fileUrl: string;
  title?: string;
}

export const PdfBookReader: React.FC<PdfBookReaderProps> = ({ fileUrl, title = 'Document' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageWrapperRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.1);
  const [pageWidth, setPageWidth] = useState<number>(800);
  const [outline, setOutline] = useState<OutlineNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pageInput, setPageInput] = useState<string>('1');

  // Resize observer pour le fit-to-width responsive
  useEffect(() => {
    const updateWidth = () => {
      if (pageWrapperRef.current) {
        const w = pageWrapperRef.current.clientWidth;
        setPageWidth(Math.max(320, w - 16));
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    setPageInput(String(pageNumber));
  }, [pageNumber]);

  // Construit l'outline avec numéros de page résolus
  const resolveOutline = useCallback(async (doc: any) => {
    try {
      const raw = await doc.getOutline();
      if (!raw) return [];
      const resolveItem = async (item: any): Promise<OutlineNode> => {
        let pageNumber: number | undefined = undefined;
        try {
          let dest = item.dest;
          if (typeof dest === 'string') {
            dest = await doc.getDestination(dest);
          }
          if (Array.isArray(dest) && dest[0]) {
            const pageIndex = await doc.getPageIndex(dest[0]);
            pageNumber = pageIndex + 1;
          }
        } catch {
          // ignore
        }
        const children = item.items?.length ? await Promise.all(item.items.map(resolveItem)) : [];
        return { title: item.title, dest: item.dest, items: children, pageNumber };
      };
      return await Promise.all(raw.map(resolveItem));
    } catch (e) {
      console.warn('Outline resolution failed', e);
      return [];
    }
  }, []);

  const onDocumentLoadSuccess = useCallback(
    async (doc: any) => {
      setNumPages(doc.numPages);
      setPdfDocument(doc);
      setLoading(false);
      const tree = await resolveOutline(doc);
      setOutline(tree);
    },
    [resolveOutline]
  );

  const goToPage = useCallback(
    (n: number) => {
      const safe = Math.max(1, Math.min(numPages || 1, n));
      setPageNumber(safe);
      setSheetOpen(false);
      // Scroll en haut de la zone de lecture
      requestAnimationFrame(() => {
        pageWrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },
    [numPages]
  );

  const onSelectOutline = (node: OutlineNode) => {
    if (node.pageNumber) goToPage(node.pageNumber);
  };

  // Raccourcis clavier
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') goToPage(pageNumber + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') goToPage(pageNumber - 1);
      else if (e.key === 'Home') goToPage(1);
      else if (e.key === 'End') goToPage(numPages);
      else if (e.key === '+') setScale((s) => Math.min(2.5, s + 0.1));
      else if (e.key === '-') setScale((s) => Math.max(0.5, s - 0.1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pageNumber, numPages, goToPage]);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn('Fullscreen toggle failed', e);
    }
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const fileProp = useMemo(() => ({ url: fileUrl }), [fileUrl]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-background border rounded-xl overflow-hidden shadow-sm ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'relative'
      }`}
      style={{ height: isFullscreen ? '100vh' : 'min(85vh, 1000px)' }}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-muted/40">
        {/* Sommaire (mobile + desktop via Sheet) */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Menu className="w-4 h-4" />
              <span className="hidden sm:inline">Sommaire</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[88vw] sm:w-[420px] p-0 flex flex-col">
            <div className="px-4 pt-4 pb-3 border-b">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Sommaire</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{title}</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2">
                {outline.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    {loading ? 'Chargement…' : "Aucun sommaire détecté dans le PDF."}
                  </div>
                ) : (
                  <OutlineTree nodes={outline} currentPage={pageNumber} onSelect={onSelectOutline} />
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToPage(pageNumber - 1)}
            disabled={pageNumber <= 1}
            aria-label="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseInt(pageInput, 10);
              if (!isNaN(n)) goToPage(n);
            }}
            className="flex items-center gap-1"
          >
            <Input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ''))}
              className="w-14 h-8 text-center text-sm"
              aria-label="Numéro de page"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">/ {numPages || '—'}</span>
          </form>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToPage(pageNumber + 1)}
            disabled={pageNumber >= numPages}
            aria-label="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            aria-label="Zoom arrière"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs tabular-nums w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setScale((s) => Math.min(2.5, s + 0.1))}
            aria-label="Zoom avant"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild aria-label="Télécharger">
            <a href={fileUrl} download>
              <Download className="w-4 h-4" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label="Plein écran">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Zone document */}
      <div ref={pageWrapperRef} className="flex-1 overflow-auto bg-muted/20 flex justify-center p-3 sm:p-5">
        <Document
          file={fileProp}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(err) => {
            console.error('PDF load error', err);
            setLoading(false);
            setLoadError(err?.message || 'Erreur de chargement du PDF');
          }}
          loading={
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Chargement du Guide SIGDSTS…</p>
              <Skeleton className="h-[400px] w-[300px] sm:w-[500px]" />
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center gap-3 py-20 max-w-md mx-auto text-center">
              <AlertCircle className="w-10 h-10 text-destructive" />
              <h3 className="font-semibold">Impossible de charger le document</h3>
              <p className="text-sm text-muted-foreground">
                Le fichier <code className="font-mono text-xs">{fileUrl}</code> n'est pas accessible.
                Vérifiez qu'il est bien déposé dans <code className="font-mono text-xs">public/docs/</code>.
              </p>
              {loadError && <p className="text-xs text-destructive">{loadError}</p>}
            </div>
          }
        >
          <div className="shadow-lg bg-white rounded-md overflow-hidden">
            <Page
              pageNumber={pageNumber}
              width={Math.min(pageWidth, 1100) * scale}
              renderTextLayer
              renderAnnotationLayer
              loading={
                <div className="flex items-center justify-center h-[600px] w-[400px]">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              }
            />
          </div>
        </Document>
      </div>

      {/* Footer navigation */}
      <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/40 text-xs text-muted-foreground">
        <Badge variant="outline" className="font-mono">
          Page {pageNumber} / {numPages || '—'}
        </Badge>
        <div className="hidden sm:flex items-center gap-2">
          <span>← / → pour naviguer</span>
          <span>•</span>
          <span>+ / − pour zoomer</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setSheetOpen(true)} className="text-xs">
          <BookOpen className="w-3.5 h-3.5 mr-1" />
          Sommaire
        </Button>
      </div>
    </div>
  );
};

// Composant arborescent récursif pour le sommaire
const OutlineTree: React.FC<{
  nodes: OutlineNode[];
  currentPage: number;
  onSelect: (node: OutlineNode) => void;
  depth?: number;
}> = ({ nodes, currentPage, onSelect, depth = 0 }) => {
  return (
    <ul className="space-y-0.5">
      {nodes.map((node, idx) => (
        <OutlineItem key={`${depth}-${idx}`} node={node} currentPage={currentPage} onSelect={onSelect} depth={depth} />
      ))}
    </ul>
  );
};

const OutlineItem: React.FC<{
  node: OutlineNode;
  currentPage: number;
  onSelect: (node: OutlineNode) => void;
  depth: number;
}> = ({ node, currentPage, onSelect, depth }) => {
  const hasChildren = !!node.items?.length;
  const [open, setOpen] = useState(depth < 1);
  const isActive = node.pageNumber === currentPage;

  return (
    <li>
      <div
        className={`flex items-start gap-1 rounded-md hover:bg-accent transition-colors ${
          isActive ? 'bg-primary/10 text-primary font-medium' : ''
        }`}
        style={{ paddingLeft: depth * 12 + 4 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="p-1 hover:bg-accent rounded shrink-0 mt-0.5"
            aria-label={open ? 'Replier' : 'Déplier'}
          >
            {open ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRightIcon className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node)}
          disabled={!node.pageNumber}
          className="flex-1 text-left text-sm py-1.5 pr-2 leading-snug disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="line-clamp-2">{node.title}</span>
          {node.pageNumber && (
            <span className="ml-2 text-xs text-muted-foreground tabular-nums">p. {node.pageNumber}</span>
          )}
        </button>
      </div>
      {hasChildren && open && (
        <OutlineTree nodes={node.items!} currentPage={currentPage} onSelect={onSelect} depth={depth + 1} />
      )}
    </li>
  );
};

export default PdfBookReader;
