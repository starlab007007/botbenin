import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Search, Bot, Store, Check, CheckCheck, Bike, Star, Wifi, BatteryFull, Signal } from "lucide-react";
import gourdeImg from "@/assets/gourde.jpg";

/**
 * Mockup animé promotionnel : 2 téléphones (Vendeur ↔ WAOUH)
 * Boucle ~11s — illustre une transaction marketplace au Bénin (gourde).
 */
const TOTAL_STEPS = 11;
const STEP_DURATION = 1100; // ms

type Side = "in" | "out";
interface Msg { side: Side; text: string; }

// Bulles à afficher pour chaque téléphone selon le step courant
const sellerMessages: { atStep: number; msg: Msg }[] = [
  { atStep: 4, msg: { side: "in", text: "Bonjour, gourde dispo ?" } },
  { atStep: 4, msg: { side: "out", text: "Oui, disponible ✅" } },
  { atStep: 5, msg: { side: "in", text: "Je propose 3 000 CFA" } },
  { atStep: 6, msg: { side: "out", text: "OK pour 3 200 CFA 🤝" } },
  { atStep: 7, msg: { side: "in", text: "Marché conclu 👍" } },
];

const waouhMessages: { atStep: number; msg: Msg }[] = [
  { atStep: 3, msg: { side: "out", text: "Bonjour, gourde dispo ?" } },
  { atStep: 4, msg: { side: "in", text: "Oui, disponible ✅" } },
  { atStep: 5, msg: { side: "out", text: "Je propose 3 000 CFA" } },
  { atStep: 6, msg: { side: "in", text: "OK pour 3 200 CFA 🤝" } },
  { atStep: 7, msg: { side: "out", text: "Marché conclu 👍" } },
];

function PhoneFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative rounded-[2rem] border-[6px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden w-[180px] h-[360px] sm:w-[230px] sm:h-[460px]">
        {/* Encoche */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 sm:w-20 h-4 sm:h-5 bg-slate-900 rounded-b-2xl z-30" />
        {/* Status bar */}
        <div className="absolute top-0 left-0 right-0 h-6 sm:h-7 flex items-center justify-between px-3 sm:px-4 text-[9px] sm:text-[10px] font-semibold text-white bg-slate-900 z-20">
          <span>09:41</span>
          <span className="opacity-90 tracking-wider">BOT.BJ</span>
          <span className="flex items-center gap-0.5">
            <Signal className="h-2.5 w-2.5" />
            <Wifi className="h-2.5 w-2.5" />
            <BatteryFull className="h-2.5 w-2.5" />
          </span>
        </div>
        {/* Inner screen */}
        <div className="absolute inset-0 top-6 sm:top-7 bg-[#ECE5DD] flex flex-col">
          {children}
        </div>
      </div>
      <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function ChatHeader({ name, icon }: { name: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 bg-[hsl(165_91%_18%)] text-white shrink-0">
      <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-white/20 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] sm:text-xs font-semibold leading-tight truncate">{name}</div>
        <div className="text-[8px] sm:text-[9px] text-white/70 leading-tight">en ligne</div>
      </div>
    </div>
  );
}

function Bubble({ side, children, delay = 0 }: { side: Side; children: React.ReactNode; delay?: number }) {
  const isOut = side === "out";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className={`flex ${isOut ? "justify-end" : "justify-start"} px-1.5`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-2 py-1 text-[9px] sm:text-[10px] leading-tight shadow-sm ${
          isOut ? "bg-[#DCF8C6] text-slate-900" : "bg-white text-slate-900"
        }`}
      >
        <div>{children}</div>
        <div className={`flex items-center gap-0.5 justify-end mt-0.5 text-[7px] sm:text-[8px] text-slate-500`}>
          09:41
          {isOut && <CheckCheck className="h-2 w-2 text-blue-500" />}
        </div>
      </div>
    </motion.div>
  );
}

function ProductCard({ price }: { price: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="mx-1.5 my-1 bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200"
    >
      <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
        <img src={gourdeImg} alt="Gourde 2L" className="w-full h-full object-cover" />
      </div>
      <div className="p-1.5">
        <div className="text-[9px] sm:text-[10px] font-semibold text-slate-900 truncate">Gourde 2L motivante</div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <span className="text-[9px] sm:text-[10px] font-bold text-[hsl(165_91%_25%)]">{price}</span>
          <span className="text-[8px] text-slate-500">Cotonou</span>
        </div>
      </div>
    </motion.div>
  );
}

export function WaouhDemoMockup() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s + 1) % TOTAL_STEPS);
    }, STEP_DURATION);
    return () => clearInterval(id);
  }, []);

  // Notification "Nouvel acheteur" sur le téléphone Vendeur
  const showSellerNotif = step === 3;
  // Toast livraison
  const showDelivery = step >= 8 && step < 10;

  const sellerBubbles = sellerMessages.filter((m) => step >= m.atStep);
  const waouhBubbles = waouhMessages.filter((m) => step >= m.atStep);

  return (
    <div className="w-full px-2 py-6">
      <div className="text-center mb-4">
        <div className="text-xs sm:text-sm font-semibold text-[hsl(165_91%_18%)]">Voyez WAOUH en action 👇</div>
        <div className="text-[10px] sm:text-xs text-muted-foreground">Marketplace locale · Cotonou, Bénin</div>
      </div>
      <div className="flex items-start justify-center gap-3 sm:gap-6">
        {/* Téléphone 1 : Vendeur */}
        <PhoneFrame label="Vendeur · Marché Local">
          <ChatHeader name="Marché Local" icon={<Store className="h-3.5 w-3.5" />} />
          <div className="flex-1 overflow-hidden relative py-1 space-y-1">
            {/* Annonce publiée */}
            {step >= 1 && (
              <>
                <div className="text-center text-[8px] text-slate-500 px-2">Annonce publiée</div>
                <ProductCard price="3 500 CFA" />
              </>
            )}

            <AnimatePresence>
              {showSellerNotif && (
                <motion.div
                  key="notif"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-1.5 bg-amber-100 border border-amber-300 rounded-md px-2 py-1 flex items-center gap-1.5"
                >
                  <Bell className="h-3 w-3 text-amber-600 animate-pulse" />
                  <span className="text-[9px] sm:text-[10px] font-semibold text-amber-900">Nouvel acheteur trouvé !</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              {sellerBubbles.map((b, i) => (
                <Bubble key={`s-${i}-${step}`} side={b.msg.side}>
                  {b.msg.text}
                </Bubble>
              ))}
            </div>

            <AnimatePresence>
              {showDelivery && (
                <motion.div
                  key="del-s"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-1.5 bg-[hsl(165_91%_92%)] border border-[hsl(165_91%_70%)] rounded-md px-2 py-1 flex items-center gap-1.5"
                >
                  <Bike className="h-3 w-3 text-[hsl(165_91%_25%)]" />
                  <span className="text-[9px] sm:text-[10px] font-semibold text-[hsl(165_91%_18%)]">Livraison Express Cotonou</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </PhoneFrame>

        {/* Téléphone 2 : WAOUH */}
        <PhoneFrame label="Acheteur · WAOUH IA">
          <ChatHeader name="WAOUH IA" icon={<Bot className="h-3.5 w-3.5" />} />
          <div className="flex-1 overflow-hidden relative py-1 space-y-1">
            {/* Recherche */}
            {step >= 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-1.5 bg-white rounded-md px-2 py-1 flex items-center gap-1.5 border border-slate-200"
              >
                <Search className="h-3 w-3 text-slate-500" />
                <span className="text-[9px] sm:text-[10px] text-slate-700">
                  {step === 1 ? "je cherche gourde..." : "je cherche gourde Cotonou"}
                </span>
              </motion.div>
            )}

            {/* Résultat trouvé */}
            {step >= 2 && (
              <>
                <div className="text-center text-[8px] text-slate-500 px-2">1 résultat trouvé</div>
                <ProductCard price="3 500 CFA" />
                {step >= 2 && (
                  <div className="px-2 flex items-center gap-1 text-[8px] text-slate-600">
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    <span>4.8 · Vendeur fiable</span>
                  </div>
                )}
              </>
            )}

            <div className="space-y-1">
              {waouhBubbles.map((b, i) => (
                <Bubble key={`w-${i}-${step}`} side={b.msg.side}>
                  {b.msg.text}
                </Bubble>
              ))}
            </div>

            <AnimatePresence>
              {showDelivery && (
                <motion.div
                  key="del-w"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-1.5 bg-[hsl(165_91%_92%)] border border-[hsl(165_91%_70%)] rounded-md px-2 py-1 flex items-center gap-1.5"
                >
                  <Check className="h-3 w-3 text-[hsl(165_91%_25%)]" />
                  <span className="text-[9px] sm:text-[10px] font-semibold text-[hsl(165_91%_18%)]">Livreur assigné · Suivi activé</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </PhoneFrame>
      </div>
      <div className="text-center mt-4 text-[10px] sm:text-xs text-muted-foreground">
        Achetez · Vendez · Négociez · Livrez — tout par message
      </div>
    </div>
  );
}

export default WaouhDemoMockup;
