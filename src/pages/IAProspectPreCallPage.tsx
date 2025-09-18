import React, { useState } from 'react';
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

  const handleStartPreparation = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      navigate('/prospect-preparation');
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 lg:mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-full p-3 shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            IA Prospect Rapport Pre-Call
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Automatisez la préparation de vos rendez-vous B2B avec une analyse complète et stratégique de vos prospects
          </p>
        </div>

        {/* Main Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Left Column - Features */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <Search className="w-6 h-6 text-blue-600" />
                  Enrichissement de Données
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800">Recherche Multi-Sources</h4>
                    <p className="text-gray-600 text-sm">Collecte automatique d'informations depuis LinkedIn, sites web, réseaux sociaux</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800">Données Professionnelles</h4>
                    <p className="text-gray-600 text-sm">Poste, entreprise, historique professionnel, formations</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800">Contexte Business</h4>
                    <p className="text-gray-600 text-sm">Actualités de l'entreprise, levées de fonds, projets récents</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                  Analyse Stratégique
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Linkedin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800">Analyse LinkedIn</h4>
                    <p className="text-gray-600 text-sm">Profil complet, réseau, activité, centres d'intérêt</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800">Site Web Entreprise</h4>
                    <p className="text-gray-600 text-sm">Services, valeurs, actualités, équipe dirigeante</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800">Opportunités Détectées</h4>
                    <p className="text-gray-600 text-sm">Points d'accroche, besoins identifiés, timing optimal</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Benefits */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <FileText className="w-6 h-6 text-green-600" />
                  Rapport Structuré
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800">Document Prêt à l'Emploi</h4>
                    <p className="text-gray-600 text-sm">Rapport PDF structuré avec toutes les informations clés</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800">Points de Discussion</h4>
                    <p className="text-gray-600 text-sm">Sujets à aborder, questions pertinentes, références communes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-800">Stratégie d'Approche</h4>
                    <p className="text-gray-600 text-sm">Recommandations personnalisées, ton à adopter</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <FolderOpen className="w-6 h-6 text-indigo-600" />
                  Organisation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                    <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-700">5 min</div>
                    <div className="text-sm text-blue-600">Temps de préparation</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                    <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-700">+40%</div>
                    <div className="text-sm text-green-600">Taux de conversion</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FolderOpen className="w-4 h-4" />
                  Archivage automatique et historique des rapports
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Prêt à révolutionner vos rendez-vous B2B ?
              </h2>
              <p className="text-blue-100 mb-6 text-lg">
                Gagnez un temps considérable et augmentez vos chances de succès avec notre IA spécialisée
              </p>
              <Button 
                size="lg" 
                onClick={handleStartPreparation}
                className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Zap className="w-5 h-5 mr-2" />
                Préparation d'Appel de Vente Automatisée
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <div className="flex items-center justify-center gap-4 mt-6 text-sm text-blue-100">
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
        <div className="mt-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-12">
            Comment ça fonctionne ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-full w-16 h-16 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Informations de Base</h3>
              <p className="text-gray-600">Saisissez le nom, l'entreprise ou le profil LinkedIn du prospect</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-full w-16 h-16 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Analyse IA</h3>
              <p className="text-gray-600">Notre IA collecte et analyse toutes les données disponibles</p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-full w-16 h-16 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Rapport Final</h3>
              <p className="text-gray-600">Recevez votre rapport complet et personnalisé en PDF</p>
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