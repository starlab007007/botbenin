import { MessageCircle } from 'lucide-react';
import { PlaceholderScreen } from './PlaceholderScreen';

export default function ChatListScreen() {
  return (
    <>
      <header
        className="sticky top-0 z-30 bg-[hsl(var(--wa-green))] text-white px-4 py-3 shadow"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <h1 className="text-lg font-semibold">WaouhApp</h1>
      </header>
      <PlaceholderScreen
        title="Conversations"
        description="Tes discussions Waouh apparaitront ici. Bientôt: messages temps réel, vocaux, photos, bots."
        icon={MessageCircle}
      />
    </>
  );
}
