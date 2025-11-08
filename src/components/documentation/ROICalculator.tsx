import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingUp, DollarSign, Clock, Users } from 'lucide-react';

export const ROICalculator = () => {
  const [requestsPerDay, setRequestsPerDay] = useState<number>(100);
  const [avgProcessingTime, setAvgProcessingTime] = useState<number>(5);
  const [hourlyCost, setHourlyCost] = useState<number>(1500);
  const [currentConversionRate, setCurrentConversionRate] = useState<number>(2);

  // Calculs
  const requestsPerMonth = requestsPerDay * 30;
  const totalMinutesPerMonth = requestsPerMonth * avgProcessingTime;
  const totalHoursPerMonth = totalMinutesPerMonth / 60;
  const currentMonthlyCost = totalHoursPerMonth * hourlyCost;
  
  // Avec Bot.bj (90% automatisé)
  const automationRate = 0.9;
  const hoursAutomated = totalHoursPerMonth * automationRate;
  const monthlySavings = hoursAutomated * hourlyCost;
  
  // Pack cost (assuming Professional at 5000 FCFA)
  const botbjCost = 5000;
  const netSavings = monthlySavings - botbjCost;
  const annualSavings = netSavings * 12;
  const roi = ((netSavings / botbjCost) * 100).toFixed(0);
  
  // Additional conversions with 40% improvement
  const additionalConversions = Math.round((requestsPerMonth * (currentConversionRate / 100) * 0.4));
  
  // Time saved
  const timeSavedHours = hoursAutomated;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Calculator className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          🧮 Calculateur de ROI
        </h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Découvrez combien vous pourriez économiser avec Bot.bj
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <Card className="p-6 space-y-6">
          <h3 className="text-xl font-semibold text-foreground">Entrez vos données</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="requests">Nombre de demandes clients/jour</Label>
              <Input
                id="requests"
                type="number"
                value={requestsPerDay}
                onChange={(e) => setRequestsPerDay(Number(e.target.value))}
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Nombre moyen de demandes reçues par jour (WhatsApp, email, téléphone)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Temps moyen de traitement (minutes)</Label>
              <Input
                id="time"
                type="number"
                value={avgProcessingTime}
                onChange={(e) => setAvgProcessingTime(Number(e.target.value))}
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                Temps nécessaire pour traiter une demande complètement
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Coût horaire agent (FCFA)</Label>
              <Input
                id="cost"
                type="number"
                value={hourlyCost}
                onChange={(e) => setHourlyCost(Number(e.target.value))}
                min="0"
                step="100"
              />
              <p className="text-xs text-muted-foreground">
                Coût horaire moyen d'un agent (salaire + charges)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conversion">Taux de conversion actuel (%)</Label>
              <Input
                id="conversion"
                type="number"
                value={currentConversionRate}
                onChange={(e) => setCurrentConversionRate(Number(e.target.value))}
                min="0"
                max="100"
                step="0.1"
              />
              <p className="text-xs text-muted-foreground">
                Pourcentage de demandes converties en ventes
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Demandes/mois:</span>
                <span className="font-semibold">{requestsPerMonth.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Heures de travail/mois:</span>
                <span className="font-semibold">{totalHoursPerMonth.toFixed(0)}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coût actuel/mois:</span>
                <span className="font-semibold text-red-600">{currentMonthlyCost.toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Results Section */}
        <Card className="p-6 space-y-6 bg-gradient-to-br from-primary/5 to-accent/5">
          <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Résultats avec Bot.bj
          </h3>

          <div className="space-y-4">
            {/* Monthly Savings */}
            <Card className="p-4 bg-background">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-foreground">Économies mensuelles</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {monthlySavings.toLocaleString()} FCFA
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Coût Bot.bj: {botbjCost.toLocaleString()} FCFA/mois
              </p>
              <p className="text-sm font-semibold text-primary mt-1">
                Économie nette: {netSavings.toLocaleString()} FCFA/mois
              </p>
            </Card>

            {/* Annual Savings */}
            <Card className="p-4 bg-background">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">Économies annuelles</span>
              </div>
              <p className="text-3xl font-bold text-primary">
                {annualSavings.toLocaleString()} FCFA
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Sur 12 mois
              </p>
            </Card>

            {/* Time Saved */}
            <Card className="p-4 bg-background">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-foreground">Temps gagné</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {timeSavedHours.toFixed(0)} heures
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Par mois (90% des demandes automatisées)
              </p>
            </Card>

            {/* Additional Conversions */}
            <Card className="p-4 bg-background">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-foreground">Conversions supplémentaires</span>
              </div>
              <p className="text-3xl font-bold text-purple-600">
                +{additionalConversions}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Par mois (+40% taux de conversion)
              </p>
            </Card>

            {/* ROI */}
            <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900">
              <div className="text-center space-y-2">
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                  Retour sur Investissement (ROI)
                </p>
                <p className="text-5xl font-bold text-green-600">
                  {roi}%
                </p>
                <p className="text-sm text-muted-foreground">
                  ROI mensuel calculé
                </p>
              </div>
            </Card>
          </div>

          <div className="pt-4 border-t space-y-3">
            <h4 className="font-semibold text-foreground">✅ Avantages supplémentaires :</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Disponibilité 24/7 sans coûts supplémentaires</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Amélioration continue de la satisfaction client (+45%)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Réduction des erreurs humaines (-95%)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Analytics et insights pour optimiser votre business</span>
              </li>
            </ul>
          </div>

          <Button size="lg" className="w-full" onClick={() => window.location.href = '/pricing'}>
            Commencer à Économiser Maintenant
          </Button>
        </Card>
      </div>

      <Card className="p-6 bg-muted/30">
        <div className="text-center space-y-4">
          <h4 className="text-lg font-semibold text-foreground">💡 Ces chiffres sont conservateurs</h4>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            La plupart de nos clients constatent des économies encore plus importantes grâce aux gains 
            de productivité, à l'augmentation des ventes et à l'amélioration de la satisfaction client. 
            Sans compter la valeur inestimable de la disponibilité 24/7 et de la scalabilité illimitée.
          </p>
        </div>
      </Card>
    </div>
  );
};
