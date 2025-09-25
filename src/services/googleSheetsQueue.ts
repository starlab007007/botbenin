import { toast } from 'sonner';

interface QueueOperation {
  id: string;
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class GoogleSheetsQueue {
  private queue: QueueOperation[] = [];
  private isProcessing = false;
  private lastOperationTime = 0;
  private readonly minDelay = 500; // Délai minimum entre opérations (500ms)

  async add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const queueItem: QueueOperation = {
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation,
        resolve,
        reject
      };

      this.queue.push(queueItem);
      console.log(`📋 Opération ajoutée à la queue: ${queueItem.id}, position: ${this.queue.length}`);
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const queueItem = this.queue.shift()!;
      
      try {
        // Respecter le délai minimum entre opérations
        const now = Date.now();
        const timeSinceLastOp = now - this.lastOperationTime;
        if (timeSinceLastOp < this.minDelay) {
          const waitTime = this.minDelay - timeSinceLastOp;
          console.log(`⏱️ Attente de ${waitTime}ms avant prochaine opération`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        console.log(`🔄 Traitement de l'opération ${queueItem.id}`);
        const result = await queueItem.operation();
        
        this.lastOperationTime = Date.now();
        queueItem.resolve(result);
        console.log(`✅ Opération ${queueItem.id} terminée avec succès`);
        
      } catch (error) {
        console.error(`❌ Erreur lors de l'opération ${queueItem.id}:`, error);
        queueItem.reject(error);
      }
    }

    this.isProcessing = false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isQueueEmpty(): boolean {
    return this.queue.length === 0 && !this.isProcessing;
  }

  clearQueue(): void {
    // Rejeter toutes les opérations en attente
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    console.log('🧹 Queue vidée');
  }
}

// Instance singleton
export const googleSheetsQueue = new GoogleSheetsQueue();

// Wrapper pour les opérations Google Sheets
export const queueGoogleSheetsOperation = <T>(operation: () => Promise<T>): Promise<T> => {
  return googleSheetsQueue.add(operation);
};

// Fonction utilitaire pour vérifier l'état de la queue
export const getQueueStatus = () => ({
  length: googleSheetsQueue.getQueueLength(),
  isEmpty: googleSheetsQueue.isQueueEmpty(),
  isProcessing: !googleSheetsQueue.isQueueEmpty()
});