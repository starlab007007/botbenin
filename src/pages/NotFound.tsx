
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, AlertTriangle } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md mx-auto">
        {/* Icône d'erreur */}
        <div className="mb-8">
          <AlertTriangle className="w-24 h-24 mx-auto text-red-500 mb-4" />
          <h1 className="text-6xl font-bold text-gray-800 mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Introuvable</h2>
        </div>
        
        {/* Message d'erreur */}
        <div className="mb-8">
          <p className="text-gray-600 text-lg mb-4">
            Oups ! La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
          <p className="text-gray-500">
            Vérifiez l'URL ou retournez à la page d'accueil.
          </p>
        </div>
        
        {/* Bouton retour à l'accueil */}
        <Link to="/home">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg flex items-center gap-2 mx-auto">
            <Home className="w-5 h-5" />
            Retour à l'accueil
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
