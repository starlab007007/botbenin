
import React, { useState, useRef, useCallback } from 'react';
import { MessageCircle, X, Sparkles, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/ChatInterface';

interface Position {
  x: number;
  y: number;
}

export const DraggableFloatingChatButton: React.FC = () => {
  const [showChat, setShowChat] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [position, setPosition] = useState<Position>({ x: 24, y: 24 }); // Default bottom-right position
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.detail === 1) { // Single click
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep button within viewport bounds
      const maxX = window.innerWidth - 60; // Button width
      const maxY = window.innerHeight - 60; // Button height
      
      setPosition({
        x: Math.max(24, Math.min(newX, maxX)),
        y: Math.max(24, Math.min(newY, maxY))
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners for mouse move and up
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleToggleChat = () => {
    if (!isDragging) {
      setShowChat(!showChat);
    }
  };

  return (
    <>
      {/* Draggable floating chat button */}
      <div 
        className="fixed z-50"
        style={{ 
          right: `${position.x}px`, 
          bottom: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <Button
          ref={buttonRef}
          onClick={handleToggleChat}
          onMouseDown={handleMouseDown}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group relative overflow-hidden"
          size="icon"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-500/20 animate-pulse" />
          {showChat ? (
            <X className="w-6 h-6 text-white transition-transform duration-300 group-hover:rotate-90 relative z-10" />
          ) : (
            <div className="relative z-10">
              <MessageCircle className="w-6 h-6 text-white" />
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-white animate-pulse" />
            </div>
          )}
          
          {/* Drag indicator */}
          {isDragging && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
              <Move className="w-3 h-3 inline mr-1" />
              Déplacer
            </div>
          )}
        </Button>
        
        {/* Breathing animation ring */}
        {!showChat && !isDragging && (
          <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
        )}
      </div>

      {/* Chat Interface Modal - Élargi */}
      {showChat && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm">
          <div className="fixed bottom-0 right-0 left-0 md:bottom-4 md:right-4 md:left-auto md:w-[520px] h-[90vh] md:h-[750px] bg-white rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-gray-200">
            <ChatInterface onBackToLanding={() => setShowChat(false)} />
          </div>
        </div>
      )}
    </>
  );
};
