import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import whatsappQualification from '@/assets/whatsapp-qualification.png';
import whatsappCampaign from '@/assets/whatsapp-campaign.png';
import whatsappAutoResponse from '@/assets/whatsapp-auto-response.png';

export const WhatsAppShowcase: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0);

  const keywords = [
    "Réponse automatique",
    "Prospects automatique",
    "Qualification automatique des prospects",
    "Campagnes WhatsApp",
    "Parler, convertir, qualifier comme toi"
  ];

  const screens = [
    {
      image: whatsappAutoResponse,
      title: "Réponses automatiques"
    },
    {
      image: whatsappQualification,
      title: "Qualification des prospects"
    },
    {
      image: whatsappCampaign,
      title: "Campagnes WhatsApp"
    }
  ];

  // Rotate keywords every 2 seconds
  useEffect(() => {
    const keywordInterval = setInterval(() => {
      setCurrentKeywordIndex((prev) => (prev + 1) % keywords.length);
    }, 2000);

    return () => clearInterval(keywordInterval);
  }, []);

  // Rotate phone screens every 3 seconds
  useEffect(() => {
    const screenInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % screens.length);
    }, 3000);

    return () => clearInterval(screenInterval);
  }, []);

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 border-0">
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full -translate-x-32 -translate-y-32"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full translate-x-32 translate-y-32"></div>
      
      <div className="relative p-6 sm:p-8 lg:p-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left content - Dynamic text */}
          <div className="space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-gray-900">
              Découvrez{' '}
              <span className="relative inline-block">
                <span 
                  className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500 transition-all duration-500"
                  key={currentKeywordIndex}
                  style={{
                    animation: 'text-slide-up 0.5s ease-out'
                  }}
                >
                  {keywords[currentKeywordIndex]}
                </span>
                <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-green-600 to-emerald-500 rounded-full"></span>
              </span>
            </h2>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              BOT.BJ automatise vos conversations WhatsApp avec l'intelligence artificielle. 
              Transformez chaque message en opportunité de conversion.
            </p>

            <div className="flex flex-wrap gap-3">
              {keywords.map((keyword, index) => (
                <div
                  key={index}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    index === currentKeywordIndex
                      ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg scale-110'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {keyword}
                </div>
              ))}
            </div>
          </div>

          {/* Right content - Animated phone screens */}
          <div className="relative h-[500px] sm:h-[600px] flex items-center justify-center">
            <div className="relative w-full max-w-[350px] h-full">
              {screens.map((screen, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-all duration-700 transform ${
                    index === currentIndex
                      ? 'opacity-100 scale-100 rotate-0 z-30'
                      : index === (currentIndex + 1) % screens.length
                      ? 'opacity-60 scale-90 rotate-6 translate-x-8 z-20'
                      : 'opacity-30 scale-80 -rotate-6 -translate-x-8 z-10'
                  }`}
                  style={{
                    transformOrigin: 'center center'
                  }}
                >
                  <div className="relative w-full h-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-[3rem] blur-2xl"></div>
                    <img
                      src={screen.image}
                      alt={screen.title}
                      className="relative w-full h-full object-contain drop-shadow-2xl"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Floating indicators */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-40">
              {screens.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'bg-green-600 w-8'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Screen ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};