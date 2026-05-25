import { Bot } from 'lucide-react';
import { PlaceholderScreen } from './PlaceholderScreen';

export default function BotsScreen() {
  return (
    <>
      <header className="sticky top-0 z-30 bg-[hsl(var(--wa-green))] text-white px-4 py-3 shadow"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
        <h1 className="text-lg font-semibold">Mes Bots</h1>
      </header>
      <PlaceholderScreen
        title="Création de Bot"
        description="Crée un bot IA en 4 étapes : nom, secteur, base de connaissances, voix."
        icon={Bot}
      />
    </>
  );
}
