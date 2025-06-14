import { supabase } from '@/integrations/supabase/client';

export interface StandardBotConfig {
  id: string;
  name: string;
  description: string;
  webhook_url: string;
  api_key?: string;
  chat_title: string;
  chat_context: string;
  share_enabled: boolean;
  is_active: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
  public_chat_url?: string;
}

export interface BotValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class BotConfigService {
  
  // Validation standard pour tous les bots
  static validateBotConfig(config: Partial<StandardBotConfig>): BotValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation obligatoire du nom
    if (!config.name || config.name.trim().length < 3) {
      errors.push('Le nom du bot doit contenir au moins 3 caractères');
    }

    // Validation obligatoire de la description
    if (!config.description || config.description.trim().length < 10) {
      errors.push('La description du bot doit contenir au moins 10 caractères');
    }

    // Validation obligatoire du webhook URL
    if (!config.webhook_url || config.webhook_url.trim() === '') {
      errors.push('L\'URL du webhook est obligatoire pour le fonctionnement du bot');
    } else {
      try {
        new URL(config.webhook_url);
      } catch {
        errors.push('L\'URL du webhook n\'est pas valide');
      }
    }

    // Validation obligatoire du titre de chat
    if (!config.chat_title || config.chat_title.trim().length < 3) {
      errors.push('Le titre du chat doit contenir au moins 3 caractères');
    }

