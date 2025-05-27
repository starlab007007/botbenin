
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessageArea } from '@/components/ChatMessageArea';
import { ChatInputArea } from '@/components/ChatInputArea';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isBookmarked?: boolean;
}

interface B2BChatInterfaceProps {
  onBackToSearch: () => void;
  searchFilters: any;
  webhookUrl: string;
}

export const B2BChatInterface: React.FC<B2BChatInterfaceProps> = ({ 
  onBackToSearch, 
  searchFilters,
  webhookUrl = 'https://ia.bot.bj/webhook/lead'
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "🔍 Excellent ! J'ai lancé votre recherche B2B avec les critères que vous avez définis. Je vais maintenant analyser les données et vous présenter les résultats. Que souhaitez-vous savoir sur les contacts trouvés ?",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [initialSearchDone, setInitialSearchDone] = useState(false);
  const { toast } = useToast();

  // Effectuer la recherche initiale automatiquement
  React.useEffect(() => {
    if (!initialSearchDone) {
      handleInitialSearch();
      setInitialSearchDone(true);
    }
  }, [initialSearchDone]);

  const buildPayloadFromFilters = () => {
    const payload: any = {
      type: 'b2b_search',
      action: 'search_contacts'
    };
    
    if (searchFilters.companyName) payload.entreprise = searchFilters.companyName;
    if (searchFilters.industry) payload.secteur = searchFilters.industry;
    if (searchFilters.jobTitle) payload.poste = searchFilters.jobTitle;
    if (searchFilters.location) payload.localisation = searchFilters.location;
    if (searchFilters.companySize) payload.taille_entreprise = searchFilters.companySize;
    if (searchFilters.department) payload.departement = searchFilters.department;
    if (searchFilters.experience) payload.experience = searchFilters.experience;
    if (searchFilters.keywords) payload.mots_cles = searchFilters.keywords;

    return payload;
  };

  const handleInitialSearch = async () => {
    setIsLoading(true);
    console.log('=== B2B INITIAL SEARCH START ===');
    console.log('Search filters:', searchFilters);

    const payload = buildPayloadFromFilters();
    console.log('Initial search payload:', payload);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout after 30 seconds');
        controller.abort();
      }, 30000);

      const requestPayload = {
        ...payload,
        timestamp: new Date().toISOString(),
        session_id: `b2b_search_${Date.now()}`,
        user_id: 'b2b_user',
        source: 'b2b_targeting_platform',
        context: 'b2b_search',
        origin: window.location.origin,
        user_agent: navigator.userAgent
      };

      console.log('Sending initial search request:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'B2B-Targeting-Platform/1.0',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      console.log('Initial search response received!');
      console.log('Status:', response.status);
      console.log('Response OK:', response.ok);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      console.log('Content-Type:', contentType);

      let responseData;
      let processedContent;

      if (contentType.includes('application/json')) {
        responseData = await response.json();
        console.log('JSON Response:', JSON.stringify(responseData, null, 2));
        
        processedContent = responseData.output || 
                          responseData.message || 
                          responseData.response || 
                          responseData.text || 
                          responseData.content ||
                          responseData.reply ||
                          (typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
      } else {
        responseData = await response.text();
        console.log('Text Response:', responseData);
        processedContent = responseData;
      }

      if (!processedContent || processedContent.trim() === '') {
        processedContent = "Recherche B2B terminée avec succès ! J'ai trouvé plusieurs contacts correspondant à vos critères. Vous pouvez maintenant visualiser les résultats ou affiner votre recherche.";
      }

      const searchResultMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: processedContent.trim(),
        isUser: false,
        timestamp: new Date(),
      };

      console.log('Adding search result message:', searchResultMessage);
      setMessages(prev => [...prev, searchResultMessage]);

    } catch (error) {
      console.error('=== B2B INITIAL SEARCH ERROR ===');
      console.error('Error:', error);
      
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "J'ai rencontré un problème technique lors de la recherche initiale, mais je peux toujours vous aider avec vos questions sur le ciblage B2B. Que souhaitez-vous savoir ?",
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, fallbackMessage]);
      
      toast({
        title: "Recherche B2B - Problème technique",
        description: "Problème de connexion au service de recherche",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('=== B2B INITIAL SEARCH END ===');
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    console.log('=== B2B CHAT MESSAGE START ===');
    console.log('User message:', textToSend);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout after 30 seconds');
        controller.abort();
      }, 30000);

      const requestPayload = {
        message: textToSend,
        timestamp: new Date().toISOString(),
        session_id: `b2b_chat_${Date.now()}`,
        user_id: 'b2b_user',
        source: 'b2b_targeting_platform',
        context: 'b2b_conversation',
        search_filters: searchFilters
      };

      console.log('Sending chat message:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'B2B-Targeting-Platform/1.0',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      console.log('Chat response received!');
      console.log('Status:', response.status);
      console.log('Response OK:', response.ok);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let responseData;
      let processedContent;

      if (contentType.includes('application/json')) {
        responseData = await response.json();
        console.log('JSON Response:', JSON.stringify(responseData, null, 2));
        
        processedContent = responseData.output || 
                          responseData.message || 
                          responseData.response || 
                          responseData.text || 
                          responseData.content ||
                          responseData.reply ||
                          (typeof responseData === 'string' ? responseData : JSON.stringify(responseData));
      } else {
        responseData = await response.text();
        console.log('Text Response:', responseData);
        processedContent = responseData;
      }

      if (!processedContent || processedContent.trim() === '') {
        throw new Error('Empty response from webhook');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: processedContent.trim(),
        isUser: false,
        timestamp: new Date(),
      };

      console.log('Adding AI message:', aiMessage);
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('=== B2B CHAT ERROR ===');
      console.error('Error:', error);
      
      let errorMessage = "Je rencontre des difficultés techniques. Laissez-moi vous proposer une assistance générale sur le ciblage B2B.";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "La requête a pris trop de temps. Le système pourrait être occupé. Veuillez réessayer.";
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "Impossible de se connecter au système. Vérifiez votre connexion internet et réessayez.";
        }
      }

      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: errorMessage,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, fallbackMessage]);
      
      toast({
        title: "Recherche B2B - Problème technique",
        description: "Problème de connexion",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('=== B2B CHAT MESSAGE END ===');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleBookmark = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, isBookmarked: !msg.isBookmarked }
          : msg
      )
    );
  };

  const handleSuggestionClick = (suggestion: any) => {
    handleSendMessage(suggestion.action);
  };

  const bookmarkedMessages = messages.filter(msg => msg.isBookmarked && !msg.isUser);

  return (
    <div className="h-screen flex flex-col gradient-warm">
      <ChatHeader
        onBackToLanding={onBackToSearch}
        isLoading={isLoading}
        bookmarkedCount={bookmarkedMessages.length}
        onShowBookmarks={() => setShowBookmarks(true)}
        title="Assistant B2B - Ciblage & Prospection"
      />
      
      <ChatMessageArea
        messages={messages}
        showSuggestions={false}
        userContext="business"
        isLoading={isLoading}
        onToggleBookmark={toggleBookmark}
        onSuggestionClick={handleSuggestionClick}
      />
      
      <ChatInputArea
        inputValue={inputValue}
        isLoading={isLoading}
        onInputChange={setInputValue}
        onKeyPress={handleKeyPress}
        onSendMessage={() => handleSendMessage()}
      />
    </div>
  );
};
