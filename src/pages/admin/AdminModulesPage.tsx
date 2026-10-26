import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LayoutGrid } from 'lucide-react';

interface ModuleState {
  module_key: string;
  label: string;
  section: string;
  enabled: boolean;
  role_names: string[];
  updated_at: string;
}

interface RoleOption {
  id: string;
  name: string;
  display_name: string | null;
}

/**
 * Permet à l'administrateur d'activer/désactiver chaque module affiché dans
 * la navigation (barre latérale PC, rail tablette, menu mobile, Flutter) et
 * de le restreindre à certains rôles. Aucun rôle sélectionné = visible par
 * tous les utilisateurs connectés. Les changements sont diffusés en direct
 * (Supabase Realtime) sans rechargement côté utilisateurs.
 */
export const AdminModulesPage: React.FC = () => {
  const [modules, setModules] = useState<ModuleState[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [modulesRes, rolesRes] = await Promise.all([
        supabase.rpc('waouh_admin_frontend_modules_state' as any),
        supabase.from('roles').select('id, name, display_name').order('name'),
      ]);
      if (modulesRes.error) throw modulesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      setModules((modulesRes.data ?? []) as ModuleState[]);
      setRoles((rolesRes.data ?? []) as RoleOption[]);
    } catch (error) {
      console.error('Error fetching frontend modules:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les modules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('admin-waouh-frontend-modules')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waouh_frontend_modules' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waouh_frontend_module_roles' }, fetchData)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = useMemo(() => {
    const bySection = new Map<string, ModuleState[]>();
    modules.forEach((m) => {
      const list = bySection.get(m.section) ?? [];
      list.push(m);
      bySection.set(m.section, list);
    });
    return Array.from(bySection.entries());
  }, [modules]);

  const setModule = async (moduleKey: string, patch: { enabled?: boolean; role_names?: string[] }) => {
    setSavingKey(moduleKey);
    // Mise à jour optimiste : l'écran reste réactif, le Realtime confirmera.
    setModules((prev) =>
      prev.map((m) => (m.module_key === moduleKey ? { ...m, ...patch } : m)),
    );
    try {
      const { error } = await supabase.rpc('waouh_admin_set_frontend_module' as any, {
        p_module_key: moduleKey,
        p_enabled: patch.enabled ?? null,
        p_role_names: patch.role_names ?? null,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error updating frontend module:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'enregistrer ce changement",
        variant: 'destructive',
      });
      fetchData();
    } finally {
      setSavingKey(null);
    }
  };

  const toggleRole = (mod: ModuleState, roleName: string, checked: boolean) => {
    const next = checked
      ? [...mod.role_names, roleName]
      : mod.role_names.filter((r) => r !== roleName);
    setModule(mod.module_key, { role_names: next });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-4xl font-bold mb-2">
          <LayoutGrid className="h-8 w-8 text-primary" />
          Modules de navigation
        </h1>
        <p className="text-muted-foreground">
          Activez ou désactivez chaque module affiché aux utilisateurs (barre latérale, rail
          tablette, menu mobile, application WAOUH), et restreignez-le à certains rôles.
          Les changements s'appliquent immédiatement, sans rechargement.
        </p>
      </div>

      <div className="space-y-8">
        {sections.map(([sectionTitle, sectionModules]) => (
          <div key={sectionTitle}>
            <h2 className="mb-3 text-lg font-semibold text-muted-foreground">{sectionTitle}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sectionModules.map((mod) => (
                <Card key={mod.module_key} className={!mod.enabled ? 'opacity-60' : undefined}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{mod.label}</CardTitle>
                        <CardDescription className="mt-1">
                          {mod.role_names.length === 0
                            ? 'Visible par tous les utilisateurs'
                            : `Limité à : ${mod.role_names.join(', ')}`}
                        </CardDescription>
                      </div>
                      <Switch
                        checked={mod.enabled}
                        disabled={savingKey === mod.module_key}
                        onCheckedChange={(checked) => setModule(mod.module_key, { enabled: checked })}
                        aria-label={`Activer ${mod.label}`}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {roles.map((role) => {
                        const checked = mod.role_names.includes(role.name);
                        return (
                          <label
                            key={role.id}
                            className="flex items-center gap-1.5 text-sm text-foreground"
                          >
                            <Checkbox
                              checked={checked}
                              disabled={savingKey === mod.module_key}
                              onCheckedChange={(value) => toggleRole(mod, role.name, value === true)}
                            />
                            {role.display_name || role.name}
                          </label>
                        );
                      })}
                    </div>
                    {!mod.enabled && (
                      <Badge variant="secondary" className="mt-3">
                        Masqué pour tous
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminModulesPage;
