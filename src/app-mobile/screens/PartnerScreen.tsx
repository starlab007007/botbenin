import { Store } from 'lucide-react';
import { PlaceholderScreen } from './PlaceholderScreen';

export default function PartnerScreen() {
  return (
    <>
      <header className="sticky top-0 z-30 bg-[hsl(var(--wa-green))] text-white px-4 py-3 shadow"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
        <h1 className="text-lg font-semibold">Waouh Partenaire</h1>
      </header>
      <PlaceholderScreen
        title="Mon commerce"
        description="Dashboard, produits, ventes et payouts depuis ton téléphone."
        icon={Store}
      />
    </>
  );
}
