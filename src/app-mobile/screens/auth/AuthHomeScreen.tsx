import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail } from "lucide-react";

export default function AuthHomeScreen() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 bg-gradient-to-b from-[hsl(165_91%_18%)] to-[hsl(165_91%_25%)] text-white">
      <div className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center mb-6 text-5xl">
        💬
      </div>
      <h1 className="text-3xl font-bold mb-2">WaouhApp</h1>
      <p className="text-white/80 text-center mb-12">Connectez-vous pour discuter, créer vos bots et gérer votre boutique.</p>

      <div className="w-full max-w-sm space-y-3">
        <Button
          size="lg"
          className="w-full bg-[#25D366] hover:bg-[#1da851] text-white h-14 text-base font-semibold"
          onClick={() => navigate("/app/auth/whatsapp")}
        >
          <MessageCircle className="mr-2 h-5 w-5" /> Continuer avec WhatsApp
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="w-full h-14 text-base font-semibold bg-white text-[hsl(165_91%_18%)] hover:bg-white/90"
          onClick={() => navigate("/app/auth/email")}
        >
          <Mail className="mr-2 h-5 w-5" /> Continuer avec Email
        </Button>
      </div>
      <p className="text-xs text-white/60 mt-8 text-center">En continuant, vous acceptez nos conditions d'utilisation.</p>
    </div>
  );
}
