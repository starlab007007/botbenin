
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Zap, 
  Shield, 
  Globe, 
  Target, 
  TrendingUp, 
  Users, 
  Cog, 
  Brain, 
  Rocket,
  Download,
  Share2,
  Play,
  ArrowRight,
  CheckCircle,
  Star,
  Award,
  Building,
  MessageSquare,
  BarChart3,
  Workflow
} from 'lucide-react';

const PlatformPresentation: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('overview');

  const uniqueFeatures = [
    {
      icon: Brain,
      title: "4 Agents IA Spécialisés",
      description: "Business, Marketing, Gestion et Citoyen - chacun expert dans son domaine",
      color: "bg-gradient-to-r from-purple-500 to-pink-500"
    },
    {
      icon: Workflow,
      title: "n8n Intégré Natif",
      description: "Plus de 400 intégrations disponibles directement dans la plateforme",
      color: "bg-gradient-to-r from-blue-500 to-cyan-500"
    },
    {
      icon: Zap,
      title: "Automatisation Intelligente",
      description: "Workflows avancés avec IA pour automatiser vos processus métier",
      color: "bg-gradient-to-r from-orange-500 to-red-500"
    },
    {
      icon: Shield,
      title: "Sécurité Avancée",
      description: "Chiffrement bout-en-bout et conformité RGPD garantie",
      color: "bg-gradient-to-r from-green-500 to-emerald-500"
    }
  ];

  const platformAdvantages = [
    {
      category: "Performance",
      items: [
        "Temps de réponse < 2 secondes",
        "Disponibilité 99.9%",
        "Scalabilité automatique",
        "Infrastructure cloud premium"
      ]
    },
    {
      category: "Innovation",
      items: [
        "IA de dernière génération",
        "Mises à jour continues",
        "R&D permanente",
        "Technologies émergentes"
      ]
    },
    {
      category: "Support",
      items: [
        "Assistance 24/7",
        "Formation personnalisée",
        "Documentation complète",
        "Communauté active"
      ]
    },
    {
      category: "ROI",
      items: [
        "Retour sur investissement 400%",
        "Réduction des coûts 60%",
        "Gain de productivité 300%",
        "Automatisation 80% des tâches"
      ]
    }
  ];

  const successMetrics = [
    { label: "Clients Actifs", value: "2,500+", icon: Users },
    { label: "Workflows Créés", value: "50,000+", icon: Workflow },
    { label: "Messages Traités", value: "2M+", icon: MessageSquare },
    { label: "Satisfaction Client", value: "98%", icon: Star }
  ];

  const testimonials = [
    {
      name: "Marie Dubois",
      role: "Directrice Marketing",
      company: "TechCorp",
      text: "Bot.Bj a révolutionné notre approche marketing. Les agents IA nous font gagner 5h par jour !",
      rating: 5
    },
    {
      name: "Jean Martin",
      role: "CEO",
      company: "StartupPro",
      text: "L'intégration n8n native est un game-changer. Nous avons automatisé 80% de nos processus.",
      rating: 5
    },
    {
      name: "Sophie Laurent",
      role: "Responsable IT",
      company: "GroupeInno",
      text: "La sécurité et la performance sont au rendez-vous. Parfait pour nos besoins enterprise.",
      rating: 5
    }
  ];

  const renderFlyer = () => (
    <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm mr-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Bot.Bj</h2>
            <p className="text-blue-100">L'IA au service de votre business</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <span className="text-sm">4 Agents IA Spécialisés</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <span className="text-sm">+400 Intégrations</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <span className="text-sm">Support 24/7</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <span className="text-sm">ROI de 400%</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <span className="text-sm">Sécurité RGPD</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-300" />
              <span className="text-sm">Interface No-Code</span>
            </div>
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-6">
          <h3 className="font-bold mb-2">Transformez votre business aujourd'hui !</h3>
          <p className="text-sm text-blue-100 mb-3">
            Rejoignez plus de 2,500 entreprises qui font confiance à Bot.Bj
          </p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">Essai gratuit 14 jours</span>
            <ArrowRight className="w-6 h-6" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-100">www.bot.bj</p>
            <p className="text-xs text-blue-100">contact@bot.bj</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-6">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Présentation de la Plateforme Bot.Bj
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            La solution d'IA conversationnelle la plus avancée pour transformer votre business
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-xl p-2 shadow-lg">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: Target },
              { id: 'features', label: 'Fonctionnalités', icon: Cog },
              { id: 'advantages', label: 'Avantages', icon: TrendingUp },
              { id: 'testimonials', label: 'Témoignages', icon: Users },
              { id: 'flyer', label: 'Flyer Publicitaire', icon: Award }
            ].map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                variant={activeSection === tab.id ? "default" : "ghost"}
                className={`mx-1 ${activeSection === tab.id ? 'bg-blue-600 text-white' : 'text-gray-700'}`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Content Sections */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
              <CardContent className="p-12 text-center">
                <h2 className="text-3xl font-bold mb-6">
                  Bot.Bj : L'IA qui Révolutionne votre Business
                </h2>
                <p className="text-xl text-blue-100 mb-8 max-w-4xl mx-auto">
                  Une plateforme unique combinant 4 agents IA spécialisés, l'automatisation n8n native, 
                  et plus de 400 intégrations pour transformer radicalement vos processus métier.
                </p>
                <div className="flex justify-center space-x-4">
                  <Button className="bg-white text-blue-600 hover:bg-gray-100">
                    <Play className="w-4 h-4 mr-2" />
                    Voir la démo
                  </Button>
                  <Button variant="outline" className="border-white text-white hover:bg-white/10">
                    <Rocket className="w-4 h-4 mr-2" />
                    Essai gratuit
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {successMetrics.map((metric, index) => (
                <Card key={index} className="text-center bg-white border border-gray-200">
                  <CardContent className="p-6">
                    <metric.icon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <div className="text-3xl font-bold text-gray-900 mb-2">{metric.value}</div>
                    <div className="text-gray-600">{metric.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Value Proposition */}
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-2xl text-gray-900 text-center">
                  Pourquoi Bot.Bj est Unique ?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {uniqueFeatures.map((feature, index) => (
                    <div key={index} className="text-center">
                      <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                        <feature.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600 text-sm">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'features' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900 flex items-center">
                  <Brain className="w-6 h-6 mr-2 text-purple-600" />
                  Agents IA Spécialisés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-gray-900">Agent Business</h4>
                  <p className="text-gray-600 text-sm">Analyse de données, KPI, reporting automatisé</p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-gray-900">Agent Marketing</h4>
                  <p className="text-gray-600 text-sm">Campagnes automatisées, lead generation, analytics</p>
                </div>
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold text-gray-900">Agent Gestion</h4>
                  <p className="text-gray-600 text-sm">RH, finance, administration, workflows</p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold text-gray-900">Agent Citoyen</h4>
                  <p className="text-gray-600 text-sm">Services publics, administration citoyenne</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900 flex items-center">
                  <Workflow className="w-6 h-6 mr-2 text-blue-600" />
                  Automatisation n8n Native
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">400+</div>
                    <div className="text-sm text-gray-600">Intégrations</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">No-Code</div>
                    <div className="text-sm text-gray-600">Interface</div>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />CRM et ERP connectés</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />APIs personnalisées</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Webhooks avancés</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" />Workflows complexes</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900 flex items-center">
                  <Shield className="w-6 h-6 mr-2 text-green-600" />
                  Sécurité Enterprise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">Chiffrement AES-256</span>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">Conformité RGPD</span>
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">ISO 27001</span>
                    <CheckCircle className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">SOC 2 Type II</span>
                    <CheckCircle className="w-5 h-5 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900 flex items-center">
                  <BarChart3 className="w-6 h-6 mr-2 text-orange-600" />
                  Analytics Avancés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Performance IA</span>
                    <div className="w-24 h-2 bg-gray-200 rounded-full">
                      <div className="w-20 h-2 bg-blue-500 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Satisfaction utilisateur</span>
                    <div className="w-24 h-2 bg-gray-200 rounded-full">
                      <div className="w-23 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Automatisation</span>
                    <div className="w-24 h-2 bg-gray-200 rounded-full">
                      <div className="w-19 h-2 bg-purple-500 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">ROI</span>
                    <div className="w-24 h-2 bg-gray-200 rounded-full">
                      <div className="w-24 h-2 bg-orange-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'advantages' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {platformAdvantages.map((advantage, index) => (
              <Card key={index} className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-900">{advantage.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {advantage.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-900">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeSection === 'testimonials' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Ce que disent nos clients
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-600 mb-4 italic">"{testimonial.text}"</p>
                    <div className="border-t pt-4">
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.role}</div>
                      <div className="text-sm text-blue-600">{testimonial.company}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Case Study */}
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border border-gray-200">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <Building className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Étude de Cas : TechCorp</h3>
                  <p className="text-gray-600">Comment Bot.Bj a transformé leur business en 3 mois</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">+300%</div>
                    <div className="text-gray-600">Productivité équipe marketing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">-60%</div>
                    <div className="text-gray-600">Coûts opérationnels</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">98%</div>
                    <div className="text-gray-600">Satisfaction client</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'flyer' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Flyers Publicitaires Bot.Bj
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Flyer Principal */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Flyer Principal</h3>
                {renderFlyer()}
              </div>

              {/* Flyer Compact */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Flyer Compact</h3>
                <div className="bg-white border-2 border-blue-600 rounded-xl p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Bot.Bj</h2>
                    <p className="text-gray-600">Automatisez votre business avec l'IA</p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-900">4 Agents IA spécialisés</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-900">400+ intégrations natives</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-900">ROI garanti 400%</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-lg font-bold text-blue-600 mb-1">Essai gratuit 14 jours</div>
                    <div className="text-sm text-gray-600">www.bot.bj</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-center space-x-4">
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2" />
                Télécharger PDF
              </Button>
              <Button variant="outline" className="text-gray-700 border-gray-300">
                <Share2 className="w-4 h-4 mr-2" />
                Partager sur réseaux
              </Button>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 mt-12">
          <CardContent className="p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Prêt à Transformer votre Business ?</h2>
            <p className="text-xl text-blue-100 mb-6">
              Rejoignez les 2,500+ entreprises qui font déjà confiance à Bot.Bj
            </p>
            <div className="flex justify-center space-x-4">
              <Button className="bg-white text-blue-600 hover:bg-gray-100">
                <Rocket className="w-4 h-4 mr-2" />
                Commencer maintenant
              </Button>
              <Button variant="outline" className="border-white text-white hover:bg-white/10">
                <Users className="w-4 h-4 mr-2" />
                Contacter un expert
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlatformPresentation;
