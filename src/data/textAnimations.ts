import { TextAnimationTemplate } from '@/types/animation-templates';

export const TEXT_ANIMATIONS: Record<string, TextAnimationTemplate> = {
  // === ENTRANCES ===
  fadeIn: {
    id: 'fadeIn',
    name: 'Apparition Douce',
    description: 'Fondu progressif du texte',
    category: 'entrance',
    duration: 0.8,
    previewIcon: '✨',
    keyframes: [
      { time: 0, properties: { opacity: 0, translateY: 20 }, easing: 'ease-out' },
      { time: 1, properties: { opacity: 1, translateY: 0 }, easing: 'ease-out' }
    ]
  },

  slideInLeft: {
    id: 'slideInLeft',
    name: 'Glissement Gauche',
    description: 'Entrée depuis la gauche',
    category: 'entrance',
    duration: 0.6,
    previewIcon: '⬅️',
    keyframes: [
      { time: 0, properties: { opacity: 0, translateX: -100 }, easing: 'ease-out' },
      { time: 1, properties: { opacity: 1, translateX: 0 }, easing: 'ease-out' }
    ]
  },

  slideInRight: {
    id: 'slideInRight',
    name: 'Glissement Droite',
    description: 'Entrée depuis la droite',
    category: 'entrance',
    duration: 0.6,
    previewIcon: '➡️',
    keyframes: [
      { time: 0, properties: { opacity: 0, translateX: 100 }, easing: 'ease-out' },
      { time: 1, properties: { opacity: 1, translateX: 0 }, easing: 'ease-out' }
    ]
  },

  slideInUp: {
    id: 'slideInUp',
    name: 'Montée Progressive',
    description: 'Entrée depuis le bas',
    category: 'entrance',
    duration: 0.7,
    previewIcon: '⬆️',
    keyframes: [
      { time: 0, properties: { opacity: 0, translateY: 50 }, easing: 'ease-out' },
      { time: 1, properties: { opacity: 1, translateY: 0 }, easing: 'ease-out' }
    ]
  },

  zoomIn: {
    id: 'zoomIn',
    name: 'Zoom Avant',
    description: 'Apparition avec agrandissement',
    category: 'entrance',
    duration: 0.8,
    previewIcon: '🔍',
    keyframes: [
      { time: 0, properties: { opacity: 0, scale: 0.5 }, easing: 'ease-out' },
      { time: 1, properties: { opacity: 1, scale: 1 }, easing: 'ease-out' }
    ]
  },

  bounceIn: {
    id: 'bounceIn',
    name: 'Rebond Dynamique',
    description: 'Entrée avec effet rebond',
    category: 'entrance',
    duration: 1.0,
    previewIcon: '🎾',
    keyframes: [
      { time: 0, properties: { opacity: 0, scale: 0.3, translateY: -30 }, easing: 'ease-out' },
      { time: 0.5, properties: { opacity: 1, scale: 1.1, translateY: 5 }, easing: 'bounce' },
      { time: 0.75, properties: { scale: 0.95, translateY: -2 }, easing: 'bounce' },
      { time: 1, properties: { scale: 1, translateY: 0 }, easing: 'bounce' }
    ]
  },

  typewriter: {
    id: 'typewriter',
    name: 'Machine à Écrire',
    description: 'Apparition lettre par lettre',
    category: 'entrance',
    duration: 1.5,
    previewIcon: '⌨️',
    keyframes: [
      { time: 0, properties: { opacity: 0 }, easing: 'linear' },
      { time: 0.1, properties: { opacity: 1 }, easing: 'linear' }
    ]
  },

  // === EMPHASIS ===
  pulse: {
    id: 'pulse',
    name: 'Pulsation',
    description: 'Battement rythmique',
    category: 'emphasis',
    duration: 1.0,
    previewIcon: '💓',
    keyframes: [
      { time: 0, properties: { scale: 1 }, easing: 'ease-in-out' },
      { time: 0.5, properties: { scale: 1.15 }, easing: 'ease-in-out' },
      { time: 1, properties: { scale: 1 }, easing: 'ease-in-out' }
    ]
  },

  shake: {
    id: 'shake',
    name: 'Secousse',
    description: 'Tremblement pour attirer l\'attention',
    category: 'emphasis',
    duration: 0.6,
    previewIcon: '📳',
    keyframes: [
      { time: 0, properties: { translateX: 0 }, easing: 'linear' },
      { time: 0.2, properties: { translateX: -10 }, easing: 'linear' },
      { time: 0.4, properties: { translateX: 10 }, easing: 'linear' },
      { time: 0.6, properties: { translateX: -5 }, easing: 'linear' },
      { time: 0.8, properties: { translateX: 5 }, easing: 'linear' },
      { time: 1, properties: { translateX: 0 }, easing: 'linear' }
    ]
  },

  glow: {
    id: 'glow',
    name: 'Lueur',
    description: 'Effet lumineux pulsant',
    category: 'emphasis',
    duration: 1.2,
    previewIcon: '✨',
    keyframes: [
      { time: 0, properties: { opacity: 1, scale: 1 }, easing: 'ease-in-out' },
      { time: 0.5, properties: { opacity: 0.7, scale: 1.05 }, easing: 'ease-in-out' },
      { time: 1, properties: { opacity: 1, scale: 1 }, easing: 'ease-in-out' }
    ]
  },

  // === EXIT ===
  fadeOut: {
    id: 'fadeOut',
    name: 'Disparition Douce',
    description: 'Fondu progressif vers transparent',
    category: 'exit',
    duration: 0.8,
    previewIcon: '💨',
    keyframes: [
      { time: 0, properties: { opacity: 1, translateY: 0 }, easing: 'ease-in' },
      { time: 1, properties: { opacity: 0, translateY: -20 }, easing: 'ease-in' }
    ]
  },

  slideOutRight: {
    id: 'slideOutRight',
    name: 'Sortie Droite',
    description: 'Départ vers la droite',
    category: 'exit',
    duration: 0.6,
    previewIcon: '➡️',
    keyframes: [
      { time: 0, properties: { opacity: 1, translateX: 0 }, easing: 'ease-in' },
      { time: 1, properties: { opacity: 0, translateX: 100 }, easing: 'ease-in' }
    ]
  },

  zoomOut: {
    id: 'zoomOut',
    name: 'Zoom Arrière',
    description: 'Rétrécissement progressif',
    category: 'exit',
    duration: 0.8,
    previewIcon: '🔍',
    keyframes: [
      { time: 0, properties: { opacity: 1, scale: 1 }, easing: 'ease-in' },
      { time: 1, properties: { opacity: 0, scale: 0.5 }, easing: 'ease-in' }
    ]
  },

  // === CONTINUOUS ===
  float: {
    id: 'float',
    name: 'Flottement',
    description: 'Mouvement vertical léger',
    category: 'continuous',
    duration: 3.0,
    previewIcon: '🎈',
    keyframes: [
      { time: 0, properties: { translateY: 0 }, easing: 'ease-in-out' },
      { time: 0.5, properties: { translateY: -10 }, easing: 'ease-in-out' },
      { time: 1, properties: { translateY: 0 }, easing: 'ease-in-out' }
    ]
  },

  rotate: {
    id: 'rotate',
    name: 'Rotation',
    description: 'Rotation continue',
    category: 'continuous',
    duration: 2.0,
    previewIcon: '🔄',
    keyframes: [
      { time: 0, properties: { rotate: 0 }, easing: 'linear' },
      { time: 1, properties: { rotate: 360 }, easing: 'linear' }
    ]
  }
};

export const getAnimationById = (id: string): TextAnimationTemplate | undefined => {
  return TEXT_ANIMATIONS[id];
};

export const getAnimationsByCategory = (category: TextAnimationTemplate['category']): TextAnimationTemplate[] => {
  return Object.values(TEXT_ANIMATIONS).filter(anim => anim.category === category);
};

export const getAnimationsList = (): TextAnimationTemplate[] => {
  return Object.values(TEXT_ANIMATIONS);
};
