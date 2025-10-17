import { MusicTrack } from '@/types/video-assembly';

export const musicLibrary: MusicTrack[] = [
  {
    id: 'afrobeat-energetic',
    name: 'Afrobeat Énergique',
    url: '/assets/music/afrobeat-energique.mp3',
    duration: 30,
    bpm: 120,
    mood: 'energetic',
    license: 'Uppbeat Free License'
  },
  {
    id: 'modern-tech',
    name: 'Tech Moderne',
    url: '/assets/music/tech-moderne.mp3',
    duration: 30,
    bpm: 128,
    mood: 'professional',
    license: 'Uppbeat Free License'
  },
  {
    id: 'coupe-decale',
    name: 'Coupé-Décalé Instrumental',
    url: '/assets/music/coupe-decale.mp3',
    duration: 30,
    bpm: 135,
    mood: 'upbeat',
    license: 'Uppbeat Free License'
  },
  {
    id: 'smooth-business',
    name: 'Business Smooth',
    url: '/assets/music/smooth-business.mp3',
    duration: 30,
    bpm: 110,
    mood: 'calm',
    license: 'Uppbeat Free License'
  },
  {
    id: 'african-vibes',
    name: 'African Vibes',
    url: '/assets/music/african-vibes.mp3',
    duration: 30,
    bpm: 115,
    mood: 'upbeat',
    license: 'Uppbeat Free License'
  }
];

export const getMusicByMood = (mood: MusicTrack['mood']): MusicTrack[] => {
  return musicLibrary.filter(track => track.mood === mood);
};

export const getRandomMusic = (): MusicTrack => {
  return musicLibrary[Math.floor(Math.random() * musicLibrary.length)];
};