    // Validation du contexte de chat
    if (!config.chat_context || config.chat_context.trim().length < 5) {
      warnings.push('Un contexte de chat plus détaillé améliorerait l\'expérience utilisateur');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Configuration par défaut standardisée
  static getDefaultBotConfig(): Partial<StandardBotConfig> {
    return {
      name: '',
      description: '',
      webhook_url: '',
      chat_title: 'Assistant IA',
      chat_context: 'general',
      share_enabled: true,
      is_active: true
    };
  }

  // Message de bienvenue standardisé
  static getStandardWelcomeMessage(botName: string, context: string): string {
    const contextMessages: Record<string, string> = {
      'services_locaux': `🏢 Bonjour ! Je suis ${botName}, votre assistant IA pour les services locaux. Je peux vous aider à trouver des restaurants, hôtels, commerces et autres services dans votre région. Que recherchez-vous aujourd'hui ?`,
      'restaurant': `🍽️ Bonjour ! Je suis ${botName}, votre assistant IA pour la réservation de restaurants. Je peux vous aider à trouver le restaurant parfait, vérifier les disponibilités et faire votre réservation. Quel type de restaurant recherchez-vous ?`,
      'automation': `🤖 Bonjour ! Je suis ${botName}, votre assistant IA automatisé. Je peux vous aider avec une large gamme de tâches selon ma configuration personnalisée. Comment puis-je vous assister aujourd'hui ?`,
      'business': `💼 Bonjour ! Je suis ${botName}, votre assistant IA pour les affaires. Je peux vous aider avec vos projets professionnels, stratégies et développement commercial. Quelle est votre demande ?`,
      'marketing': `📈 Bonjour ! Je suis ${botName}, votre assistant IA marketing. Je peux vous aider avec vos campagnes, stratégies marketing et communication. Comment puis-je vous accompagner ?`,
      'gestion': `📊 Bonjour ! Je suis ${botName}, votre assistant IA de gestion. Je peux vous aider avec la gestion de projets, organisation et optimisation des processus. Que souhaitez-vous gérer ?`,
      'citoyen': `🏛️ Bonjour ! Je suis ${botName}, votre assistant IA citoyen. Je peux vous aider avec vos démarches administratives et questions civiques. Comment puis-je vous renseigner ?`,
      'general': `🚀 Bonjour ! Je suis ${botName}, votre assistant IA intelligent. Je peux vous aider avec vos questions et vous accompagner dans vos démarches. Comment puis-je vous aider aujourd'hui ?`
    };

    return contextMessages[context] || contextMessages['general'];
  }

  // Normalisation des paramètres URL pour tous les bots
  static normalizeUrlParams(searchParams: URLSearchParams) {
    return {
      botId: searchParams.get('bot'),
      webhookUrl: searchParams.get('webhook') ? decodeURIComponent(searchParams.get('webhook')!) : null,
      chatContext: searchParams.get('context') || 'general',
      chatTitle: searchParams.get('title'),
      botName: searchParams.get('bot_name'),
      isTest: searchParams.get('test') === 'true',
      entryPoint: searchParams.get('entry') || 'direct',
      refCode: searchParams.get('ref')
    };
  }

  // Configuration des headers standardisés pour les webhooks
  static getStandardWebhookHeaders(botId: string, botName: string, context: string, isTest: boolean = false): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Bot.Bj-Platform/1.0',
      'X-Bot-Platform': 'bot_bj',
      'X-Bot-Version': '1.0',
      'X-Bot-ID': botId || 'unknown',
      'X-Bot-Name': encodeURIComponent(botName),
      'X-Webhook-Source': 'standardized_bot',
      'X-Chat-Context': context,
      'X-Is-Test': isTest ? 'true' : 'false'
    };
  }

  // Payload standardisé pour tous les webhooks
  static createStandardWebhookPayload(
    message: string,
    botId: string,
    botName: string,
    context: string,
    sessionId?: string,
    isTest: boolean = false
  ) {
    return {
      message: message,
      timestamp: new Date().toISOString(),
      session_id: sessionId || `bot_${botId}_${context}_${Date.now()}`,
      user_id: `bot_bj_user_${botId}`,
      source: 'bot_bj_platform',
      context: context,
      chat_title: botName,
      bot_id: botId,
      bot_name: botName,
      bot_type: 'standardized',
      interface_type: 'full_chat_interface',
      module: context,
      service_type: context,
      platform: 'bot_bj',
      is_test_mode: isTest,
      webhook_source: 'standardized_config'
    };
  }

  // Récupération sécurisée de la configuration d'un bot
  static async getBotConfig(botId: string): Promise<StandardBotConfig | null> {
    try {
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .single();

      if (error) {
        console.error('Erreur lors du chargement du bot:', error);
        return null;
      }

      return data as StandardBotConfig;
    } catch (error) {
      console.error('Erreur lors de la récupération de la configuration du bot:', error);
      return null;
    }
  }

  // Vérification de l'accessibilité publique d'un bot utilisant la nouvelle fonction de base de données
  static async checkPublicAccess(botId: string): Promise<{ accessible: boolean; config?: StandardBotConfig; error?: string }> {
    try {
      console.log('=== VÉRIFICATION ACCÈS PUBLIC AVEC NOUVELLE FONCTION ===');
      console.log('Bot ID:', botId);

      // Utiliser la nouvelle fonction de base de données qui simplifie l'accès
      const { data, error } = await supabase.rpc('check_bot_public_access', {
        bot_uuid: botId
      });

      if (error) {
        console.error('Erreur lors de l\'appel de la fonction check_bot_public_access:', error);
        return { 
          accessible: false, 
          error: `Erreur de base de données: ${error.message}` 
        };
      }

      if (!data || data.length === 0) {
        return { 
          accessible: false, 
          error: 'Aucune réponse de la fonction de vérification d\'accès' 
        };
      }

      const result = data[0];
      console.log('Résultat de la fonction check_bot_public_access:', result);

      if (!result.accessible) {
        return { 
          accessible: false, 
          error: result.error_message || 'Bot non accessible' 
        };
      }

      // Extraire les données du bot depuis le JSONB
      const botData = result.bot_data;
      if (!botData) {
        return { 
          accessible: false, 
          error: 'Données du bot non trouvées' 
        };
      }

      console.log('Bot trouvé et accessible:', {
        id: botData.id,
        name: botData.name,
        is_active: botData.is_active,
        share_enabled: botData.share_enabled
      });

      return { 
        accessible: true, 
        config: botData as StandardBotConfig 
      };

    } catch (error) {
      console.error('Erreur lors de la vérification de l\'accès public:', error);
      return { 
        accessible: false, 
        error: 'Impossible de vérifier l\'accessibilité de ce bot.' 
      };
    }
  }
}
