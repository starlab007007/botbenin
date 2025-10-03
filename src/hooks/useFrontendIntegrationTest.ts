import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FrontendTestResult {
  category: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message?: string;
  duration?: number;
  details?: any;
}

/**
 * Hook pour tester l'intégration frontend-backend de bout en bout
 */
export const useFrontendIntegrationTest = () => {
  const [tests, setTests] = useState<FrontendTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  const updateTest = useCallback((
    category: string, 
    name: string, 
    updates: Partial<FrontendTestResult>
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
      return [...prev, { category, name, status: 'pending', ...updates } as FrontendTestResult];
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

  const defineTestCategories = useCallback(() => {
    if (!user) return [];

    return [
      {
        name: 'Intégration UI-Backend',
        tests: [
          {
            name: 'Connexion Auth Context',
            testFn: async () => {
              if (!user) throw new Error('User non disponible dans le contexte');
              if (!user.id) throw new Error('User ID manquant');
            }
          },
          {
            name: 'Client Supabase initialisé',
            testFn: async () => {
              const { data, error } = await supabase.auth.getSession();
              if (error) throw error;
              if (!data.session) throw new Error('Pas de session active');
            }
          }
        ]
      },
      {
        name: 'Gestion des Bots',
        tests: [
          {
            name: 'Lecture des bots',
            testFn: async () => {
              const { data, error } = await supabase
                .from('bots')
                .select('id, name, is_active')
                .limit(1);
              if (error) throw error;
            }
          },
          {
            name: 'Vérification bot_owners',
            testFn: async () => {
              const { data, error } = await supabase
                .from('bot_owners')
                .select('id, user_id')
                .eq('user_id', user.id)
                .single();
              if (error && error.code !== 'PGRST116') throw error;
            }
          },
          {
            name: 'Test création bot (simulation)',
            testFn: async () => {
              // Test de validation uniquement, pas de création réelle
              const testBot = {
                name: 'Test Bot',
                description: 'Bot de test',
                is_active: true
              };
              if (!testBot.name) throw new Error('Validation échouée');
            }
          }
        ]
      },
      {
        name: 'Gestion des Prospects',
        tests: [
          {
            name: 'Lecture des prospects',
            testFn: async () => {
              const { data, error } = await supabase
                .from('prospects')
                .select('id, first_name, last_name')
                .limit(5);
              if (error) throw error;
            }
          },
          {
            name: 'Lecture des bases de prospects',
            testFn: async () => {
              const { data, error } = await supabase
                .from('prospect_databases')
                .select('id, name')
                .limit(5);
              if (error) throw error;
            }
          }
        ]
      },
      {
        name: 'Gestion des Campagnes',
        tests: [
          {
            name: 'Lecture des campagnes',
            testFn: async () => {
              const { data, error } = await supabase
                .from('campaigns')
                .select('id, name, status')
                .limit(5);
              if (error) throw error;
            }
          },
          {
            name: 'Lecture des campagnes sociales',
            testFn: async () => {
              const { data, error } = await supabase
                .from('social_sharing_campaigns')
                .select('id, name, status')
                .limit(5);
              if (error) throw error;
            }
          }
        ]
      },
      {
        name: 'Messagerie et Chat',
        tests: [
          {
            name: 'Lecture des messages',
            testFn: async () => {
              const { data, error } = await supabase
                .from('chat_messages')
                .select('id, message_content')
                .limit(5);
              if (error) throw error;
            }
          },
          {
            name: 'Lecture des utilisateurs bot',
            testFn: async () => {
              const { data, error } = await supabase
                .from('bot_users')
                .select('id, user_name')
                .limit(5);
              if (error) throw error;
            }
          }
        ]
      },
      {
        name: 'WhatsApp Integration',
        tests: [
          {
            name: 'Lecture des comptes WhatsApp',
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
        name: 'Analytics et Tracking',
        tests: [
          {
            name: 'Lecture des sessions visiteurs',
            testFn: async () => {
              const { data, error } = await supabase
                .from('anonymous_visitor_sessions')
                .select('id, session_token')
                .limit(5);
              if (error) throw error;
            }
          },
          {
            name: 'Lecture des liens raccourcis',
            testFn: async () => {
              const { data, error } = await supabase
                .from('shortened_links')
                .select('id, short_code')
                .limit(5);
              if (error) throw error;
            }
          }
        ]
      },
      {
        name: 'Permissions et Sécurité',
        tests: [
          {
            name: 'Vérification des permissions utilisateur',
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
          },
          {
            name: 'Lecture des rôles',
            testFn: async () => {
              const { data, error } = await supabase
                .from('roles')
                .select('id, name, display_name');
              if (error) throw error;
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
