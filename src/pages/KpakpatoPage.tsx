import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, Plus, Play, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const KpakpatoPage: React.FC = () => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleVocalKpakpato = () => {
    if (isListening) {
      setIsListening(false);
      toast({
        title: "Kpakpato terminé",
        description: "Enregistrement vocal arrêté",
      });
    } else {
      setIsListening(true);
      toast({
        title: "Kpakpato démarré",
        description: "Parlez maintenant...",
      });
      
      // Simuler l'arrêt automatique après 5 secondes
      setTimeout(() => {
        setIsListening(false);
      }, 5000);
    }
  };

  const handleAddPersonalKpakpato = () => {
    toast({
      title: "Ajouter votre Kpakpato",
      description: "Fonctionnalité en développement",
    });
  };

  const handlePlayDemo = () => {
    setIsPlaying(true);
    toast({
      title: "Lecture démo",
      description: "Écoute d'un exemple de Kpakpato",
    });
    
    setTimeout(() => {
      setIsPlaying(false);
    }, 3000);
  };

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
          <Volume2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900">Kpakpato</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Découvrez et créez des messages vocaux interactifs avec notre système Kpakpato
        </p>
      </div>

      {/* Boutons principaux */}
      <div className="max-w-4xl mx-auto grid gap-8 md:grid-cols-2">
        {/* Bouton Vocal Kpakpato */}
        <Card className="p-8 text-center space-y-6 hover:shadow-lg transition-shadow">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
            <Mic className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Kpakpato Vocal</h2>
            <p className="text-gray-600">
              Créez un message vocal instantané disponible pour tous
            </p>
          </div>
          <Button 
            onClick={handleVocalKpakpato}
            size="lg"
            className={`w-full py-6 text-lg font-semibold transition-all ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isListening ? (
              <>
                <Mic className="w-6 h-6 mr-2 animate-pulse" />
                Arrêter l'enregistrement
              </>
            ) : (
              <>
                <Mic className="w-6 h-6 mr-2" />
                Commencer Kpakpato
              </>
            )}
          </Button>
          
          {/* Bouton démo */}
          <Button 
            variant="outline" 
            onClick={handlePlayDemo}
            disabled={isPlaying}
            className="w-full"
          >
            {isPlaying ? (
              <>
                <Volume2 className="w-4 h-4 mr-2 animate-pulse" />
                Lecture en cours...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Écouter un exemple
              </>
            )}
          </Button>
        </Card>

        {/* Bouton Ajouter son propre Kpakpato */}
        <Card className="p-8 text-center space-y-6 hover:shadow-lg transition-shadow">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
            <Plus className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Mon Kpakpato</h2>
            <p className="text-gray-600">
              Créez et personnalisez votre propre système Kpakpato
            </p>
          </div>
          <Button 
            onClick={handleAddPersonalKpakpato}
            size="lg"
            variant="outline"
            className="w-full py-6 text-lg font-semibold border-2 border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            <Plus className="w-6 h-6 mr-2" />
            Ajouter mon Kpakpato
          </Button>
        </Card>
      </div>

      {/* Section d'information */}
      <div className="max-w-4xl mx-auto">
        <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold text-purple-800">À propos de Kpakpato</h3>
            <p className="text-purple-700">
              Kpakpato est un système innovant de messages vocaux interactifs qui permet de créer, 
              partager et écouter des contenus audio personnalisés de manière simple et intuitive.
            </p>
            <div className="flex justify-center space-x-4 text-sm text-purple-600">
              <span>• Messages vocaux instantanés</span>
              <span>• Partage facile</span>
              <span>• Interface intuitive</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};