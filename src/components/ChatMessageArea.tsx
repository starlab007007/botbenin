
import React, { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ChatMessage } from '@/components/ChatMessage';
import { SuggestionCards } from '@/components/SuggestionCards';
import { HybridSuggestionSystem } from '@/components/HybridSuggestionSystem';
import { useSearchParams } from 'react-router-dom';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isBookmarked?: boolean;
}

interface ChatMessageAreaProps {
  messages: Message[];
  showSuggestions: boolean;
  userContext: 'business' | 'marketing' | 'gestion' | 'citoyen' | 'services_locaux' | 'restaurant' | 'automation' | 'general';
  isLoading: boolean;
  onToggleBookmark: (messageId: string) => void;
  onSuggestionClick: (suggestion: any) => void;
  botId?: string; // Ajout du botId optionnel
}

// Utilitaire pour détecter les appareils mobiles
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
};

export const ChatMessageArea: React.FC<ChatMessageAreaProps> = ({
  messages,
  showSuggestions,
  userContext,
  isLoading,
  onToggleBookmark,
  onSuggestionClick,
  botId: propBotId, // Renommer pour éviter la confusion
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [usedSuggestions, setUsedSuggestions] = useState<Set<string>>(new Set());
  const [searchParams] = useSearchParams();
  
  // Récupérer le botId des props ou des paramètres URL en fallback
  const botId = propBotId || searchParams.get('bot');
  
  // Détecter si c'est un lien partagé
  const isSharedLink = searchParams.get('entry') === 'shortened_link' || 
                      !!searchParams.get('ref') || 
                      !!searchParams.get('webhook') ||
                      window.location.pathname.includes('/chat/');
  
  const isMobile = isMobileDevice();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Banque de suggestions optimisées pour mobile
  const suggestionBank = {
    initial_mobile: [
      { action: "Que pouvez-vous faire ?", category: "découverte" },
      { action: "Aide-moi", category: "assistance" },
      { action: "Commencer", category: "démarrage" }
    ],
    initial: [
      { action: "Quoi de neuf aujourd'hui", category: "général" },
      { action: "Les bons plans de la journée", category: "catalogue" },
      { action: "Qu'est-ce que vous m'offrez", category: "nouveauté" }
    ],
    services_locaux: [
      { action: "Je cherche location maison à Cotonou", category: "immobilier" },
      { action: "Je cherche opportunité d'achat de terrain à Calavi", category: "terrain" },
      { action: "Regardons les opportunités d'investissement", category: "investissement" },
      { action: "Quels sont les meilleurs quartiers pour investir ?", category: "conseil" },
      { action: "Prix du m² dans différents quartiers", category: "prix" }
    ],
    restaurant: [
      { action: "Je cherche un restaurant français", category: "cuisine" },
      { action: "Restaurant avec terrasse disponible ce soir", category: "spécifique" },
      { action: "Quels sont vos restaurants recommandés ?", category: "recommandation" },
      { action: "Restaurant pour groupe de 8 personnes", category: "groupe" },
      { action: "Réserver pour ce weekend", category: "réservation" }
    ],
    produit: [
      { action: "Montrez-moi les coques iPhone 15", category: "spécifique" },
      { action: "Quels sont vos prix ?", category: "prix" },
      { action: "Avez-vous des promotions ?", category: "promo" },
      { action: "Quelle est la qualité des matériaux ?", category: "qualité" },
      { action: "Livraison disponible ?", category: "livraison" }
    ],
    catalogue: [
      { action: "Voir tous les produits", category: "navigation" },
      { action: "Quelles sont vos marques ?", category: "marque" },
      { action: "Avez-vous des accessoires Samsung ?", category: "samsung" },
      { action: "Produits pour tablettes disponibles ?", category: "tablette" },
      { action: "Câbles et chargeurs en stock ?", category: "accessoire" }
    ],
    nouveauté: [
      { action: "Voir les dernières arrivées", category: "recent" },
      { action: "Quand sortent les nouveaux modèles ?", category: "futur" },
      { action: "Newsletter pour les nouveautés", category: "newsletter" },
      { action: "Alertes pour iPhone 16 ?", category: "alerte" },
      { action: "Produits tendance actuels", category: "tendance" }
    ],
    prix: [
      { action: "Avez-vous des prix dégressifs ?", category: "volume" },
      { action: "Modes de paiement acceptés ?", category: "paiement" },
      { action: "Garantie incluse ?", category: "garantie" },
      { action: "Retour possible si défaut ?", category: "retour" }
    ],
    livraison: [
      { action: "Délais de livraison ?", category: "délai" },
      { action: "Livraison gratuite à partir de combien ?", category: "gratuit" },
      { action: "Livraison express disponible ?", category: "express" },
      { action: "Point relais possibles ?", category: "relais" }
    ],
    spécifique: [
      { action: "Compatible avec iPhone 15 Pro Max ?", category: "compatibilité" },
      { action: "Couleurs disponibles ?", category: "couleur" },
      { action: "Protection écran incluse ?", category: "protection" },
      { action: "Résistant aux chocs ?", category: "résistance" }
    ]
  };

  // Générer des suggestions dynamiques basées sur le dernier message de l'IA
  const generateDynamicSuggestions = (lastBotMessage: string): Array<{action: string, category: string}> => {
    const content = lastBotMessage.toLowerCase();
    let suggestionsPool: Array<{action: string, category: string}> = [];

    // Déterminer la catégorie basée sur le contenu
    if (content.includes('iphone') || content.includes('coque')) {
      suggestionsPool = [...suggestionBank.produit, ...suggestionBank.spécifique];
    } else if (content.includes('boutique') || content.includes('article') || content.includes('catalogue')) {
      suggestionsPool = [...suggestionBank.catalogue, ...suggestionBank.produit];
    } else if (content.includes('nouveauté') || content.includes('nouveau')) {
      suggestionsPool = [...suggestionBank.nouveauté, ...suggestionBank.catalogue];
    } else if (content.includes('prix') || content.includes('coût') || content.includes('euro')) {
      suggestionsPool = [...suggestionBank.prix, ...suggestionBank.livraison];
    } else if (content.includes('livraison') || content.includes('délai')) {
      suggestionsPool = [...suggestionBank.livraison, ...suggestionBank.prix];
    } else {
      // Suggestions générales adaptées au mobile/desktop
      suggestionsPool = isMobile && isSharedLink ? [
        { action: "Plus d'infos", category: "général" },
        { action: "Comment faire ?", category: "général" },
        { action: "Autres options ?", category: "général" }
      ] : [
        { action: "Pouvez-vous me donner plus de détails ?", category: "général" },
        { action: "Quelles sont les options disponibles ?", category: "général" },
        { action: "Comment puis-je procéder ?", category: "général" },
        { action: "Avez-vous d'autres suggestions ?", category: "général" }
      ];
    }

    // Filtrer les suggestions déjà utilisées et en sélectionner 3
    const availableSuggestions = suggestionsPool.filter(
      suggestion => !usedSuggestions.has(suggestion.action)
    );

    // Si moins de 3 suggestions disponibles, réinitialiser partiellement
    if (availableSuggestions.length < 3) {
      const resetSuggestions = new Set(usedSuggestions);
      // Garder seulement les 5 dernières suggestions utilisées
      const recentSuggestions = Array.from(usedSuggestions).slice(-5);
      setUsedSuggestions(new Set(recentSuggestions));
      
      return suggestionsPool
        .filter(suggestion => !recentSuggestions.includes(suggestion.action))
        .slice(0, 3);
    }

    return availableSuggestions.slice(0, 3);
  };

  const handleSuggestionClick = (suggestion: any) => {
    // Marquer la suggestion comme utilisée
    setUsedSuggestions(prev => new Set([...prev, suggestion.action]));
    onSuggestionClick(suggestion);
  };

  const lastBotMessage = messages.slice().reverse().find(msg => !msg.isUser);
  const showDynamicSuggestions = messages.length > 1 && lastBotMessage && !isLoading;

  // Choisir les suggestions initiales selon le contexte
  const getInitialSuggestions = () => {
    if (isMobile && isSharedLink) {
      return suggestionBank.initial_mobile;
    }
    
    switch (userContext) {
      case 'restaurant':
        return suggestionBank.restaurant;
      case 'services_locaux':
        return suggestionBank.services_locaux;
      default:
        return suggestionBank.initial;
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-gray-100 ${isMobile && isSharedLink ? 'px-[5%] py-3' : 'px-[5%] md:px-6 py-6'}`}>
      <div className="max-w-full mx-auto space-y-4">
        {/* Welcome message and suggestions */}
        {messages.length <= 1 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <span className="text-white font-semibold text-2xl">🤖</span>
            </div>
            <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 mb-3`}>
              Comment puis-je vous aider?
            </h3>
            <p className={`text-gray-600 ${isMobile ? 'text-base' : 'text-lg'} mb-8 font-medium`}>
              Voici quelques suggestions pour commencer
            </p>
            
            {/* Système de suggestions hybride (intelligent + fallback) */}
            {botId ? (
              <div className={`${isMobile ? 'w-[90%]' : 'max-w-4xl'} mx-auto`}>
                <HybridSuggestionSystem
                  botId={botId}
                  userContext={userContext}
                  onSuggestionClick={(action) => handleSuggestionClick({ action })}
                />
              </div>
            ) : (
              <div className={`space-y-4 ${isMobile ? 'w-[90%]' : 'max-w-md'} mx-auto`}>
                {getInitialSuggestions().map((suggestion, index) => (
                  <button 
                    key={suggestion.action}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full ${
                      index === 0 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg' 
                        : 'bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-blue-300 shadow-md'
                    } rounded-2xl ${isMobile ? 'py-4 px-5 text-base' : 'py-5 px-7 text-lg'} font-semibold transition-all duration-200 transform hover:scale-105`}
                  >
                    {suggestion.action}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat Messages */}
        {messages.slice(1).map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onToggleBookmark={onToggleBookmark}
          />
        ))}

        {/* Suggestions dynamiques après chaque réponse */}
        {showDynamicSuggestions && (
          <div className="flex flex-col items-center mt-8">
            <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 mb-4 font-medium`}>
              💡 Suggestions personnalisées :
            </p>
            <div className={`flex flex-wrap gap-3 justify-center ${isMobile ? 'w-[90%]' : 'max-w-2xl'}`}>
              {generateDynamicSuggestions(lastBotMessage.content).map((suggestion, index) => (
                <button
                  key={`${suggestion.action}-${index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`bg-white border-2 border-gray-200 text-gray-700 rounded-full ${
                    isMobile ? 'py-3 px-4 text-sm' : 'py-3 px-5 text-sm'
                  } font-semibold hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105`}
                >
                  {suggestion.action}
                </button>
              ))}
            </div>
            <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 mt-3 italic`}>
              ✨ Suggestions adaptées à votre conversation
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-start px-1">
            <div className={`bg-white rounded-2xl rounded-bl-lg ${isMobile ? 'p-4' : 'p-5'} shadow-lg border border-gray-200 max-w-xs w-[90%] md:max-w-md`}>
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 font-medium`}>
                  En train d'écrire...
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
