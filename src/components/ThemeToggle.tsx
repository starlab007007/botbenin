
import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ThemeProvider';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      case 'system':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Sun className="w-4 h-4" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Mode Clair';
      case 'dark':
        return 'Mode Sombre';
      case 'system':
        return 'Mode Système';
      default:
        return 'Mode Clair';
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="flex items-center gap-2 justify-center sm:justify-start px-2 sm:px-3 py-2 text-sm font-body hover:bg-muted/50 rounded-xl transition-all duration-300"
      title={getLabel()}
      aria-label={getLabel()}
    >
      {getIcon()}
      <span className="hidden md:inline text-muted-foreground">{getLabel()}</span>
    </Button>
  );
};
