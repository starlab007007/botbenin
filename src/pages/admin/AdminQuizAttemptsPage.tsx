import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from '@/components/SEO';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, GraduationCap, Users, Trophy, Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { QUIZ_MODULES } from '@/data/sigdsts-quiz';
import { MENTION_LABEL } from '@/data/sigdsts-quiz/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface Attempt {
  id: string;
  candidate_email: string;
  candidate_name: string;
  candidate_organization: string | null;
  module_id: string;
  module_title: string;
  total_questions: number;
  score: number;
  ratio: number;
  mention: 'excellent' | 'good' | 'review';
  passed: boolean;
  duration_seconds: number | null;
  certificate_issued: boolean;
  ip_hash: string | null;
  created_at: string;
}

const AdminQuizAttemptsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [kpis, setKpis] = useState({ total_candidates: 0, total_attempts: 0, returned: 0 });
  const [search, setSearch] = useState('');
  const [moduleId, setModuleId] = useState<string>('all');
  const [mention, setMention] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('quiz-admin-list', {
        body: {
          search: search.trim() || undefined,
          module_id: moduleId === 'all' ? undefined : moduleId,
          mention: mention === 'all' ? undefined : mention,
          limit: 500,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAttempts((data as any).attempts ?? []);
      setKpis((data as any).kpis ?? { total_candidates: 0, total_attempts: 0, returned: 0 });
    } catch (e: any) {
      toast.error(e?.message ?? 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const passRate = useMemo(() => {
    if (!attempts.length) return 0;
    return Math.round((attempts.filter(a => a.passed).length / attempts.length) * 100);
  }, [attempts]);

  const exportCsv = () => {
    const header = ['Date', 'Candidat', 'Email', 'Organisation', 'Module', 'Score', 'Total', 'Taux %', 'Mention', 'Réussi', 'Durée (s)'];
    const rows = attempts.map(a => [
      format(new Date(a.created_at), 'yyyy-MM-dd HH:mm'),
      a.candidate_name, a.candidate_email, a.candidate_organization ?? '',
      a.module_title, a.score, a.total_questions,
      Math.round(Number(a.ratio) * 100), MENTION_LABEL[a.mention],
      a.passed ? 'oui' : 'non', a.duration_seconds ?? '',
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `quiz-sigdsts-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Helmet><title>Évaluations Quiz — Admin | SIGDSTS</title></Helmet>
      <div className="container mx-auto px-4 py-6 lg:py-10 max-w-7xl">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-1">Évaluations des candidats</h1>
            <p className="text-sm text-muted-foreground">Suivi de toutes les tentatives de quiz SIGDSTS</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualiser
            </Button>
            <Button size="sm" onClick={exportCsv} disabled={!attempts.length}>
              <Download className="w-3.5 h-3.5 mr-1" /> Exporter CSV
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <Card className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            <div><div className="text-2xl font-bold">{kpis.total_candidates}</div><div className="text-xs text-muted-foreground">Candidats</div></div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-violet-600" />
            <div><div className="text-2xl font-bold">{kpis.total_attempts}</div><div className="text-xs text-muted-foreground">Tentatives totales</div></div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500" />
            <div><div className="text-2xl font-bold">{passRate}%</div><div className="text-xs text-muted-foreground">Taux de réussite (filtré)</div></div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Affichées</div>
            <div className="text-2xl font-bold">{attempts.length}</div>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="p-3 mb-4 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Rechercher nom, email, module…" className="pl-9" />
          </div>
          <Select value={moduleId} onValueChange={(v) => { setModuleId(v); }}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les modules</SelectItem>
              {QUIZ_MODULES.map(m => <SelectItem key={m.id} value={m.id}>{m.order}. {m.shortTitle}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={mention} onValueChange={setMention}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes mentions</SelectItem>
              <SelectItem value="excellent">Excellent</SelectItem>
              <SelectItem value="good">Bien</SelectItem>
              <SelectItem value="review">À revoir</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={load} disabled={loading}>Filtrer</Button>
        </Card>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : attempts.length === 0 ? (
          <Card className="p-10 text-center">
            <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucune tentative</p>
          </Card>
        ) : (
          <>
            {/* Mobile : cartes */}
            <div className="space-y-2 lg:hidden">
              {attempts.map((a) => {
                const pct = Math.round(Number(a.ratio) * 100);
                return (
                  <Card key={a.id} className="p-3">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{a.candidate_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.candidate_email}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{pct}%</div>
                        <Badge variant={a.passed ? 'default' : 'outline'} className={a.passed ? 'bg-emerald-600' : ''}>
                          {MENTION_LABEL[a.mention]}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs"><strong>{a.module_title}</strong> · {a.score}/{a.total_questions}</p>
                    <p className="text-[11px] text-muted-foreground">{format(new Date(a.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                  </Card>
                );
              })}
            </div>
            {/* Desktop : tableau */}
            <div className="hidden lg:block overflow-x-auto">
              <Card className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Candidat</th>
                      <th className="px-3 py-2">Organisation</th>
                      <th className="px-3 py-2">Module</th>
                      <th className="px-3 py-2 text-center">Score</th>
                      <th className="px-3 py-2 text-center">Mention</th>
                      <th className="px-3 py-2 text-center">Durée</th>
                      <th className="px-3 py-2 text-center">📜</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a) => {
                      const pct = Math.round(Number(a.ratio) * 100);
                      return (
                        <tr key={a.id} className="border-t hover:bg-muted/30">
                          <td className="px-3 py-2 whitespace-nowrap text-xs">{format(new Date(a.created_at), 'dd/MM HH:mm', { locale: fr })}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{a.candidate_name}</div>
                            <div className="text-xs text-muted-foreground">{a.candidate_email}</div>
                          </td>
                          <td className="px-3 py-2 text-xs">{a.candidate_organization ?? '—'}</td>
                          <td className="px-3 py-2">{a.module_title}</td>
                          <td className="px-3 py-2 text-center font-bold">{pct}% <span className="text-xs text-muted-foreground font-normal">({a.score}/{a.total_questions})</span></td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant={a.passed ? 'default' : 'outline'} className={a.passed ? 'bg-emerald-600' : ''}>
                              {MENTION_LABEL[a.mention]}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-center text-xs">{a.duration_seconds ? `${Math.round(a.duration_seconds / 60)} min` : '—'}</td>
                          <td className="px-3 py-2 text-center">{a.certificate_issued ? '✓' : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default AdminQuizAttemptsPage;
