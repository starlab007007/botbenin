export interface AnimationKeyframe {
  time: number; // 0-1 (pourcentage de la durée)
  properties: {
    opacity?: number;
    scale?: number;
    translateX?: number;
    translateY?: number;
    rotate?: number;
  };
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
}

export interface TextAnimationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'entrance' | 'emphasis' | 'exit' | 'continuous';
  duration: number; // en secondes
  keyframes: AnimationKeyframe[];
  previewIcon: string;
}

export interface TransitionTemplate {
  id: string;
  name: string;
  description: string;
  duration: number; // en secondes
  type: 'slide' | 'fade' | 'zoom' | 'wipe' | 'dissolve' | 'bounce';
  direction?: 'left' | 'right' | 'up' | 'down' | 'center';
  easing: string;
}

export interface VideoAnimationTemplate {
  id: string;
  name: string;
  description: string;
  textAnimations: {
    hook: string; // ID du template d'animation
    content: string[];
    cta: string;
  };
  transitions: string[]; // IDs des templates de transition
  globalEffects?: {
    backgroundAnimation?: string;
    particleEffects?: boolean;
    colorGrading?: string;
  };
}
