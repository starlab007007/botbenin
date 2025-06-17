
import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, RefreshCw, ExternalLink, Copy, CheckCircle, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const [copied, setCopied] = useState(false);
  const [isLinkIssue, setIsLinkIssue] = useState(false);

  useEffect(() => {
    // Logging détaillé pour le debugging
    console.error("🚨 404 Error - Détails complets:", {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
      fullURL: window.location.href,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      origin: window.location.origin,
      protocol: window.location.protocol,
      host: window.location.host,
    });

    // Détecter si c'est un problème de lien raccourci
    if (location.pathname.startsWith('/s/') || location.search.includes('bot=')) {
      setIsLinkIssue(true);
    }

    // Tentative de redirection automatique pour certains patterns
    const path = location.pathname.toLowerCase();
    if (path === '/index.html' || path === '/index') {
      console.log("🔄 Redirection automatique vers /");
      window.location.replace('/');
    }
  }, [location]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const availableRoutes = [
    { path: "/", name: "🏠 Accueil", description: "Page principale" },
    { path: "/chat", name: "💬 Chat", description: "Interface de discussion IA" },
    { path: "/chat-test", name: "🧪 Test Chat", description: "Test des fonctionnalités de chat" },
    { path: "/automatisations", name: "⚙️ Automatisations", description: "Gestion des automatisations" },
    { path: "/bots", name: "🤖 Gestion des Bots", description: "Administration des bots" },
    { path: "/dashboard", name: "📊 Tableau de bord", description: "Statistiques et métriques" },
    { path: "/prospects", name: "👥 Prospects", description: "Gestion des prospects" },
    { path: "/modules/business", name: "💼 Module Business", description: "Outils business" },
    { path: "/modules/marketing", name: "📢 Module Marketing", description: "Outils marketing" },
    { path: "/modules/gestion", name: "📋 Module Gestion", description: "Outils de gestion" },
    { path: "/modules/citoyen", name: "🏛️ Module Citoyen", description: "Services citoyens" },
    { path: "/account", name: "👤 Compte", description: "Gestion du compte utilisateur" },
    { path: "/support", name: "❓ Support", description: "Aide et documentation" },
    { path: "/users", name: "👥 Utilisateurs", description: "Gestion des utilisateurs" }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-100 px-4">
      <div className="text-center max-w-4xl mx-auto space-y-8">
        {/* Animation d'erreur avec message spécialisé pour les liens */}
        <div className="mb-8 animate-bounce">
          <div className="text-8xl mb-4">
            {isLinkIssue ? '🔗' : '🔍'}
          </div>
          <h1 className="text-6xl md:text-8xl font-bold text-indigo-600 mb-4 animate-pulse">404</h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-4">
            {isLinkIssue ? 'Lien Non Valide' : 'Page Introuvable'}
          </h2>
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            {isLinkIssue 
              ? "Ce lien ne semble plus fonctionner. Il peut pointer vers un assistant qui n'existe plus ou qui a été désactivé."
              : "Oups ! La page que vous recherchez semble avoir disparu dans les méandres du web."
            }
          </p>
        </div>
        
        {/* Message spécialisé pour les liens raccourcis */}
        {isLinkIssue && (
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-6 mb-8 text-left max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-amber-800 mb-3 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Problème de Lien Détecté
            </h3>
            <div className="space-y-2 text-sm text-amber-700">
              <p><strong>Causes possibles :</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>L'assistant IA associé à ce lien n'existe plus</li>
                <li>Le lien a été désactivé par son propriétaire</li>
                <li>Le lien a expiré ou n'est plus valide</li>
                <li>Problème temporaire de connectivité</li>
              </ul>
            </div>
          </div>
        )}
        
        {/* Informations de debugging */}
        <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-6 mb-8 text-left max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
            🐛 Informations de Debug
          </h3>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <p className="text-red-700"><strong>Chemin :</strong> {location.pathname}</p>
              <p className="text-red-700"><strong>Domaine :</strong> {window.location.host}</p>
              <p className="text-red-700"><strong>Protocole :</strong> {window.location.protocol}</p>
              <p className="text-red-700"><strong>Timestamp :</strong> {new Date().toLocaleString('fr-FR')}</p>
            </div>
            <div className="mt-3 p-3 bg-red-100 rounded border">
              <p className="text-red-800 break-all">
                <strong>URL complète :</strong> {window.location.href}
              </p>
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
                className="mt-2 text-red-700 border-red-300 hover:bg-red-100"
              >
                {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? 'Copié !' : 'Copier URL'}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Actions principales */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <Home className="w-5 h-5 mr-2" />
                Retour à l'Accueil
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              className="px-6 py-3 border-gray-300 hover:bg-gray-50"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Page Précédente
            </Button>
            
            <Button 
              variant="outline" 
              className="px-6 py-3 border-gray-300 hover:bg-gray-50"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>
        
        {/* Plan du site */}
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center justify-center">
            🗺️ Plan du Site
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableRoutes.map((route) => (
              <Link 
                key={route.path}
                to={route.path} 
                className="group block p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 hover:shadow-md"
              >
                <div className="font-medium text-indigo-600 group-hover:text-indigo-800 mb-1">
                  {route.name}
                </div>
                <div className="text-sm text-gray-500 group-hover:text-gray-700">
                  {route.description}
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>

        {/* Support avec message spécialisé */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 max-w-2xl mx-auto">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">🆘 Besoin d'aide ?</h4>
          <p className="text-gray-600 mb-4">
            {isLinkIssue 
              ? "Si ce lien vous a été fourni récemment, contactez la personne qui vous l'a envoyé. Sinon, notre équipe peut vous aider."
              : "Si le problème persiste, notre équipe technique est là pour vous aider."
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/support">
              <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                📞 Contacter le Support
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => window.open(`mailto:support@bot.bj?subject=${isLinkIssue ? 'Lien Raccourci Non Valide' : 'Erreur 404'}&body=${encodeURIComponent(`URL: ${window.location.href}\nTimestamp: ${new Date().toISOString()}\nType: ${isLinkIssue ? 'Link Issue' : 'Page Not Found'}`)}`)}
            >
              ✉️ Signaler le Problème
            </Button>
          </div>
        </div>

        {/* Footer avec infos techniques */}
        <div className="text-center text-sm text-gray-400 space-y-2">
          <p>Bot.BJ - Version 2.0 | Environnement: {window.location.protocol === 'https:' ? 'Production' : 'Développement'}</p>
          <p>
            {isLinkIssue 
              ? "Les liens raccourcis sont automatiquement vérifiés pour détecter les problèmes."
              : "Si vous voyez cette page en production, veuillez signaler le problème."
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
