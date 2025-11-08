import { Card } from '@/components/ui/card';
import { Check, X } from 'lucide-react';

export const CompetitorComparison = () => {
  const comparisons = [
    { feature: 'Tarif mensuel', botbj: '3 000 - 15 000 FCFA', competitors: '50 000 - 300 000 FCFA', winner: 'botbj' },
    { feature: 'Paiement', botbj: 'Mobile Money + CB', competitors: 'CB uniquement', winner: 'botbj' },
    { feature: 'Support', botbj: 'Français, local, réactif', competitors: 'Anglais, distant, lent', winner: 'botbj' },
    { feature: 'Délai déploiement', botbj: '24h', competitors: '1-2 semaines', winner: 'botbj' },
    { feature: 'Formation incluse', botbj: 'Oui', competitors: 'Payante', winner: 'botbj' },
    { feature: 'Templates sectoriels', botbj: '8 secteurs pré-configurés', competitors: 'Générique uniquement', winner: 'botbj' },
    { feature: 'WhatsApp natif', botbj: 'Intégré', competitors: 'Plugin payant', winner: 'botbj' },
    { feature: 'IA Créateur Visuel', botbj: 'Inclus', competitors: 'Absent', winner: 'botbj' },
    { feature: 'Rapport Pre-Call IA', botbj: 'Inclus', competitors: 'Absent', winner: 'botbj' },
    { feature: 'Adaptation Afrique', botbj: '100% adapté', competitors: '0% adapté', winner: 'botbj' },
    { feature: 'Interface no-code', botbj: 'Oui', competitors: 'Partiellement', winner: 'botbj' },
    { feature: 'Analytics avancées', botbj: 'Incluses', competitors: 'Payantes', winner: 'botbj' }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          ⚔️ Bot.bj vs Concurrence
        </h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Comparaison détaillée avec les solutions internationales
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="p-4 text-left font-semibold text-foreground">Critère</th>
                <th className="p-4 text-left font-semibold text-primary bg-primary/10">Bot.bj 🇧🇯</th>
                <th className="p-4 text-left font-semibold text-muted-foreground">Concurrents Internationaux 🌍</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                  <td className="p-4 font-medium text-foreground">{item.feature}</td>
                  <td className={`p-4 ${item.winner === 'botbj' ? 'bg-green-50 dark:bg-green-950/20' : ''}`}>
                    <div className="flex items-center gap-2">
                      {item.winner === 'botbj' && <Check className="w-5 h-5 text-green-600 flex-shrink-0" />}
                      <span className={item.winner === 'botbj' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                        {item.botbj}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {item.winner === 'botbj' && <X className="w-5 h-5 text-red-600 flex-shrink-0" />}
                      <span className="text-muted-foreground">{item.competitors}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <div className="space-y-4 text-center">
          <h3 className="text-2xl font-bold text-foreground">🏆 Verdict</h3>
          <p className="text-lg text-foreground">
            <strong>Bot.bj gagne sur 12/12 critères</strong>
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            La seule plateforme d'IA conversationnelle conçue spécifiquement pour les entreprises africaines, 
            combinant technologies de pointe, tarifs accessibles et support local.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">5-10x</p>
              <p className="text-sm text-muted-foreground">Moins cher</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">7x</p>
              <p className="text-sm text-muted-foreground">Plus rapide à déployer</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">100%</p>
              <p className="text-sm text-muted-foreground">Adapté à l'Afrique</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
