import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle } from 'lucide-react';

interface IACreatorAlertsProps {
  stats: {
    pending_moderation: number;
    flagged_creations: number;
  } | undefined;
}

export const IACreatorAlerts: React.FC<IACreatorAlertsProps> = ({ stats }) => {
  if (!stats) return null;

  const alerts = [];

  if (stats.pending_moderation > 10) {
    alerts.push({
      type: 'warning' as const,
      title: 'Modération en attente',
      description: `${stats.pending_moderation} créations nécessitent une modération`,
    });
  }

  if (stats.flagged_creations > 0) {
    alerts.push({
      type: 'error' as const,
      title: 'Créations signalées',
      description: `${stats.flagged_creations} créations ont été signalées automatiquement`,
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-4">
      {alerts.map((alert, index) => (
        <Alert key={index} variant={alert.type === 'error' ? 'destructive' : 'default'}>
          {alert.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.description}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
};