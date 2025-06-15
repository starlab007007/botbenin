
import React from "react";
import { Button } from "@/components/ui/button";
import { Home, Bot, Mail } from "lucide-react";

type ViewType = 'dashboard' | 'list' | 'create' | 'analytics' | 'share' | 'conversations';

interface BotManagerNavProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
}

export const BotManagerNav: React.FC<BotManagerNavProps> = ({ currentView, onChangeView }) => (
  <div className="flex flex-wrap gap-2">
    <Button
      variant={currentView === 'dashboard' ? 'default' : 'outline'}
      onClick={() => onChangeView('dashboard')}
    >
      <Home className="w-4 h-4 mr-2" />
      Dashboard
    </Button>
    <Button
      variant={currentView === 'list' ? 'default' : 'outline'}
      onClick={() => onChangeView('list')}
    >
      <Bot className="w-4 h-4 mr-2" />
      Mes Bots
    </Button>
    <Button
      variant={currentView === 'conversations' ? 'default' : 'outline'}
      onClick={() => onChangeView('conversations')}
    >
      <Mail className="w-4 h-4 mr-2" />
      Conversations
    </Button>
  </div>
);
