
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface LandingHeroProps {
  onStartChat: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onStartChat }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
        {/* Hero Text */}
        <div className="space-y-6">
          <h1 className="text-5xl md:text-7xl font-playfair font-bold text-gray-900 leading-tight">
            Discover Your Purpose &<br />
            <span className="text-soft-peach-600">Build Your Dream Career</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-700 max-w-2xl mx-auto leading-relaxed">
            AI-powered coaching to help you find clarity and take action.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Card className="p-6 bg-white/70 backdrop-blur-sm border-warm-beige-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-soft-peach-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="font-playfair font-semibold text-lg text-gray-900">Find Your Direction</h3>
              <p className="text-gray-600 text-sm">Get personalized career path suggestions based on your goals and interests.</p>
            </div>
          </Card>

          <Card className="p-6 bg-white/70 backdrop-blur-sm border-warm-beige-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-soft-peach-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">📚</span>
              </div>
              <h3 className="font-playfair font-semibold text-lg text-gray-900">Learn & Grow</h3>
              <p className="text-gray-600 text-sm">Discover curated learning resources, books, and courses for your journey.</p>
            </div>
          </Card>

          <Card className="p-6 bg-white/70 backdrop-blur-sm border-warm-beige-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-soft-peach-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="font-playfair font-semibold text-lg text-gray-900">Take Action</h3>
              <p className="text-gray-600 text-sm">Get actionable steps and strategies to move forward with confidence.</p>
            </div>
          </Card>
        </div>

        {/* CTA Button */}
        <div className="mt-12">
          <Button 
            onClick={onStartChat}
            className="bg-soft-peach-500 hover:bg-soft-peach-600 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            Start Your Career Journey
          </Button>
        </div>

        {/* Example Questions */}
        <div className="mt-8 text-sm text-gray-600">
          <p className="mb-2">Try asking:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="bg-white/60 px-3 py-1 rounded-full border border-warm-beige-200">"I want to transition into AI engineering"</span>
            <span className="bg-white/60 px-3 py-1 rounded-full border border-warm-beige-200">"How to develop leadership skills?"</span>
            <span className="bg-white/60 px-3 py-1 rounded-full border border-warm-beige-200">"Career change at 35"</span>
          </div>
        </div>
      </div>
    </div>
  );
};
