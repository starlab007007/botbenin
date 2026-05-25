import { Megaphone } from 'lucide-react';
import { PlaceholderScreen } from './PlaceholderScreen';

export default function DiffusionScreen() {
  return (
    <>
      <header className="sticky top-0 z-30 bg-[hsl(var(--wa-green))] text-white px-4 py-3 shadow"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
        <h1 className="text-lg font-semibold">Diffusion</h1>
      </header>
      <PlaceholderScreen
        title="Campagnes WhatsApp"
        description="Lance des campagnes de diffusion vers tes contacts avec suivi temps réel."
        icon={Megaphone}
      />
    </>
  );
}
