import { VideoAnimationTemplate } from '@/types/animation-templates';

export const VIDEO_ANIMATION_TEMPLATES: Record<string, VideoAnimationTemplate> = {
  dynamic: {
    id: 'dynamic',
    name: 'Dynamique',
    description: 'Animations énergiques et rapides pour capter l\'attention',
    textAnimations: {
      hook: 'bounceIn',
      content: ['slideInLeft', 'slideInRight', 'zoomIn', 'slideInUp'],
      cta: 'pulse'
    },
    transitions: ['zoom', 'slide', 'zoom', 'slide'],
    globalEffects: {
      backgroundAnimation: 'subtle-zoom',
      particleEffects: true,
      colorGrading: 'vibrant'
    }
  },

  professional: {
    id: 'professional',
    name: 'Professionnel',
    description: 'Animations élégantes et sobres pour contenu corporate',
    textAnimations: {
      hook: 'fadeIn',
      content: ['fadeIn', 'slideInUp', 'fadeIn', 'slideInUp'],
      cta: 'glow'
    },
    transitions: ['fade', 'fade', 'fade', 'fade'],
    globalEffects: {
      backgroundAnimation: 'none',
      particleEffects: false,
      colorGrading: 'neutral'
    }
  },

  storytelling: {
    id: 'storytelling',
    name: 'Storytelling',
    description: 'Animations progressives pour narration captivante',
    textAnimations: {
      hook: 'typewriter',
      content: ['fadeIn', 'slideInLeft', 'fadeIn', 'slideInRight'],
      cta: 'bounceIn'
    },
    transitions: ['fade', 'slide', 'dissolve', 'zoom'],
    globalEffects: {
      backgroundAnimation: 'parallax',
      particleEffects: false,
      colorGrading: 'cinematic'
    }
  },

  energetic: {
    id: 'energetic',
    name: 'Énergique',
    description: 'Maximum d\'impact avec animations vives',
    textAnimations: {
      hook: 'zoomIn',
      content: ['bounceIn', 'shake', 'zoomIn', 'pulse'],
      cta: 'shake'
    },
    transitions: ['zoom', 'wipe', 'bounce', 'zoom'],
    globalEffects: {
      backgroundAnimation: 'pulse',
      particleEffects: true,
      colorGrading: 'saturated'
    }
  },

  minimal: {
    id: 'minimal',
    name: 'Minimaliste',
    description: 'Animations subtiles et raffinées',
    textAnimations: {
      hook: 'fadeIn',
      content: ['fadeIn', 'fadeIn', 'fadeIn', 'fadeIn'],
      cta: 'fadeIn'
    },
    transitions: ['fade', 'fade', 'fade', 'fade'],
    globalEffects: {
      backgroundAnimation: 'none',
      particleEffects: false,
      colorGrading: 'minimal'
    }
  },

  playful: {
    id: 'playful',
    name: 'Ludique',
    description: 'Animations amusantes et créatives',
    textAnimations: {
      hook: 'bounceIn',
      content: ['rotate', 'shake', 'float', 'bounceIn'],
      cta: 'pulse'
    },
    transitions: ['bounce', 'wipe', 'bounce', 'zoom'],
    globalEffects: {
      backgroundAnimation: 'float',
      particleEffects: true,
      colorGrading: 'vibrant'
    }
  },

  smooth: {
    id: 'smooth',
    name: 'Fluide',
    description: 'Transitions douces et harmonieuses',
    textAnimations: {
      hook: 'slideInUp',
      content: ['slideInLeft', 'slideInRight', 'slideInUp', 'fadeIn'],
      cta: 'glow'
    },
    transitions: ['slide', 'dissolve', 'slide', 'fade'],
    globalEffects: {
      backgroundAnimation: 'parallax',
      particleEffects: false,
      colorGrading: 'soft'
    }
  },

  impactful: {
    id: 'impactful',
    name: 'Impactant',
    description: 'Maximum de présence visuelle',
    textAnimations: {
      hook: 'zoomIn',
      content: ['zoomIn', 'pulse', 'shake', 'bounceIn'],
      cta: 'bounceIn'
    },
    transitions: ['zoom', 'zoom', 'wipe', 'zoom'],
    globalEffects: {
      backgroundAnimation: 'zoom',
      particleEffects: true,
      colorGrading: 'dramatic'
    }
  }
};

export const getVideoAnimationTemplateById = (id: string): VideoAnimationTemplate => {
  return VIDEO_ANIMATION_TEMPLATES[id] || VIDEO_ANIMATION_TEMPLATES.dynamic;
};

export const getVideoAnimationTemplatesList = (): VideoAnimationTemplate[] => {
  return Object.values(VIDEO_ANIMATION_TEMPLATES);
};
