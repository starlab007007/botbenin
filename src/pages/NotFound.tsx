
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Vérifier si l'URL contient des paramètres d'authentification Google
    const hasAuthParams = location.search.includes('access_token') || 
                         location.search.includes('code=') ||
                         location.hash.includes('access_token');

    if (hasAuthParams) {
      console.log('Paramètres d\'authentification détectés sur route 404, redirection vers account...');
      // Rediriger vers /account pour que GoogleAuthHandler puisse traiter la connexion
      navigate('/account', { replace: true });
      return;
    }

    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname, location.search, location.hash, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
