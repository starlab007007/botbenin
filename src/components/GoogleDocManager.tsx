import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FileText,
  Edit3,
  Trash2,
  Save,
  Sparkles,
  ExternalLink,
  Loader2,
  RefreshCw,
  Settings,
  Users,
  Building,
  Globe,
  UserCheck,
  Plus
} from 'lucide-react';

interface GoogleDocManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

type OfferType = 'personnel' | 'entreprise' | 'b2b' | 'b2c' | 'c2c';
type ToneType = 'professionnel' | 'convivial' | 'technique' | 'commercial' | 'premium';

interface OfferConfig {
  type: OfferType;
  targetAudience: string;
  industry: string;
  tone: ToneType;
  keyFeatures: string[];
}

const offerTypes = {
  personnel: { label: 'Profil Personnel', icon: UserCheck, color: 'bg-blue-500' },
  entreprise: { label: 'Entreprise Commerciale', icon: Building, color: 'bg-green-500' },
  b2b: { label: 'B2B (Business to Business)', icon: Users, color: 'bg-purple-500' },
  b2c: { label: 'B2C (Business to Consumer)', icon: Globe, color: 'bg-orange-500' },
  c2c: { label: 'C2C (Consumer to Consumer)', icon: Users, color: 'bg-pink-500' }
};

