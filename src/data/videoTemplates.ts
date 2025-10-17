import { VideoTemplate } from '@/types/video-assembly';

export const videoTemplates: Record<string, VideoTemplate> = {
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'Template équilibré avec transitions douces',
    frameDurations: [2.5, 2.5, 2.5, 2.5],
    transitions: ['slide', 'fade', 'zoom', 'slide'],
    textPositions: {
      hook: { x: 'center', y: 150 },
      content: { x: 'center', y: 500 },
      cta: { x: 'center', y: 850 }
    },
    musicVolume: 0.3
  },
  
  fast: {
    id: 'fast',
    name: 'Rapide',
    description: 'Rythme dynamique pour capter l\'attention',
    frameDurations: [2, 2, 3, 3],
    transitions: ['cut', 'cut', 'fade', 'zoom'],
    textPositions: {
      hook: { x: 'center', y: 120 },
      content: { x: 'center', y: 480 },
      cta: { x: 'center', y: 900 }
    },
    musicVolume: 0.4
  },
  
  story: {
    id: 'story',
    name: 'Story',
    description: 'Narration progressive pour storytelling',
    frameDurations: [3, 2, 2, 3],
    transitions: ['zoom', 'slide', 'slide', 'fade'],
    textPositions: {
      hook: { x: 'center', y: 180 },
      content: { x: 'center', y: 520 },
      cta: { x: 'center', y: 800 }
    },
    musicVolume: 0.25
  },
  
  energetic: {
    id: 'energetic',
    name: 'Énergique',
    description: 'Transitions rapides et dynamiques',
    frameDurations: [2, 2.5, 2.5, 3],
    transitions: ['zoom', 'cut', 'slide', 'zoom'],
    textPositions: {
      hook: { x: 'center', y: 100 },
      content: { x: 'center', y: 450 },
      cta: { x: 'center', y: 950 }
    },
    musicVolume: 0.35
  },
  
  professional: {
    id: 'professional',
    name: 'Professionnel',
    description: 'Élégant et sobre pour contenu business',
    frameDurations: [3, 2.5, 2.5, 2],
    transitions: ['fade', 'fade', 'fade', 'fade'],
    textPositions: {
      hook: { x: 'center', y: 200 },
      content: { x: 'center', y: 550 },
      cta: { x: 'center', y: 850 }
    },
    musicVolume: 0.2
  }
};

export const getTemplateById = (id: string): VideoTemplate => {
  return videoTemplates[id] || videoTemplates.standard;
};

export const getTemplatesList = (): VideoTemplate[] => {
  return Object.values(videoTemplates);
};
