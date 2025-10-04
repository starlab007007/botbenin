import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FileText, 
  Search, 
  BarChart3, 
  FolderOpen, 
  Zap,
  CheckCircle,
  Clock,
  Target,
  Linkedin,
  Globe,
  Users,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

export const IAProspectPreCallPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Redirection automatique si l'utilisateur est connecté
  useEffect(() => {
    if (user) {
      navigate('/prospect-preparation');
    }
  }, [user, navigate]);

  const handleStartPreparation = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      navigate('/prospect-preparation');
    }
  };

  // Ne pas afficher la page si l'utilisateur est connecté (en cours de redirection)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 lg:mb-12 px-2">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-full p-2 sm:p-3 shadow-lg">
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 sm:mb-4 px-2">
            IA Prospect Rapport Pre-Call
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-2">
            Automatisez la préparation de vos rendez-vous B2B avec une analyse complète et stratégique de vos prospects
          </p>
        </div>

        {/* Main Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
          {/* Left Column - Features */}
          <div className="space-y-4 sm:space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                  <Search className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                  <span>Enrichissement de Données</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
                <div className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Recherche Multi-Sources</h4>
                    <p className="text-gray-600 text-xs sm:text-sm">Collecte automatique d'informations depuis LinkedIn, sites web, réseaux sociaux</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Données Professionnelles</h4>
                    <p className="text-gray-600 text-xs sm:text-sm">Poste, entreprise, historique professionnel, formations</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Contexte Business</h4>
                    <p className="text-gray-600 text-xs sm:text-sm">Actualités de l'entreprise, levées de fonds, projets récents</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
                  <span>Analyse Stratégique</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Linkedin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Analyse LinkedIn</h4>
                    <p className="text-gray-600 text-xs sm:text-sm">Profil complet, réseau, activité, centres d'intérêt</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Site Web Entreprise</h4>
                    <p className="text-gray-600 text-xs sm:text-sm">Services, valeurs, actualités, équipe dirigeante</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Opportunités Détectées</h4>
                    <p className="text-gray-600 text-xs sm:text-sm">Points d'accroche, besoins identifiés, timing optimal</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Benefits */}
          <div className="space-y-4 sm:space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                  <span>Rapport Structuré</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Document Prêt à l'Emploi</h4>
                    <p className="text-gray-600 text-xs sm:text-sm">Rapport PDF structuré avec toutes les informations clés</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Points de Discussion</h4>
                    <p className="text-gray-600 text-xs sm:text-sm">Sujets à aborder, questions pertinentes, références communes</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">Stratégie d'Approche</h4>
                    <p className="text-gray-600 text-xs sm:text-sm">Recommandations personnalisées, ton à adopter</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                  <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" />
                  <span>Organisation</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                    <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mx-auto mb-1 sm:mb-2" />
                    <div className="text-xl sm:text-2xl font-bold text-blue-700">5 min</div>
                    <div className="text-xs sm:text-sm text-blue-600">Temps de préparation</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mx-auto mb-1 sm:mb-2" />
                    <div className="text-xl sm:text-2xl font-bold text-green-700">+40%</div>
                    <div className="text-xs sm:text-sm text-green-600">Taux de conversion</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <FolderOpen className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>Archivage automatique et historique des rapports</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center px-2">
          <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white max-w-2xl mx-auto">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 px-2">
                Prêt à révolutionner vos rendez-vous B2B ?
              </h2>
              <p className="text-blue-100 mb-4 sm:mb-6 text-sm sm:text-base md:text-lg px-2">
                Gagnez un temps considérable et augmentez vos chances de succès avec notre IA spécialisée
              </p>
              <Button 
                size="lg" 
                onClick={handleStartPreparation}
                className="bg-white text-blue-600 hover:bg-blue-50 text-sm sm:text-base md:text-lg px-4 sm:px-6 md:px-8 py-2 sm:py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
              >
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="hidden sm:inline">Préparation d'Appel de Vente Automatisée</span>
                <span className="sm:hidden">Démarrer</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-4 sm:mt-6 text-xs sm:text-sm text-blue-100">
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Gratuit
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  <Clock className="w-3 h-3 mr-1" />
                  Résultats en 2 min
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  <FileText className="w-3 h-3 mr-1" />
                  PDF inclus
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Process Steps */}
        <div className="mt-12 sm:mt-16 px-2">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-800 mb-8 sm:mb-12">
            Comment ça fonctionne ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center px-2">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-white text-xl sm:text-2xl font-bold mx-auto mb-3 sm:mb-4 shadow-lg">
                1
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-2">Informations de Base</h3>
              <p className="text-sm sm:text-base text-gray-600">Saisissez le nom, l'entreprise ou le profil LinkedIn du prospect</p>
            </div>
            <div className="text-center px-2">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-white text-xl sm:text-2xl font-bold mx-auto mb-3 sm:mb-4 shadow-lg">
                2
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-2">Analyse IA</h3>
              <p className="text-sm sm:text-base text-gray-600">Notre IA collecte et analyse toutes les données disponibles</p>
            </div>
            <div className="text-center px-2">
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center text-white text-xl sm:text-2xl font-bold mx-auto mb-3 sm:mb-4 shadow-lg">
                3
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-2">Rapport Final</h3>
              <p className="text-sm sm:text-base text-gray-600">Recevez votre rapport complet et personnalisé en PDF</p>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};