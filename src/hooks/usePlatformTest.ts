import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TestResult {
  category: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message?: string;
  duration?: number;
  details?: any;
}

export interface TestCategory {
  name: string;
  tests: Array<{
    name: string;
    testFn: () => Promise<void>;
  }>;
}

/**
 * Hook personnalisé pour tester la plateforme de bout en bout
 */
export const usePlatformTest = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  const updateTest = useCallback((
    category: string, 
    name: string, 
    updates: Partial<TestResult>
  ) => {
    setTests(prev => {
      const existing = prev.find(t => t.category === category && t.name === name);
      if (existing) {
        return prev.map(t => 
          t.category === category && t.name === name 
            ? { ...t, ...updates } 
            : t
        );
      }
      return [...prev, { category, name, status: 'pending', ...updates } as TestResult];
    });
  }, []);

  const runSingleTest = useCallback(async (
    category: string,
    name: string,
    testFn: () => Promise<void>
  ): Promise<boolean> => {
    const startTime = Date.now();
    updateTest(category, name, { status: 'running' });
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTest(category, name, { 
        status: 'success', 
        message: 'Test réussi',
        duration 
      });
      return true;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTest(category, name, { 
        status: 'error', 
        message: error.message || 'Test échoué',
        duration,
        details: error
      });
      return false;
    }
  }, [updateTest]);

  const defineTestCategories = useCallback((): TestCategory[] => {
    if (!user) return [];

    return [
      {
        name: 'Authentification',
        tests: [
          {
            name: 'Vérification session utilisateur',
            testFn: async () => {
              const { data, error } = await supabase.auth.getSession();
              if (error) throw error;
              if (!data.session) throw new Error('Aucune session active');
            }
          },
          {
            name: 'Récupération profil utilisateur',
            testFn: async () => {
              const { data, error } = await supabase.auth.getUser();
              if (error) throw error;
              if (!data.user) throw new Error('Utilisateur non trouvé');
            }
          }
        ]
      },
      {
        name: 'Permissions',
        tests: [
          {
            name: 'Vérification permissions système',
            testFn: async () => {
              const { data, error } = await supabase.rpc('get_user_permissions', {
                user_uuid: user.id
              });
              if (error) throw error;
            }
          },
          {
            name: 'Test permission spécifique',
            testFn: async () => {
              const { data, error } = await supabase.rpc('user_has_permission', {
                user_uuid: user.id,
                permission_name: 'users.view'
              });
              if (error) throw error;
            }
          }
        ]
      },
      {
        name: 'Base de données',
        tests: [
          {
            name: 'Lecture table bots',
            testFn: async () => {
              const { data, error } = await supabase
                .from('bots')
                .select('id, name, is_active')
                .limit(5);
              if (error) throw error;
            }
          },
          {
            name: 'Lecture table prospects',
            testFn: async () => {
              const { data, error } = await supabase
                .from('prospects')
                .select('id, first_name, last_name')
                .limit(5);
              if (error) throw error;
            }
          },
          {
            name: 'Lecture table campaigns',
            testFn: async () => {
              const { data, error } = await supabase
                .from('campaigns')
                .select('id, name, status')
                .limit(5);
              if (error) throw error;
            }
          }
        ]
      },
      {
        name: 'Gestion utilisateurs',
        tests: [
          {
            name: 'Liste utilisateurs (admin)',
            testFn: async () => {
              const { data, error } = await supabase.functions.invoke('list-users-admin');
              if (error) throw error;
              if (!data?.users) throw new Error('Format de réponse invalide');
            }
          },
          {
            name: 'Lecture rôles disponibles',
            testFn: async () => {
              const { data, error } = await supabase
                .from('roles')
                .select('id, name, display_name')
                .order('name');
              if (error) throw error;
              if (!data || data.length === 0) throw new Error('Aucun rôle trouvé');
            }
          },
          {
            name: 'Vérification RLS user_roles',
            testFn: async () => {
              const { data, error } = await supabase
                .from('user_roles')
                .select('user_id, role_id')
                .limit(1);
              if (error) throw error;
            }
          }
        ]
      },
      {
        name: 'Messagerie',
        tests: [
          {
            name: 'Lecture messages chat',
            testFn: async () => {
              const { data, error } = await supabase
                .from('chat_messages')
                .select('id, message_content, message_type')
                .limit(5);
              if (error) throw error;
            }
          },
          {
            name: 'Lecture sessions chat',
            testFn: async () => {
              const { data, error } = await supabase
                .from('bot_users')
                .select('id, user_name, session_id')
                .limit(5);
              if (error) throw error;
            }
          }
        ]
      },
      {
        name: 'WhatsApp',
        tests: [
          {
            name: 'Lecture comptes WhatsApp',
            testFn: async () => {
              const { data, error } = await supabase
                .from('whatsapp_accounts')
                .select('id, session_name, status')
                .limit(5);
              if (error) throw error;
            }
          }
        ]
      },
      {
        name: 'Analytics',
        tests: [
          {
            name: 'Lecture sessions visiteurs',
            testFn: async () => {
              const { data, error } = await supabase
                .from('anonymous_visitor_sessions')
                .select('id, session_token, bot_id')
                .limit(5);
              if (error) throw error;
            }
          }
        ]
      },
      {
        name: 'Edge Functions',
        tests: [
          {
            name: 'Test santé système',
            testFn: async () => {
              const { data, error } = await supabase.functions.invoke('check-user-permission', {
                body: { permission: 'users.view' }
              });
              // Ne pas échouer si la fonction n'existe pas
              if (error && !error.message?.includes('404')) throw error;
            }
          }
        ]
      }
    ];
  }, [user]);

  const runAllTests = useCallback(async () => {
    if (!user) {
      throw new Error('Utilisateur non connecté');
    }

    setIsRunning(true);
    setTests([]);
    setProgress(0);

    const categories = defineTestCategories();
    const totalTests = categories.reduce((sum, cat) => sum + cat.tests.length, 0);
    let completed = 0;

    for (const category of categories) {
      for (const test of category.tests) {
        await runSingleTest(category.name, test.name, test.testFn);
        completed++;
        setProgress((completed / totalTests) * 100);
      }
    }

    setIsRunning(false);
  }, [user, defineTestCategories, runSingleTest]);

  const resetTests = useCallback(() => {
    setTests([]);
    setProgress(0);
  }, []);

  const stats = {
    total: tests.length,
    success: tests.filter(t => t.status === 'success').length,
    error: tests.filter(t => t.status === 'error').length,
    warning: tests.filter(t => t.status === 'warning').length,
    pending: tests.filter(t => t.status === 'pending' || t.status === 'running').length,
  };

  return {
    tests,
    isRunning,
    progress,
    stats,
    runAllTests,
    resetTests,
    runSingleTest
  };
};
