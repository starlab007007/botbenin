
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, RefreshCw } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error Details:", {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
      fullURL: window.location.href,
      timestamp: new Date().toISOString()
    });
  }, [location]);

  const availableRoutes = [
    { path: "/", name: "Accueil" },
    { path: "/chat", name: "Chat" },
    { path: "/chat-test", name: "Test de Chat" },
    { path: "/automatisations", name: "Automatisations" },
    { path: "/bots", name: "Gestion des Bots" },
    { path: "/dashboard", name: "Tableau de bord" },
    { path: "/prospects", name: "Prospects" },
    { path: "/modules/business", name: "Module Business" },
    { path: "/modules/marketing", name: "Module Marketing" },
    { path: "/modules/gestion", name: "Module Gestion" },
    { path: "/modules/citoyen", name: "Module Citoyen" },
    { path: "/account", name: "Compte" },
    { path: "/support", name: "Support" },
    { path: "/users", name: "Gestion Utilisateurs" }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="text-center max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-8xl font-bold text-indigo-600 mb-4">404</h1>
          <h2 className="text-3xl font-semibold text-gray-800 mb-4">Page introuvable</h2>
          <p className="text-lg text-gray-600 mb-6">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">
              <strong>URL demandée :</strong> {location.pathname}
            </p>
            <p className="text-sm text-red-700">
              <strong>URL complète :</strong> {window.location.href}
            </p>
          </div>
        </div>
        
        <div className="space-y-4 mb-8">
          <Link to="/">
            <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3">
              <Home className="w-5 h-5 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="outline" 
              className="px-6 py-3"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Page précédente
            </Button>
            
            <Button 
              variant="outline" 
              className="px-6 py-3"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Pages disponibles :</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {availableRoutes.map((route) => (
              <Link 
                key={route.path}
                to={route.path} 
                className="block text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-2 rounded transition-colors"
              >
                {route.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>Si le problème persiste, contactez l'équipe technique.</p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
