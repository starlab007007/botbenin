import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Download, Grid, Smartphone } from "lucide-react";

// Import all YOVO screens
import splash from "@/assets/yovo-screens/01-splash-screen.png";
import languageSelection from "@/assets/yovo-screens/02-language-selection.png";
import voiceSetup from "@/assets/yovo-screens/03-voice-setup.png";
import homeFeed from "@/assets/yovo-screens/04-home-feed.png";
import conversations from "@/assets/yovo-screens/05-conversations.png";
import discover from "@/assets/yovo-screens/06-discover.png";
import profile from "@/assets/yovo-screens/07-profile.png";
import voiceRecording from "@/assets/yovo-screens/08-voice-recording.png";
import groupChat from "@/assets/yovo-screens/09-group-chat.png";
import liveAudio from "@/assets/yovo-screens/10-live-audio.png";
import iaTranslator from "@/assets/yovo-screens/11-ia-translator.png";
import iaEducation from "@/assets/yovo-screens/12-ia-education.png";
import iaEmergency from "@/assets/yovo-screens/13-ia-emergency.png";
import iaFinance from "@/assets/yovo-screens/14-ia-finance.png";
import iaHealth from "@/assets/yovo-screens/15-ia-health.png";
import iaAgriculture from "@/assets/yovo-screens/16-ia-agriculture.png";
import iaTraditions from "@/assets/yovo-screens/17-ia-traditions.png";
import iaDocuments from "@/assets/yovo-screens/18-ia-documents.png";
import settings from "@/assets/yovo-screens/19-settings.png";
import accessibility from "@/assets/yovo-screens/20-accessibility.png";

const screens = [
  { id: 1, name: "Splash Screen", category: "Onboarding", image: splash },
  { id: 2, name: "Sélection de langue", category: "Onboarding", image: languageSelection },
  { id: 3, name: "Configuration vocale", category: "Onboarding", image: voiceSetup },
  { id: 4, name: "Fil d'actualité", category: "Social", image: homeFeed },
  { id: 5, name: "Conversations", category: "Social", image: conversations },
  { id: 6, name: "Découvrir", category: "Social", image: discover },
  { id: 7, name: "Profil", category: "Social", image: profile },
  { id: 8, name: "Enregistrement vocal", category: "Social", image: voiceRecording },
  { id: 9, name: "Groupe vocal", category: "Social", image: groupChat },
  { id: 10, name: "Live Audio", category: "Social", image: liveAudio },
  { id: 11, name: "IA Traducteur", category: "IA", image: iaTranslator },
  { id: 12, name: "IA Éducation", category: "IA", image: iaEducation },
  { id: 13, name: "IA Urgences", category: "IA", image: iaEmergency },
  { id: 14, name: "IA Finance", category: "IA", image: iaFinance },
  { id: 15, name: "IA Santé", category: "IA", image: iaHealth },
  { id: 16, name: "IA Agriculture", category: "IA", image: iaAgriculture },
  { id: 17, name: "IA Traditions", category: "IA", image: iaTraditions },
  { id: 18, name: "IA Documents", category: "IA", image: iaDocuments },
  { id: 19, name: "Paramètres", category: "Settings", image: settings },
  { id: 20, name: "Accessibilité", category: "Settings", image: accessibility },
];

const categories = ["Tous", "Onboarding", "Social", "IA", "Settings"];

export default function YovoGallery() {
  const [selectedScreen, setSelectedScreen] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("Tous");

  const filteredScreens = activeCategory === "Tous" 
    ? screens 
    : screens.filter(s => s.category === activeCategory);

  const handlePrevious = () => {
    if (selectedScreen === null) return;
    const currentIndex = filteredScreens.findIndex(s => s.id === selectedScreen);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredScreens.length - 1;
    setSelectedScreen(filteredScreens[prevIndex].id);
  };

  const handleNext = () => {
    if (selectedScreen === null) return;
    const currentIndex = filteredScreens.findIndex(s => s.id === selectedScreen);
    const nextIndex = currentIndex < filteredScreens.length - 1 ? currentIndex + 1 : 0;
    setSelectedScreen(filteredScreens[nextIndex].id);
  };

  const selectedScreenData = screens.find(s => s.id === selectedScreen);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-gray-900/80 border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">YOVO App</h1>
                <p className="text-gray-400 text-sm">Réseau social vocal en langues locales</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2">
              <Grid className="w-4 h-4 text-green-400" />
              <span className="text-white font-medium">{screens.length} écrans</span>
            </div>
          </div>
        </div>
      </header>

      {/* Category Filter */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === category
                  ? "bg-green-500 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {category}
              {category !== "Tous" && (
                <span className="ml-2 text-xs opacity-70">
                  ({screens.filter(s => s.category === category).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredScreens.map((screen) => (
            <div
              key={screen.id}
              onClick={() => setSelectedScreen(screen.id)}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[9/19] rounded-2xl overflow-hidden bg-gray-800 border border-white/10 transition-all duration-300 group-hover:border-green-500/50 group-hover:shadow-lg group-hover:shadow-green-500/20 group-hover:scale-[1.02]">
                <img
                  src={screen.image}
                  alt={screen.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <span className="text-xs text-green-400 font-medium">{screen.category}</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 px-1">
                <p className="text-white text-sm font-medium truncate">{screen.name}</p>
                <p className="text-gray-500 text-xs">Écran {screen.id}/20</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Preview */}
      <Dialog open={selectedScreen !== null} onOpenChange={() => setSelectedScreen(null)}>
        <DialogContent className="max-w-4xl bg-gray-900/95 border-white/10 p-0 overflow-hidden">
          <div className="relative">
            {/* Close button */}
            <button
              onClick={() => setSelectedScreen(null)}
              className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Navigation */}
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Image */}
            <div className="flex items-center justify-center p-8 min-h-[80vh]">
              {selectedScreenData && (
                <img
                  src={selectedScreenData.image}
                  alt={selectedScreenData.name}
                  className="max-h-[75vh] w-auto rounded-3xl shadow-2xl"
                />
              )}
            </div>

            {/* Info bar */}
            {selectedScreenData && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-green-400 text-sm font-medium">{selectedScreenData.category}</span>
                    <h3 className="text-white text-xl font-bold">{selectedScreenData.name}</h3>
                    <p className="text-gray-400 text-sm">Écran {selectedScreenData.id} sur {screens.length}</p>
                  </div>
                  <a
                    href={selectedScreenData.image}
                    download={`yovo-${selectedScreenData.id}-${selectedScreenData.name.toLowerCase().replace(/\s/g, '-')}.png`}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </a>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
