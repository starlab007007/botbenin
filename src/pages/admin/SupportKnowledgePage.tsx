import React, { useEffect, useState } from 'react';
import { Helmet } from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { SupportKnowledgeArticle } from '@/types/support';

const SupportKnowledgePage: React.FC = () => {
  const [articles, setArticles] = useState<SupportKnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<SupportKnowledgeArticle> | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('support_knowledge_articles').select('*').order('display_order');
    setArticles((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.title || !editing?.content) {
      toast.error('Titre et contenu requis');
      return;
    }
    const payload: any = {
      title: editing.title,
      content: editing.content,
      module: editing.module || null,
      category: editing.category || null,
      keywords: editing.keywords || null,
      is_active: editing.is_active ?? true,
      display_order: editing.display_order ?? 0,
    };
    let res;
    if (editing.id) res = await supabase.from('support_knowledge_articles').update(payload).eq('id', editing.id);
    else res = await supabase.from('support_knowledge_articles').insert(payload);
    if (res.error) toast.error(res.error.message);
    else { toast.success('Article enregistré'); setOpen(false); setEditing(null); load(); }
  };

  const del = async (id: string) => {
    if (!confirm('Supprimer cet article ?')) return;
    const { error } = await supabase.from('support_knowledge_articles').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Supprimé'); load(); }
  };

  const toggle = async (a: SupportKnowledgeArticle) => {
    const { error } = await supabase.from('support_knowledge_articles').update({ is_active: !a.is_active }).eq('id', a.id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <>
      <Helmet><title>Base de connaissances chatbot — Admin | SIGDSTS</title></Helmet>
      <div className="container mx-auto px-4 py-6 lg:py-10 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-emerald-600" /> Base de connaissances chatbot
            </h1>
            <p className="text-sm text-muted-foreground">Articles utilisés par l'assistant N1 pour répondre aux utilisateurs</p>
          </div>
          <Button onClick={() => { setEditing({ is_active: true, display_order: articles.length + 1 }); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Nouvel article
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {articles.map((a) => (
              <Card key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{a.title}</h3>
                    {a.module && <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{a.module}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={a.is_active} onCheckedChange={() => toggle(a)} />
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing?.id ? 'Modifier' : 'Nouvel'} article</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label>Titre</Label>
                <Input value={editing?.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Module</Label>
                  <Input value={editing?.module ?? ''} onChange={(e) => setEditing({ ...editing, module: e.target.value })} />
                </div>
                <div>
                  <Label>Catégorie</Label>
                  <Input value={editing?.category ?? ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Contenu (markdown supporté)</Label>
                <Textarea rows={10} value={editing?.content ?? ''} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Article actif (utilisé par le chatbot)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={save}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default SupportKnowledgePage;
