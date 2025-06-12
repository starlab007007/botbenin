
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    console.log("Current URL:", window.location.href);
    console.log("Available routes:", [
      "/",
      "/chat",
      "/chat-test", 
      "/automatisations",
      "/bots",
      "/dashboard",
      "/prospects",
      "/modules/business",
      "/modules/marketing", 
      "/modules/gestion",
      "/modules/citoyen",
      "/account",
      "/support",
      "/users"
    ]);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page introuvable</h2>
          <p className="text-gray-600 mb-6">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">
              <strong>URL demandée :</strong> {location.pathname}
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <Link to="/">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Home className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Page précédente
          </Button>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          <p>Pages disponibles :</p>
          <div className="mt-2 space-y-1">
            <Link to="/" className="block text-blue-600 hover:text-blue-800">Accueil</Link>
            <Link to="/chat" className="block text-blue-600 hover:text-blue-800">Chat</Link>
            <Link to="/dashboard" className="block text-blue-600 hover:text-blue-800">Tableau de bord</Link>
            <Link to="/automatisations" className="block text-blue-600 hover:text-blue-800">Automatisations</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
