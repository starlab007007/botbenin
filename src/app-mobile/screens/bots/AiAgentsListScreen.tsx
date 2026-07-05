import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, BarChart3, Package, MapPin } from 'lucide-react';
import { useMobileAuth } from '../../hooks/useMobileAuth';
import MobileScreenHeader from '../../components/MobileScreenHeader';
import { AgentsSection } from '@/components/whatsapp/agents/AgentsSection';
import MyAiAgentsSection from '../agents/MyAiAgentsSection';

const QUICK_AGENTS = [
  { id: 'bi',         label: 'BI / Analyse',    desc: 'Google Sheet, Excel, CSV, API',      icon: BarChart3, route: '/app/agents/bi/new',         color: 'from-blue-500 to-indigo-600' },
  { id: 'stock',      label: 'Gestion stock',   desc: 'Produits, alertes, réappro IA',      icon: Package,   route: '/app/agents/stock/new',      color: 'from-amber-500 to-orange-600' },
  { id: 'attendance', label: 'Présence QR',     desc: 'Check-in géolocalisé + WhatsApp',    icon: MapPin,    route: '/app/agents/attendance/new', color: 'from-fuchsia-500 to-pink-600' },
];

export default function AiAgentsListScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useMobileAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate('/app/auth');
  }, [user, authLoading, navigate]);

  return (
    <div className="min-h-[100dvh] bg-background">
      <MobileScreenHeader title="Mes Bots" subtitle="Agents IA & conversations" />
      <div className="p-3 pb-24 space-y-4">
        <button
          onClick={() => navigate('/app/agents/new')}
          className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 via-orange-500 to-amber-500 text-white p-4 flex items-center gap-3 shadow-md active:scale-[0.98] transition"
        >
          <Sparkles className="h-6 w-6" />
          <div className="text-left flex-1">
            <div className="font-bold">Créer un agent IA</div>
            <div className="text-xs opacity-90">BI · Stock · Présence QR · Conversationnel</div>
          </div>
          <Plus className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {QUICK_AGENTS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                onClick={() => navigate(a.route)}
                className={`rounded-2xl p-4 text-white text-left shadow-sm active:scale-[0.98] transition bg-gradient-to-br ${a.color}`}
              >
                <Icon className="h-6 w-6 mb-2" />
                <div className="font-semibold">{a.label}</div>
                <div className="text-xs opacity-90 mt-0.5">{a.desc}</div>
              </button>
            );
          })}
        </div>

        <MyAiAgentsSection />

        <AgentsSection />
      </div>
    </div>
  );
}
