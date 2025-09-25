import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getQueueStatus, googleSheetsQueue } from '@/services/googleSheetsQueue';
import { Clock, CheckCircle, AlertTriangle, RotateCcw } from 'lucide-react';

export const GoogleSheetsQueueStatus: React.FC = () => {
  const [queueStatus, setQueueStatus] = useState(getQueueStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setQueueStatus(getQueueStatus());
    }, 1000); // Mise à jour chaque seconde

    return () => clearInterval(interval);
  }, []);

  const handleClearQueue = () => {
    if (queueStatus.length > 0) {
      const confirmed = window.confirm(
        `Êtes-vous sûr de vouloir annuler les ${queueStatus.length} opération(s) en attente ?`
      );
      if (confirmed) {
        googleSheetsQueue.clearQueue();
      }
    }
  };

  if (queueStatus.isEmpty) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        Synchronisé
      </Badge>
    );
  }

  if (queueStatus.isProcessing) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="default" className="flex items-center gap-1 animate-pulse">
          <Clock className="w-3 h-3" />
          Synchronisation... ({queueStatus.length} en attente)
        </Badge>
        {queueStatus.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearQueue}
            className="h-6 px-2 text-xs"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Annuler
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="flex items-center gap-1">
        <RotateCcw className="w-3 h-3" />
        {queueStatus.length} opération(s) en attente
      </Badge>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClearQueue}
        className="h-6 px-2 text-xs"
      >
        Annuler tout
      </Button>
    </div>
  );
};