export interface FrenchVoice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  age: 'young' | 'adult' | 'mature';
  description: string;
  accent: 'francais' | 'quebecois' | 'belge';
  mood: 'professional' | 'dynamic' | 'gentle' | 'energetic';
  sampleText: string;
}

export const FRENCH_VOICES: FrenchVoice[] = [
  {
    id: 'antoine-professional',
    name: 'Antoine',
    gender: 'male',
    age: 'adult',
    description: 'Voix masculine professionnelle et confiante',
    accent: 'francais',
    mood: 'professional',
    sampleText: 'Bonjour, je suis Antoine. Une voix professionnelle pour vos projets sérieux.',
  },
  {
    id: 'charlotte-dynamic',
    name: 'Charlotte',
    gender: 'female',
    age: 'young',
    description: 'Voix féminine dynamique et engageante',
    accent: 'francais',
    mood: 'dynamic',
    sampleText: 'Salut ! Je suis Charlotte, une voix dynamique pour capter l\'attention !',
  },
  {
    id: 'pierre-mature',
    name: 'Pierre',
    gender: 'male',
    age: 'mature',
    description: 'Voix masculine mature et autoritaire',
    accent: 'francais',
    mood: 'professional',
    sampleText: 'Je suis Pierre. Une voix d\'expérience pour inspirer confiance.',
  },
  {
    id: 'amelie-gentle',
    name: 'Amélie',
    gender: 'female',
    age: 'adult',
    description: 'Voix féminine douce et rassurante',
    accent: 'francais',
    mood: 'gentle',
    sampleText: 'Bonjour, je m\'appelle Amélie. Une voix douce qui met à l\'aise.',
  },
];

export const getVoiceById = (id: string): FrenchVoice | undefined => {
  return FRENCH_VOICES.find(voice => voice.id === id);
};

export const getVoicesByGender = (gender: 'male' | 'female'): FrenchVoice[] => {
  return FRENCH_VOICES.filter(voice => voice.gender === gender);
};

export const getVoicesByMood = (mood: FrenchVoice['mood']): FrenchVoice[] => {
  return FRENCH_VOICES.filter(voice => voice.mood === mood);
};
