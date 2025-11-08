import { CompleteModuleData } from '@/types/module';
import { kpakpatoModule } from './kpakpatoModule';
import { iaBusinessModule } from './iaBusinessModule';
import { mesBotsModule } from './mesBotsModule';
import { creationBotsModule } from './creationBotsModule';
import { whatsappConnectModule } from './whatsappConnectModule';
import { prospectsModule } from './prospectsModule';
import { iaProspectModule } from './iaProspectModule';
import { iaCreateurModule } from './iaCreateurModule';

// Export all modules
export const allModules: CompleteModuleData[] = [
  kpakpatoModule,
  iaBusinessModule,
  mesBotsModule,
  creationBotsModule,
  whatsappConnectModule,
  prospectsModule,
  iaProspectModule,
  iaCreateurModule,
];

// Helper functions
export const getModuleById = (id: string): CompleteModuleData | undefined => {
  return allModules.find(m => m.id === id);
};

export const getModulesByCategory = (category: string): CompleteModuleData[] => {
  return allModules.filter(m => m.category === category);
};

export const searchModules = (query: string): CompleteModuleData[] => {
  const q = query.toLowerCase();
  return allModules.filter(m => 
    m.title.toLowerCase().includes(q) ||
    m.presentation.shortDescription.toLowerCase().includes(q) ||
    m.metadata.tags.some(tag => tag.includes(q))
  );
};
