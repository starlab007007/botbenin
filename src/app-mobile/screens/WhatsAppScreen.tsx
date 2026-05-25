import { Smartphone } from 'lucide-react';
import { PlaceholderScreen } from './PlaceholderScreen';

export default function WhatsAppScreen() {
  return (
    <>
      <header className="sticky top-0 z-30 bg-[hsl(var(--wa-green))] text-white px-4 py-3 shadow"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
        <h1 className="text-lg font-semibold">WhatsApp IA</h1>
      </header>
      <PlaceholderScreen
        title="Connexion WhatsApp"
        description="Scanne le QR pour brancher ton compte WhatsApp à un bot IA via WAHA."
        icon={Smartphone}
      />
    </>
  );
}
