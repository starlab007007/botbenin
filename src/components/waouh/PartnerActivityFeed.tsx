import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWaouhPartnerActivity } from '@/hooks/useWaouhPartnerActivity';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Activity, Building2, Package, ShoppingCart, Wallet, ShieldCheck, AlertCircle } from 'lucide-react';

const ICONS: Record<string, any> = {
  business_created: Building2, business_updated: Building2, business_deleted: Building2,
  product_created: Package, product_updated: Package, product_deleted: Package,
  sale_recorded: ShoppingCart, sale_confirmed: ShoppingCart, sale_paid: ShoppingCart, sale_cancelled: AlertCircle,
  payout_requested: Wallet, payout_paid: Wallet,
  status_changed: ShieldCheck, permission_granted: ShieldCheck, permission_revoked: ShieldCheck, kyc_verified: ShieldCheck,
};

const COLORS: Record<string, string> = {
  business_created: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  product_created: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  sale_recorded: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  sale_paid: 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300',
  sale_cancelled: 'bg-destructive/10 text-destructive',
  business_deleted: 'bg-destructive/10 text-destructive',
  product_deleted: 'bg-destructive/10 text-destructive',
};

export function PartnerActivityFeed({ partnerId, height = 'h-[400px]' }: { partnerId?: string; height?: string }) {
  const { items, loading } = useWaouhPartnerActivity({ partnerId, limit: 50 });

  if (loading) return <div className="text-sm text-muted-foreground p-4">Chargement…</div>;
  if (!items.length) return <div className="text-sm text-muted-foreground p-4 text-center">Aucune activité pour l'instant.</div>;

  return (
    <ScrollArea className={height}>
      <div className="space-y-1 p-2">
        {items.map(it => {
          const Icon = ICONS[it.event_type] || Activity;
          const colorClass = COLORS[it.event_type] || 'bg-muted text-muted-foreground';
          return (
            <div key={it.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/50">
              <div className={`p-2 rounded-md ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{it.title || it.event_type}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] h-4 px-1">{it.event_type}</Badge>
                  {formatDistanceToNow(new Date(it.created_at), { locale: fr, addSuffix: true })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
