import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from '@/components/SEO';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Trophy, Calendar, Building2, Mail, Cloud, Download, RefreshCw, GraduationCap } from 'lucide-react';
import { fetchGuestHistory, setGuestToken } from '@/lib/quizGuestSync';
import { getQuizModule } from '@/data/sigdsts-quiz';
import { MENTION_LABEL } from '@/data/sigdsts-quiz/types';
import { generateCertificate } from '@/lib/quizCertificate';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const SigdstsQuizGuestHistoryPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchGuestHistory>> | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const r = await fetchGuestHistory(token);
      setData(r);
      setGuestToken(token); // mémorise dans ce navigateur
    } catch (e: any) {
      setError(e?.message ?? 'Lien invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  // Best score per module
  const bestByModule = React.useMemo(() => {
    const map = new Map<string, typeof data extends null ? never : (typeof data.attempts)[number]>();
    data?.attempts.forEach((a) => {
      const prev = map.get(a.module_id);
      if (!prev || a.score > prev.score) map.set(a.module_id, a);
    });
    return map;
  }, [data]);

  const handleDownload = (att: NonNullable<typeof data>['attempts'][number]) => {
    if (!data) return;
    const mod = getQuizModule(att.module_id);
    if (!mod) { toast.error('Module introuvable'); return; }
    generateCertificate({
      userName: data.candidate.full_name, module: mod,
      score: att.score, total: att.total_questions, date: new Date(att.created_at),
    });
    toast.success('Attestation téléchargée');
  };

  return (
    <>
      <Helmet>
        <title>Mes évaluations SIGDSTS</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-950/20 dark:to-blue-950/20">
        <div className="container mx-auto px-4 py-6 lg:py-10 max-w-5xl">
          <Link to="/sigdsts/quiz" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="w-4 h-4" /> Retour aux quiz
          </Link>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}

          {error && !loading && (
            <Card className="p-8 text-center">
              <h1 className="text-xl font-bold mb-2">Lien invalide ou expiré</h1>
              <p className="text-muted-foreground mb-5">{error}</p>
              <Button asChild><Link to="/sigdsts/quiz">Créer un nouvel espace</Link></Button>
            </Card>
          )}

          {data && !loading && (
            <>
              {/* Identity card */}
              <Card className="p-5 lg:p-6 mb-5 bg-gradient-to-br from-violet-600 to-blue-700 text-white border-0">
                <Badge variant="outline" className="bg-white/20 text-white border-white/30 mb-3">
                  <Cloud className="w-3 h-3 mr-1" /> Espace synchronisé
                </Badge>
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">{data.candidate.full_name}</h1>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm opacity-90">
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> <span className="truncate">{data.candidate.email}</span></div>
                  {data.candidate.organization && (
                    <div className="flex items-center gap-2"><Building2 className="w-4 h-4" /> {data.candidate.organization}</div>
                  )}
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Lien valide jusqu'au {format(new Date(data.candidate.guest_token_expires), 'dd MMM yyyy', { locale: fr })}</div>
                </div>
              </Card>

              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Tentatives</div>
                  <div className="text-2xl font-bold">{data.attempts.length}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Modules réussis</div>
                  <div className="text-2xl font-bold">{Array.from(bestByModule.values()).filter(a => a.passed).length}/10</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Attestations</div>
                  <div className="text-2xl font-bold">{data.attempts.filter(a => a.passed).length}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Meilleur taux</div>
                  <div className="text-2xl font-bold">
                    {data.attempts.length ? Math.round(Math.max(...data.attempts.map(a => Number(a.ratio))) * 100) : 0}%
                  </div>
                </Card>
              </div>

              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" /> Historique des tentatives
                </h2>
                <Button variant="outline" size="sm" onClick={load}>
                  <RefreshCw className="w-3 h-3 mr-1" /> Actualiser
                </Button>
              </div>

              {data.attempts.length === 0 ? (
                <Card className="p-8 text-center">
                  <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">Aucune tentative pour le moment</p>
                  <Button asChild><Link to="/sigdsts/quiz">Démarrer un quiz</Link></Button>
                </Card>
              ) : (
                <div className="space-y-2">
                  {data.attempts.map((a) => {
                    const ratioPct = Math.round(Number(a.ratio) * 100);
                    return (
                      <Card key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold truncate">{a.module_title}</span>
                            <Badge variant={a.passed ? 'default' : 'outline'} className={a.passed ? 'bg-emerald-600' : ''}>
                              {MENTION_LABEL[a.mention]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr })}
                            {a.duration_seconds ? ` · ${Math.round(a.duration_seconds / 60)} min` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xl font-bold">{ratioPct}%</div>
                            <div className="text-xs text-muted-foreground">{a.score}/{a.total_questions}</div>
                          </div>
                          {a.passed && (
                            <Button size="sm" variant="outline" onClick={() => handleDownload(a)}>
                              <Download className="w-3.5 h-3.5 mr-1" /> Attestation
                            </Button>
                          )}
                          <Button asChild size="sm">
                            <Link to={`/sigdsts/quiz/${a.module_id}`}>Refaire</Link>
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default SigdstsQuizGuestHistoryPage;
