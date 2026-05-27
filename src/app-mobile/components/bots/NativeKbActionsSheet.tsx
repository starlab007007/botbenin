import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Edit, Eye, FileJson, FileSpreadsheet, FileText, Trash2 } from 'lucide-react';
import { KnowledgeBase } from '@/types/knowledge-base';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kb: KnowledgeBase | null;
  onView: () => void;
  onEdit: () => void;
  onExport: (fmt: 'json' | 'csv' | 'excel' | 'pdf') => void;
  onDelete: () => void;
}

export default function NativeKbActionsSheet({ open, onOpenChange, kb, onView, onEdit, onExport, onDelete }: Props) {
  if (!kb) return null;
  const Item = ({ icon: Icon, label, onClick, danger }: any) => (
    <button
      type="button"
      onClick={() => { onClick(); onOpenChange(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-accent ${danger ? 'text-destructive' : ''}`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="text-[15px]">{label}</span>
    </button>
  );
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="p-0 rounded-t-2xl">
        <div className="py-2 px-4">
          <div className="mx-auto w-10 h-1 rounded-full bg-muted mb-2" />
          <h3 className="font-semibold text-base truncate">{kb.name}</h3>
          <p className="text-xs text-muted-foreground truncate mb-2">{kb.description || 'Base de connaissances'}</p>
        </div>
        <div className="border-t">
          <Item icon={Eye} label="Visualiser" onClick={onView} />
          <Item icon={Edit} label="Modifier" onClick={onEdit} />
          <div className="border-t" />
          <Item icon={FileJson} label="Exporter JSON" onClick={() => onExport('json')} />
          <Item icon={FileSpreadsheet} label="Exporter Excel" onClick={() => onExport('excel')} />
          <Item icon={FileText} label="Exporter CSV" onClick={() => onExport('csv')} />
          <Item icon={FileText} label="Exporter PDF" onClick={() => onExport('pdf')} />
          <div className="border-t" />
          <Item icon={Trash2} label="Supprimer" onClick={onDelete} danger />
        </div>
        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </SheetContent>
    </Sheet>
  );
}
