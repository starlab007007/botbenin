import { CompleteModuleData } from '@/types/module';
import { kpakpatoModule } from './kpakpatoModule';
import { iaBusinessModule } from './iaBusinessModule';

// Export all modules
export const allModules: CompleteModuleData[] = [
  kpakpatoModule,
  iaBusinessModule,
  // Additional modules will be added here
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
