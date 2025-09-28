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
import { supabase } from '@/integrations/supabase/client';
import { useGoogleDocsWriter } from '@/hooks/useGoogleDocsWriter';
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
  googleDocId?: string;
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

export const GoogleDocManager = ({ isOpen, onClose, googleDocId: propGoogleDocId }: GoogleDocManagerProps) => {
  const { user } = useAuth();
  const { writeToGoogleDoc, isWriting: isDocWriting } = useGoogleDocsWriter(user?.id);
  const [googleDocId, setGoogleDocId] = useState(propGoogleDocId || '1TXeYy0iEw8HTiGkzv8HZzDShg0Vmjnn7kcIE8SpIhmg');
  const [docContent, setDocContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [isLoadingAccountInfo, setIsLoadingAccountInfo] = useState(false);
  
  // Configuration de l'offre
  const [offerConfig, setOfferConfig] = useState<OfferConfig>({
    type: 'b2b',
    targetAudience: '',
    industry: '',
    tone: 'professionnel',
    keyFeatures: []
  });
  
  const [newFeature, setNewFeature] = useState('');

  // Function to check Google service account info
  const checkAccountInfo = async () => {
    setIsLoadingAccountInfo(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-account-info');
      if (error) {
        console.error('Erreur lors de la récupération des informations du compte:', error);
        toast.error(`Impossible de récupérer les informations du compte: ${error.message}`);
      } else {
        setAccountInfo(data);
        if (data.success) {
          toast.success("✅ Informations du Service Account récupérées - Consultez les instructions pour partager le document", { duration: 6000 });
        } else {
          toast.error(data.error || "Erreur lors de la récupération des informations");
        }
      }
    } catch (err) {
      console.error('Erreur:', err);
      toast.error("Erreur lors de la vérification du compte de service");
    } finally {
      setIsLoadingAccountInfo(false);
    }
  };

  // Effet pour utiliser l'ID de document passé en prop
  useEffect(() => {
    if (propGoogleDocId && propGoogleDocId !== googleDocId) {
      setGoogleDocId(propGoogleDocId);
      // Charger automatiquement le contenu du nouveau document
      if (isOpen) {
        loadDocContent();
      }
    }
  }, [propGoogleDocId, isOpen]);

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

  useEffect(() => {
    if (isOpen && googleDocId) {
      loadDocContent();
    }
  }, [isOpen, googleDocId]);

  const loadDocContent = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-docs-reader', {
        body: { docId: googleDocId }
      });

      if (error) throw error;

      if (data?.content) {
        setDocContent(data.content);
        toast.success('Contenu chargé depuis Google Docs');
      } else {
        throw new Error('Contenu non reçu');
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      const fallbackContent = "OFFRE COMMERCIALE\n\nMÉMO POUR L'ÉQUIPE COMMERCIALE\n\nPROPOSITION DE VALEUR\nUne équipe d'agents IA qui propulse votre entreprise en automatisant les tâches répétitives pour libérer du temps stratégique.\n\nCIBLES IDÉALES\nEntreprises qui :\n• Perdent du temps sur des processus manuels répétitifs\n• Ont des équipes surchargées par l'opérationnel\n• Cherchent à améliorer leur productivité\n• Ont des difficultés de recrutement\n• Veulent rester compétitives mais manquent de temps pour se former à l'IA\n\nMÉTHODE EN 3 ÉTAPES\n1. Audit gratuit : Analyse des processus et identification des opportunités\n2. Développement : Création de workflows intelligents intégrés aux outils existants\n3. Déploiement : Mise en place rapide avec documentation et suivi continu\n\nTARIFS\n• Audit : Gratuit (30 minutes)\n• Premier test : À partir de 50 000 cfa\n• Solution complète : Sur devis\n• Coûts typiques : 200 000 -300 000 cfa initial + 40 000-100 000 cfa/semaine";
      
      setDocContent(fallbackContent);
      toast.error('Mode simulation - Contenu chargé localement');
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
      const { data, error } = await supabase.functions.invoke('generate-commercial-offer', {
        body: {
          config: offerConfig,
          userId: user?.id
        }
      });

      if (error) throw error;

      if (data?.generatedContent) {
        setDocContent(data.generatedContent);
        toast.success('Offre commerciale générée avec Gemini AI');
      } else {
        throw new Error('Contenu généré non reçu');
      }
    } catch (error) {
      console.error('Erreur lors de la génération IA:', error);
      toast.error(`Erreur Gemini AI: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToGoogleDoc = async (showToast = true) => {
    if (!googleDocId || !docContent) {
      if (showToast) {
        if (!googleDocId) {
          toast.error('Veuillez saisir l\'ID du Google Document');
        } else {
          toast.error('Le contenu ne peut pas être vide');
        }
      }
      return;
    }

    // Utiliser le nouveau hook pour la sauvegarde
    const success = await writeToGoogleDoc(googleDocId, docContent);
    if (success) {
      setLastSyncTime(new Date());
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
    window.open(`https://docs.google.com/document/d/${googleDocId}/edit`, '_blank');
  };

  // Notification pour confirmer la connexion au bon document
  useEffect(() => {
    if (isOpen && googleDocId && googleDocId === '1TXeYy0iEw8HTiGkzv8HZzDShg0Vmjnn7kcIE8SpIhmg') {
      toast.success('🔗 Connecté au Google Document de préparation d\'appel IA', { duration: 3000 });
    }
  }, [isOpen, googleDocId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-0">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <div>
              <h2 className="text-base sm:text-xl font-semibold text-gray-800 dark:text-gray-200">
                Gestionnaire d'Offre Commerciale
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Enregistrement manuel uniquement
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={openGoogleDoc}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-none"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Ouvrir Google Doc</span>
            </Button>
            <Button onClick={onClose} variant="outline" size="sm" className="px-3">
              ✕
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
            {/* Configuration Panel */}
            <div className="p-3 sm:p-4 lg:border-r bg-gray-50/50 dark:bg-gray-800/30 overflow-y-auto max-h-[60vh] lg:max-h-full">
              <div className="sticky top-0 bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-sm pb-2 mb-4">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  Configuration
                </h3>
              </div>

              <div className="space-y-4">
                {/* Google Doc ID */}
                <div className="space-y-2">
                  <Label htmlFor="doc-id" className="text-xs sm:text-sm flex items-center gap-2">
                    ID du Google Doc
                    {googleDocId === '1TXeYy0iEw8HTiGkzv8HZzDShg0Vmjnn7kcIE8SpIhmg' && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        Préparation d'Appel IA
                      </Badge>
                    )}
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="doc-id"
                      value={googleDocId}
                      onChange={(e) => setGoogleDocId(e.target.value)}
                      placeholder="1TXeYy0iEw8HTiGkzv8HZzDShg0Vmjnn7kcIE8SpIhmg"
                      className="font-mono text-xs sm:text-sm flex-1"
                      disabled={true}
                    />
                    <Button
                      onClick={loadDocContent}
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      className="w-full sm:w-auto"
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />}
                      <span className="ml-2">Charger</span>
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    📝 Enregistrement manuel dans le Google Document
                  </p>
                </div>

                {/* Instructions de partage Google Docs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs sm:text-sm font-medium">Configuration Google Docs</Label>
                    <Button
                      onClick={checkAccountInfo}
                      variant="outline"
                      size="sm"
                      disabled={isLoadingAccountInfo}
                      className="text-xs"
                    >
                      {isLoadingAccountInfo ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Settings className="w-3 h-3 mr-1" />
                      )}
                      Vérifier les permissions
                    </Button>
                  </div>
                  
                  {accountInfo && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      {accountInfo.success ? (
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-sm text-blue-800 mb-1">📧 Email du Service Account</h4>
                            <code className="text-xs bg-white px-2 py-1 rounded border break-all">
                              {accountInfo.service_account_email}
                            </code>
                          </div>
                          
                          <div className="text-xs text-blue-700">
                            <h4 className="font-medium mb-1">🔧 Instructions de configuration:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-xs">
                              <li>Copiez l'email ci-dessus</li>
                              <li>
                                <button 
                                  onClick={() => window.open(`https://docs.google.com/document/d/${googleDocId}/edit`, '_blank')}
                                  className="text-blue-600 underline"
                                >
                                  Ouvrez le Google Document
                                </button>
                              </li>
                              <li>Cliquez sur "Partager" (en haut à droite)</li>
                              <li>Collez l'email et donnez les permissions "Éditeur"</li>
                              <li>Cliquez sur "Envoyer"</li>
                            </ol>
                          </div>
                        </div>
                      ) : (
                        <div className="text-red-700 text-xs">
                          <p className="font-medium">❌ Erreur de configuration</p>
                          <p>{accountInfo.error}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Configuration de l'offre */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">Type d'offre</Label>
                    <Select 
                      value={offerConfig.type} 
                      onValueChange={(value: OfferType) => setOfferConfig(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(offerTypes).map(([key, config]) => {
                          const IconComponent = config.icon;
                          return (
                            <SelectItem key={key} value={key} className="text-xs sm:text-sm">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${config.color}`} />
                                <IconComponent className="w-3 h-3 sm:w-4 sm:h-4" />
                                {config.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">Audience cible</Label>
                    <Input
                      value={offerConfig.targetAudience}
                      onChange={(e) => setOfferConfig(prev => ({ ...prev, targetAudience: e.target.value }))}
                      placeholder="Ex: PME du secteur technologique"
                      className="text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">Secteur d'activité</Label>
                    <Input
                      value={offerConfig.industry}
                      onChange={(e) => setOfferConfig(prev => ({ ...prev, industry: e.target.value }))}
                      placeholder="Ex: Services numériques, Conseil, E-commerce"
                      className="text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">Ton de l'offre</Label>
                    <Select 
                      value={offerConfig.tone} 
                      onValueChange={(value: ToneType) => setOfferConfig(prev => ({ ...prev, tone: value }))}
                    >
                      <SelectTrigger className="text-xs sm:text-sm">
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

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">Caractéristiques clés</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        placeholder="Ajouter une caractéristique"
                        onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                        className="text-xs sm:text-sm flex-1"
                      />
                      <Button onClick={addFeature} size="sm" variant="outline">
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {offerConfig.keyFeatures.map((feature, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer hover:bg-red-100 text-xs"
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
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-xs sm:text-sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Générer avec l'IA
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Content Editor */}
            <div className="p-3 sm:p-4 overflow-y-auto max-h-[60vh] lg:max-h-full bg-white dark:bg-gray-900">
              <div className="sticky top-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm pb-2 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    Contenu de l'offre
                  </h3>
                  <div className="flex items-center gap-2">
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
                      disabled={isDocWriting || !docContent.trim() || !googleDocId}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white font-medium"
                    >
                      {isDocWriting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Enregistrer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Content Textarea */}
                {isLoading ? (
                  <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg p-8">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Chargement du contenu...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      value={docContent}
                      onChange={(e) => setDocContent(e.target.value)}
                      placeholder="Le contenu de votre offre commerciale apparaîtra ici..."
                      className="min-h-[400px] text-sm leading-relaxed border-2 focus:border-blue-500 resize-y"
                    />
                    
                    {/* Status Bar */}
                    <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <span>{docContent.length} caractères</span>
                      {lastSyncTime && (
                        <span className="text-green-600">
                          Sauvé le {lastSyncTime.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};