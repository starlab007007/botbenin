
-- NETTOYAGE COMPLET DE LA BASE DE DONNÉES
-- ATTENTION: Cette opération supprimera TOUTES les données utilisateur

-- 1. Désactiver temporairement les contraintes de clés étrangères pour faciliter la suppression
SET session_replication_role = replica;

-- 2. Supprimer toutes les données de chat et conversations
DELETE FROM public.chat_messages;
DELETE FROM public.bot_users;
DELETE FROM public.enhanced_chat_sessions;
DELETE FROM public.chat_sessions;
DELETE FROM public.conversations;
DELETE FROM public.conversation_insights;

-- 3. Supprimer toutes les sessions et données de tracking
DELETE FROM public.anonymous_visitor_sessions;
DELETE FROM public.visitor_tracking_events;
DELETE FROM public.visitor_progressive_data;
DELETE FROM public.visitor_fingerprints;
DELETE FROM public.user_sessions;

-- 4. Supprimer tous les bots et données associées
DELETE FROM public.shortened_links;
DELETE FROM public.link_clicks;
DELETE FROM public.bots;
DELETE FROM public.bot_owners;

-- 5. Supprimer toutes les campagnes et médias
DELETE FROM public.scheduled_posts;
DELETE FROM public.performance_predictions;
DELETE FROM public.content_variations;
DELETE FROM public.media_assets;
DELETE FROM public.social_sharing_campaigns;
DELETE FROM public.campaign_templates;
DELETE FROM public.marketing_campaigns;
DELETE FROM public.campaigns;

-- 6. Supprimer les données business et prospects
DELETE FROM public.local_businesses;
DELETE FROM public.leads;
DELETE FROM public.contacts;
DELETE FROM public.subscribers;

-- 7. Supprimer les données WhatsApp
DELETE FROM public.whatsapp_messages;
DELETE FROM public.whatsapp_conversations;
DELETE FROM public.whatsapp_templates;

-- 8. Supprimer les fichiers et données utilisateur
DELETE FROM public.user_files;
DELETE FROM public.appointments;
DELETE FROM public.subscriptions;
DELETE FROM public.subscription_history;

-- 9. Supprimer les logs et analytics
DELETE FROM public.user_activities;
DELETE FROM public.admin_logs;
DELETE FROM public.access_logs;
DELETE FROM public.analytics;
DELETE FROM public.logs_session_anomalies;

-- 10. Supprimer les permissions utilisateur personnalisées
DELETE FROM public.user_permissions;
DELETE FROM public.user_module_access;
DELETE FROM public.user_roles;

-- 11. Supprimer les comptes démo
DELETE FROM public.demo_accounts;

-- 12. Supprimer tous les utilisateurs (cela supprimera automatiquement les profils via cascade)
DELETE FROM public.users;

-- 13. Nettoyer auth.users (utilisateurs Supabase Auth)
DELETE FROM auth.users;

-- 14. Réactiver les contraintes de clés étrangères
SET session_replication_role = DEFAULT;

-- 15. Nettoyer les vues matérialisées existantes (syntaxe corrigée)
DO $$
BEGIN
    -- Vérifier et rafraîchir les vues matérialisées si elles existent
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'detailed_bot_stats') THEN
        REFRESH MATERIALIZED VIEW public.detailed_bot_stats;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'complete_bot_analytics') THEN
        REFRESH MATERIALIZED VIEW public.complete_bot_analytics;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'bot_conversation_history') THEN
        REFRESH MATERIALIZED VIEW public.bot_conversation_history;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'unified_conversation_history') THEN
        REFRESH MATERIALIZED VIEW public.unified_conversation_history;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'bot_message_history') THEN
        REFRESH MATERIALIZED VIEW public.bot_message_history;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'bot_stats') THEN
        REFRESH MATERIALIZED VIEW public.bot_stats;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'user_stats') THEN
        REFRESH MATERIALIZED VIEW public.user_stats;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'admin_dashboard_stats') THEN
        REFRESH MATERIALIZED VIEW public.admin_dashboard_stats;
    END IF;
END $$;

-- 16. Vider les métriques de plateforme
DELETE FROM public.platform_metrics;

-- Message de confirmation
SELECT 'Base de données nettoyée avec succès. Tous les utilisateurs, bots, conversations et données associées ont été supprimés.' as message;
;