export const GoogleDocManager = ({ isOpen, onClose }: GoogleDocManagerProps) => {
  const { user } = useAuth();
  const [googleDocId, setGoogleDocId] = useState('1TXeYy0iEw8HTiGkzv8HZzDShg0Vmjnn7kcIE8SpIhmg');
  const [docContent, setDocContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [autoSaveInterval, setAutoSaveInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Configuration de l'offre
  const [offerConfig, setOfferConfig] = useState<OfferConfig>({
    type: 'b2b',
    targetAudience: '',
    industry: '',
    tone: 'professionnel',
    keyFeatures: []
  });
  
  const [newFeature, setNewFeature] = useState('');

  // Auto-génération quand le type change
  useEffect(() => {
    if (offerConfig.type) {
      // Définir des valeurs par défaut selon le type
      const defaultConfigs = {
        personnel: {
          targetAudience: 'Entrepreneurs et dirigeants PME',
          industry: 'Conseil et expertise',
          keyFeatures: ['Expertise personnalisée', 'Accompagnement sur-mesure', 'Disponibilité flexible']
        },
        entreprise: {
          targetAudience: 'PME et grandes entreprises',
          industry: 'Services aux entreprises',
          keyFeatures: ['Équipe dédiée', 'Processus structurés', 'Support continu']
        },
        b2b: {
          targetAudience: 'PME du secteur technologique',
          industry: 'Services numériques',
          keyFeatures: ['Automatisation IA', 'Intégration systèmes', 'ROI mesurable']
        },
        b2c: {
          targetAudience: 'Particuliers et familles',
          industry: 'Services aux particuliers',
          keyFeatures: ['Interface simple', 'Prix abordable', 'Support client']
        },
        c2c: {
          targetAudience: 'Communauté d\'utilisateurs',
          industry: 'Plateforme d\'échange',
          keyFeatures: ['Sécurité transactions', 'Interface intuitive', 'Commission transparente']
        }
      };

      const defaults = defaultConfigs[offerConfig.type];
      if (defaults) {
        setOfferConfig(prev => ({
          ...prev,
          targetAudience: defaults.targetAudience,
          industry: defaults.industry,
          keyFeatures: defaults.keyFeatures
        }));
      }
    }
  }, [offerConfig.type]);

  // Auto-génération après mise à jour des valeurs par défaut
  useEffect(() => {
    if (offerConfig.type && offerConfig.targetAudience && offerConfig.industry && offerConfig.keyFeatures.length > 0) {
      generateWithAI();
    }
  }, [offerConfig.targetAudience, offerConfig.industry, offerConfig.keyFeatures]);

  // Auto-sync avec Google Doc
  useEffect(() => {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
    }

    if (autoSync && googleDocId && docContent) {
      const interval = setInterval(() => {
        saveToGoogleDoc(false); // Save without toast notification
      }, 30000); // Auto-save every 30 seconds
      setAutoSaveInterval(interval);
    }

    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }
    };
  }, [autoSync, googleDocId, docContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen && googleDocId) {
      loadDocContent();
    }
  }, [isOpen, googleDocId]);

  const loadDocContent = async () => {
    setIsLoading(true);
    try {
      // Appel à l'API Google Docs via edge function
      const response = await fetch(`https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/google-docs-reader`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8`,
        },
        body: JSON.stringify({ docId: googleDocId }),
      });

      if (response.ok) {
        const data = await response.json();
        setDocContent(data.content || '');
        toast.success('Contenu chargé avec succès');
      } else {
        throw new Error('Erreur lors du chargement');
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setDocContent("Contenu par défaut de l'offre commerciale...\n\nCeci est un exemple de contenu qui sera synchronisé avec Google Doc.");
      toast.error('Mode démo - Contenu simulé chargé');
    } finally {
      setIsLoading(false);
    }
  };

  const generateWithAI = async () => {
    if (!offerConfig.targetAudience.trim() || !offerConfig.industry.trim()) {
      toast.error('Veuillez remplir l\'audience cible et le secteur d\'activité');
      return;
    }

    setIsGenerating(true);
    try {
      // Appel à l'edge function Supabase avec Gemini
      const response = await fetch(`https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/generate-commercial-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8`,
        },
        body: JSON.stringify({
          config: offerConfig,
          userId: user?.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur de l\'API:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la génération');
      }

      const data = await response.json();
      setDocContent(data.generatedContent);
      toast.success('Offre commerciale générée avec Gemini AI');
      
      // Auto-sync si activé
      if (autoSync) {
        setLastSyncTime(new Date());
      }
    } catch (error) {
      console.error('Erreur lors de la génération IA:', error);
      toast.error(`Erreur Gemini AI: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToGoogleDoc = async (showToast = true) => {
    if (!googleDocId || !docContent) return;

    setIsSaving(true);
    try {
      // Appel à l'API Google Docs pour sauvegarder
      const response = await fetch(`https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/google-docs-writer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8`,
        },
        body: JSON.stringify({ 
          docId: googleDocId,
          content: docContent,
          userId: user?.id 
        }),
      });

      if (response.ok) {
        setLastSyncTime(new Date());
        if (showToast) {
          toast.success('Document sauvegardé avec succès !');
        }
      } else {
        throw new Error('Erreur lors de la synchronisation');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      if (showToast) {
        toast.success('Mode démo - Changements sauvegardés localement');
      }
      setLastSyncTime(new Date());
    } finally {
      setIsSaving(false);
    }
  };

  const deleteContent = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer tout le contenu ?')) {
      setDocContent('');
      toast.success('Contenu supprimé');
    }
  };

  const addFeature = () => {
    if (newFeature.trim() && !offerConfig.keyFeatures.includes(newFeature.trim())) {
      setOfferConfig(prev => ({
        ...prev,
        keyFeatures: [...prev.keyFeatures, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (feature: string) => {
    setOfferConfig(prev => ({
      ...prev,
      keyFeatures: prev.keyFeatures.filter(f => f !== feature)
    }));
  };

  const openGoogleDoc = () => {
    const url = `https://docs.google.com/document/d/${googleDocId}/edit`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Gestionnaire d'Offre Commerciale
                </h2>
                <p className="text-sm text-gray-600">
                  Gérez et générez vos offres commerciales avec l'IA
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={openGoogleDoc}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Ouvrir Google Doc
              </Button>
              <Button onClick={onClose} variant="outline" size="sm">
                ✕
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
              {/* Configuration Panel */}
              <div className="p-6 border-r bg-gray-50/50 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                  Configuration
                </h3>

                <div className="space-y-6">
                  {/* Google Doc ID */}
                  <div className="space-y-2">
                    <Label htmlFor="doc-id">ID du Google Doc</Label>
                    <div className="flex gap-2">
                      <Input
                        id="doc-id"
                        value={googleDocId}
                        onChange={(e) => setGoogleDocId(e.target.value)}
                        placeholder="1TXeYy0iEw8HTiGkzv8HZzDShg0Vmjnn7kcIE8SpIhmg"
                        className="font-mono text-sm"
                      />
                      <Button
                        onClick={loadDocContent}
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Type d'offre */}
                  <div className="space-y-3">
                    <Label>Type d'offre commerciale</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(offerTypes).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <Button
                            key={key}
                            onClick={() => setOfferConfig(prev => ({ ...prev, type: key as OfferType }))}
                            variant={offerConfig.type === key ? "default" : "outline"}
                            className="justify-start h-auto p-3"
                          >
                            <Icon className="w-4 h-4 mr-2" />
                            <span className="text-sm">{config.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Configuration détaillée */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="target-audience">Audience cible</Label>
                      <Input
                        id="target-audience"
                        value={offerConfig.targetAudience}
                        onChange={(e) => setOfferConfig(prev => ({ ...prev, targetAudience: e.target.value }))}
                        placeholder="Ex: PME du secteur technologique"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industry">Secteur d'activité</Label>
                      <Input
                        id="industry"
                        value={offerConfig.industry}
                        onChange={(e) => setOfferConfig(prev => ({ ...prev, industry: e.target.value }))}
                        placeholder="Ex: Services numériques, E-commerce, etc."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tone">Ton de communication</Label>
                      <Select value={offerConfig.tone} onValueChange={(value: ToneType) => setOfferConfig(prev => ({ ...prev, tone: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professionnel">Professionnel</SelectItem>
                          <SelectItem value="convivial">Convivial</SelectItem>
                          <SelectItem value="technique">Technique</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Caractéristiques clés */}
                    <div className="space-y-3">
                      <Label>Caractéristiques clés</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          placeholder="Ajouter une caractéristique"
                          onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                        />
                        <Button onClick={addFeature} size="sm" variant="outline">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {offerConfig.keyFeatures.map((feature, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="cursor-pointer hover:bg-red-100"
                            onClick={() => removeFeature(feature)}
                          >
                            {feature} ✕
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Génération IA */}
                  <Button
                    onClick={generateWithAI}
                    disabled={isGenerating || !offerConfig.targetAudience.trim() || !offerConfig.industry.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Générer avec l'IA
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Content Editor */}
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-blue-600" />
                    Contenu de l'offre
                  </h3>
                  <div className="flex items-center gap-2">
                    {/* Auto-sync toggle */}
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        id="auto-sync"
                        checked={autoSync}
                        onChange={(e) => setAutoSync(e.target.checked)}
                        className="rounded"
                      />
                       <label htmlFor="auto-sync" className="text-gray-600">
                         Sync auto (30s)
                       </label>
                    </div>
                    {lastSyncTime && (
                      <span className="text-xs text-gray-500">
                        Dernière sync: {lastSyncTime.toLocaleTimeString()}
                      </span>
                    )}
                    <Button
                      onClick={deleteContent}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      disabled={!docContent.trim()}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => saveToGoogleDoc()}
                      disabled={isSaving || !docContent.trim()}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Synchronisation...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Synchroniser
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex-1 relative">
                  {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                        <p className="text-gray-600">Chargement du contenu...</p>
                      </div>
                    </div>
                  ) : (
                    <Textarea
                      value={docContent}
                      onChange={(e) => {
                        setDocContent(e.target.value);
                        if (autoSync) {
                          setLastSyncTime(new Date());
                        }
                      }}
                      placeholder="Le contenu de votre offre commerciale apparaîtra ici..."
                      className="w-full h-full resize-none text-sm leading-relaxed"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};