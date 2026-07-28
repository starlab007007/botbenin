import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import PublicAgentWebChatPage from "./PublicAgentWebChatPage";

const PUBLIC_AGENT_SLUG = /^[a-z0-9_-]{6,24}$/i;

const NotFound = () => {
  const location = useLocation();
  const path = decodeURIComponent(location.pathname)
    .replace(/^\/+|\/+$/g, "");

  // Les liens publics des agents sont volontairement très courts :
  // https://bot.bj/<ID>. Toutes les routes applicatives connues sont déjà
  // résolues avant la route 404, donc seul un segment inconnu compatible
  // avec le format sécurisé est traité comme un Web Chat public.
  if (!path.includes("/") && PUBLIC_AGENT_SLUG.test(path)) {
    return <PublicAgentWebChatPage slug={path} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-2xl mx-auto space-y-8">
        <div className="text-8xl mb-6 animate-bounce">🔍</div>

        <h1 className="text-7xl md:text-9xl font-bold text-primary mb-6">
          404
        </h1>

        <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-6">
          Page Introuvable
        </h2>

        <p className="text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed">
          Oups ! La page que vous recherchez semble avoir disparu dans les méandres du web.
        </p>

        <Link to="/">
          <Button
            size="lg"
            className="px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Home className="w-5 h-5 mr-2" />
            Retour à l'Accueil
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
