import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useMobileAuth } from '@/app-mobile/hooks/useMobileAuth';

export type BrickId =
  | 'radar'
  | 'whatsapp'
  | 'diffusion'
  | 'bots'
  | 'agents'
  | 'conversational'
  | 'bi'
  | 'stock'
  | 'presence'
  | 'store'
  | 'sales'
  | 'partner'
  | 'apresbac'
  | 'fa';

type Loader = () => Promise<{ default: React.ComponentType<any> }>;

const LOADERS: Record<BrickId, Loader> = {
  radar: () => import('@/app-mobile/components/radar/RadarPanel').then((m) => ({ default: m.RadarPanel })),

  // Desktop ERP parity: these modules render Web-safe bricks that mirror the
  // Flutter functional content without injecting fixed mobile screens inside
  // the desktop shell.
  whatsapp: () => import('./FlutterParityBricks').then((m) => ({ default: m.WhatsAppFlutterParityBrick })),
  diffusion: () => import('./FlutterParityBricks').then((m) => ({ default: m.DiffusionFlutterParityBrick })),
  bots: () => import('./FlutterParityBricks').then((m) => ({ default: m.BotsFlutterParityBrick })),

  agents: () => import('./FlutterRemainingParityBricks').then((m) => ({ default: m.AgentsIaParityBrick })),
  conversational: () => import('./FlutterRemainingParityBricks').then((m) => ({ default: m.ConversationalParityBrick })),
  bi: () => import('./FlutterRemainingParityBricks').then((m) => ({ default: m.BiWaouhParityBrick })),
  stock: () => import('./FlutterRemainingParityBricks').then((m) => ({ default: m.StockWaouhParityBrick })),
  presence: () => import('./FlutterRemainingParityBricks').then((m) => ({ default: m.PresenceQrParityBrick })),
  store: () => import('./FlutterRemainingParityBricks').then((m) => ({ default: m.StoresParityBrick })),
  sales: () => import('./FlutterRemainingParityBricks').then((m) => ({ default: m.SalesParityBrick })),
  partner: () => import('./FlutterRemainingParityBricks').then((m) => ({ default: m.PartnerParityBrick })),
  apresbac: () => import('./FlutterRemainingParityBricks').then((m) => ({ default: m.ApresBacParityBrick })),
  fa: () => import('./FlutterRemainingParityBricks').then((m) => ({ default: m.FaIaParityBrick })),
};

const BRICKS: Record<BrickId, ReturnType<typeof lazy>> = Object.fromEntries(
  (Object.keys(LOADERS) as BrickId[]).map((id) => [id, lazy(LOADERS[id] as any)]),
) as Record<BrickId, ReturnType<typeof lazy>>;

/** Warm up a brick chunk (hover on the rail) so the switch feels instant. */
export const preloadBrick = (brick: BrickId) => {
  void LOADERS[brick]?.().catch(() => undefined);
};

/**
 * Renders an ERP brick inside the central canvas — no page navigation,
 * the shell and the chat engine stay mounted.
 */
export const ErpBrickCanvas = ({ brick }: { brick: BrickId }) => {
  const { user } = useMobileAuth();
  const navigate = useNavigate();
  const Brick = BRICKS[brick];

  if (!user) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <LockKeyhole className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Connexion requise</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Connectez-vous pour piloter cette brique ERP depuis le centre de commande.
        </p>
        <Button type="button" onClick={() => navigate('/app/auth/email?tab=login')}>
          Se connecter
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto">
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <LoadingSpinner />
          </div>
        }
      >
        <Brick />
      </Suspense>
    </div>
  );
};

export default ErpBrickCanvas;
