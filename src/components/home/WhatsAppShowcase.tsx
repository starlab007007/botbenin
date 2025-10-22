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
      <div className="absolute top-0 left-0 w-64 md:w-96 h-64 md:h-96 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full blur-3xl -translate-x-20 md:-translate-x-32 -translate-y-20 md:-translate-y-32 animate-pulse-glow"></div>
      <div className="absolute bottom-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-gradient-to-tl from-blue-500/10 to-purple-500/10 rounded-full blur-3xl translate-x-20 md:translate-x-32 translate-y-20 md:translate-y-32 animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative p-4 md:p-6 lg:p-12 xl:p-16">
        <div className="grid lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center">
          {/* Left content - Dynamic text */}
          <div className="space-y-4 md:space-y-6 lg:space-y-8 animate-fade-in text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-full">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-green-600 animate-pulse-glow" />
              <span className="text-xs md:text-sm font-medium text-green-700">Intelligence Artificielle Conversationnelle</span>
            </div>

            {/* Main heading with animated keyword */}
            <div>
              <h2 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold leading-tight text-gray-900 mb-3 md:mb-4 px-2 lg:px-0">
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
                  <span className="absolute -bottom-1 md:-bottom-2 left-0 h-0.5 md:h-1 bg-gradient-to-r from-green-600 via-emerald-500 to-transparent rounded-full transition-all duration-500"
                    style={{ width: `${((currentKeywordIndex + 1) / keywords.length) * 100}%` }}
                  ></span>
                </span>
              </h2>
              
              <p className="text-sm md:text-base lg:text-lg text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0 px-4 lg:px-0">
                BOT.BJ automatise vos conversations WhatsApp avec l'intelligence artificielle. 
                Transformez chaque message en opportunité de conversion.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-2 md:space-y-3 max-w-lg mx-auto lg:mx-0">
              {[
                "Réponses instantanées 24/7",
                "Qualification intelligente des prospects",
                "Campagnes automatisées multicanales"
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 md:gap-3 group cursor-pointer lg:hover:translate-x-2 transition-transform duration-300 justify-center lg:justify-start"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-r from-green-600 to-emerald-500 flex items-center justify-center shadow-lg group-hover:shadow-green-500/50 transition-shadow">
                    <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-white" />
                  </div>
                  <span className="text-sm md:text-base text-gray-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>

            {/* Interactive keyword pills */}
            <div className="flex flex-wrap gap-1.5 md:gap-2 justify-center lg:justify-start px-2 lg:px-0">
              {keywords.map((keyword, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentKeywordIndex(index)}
                  className={`px-2.5 md:px-3 lg:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-500 transform hover:scale-105 ${
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
          <div className="relative h-[450px] md:h-[500px] lg:h-[600px] flex items-center justify-center animate-fade-in mt-6 lg:mt-0" style={{ animationDelay: '0.2s' }}>
            <div className="relative w-full max-w-[280px] md:max-w-[320px] lg:max-w-[380px] h-full perspective-1000">
              {screens.map((screen, index) => {
                const isActive = index === currentIndex;
                const isPrev = index === (currentIndex - 1 + screens.length) % screens.length;
                const isNext = index === (currentIndex + 1) % screens.length;

                return (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-all duration-700 transform ${
                      isActive
                        ? 'opacity-100 scale-90 md:scale-95 lg:scale-100 rotate-0 z-30 translate-x-0'
                        : isNext
                        ? 'opacity-30 md:opacity-40 scale-75 md:scale-85 lg:scale-90 rotate-3 md:rotate-6 z-20 translate-x-12 md:translate-x-16 translate-y-3 md:translate-y-4'
                        : isPrev
                        ? 'opacity-30 md:opacity-40 scale-75 md:scale-85 lg:scale-90 -rotate-3 md:-rotate-6 z-10 -translate-x-12 md:-translate-x-16 translate-y-3 md:translate-y-4'
                        : 'opacity-0 scale-75 z-0'
                    }`}
                  >
                    {/* Phone frame */}
                    <div className="relative w-full h-full rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3rem] bg-gray-900 p-2 md:p-2.5 lg:p-3 shadow-2xl">
                      {/* Screen glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/30 via-emerald-500/20 to-transparent rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3rem] blur-xl md:blur-2xl opacity-75"></div>
                      
                      {/* Screen content */}
                      <div className="relative w-full h-full rounded-[1.7rem] md:rounded-[2.2rem] lg:rounded-[2.5rem] bg-gradient-to-b from-green-50 to-white overflow-hidden">
                        {/* WhatsApp header */}
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-2.5 md:p-3 lg:p-4 flex items-center gap-2 md:gap-3 shadow-lg">
                          <div className="w-8 h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-sm md:text-base">
                            B
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm md:text-base">BOT.BJ</div>
                            <div className="text-[10px] md:text-xs text-white/80">En ligne</div>
                          </div>
                        </div>

                        {/* Chat messages */}
                        <div className="p-2.5 md:p-3 lg:p-4 space-y-2 md:space-y-2.5 lg:space-y-3 h-[calc(100%-65px)] md:h-[calc(100%-70px)] lg:h-[calc(100%-80px)] overflow-y-auto">
                          {visibleMessages.map((message, msgIndex) => (
                            <div
                              key={msgIndex}
                              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                            >
                              <div
                                className={`max-w-[80%] px-2.5 md:px-3 lg:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl shadow-sm ${
                                  message.type === 'user'
                                    ? 'bg-white text-gray-800 rounded-tr-none'
                                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-tl-none'
                                }`}
                              >
                                <p className="text-[11px] md:text-xs lg:text-sm leading-relaxed">{message.text}</p>
                              </div>
                            </div>
                          ))}

                          {/* Typing indicator */}
                          {isTyping && isActive && (
                            <div className="flex justify-start animate-fade-in">
                              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-2.5 md:px-3 lg:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl rounded-tl-none shadow-sm">
                                <div className="flex gap-0.5 md:gap-1">
                                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-bounce"></span>
                                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* WhatsApp footer */}
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-1.5 md:p-2 flex items-center gap-1.5 md:gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full px-2.5 md:px-3 lg:px-4 py-1.5 md:py-2">
                            <span className="text-[10px] md:text-xs lg:text-sm text-gray-400">Message...</span>
                          </div>
                          <div className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center shadow-lg">
                            <span className="text-white text-base md:text-lg lg:text-xl">→</span>
                          </div>
                        </div>
                      </div>

                      {/* Phone notch */}
                      <div className="absolute top-2 md:top-2.5 lg:top-3 left-1/2 -translate-x-1/2 w-20 h-4 md:w-24 md:h-5 lg:w-32 lg:h-6 bg-gray-900 rounded-b-xl md:rounded-b-2xl z-10"></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Screen indicators */}
            <div className="absolute -bottom-6 md:-bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2 z-40">
              {screens.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    setVisibleMessages([]);
                  }}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentIndex
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 w-6 md:w-8 h-1.5 md:h-2 shadow-lg shadow-green-500/50'
                      : 'bg-gray-300 w-1.5 md:w-2 h-1.5 md:h-2 hover:bg-gray-400'
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