// Déclarations TypeScript pour les éléments personnalisés ElevenLabs
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': {
        'agent-id': string;
        'server-location'?: string;
        variant?: string;
        'action-text'?: string;
        'start-call-text'?: string;
        'end-call-text'?: string;
        'listening-text'?: string;
        'speaking-text'?: string;
        'dynamic-variables'?: string;
        'auto-open'?: boolean;
        style?: React.CSSProperties;
        ref?: React.RefObject<HTMLElement>;
      };
    }
  }
}

export {};