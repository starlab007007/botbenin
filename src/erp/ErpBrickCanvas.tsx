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
  whatsapp: () => import('@/app-mobile/screens/WhatsAppScreen'),
  diffusion: () => import('@/app-mobile/screens/DiffusionScreen'),
  bots: () => import('@/app-mobile/screens/bots/AiAgentsListScreen'),
  agents: () => import('@/app-mobile/screens/bots/AiAgentsListScreen'),
  conversational: () => import('@/app-mobile/screens/bots/KnowledgeBaseCreateWizard'),
  bi: () => import('./BrickHome').then((m) => ({ default: m.BiBrickHome })),
  stock: () => import('@/app-mobile/screens/agents/StockAgentDashboard'),
  presence: () => import('./BrickHome').then((m) => ({ default: m.PresenceBrickHome })),
  store: () => import('@/app-mobile/screens/partner/PartnerBusinessesScreen'),
  sales: () => import('@/app-mobile/screens/partner/PartnerSalesScreen'),
  partner: () => import('@/app-mobile/screens/partner/PartnerHomeScreen'),
  apresbac: () => import('@/pages/apres-bac/ApresBacPage'),
  fa: () => import('@/app-mobile/screens/FaIaScreen'),
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
        <Button type="button" onClick={() => navigate('/app/auth')}>
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
