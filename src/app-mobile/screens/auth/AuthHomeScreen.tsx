import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, ShoppingBag, Search, Handshake } from "lucide-react";

export default function AuthHomeScreen() {
  const navigate = useNavigate();

  const pillars = [
    { icon: ShoppingBag, title: "Vendre", subtitle: "Publiez un article en 30s", bg: "bg-[#10b981]", delay: "0ms" },
    { icon: Search, title: "Acheter", subtitle: "Trouvez près de vous", bg: "bg-[#3b82f6]", delay: "120ms" },
    { icon: Handshake, title: "Négocier", subtitle: "Proposez votre prix", bg: "bg-[#f59e0b]", delay: "240ms" },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-[hsl(165_91%_18%)] to-[hsl(165_91%_25%)] flex items-center justify-center px-5 py-8 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute bottom-10 -right-24 w-80 h-80 rounded-full bg-emerald-300/5 blur-3xl" />

      <div className="w-full max-w-[400px] flex flex-col items-center gap-7 relative z-10">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/15 shadow-lg shadow-black/20">
            <MessageCircle className="w-9 h-9 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-3xl text-white font-bold tracking-tight font-serif">WaouhApp</h1>
        </div>

        <div className="text-center space-y-1 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <h2 className="text-[26px] leading-tight text-white font-serif">
            Envoie un message.
            <br />
            <span className="italic text-emerald-300">Le monde achète.</span>
          </h2>
          
        </div>

        <div className="w-full flex flex-col gap-2.5">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="flex items-center gap-4 bg-white/10 p-3.5 rounded-2xl border border-white/10 backdrop-blur-sm animate-fade-in hover:bg-white/15 transition-colors"
                style={{ animationDelay: p.delay }}
              >
                <div className={`w-11 h-11 ${p.bg} rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-black/20`}>
                  <Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
                </div>
                <div className="text-left">
                  <h3 className="text-white font-semibold font-serif leading-tight">{p.title}</h3>
                  <p className="text-white/65 text-xs">{p.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="w-full flex flex-col gap-3 mt-1">
          <Button
            size="lg"
            className="w-full bg-[#25D366] hover:bg-[#1da851] text-white h-14 text-base font-semibold rounded-2xl shadow-lg shadow-black/20"
            onClick={() => navigate("/app/auth/whatsapp")}
          >
            <MessageCircle className="mr-2 h-5 w-5" /> Continuer avec WhatsApp
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="w-full h-14 text-base font-semibold bg-white text-[hsl(165_91%_18%)] hover:bg-white/90 rounded-2xl shadow-md"
            onClick={() => navigate("/app/auth/email")}
          >
            <Mail className="mr-2 h-5 w-5" /> Continuer avec Email
          </Button>
          <p className="text-xs text-white/60 mt-2 text-center">
            En continuant, vous acceptez nos conditions d'utilisation.
          </p>
        </div>
      </div>
    </div>
  );
}
