import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMobileAuth } from '../../hooks/useMobileAuth';
import MobileScreenHeader from '../../components/MobileScreenHeader';
import { AgentsSection } from '@/components/whatsapp/agents/AgentsSection';

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
      <div className="p-3 pb-24">
        <AgentsSection />
      </div>
    </div>
  );
}
