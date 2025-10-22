import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { CheckCircle2, Sparkles } from 'lucide-react';

interface ChatMessage {
  type: 'bot' | 'user';
  text: string;
  delay: number;
}

interface ScreenContent {
  title: string;
  messages: ChatMessage[];
}

export const WhatsAppShowcase: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const keywords = [
    "Réponse automatique",
    "Prospects automatique", 
    "Qualification automatique",
    "Campagnes WhatsApp",
    "Convertir comme toi"
  ];

  const screens: ScreenContent[] = [
    {
      title: "Réponses automatiques",
      messages: [
        { type: 'user', text: "Bonjour, êtes-vous disponible ?", delay: 0 },
        { type: 'bot', text: "Bonjour ! 👋 Je suis disponible 24/7. Comment puis-je vous aider ?", delay: 1000 },
        { type: 'user', text: "Quels sont vos tarifs ?", delay: 2500 },
        { type: 'bot', text: "Nos forfaits commencent à partir de 15.000 FCFA/mois. Souhaitez-vous plus de détails ? 📊", delay: 3500 }
      ]
    },
    {
      title: "Qualification des prospects", 
      messages: [
        { type: 'bot', text: "Bonjour ! Quel est votre secteur d'activité ?", delay: 0 },
        { type: 'user', text: "Je suis dans l'e-commerce", delay: 1200 },
        { type: 'bot', text: "Parfait ! Combien de clients contactez-vous par jour ? 📈", delay: 2200 },
        { type: 'user', text: "Environ 50 clients", delay: 3400 },
        { type: 'bot', text: "Super ! Notre solution peut automatiser 80% de ces échanges. Voulez-vous un audit gratuit ? ✨", delay: 4400 }
      ]
    },
    {
      title: "Campagnes WhatsApp",
      messages: [
        { type: 'bot', text: "🎉 Nouvelle offre spéciale ! -30% sur tous nos services jusqu'au 31 octobre", delay: 0 },
        { type: 'bot', text: "💡 Plus de 500 entreprises nous font confiance pour automatiser leur WhatsApp", delay: 1500 },
        { type: 'user', text: "Intéressant ! Comment démarrer ?", delay: 3000 },
        { type: 'bot', text: "C'est simple ! Je vous envoie un lien pour un audit gratuit de 30 min 🚀", delay: 4000 }
      ]
    }
  ];

  // Rotate keywords every 3 seconds
  useEffect(() => {
    const keywordInterval = setInterval(() => {
      setCurrentKeywordIndex((prev) => (prev + 1) % keywords.length);
    }, 3000);

    return () => clearInterval(keywordInterval);
  }, []);

  // Rotate screens and reset messages every 8 seconds
  useEffect(() => {
    const screenInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % screens.length);
      setVisibleMessages([]);
    }, 8000);

    return () => clearInterval(screenInterval);
  }, []);

  // Animate messages for current screen
  useEffect(() => {
    setVisibleMessages([]);
    const currentMessages = screens[currentIndex].messages;
    
    currentMessages.forEach((message, index) => {
      setTimeout(() => {
        if (message.type === 'bot') {
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            setVisibleMessages(prev => [...prev, message]);
          }, 800);
        } else {
          setVisibleMessages(prev => [...prev, message]);
        }
      }, message.delay);
    });
  }, [currentIndex]);

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 border-0 shadow-xl">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full blur-3xl -translate-x-32 -translate-y-32 animate-pulse-glow"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-blue-500/10 to-purple-500/10 rounded-full blur-3xl translate-x-32 translate-y-32 animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative p-6 sm:p-8 lg:p-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content - Dynamic text */}
          <div className="space-y-8 animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-full">
              <Sparkles className="w-4 h-4 text-green-600 animate-pulse-glow" />
              <span className="text-sm font-medium text-green-700">Intelligence Artificielle Conversationnelle</span>
            </div>

            {/* Main heading with animated keyword */}
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-gray-900 mb-4">
                Découvrez{' '}
                <span className="relative inline-block min-h-[1.2em]">
                  <span 
                    className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 bg-[length:200%_100%] animate-fade-in"
                    key={currentKeywordIndex}
                    style={{
                      animation: 'fade-in 0.6s ease-out, slide-up 0.5s ease-out'
                    }}
                  >
                    {keywords[currentKeywordIndex]}
                  </span>
                  <span className="absolute -bottom-2 left-0 h-1 bg-gradient-to-r from-green-600 via-emerald-500 to-transparent rounded-full transition-all duration-500"
                    style={{ width: `${((currentKeywordIndex + 1) / keywords.length) * 100}%` }}
                  ></span>
                </span>
              </h2>
              
              <p className="text-lg text-gray-600 leading-relaxed">
                BOT.BJ automatise vos conversations WhatsApp avec l'intelligence artificielle. 
                Transformez chaque message en opportunité de conversion.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-3">
              {[
                "Réponses instantanées 24/7",
                "Qualification intelligente des prospects",
                "Campagnes automatisées multicanales"
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 group cursor-pointer hover:translate-x-2 transition-transform duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-green-600 to-emerald-500 flex items-center justify-center shadow-lg group-hover:shadow-green-500/50 transition-shadow">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>

            {/* Interactive keyword pills */}
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentKeywordIndex(index)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-500 transform hover:scale-105 ${
                    index === currentKeywordIndex
                      ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg shadow-green-500/50'
                      : 'bg-white/80 text-gray-600 hover:bg-white border border-gray-200'
                  }`}
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>

          {/* Right content - Animated phone screens with chat */}
          <div className="relative h-[600px] flex items-center justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative w-full max-w-[380px] h-full perspective-1000">
              {screens.map((screen, index) => {
                const isActive = index === currentIndex;
                const isPrev = index === (currentIndex - 1 + screens.length) % screens.length;
                const isNext = index === (currentIndex + 1) % screens.length;

                return (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-all duration-700 transform ${
                      isActive
                        ? 'opacity-100 scale-100 rotate-0 z-30 translate-x-0'
                        : isNext
                        ? 'opacity-40 scale-90 rotate-6 z-20 translate-x-16 translate-y-4'
                        : isPrev
                        ? 'opacity-40 scale-90 -rotate-6 z-10 -translate-x-16 translate-y-4'
                        : 'opacity-0 scale-75 z-0'
                    }`}
                  >
                    {/* Phone frame */}
                    <div className="relative w-full h-full rounded-[3rem] bg-gray-900 p-3 shadow-2xl">
                      {/* Screen glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/30 via-emerald-500/20 to-transparent rounded-[3rem] blur-2xl opacity-75"></div>
                      
                      {/* Screen content */}
                      <div className="relative w-full h-full rounded-[2.5rem] bg-gradient-to-b from-green-50 to-white overflow-hidden">
                        {/* WhatsApp header */}
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 flex items-center gap-3 shadow-lg">
                          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold">
                            B
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold">BOT.BJ</div>
                            <div className="text-xs text-white/80">En ligne</div>
                          </div>
                        </div>

                        {/* Chat messages */}
                        <div className="p-4 space-y-3 h-[calc(100%-80px)] overflow-y-auto">
                          {visibleMessages.map((message, msgIndex) => (
                            <div
                              key={msgIndex}
                              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                            >
                              <div
                                className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm ${
                                  message.type === 'user'
                                    ? 'bg-white text-gray-800 rounded-tr-none'
                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-tl-none'
                                }`}
                              >
                                <p className="text-sm leading-relaxed">{message.text}</p>
                              </div>
                            </div>
                          ))}

                          {/* Typing indicator */}
                          {isTyping && isActive && (
                            <div className="flex justify-start animate-fade-in">
                              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-2xl rounded-tl-none shadow-sm">
                                <div className="flex gap-1">
                                  <span className="w-2 h-2 bg-white rounded-full animate-bounce"></span>
                                  <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                  <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* WhatsApp footer */}
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full px-4 py-2">
                            <span className="text-sm text-gray-400">Message...</span>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center shadow-lg">
                            <span className="text-white text-xl">→</span>
                          </div>
                        </div>
                      </div>

                      {/* Phone notch */}
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-10"></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Screen indicators */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-40">
              {screens.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    setVisibleMessages([]);
                  }}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentIndex
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 w-8 h-2 shadow-lg shadow-green-500/50'
                      : 'bg-gray-300 w-2 h-2 hover:bg-gray-400'
                  }`}
                  aria-label={`Écran ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};