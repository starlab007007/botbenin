import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Download, Grid, Smartphone, Mic, Heart, Users, Briefcase, Stethoscope, Search } from "lucide-react";

// Import all YOVO screens - Updated with new improved designs
import splash from "@/assets/yovo-screens/01-splash-screen.png";
import homeFeed from "@/assets/yovo-screens/02-home-feed.png";
import translator from "@/assets/yovo-screens/03-translator.png";
import iaHealth from "@/assets/yovo-screens/04-ia-health.png";
import jobsOpportunities from "@/assets/yovo-screens/05-jobs-opportunities.png";
import marketplace from "@/assets/yovo-screens/06-marketplace.png";
import agriculture from "@/assets/yovo-screens/07-agriculture.png";
import traditionsLibrary from "@/assets/yovo-screens/08-traditions-library.png";
import iaBusiness from "@/assets/yovo-screens/09-ia-business.png";
import conversations from "@/assets/yovo-screens/10-conversations.png";
import voiceRecording from "@/assets/yovo-screens/11-voice-recording.png";
import liveAudio from "@/assets/yovo-screens/12-live-audio.png";
import profile from "@/assets/yovo-screens/13-profile.png";
import discover from "@/assets/yovo-screens/14-discover.png";
import groupChat from "@/assets/yovo-screens/15-group-chat.png";
import emergencySos from "@/assets/yovo-screens/16-emergency-sos.png";
import financeMobile from "@/assets/yovo-screens/17-finance-mobile.png";
import documents from "@/assets/yovo-screens/18-documents.png";
import settings from "@/assets/yovo-screens/19-settings.png";
import accessibility from "@/assets/yovo-screens/20-accessibility.png";

const screens = [
  { id: 1, name: "Splash Screen", category: "Onboarding", image: splash, icon: Smartphone, description: "Écran d'accueil BOT.BJ Langue Locale" },
  { id: 2, name: "Fil d'actualité", category: "Social", image: homeFeed, icon: Heart, description: "Fil social avec partage vocal et vidéo" },
  { id: 3, name: "Traducteur Vocal", category: "IA", image: translator, icon: Mic, description: "Traduction Français ↔ Langues locales" },
  { id: 4, name: "IA Santé Locale", category: "IA Santé", image: iaHealth, icon: Stethoscope, description: "Assistant santé vocal avec conseils médicaux" },
  { id: 5, name: "Emploi Audio Jobs", category: "Opportunités", image: jobsOpportunities, icon: Search, description: "Trouver des emplois avec candidature vocale" },
  { id: 6, name: "Marketplace Locale", category: "Business", image: marketplace, icon: Briefcase, description: "Commerce audio avec descriptions vocales" },
  { id: 7, name: "Conseil Agritech", category: "IA", image: agriculture, icon: Mic, description: "Conseils agricoles vocaux avec météo" },
  { id: 8, name: "Bibliothèque Locale", category: "Culture", image: traditionsLibrary, icon: Heart, description: "Contes et traditions orales numérisées" },
  { id: 9, name: "IA Business Locale", category: "Business", image: iaBusiness, icon: Briefcase, description: "Conseiller commercial vocal" },
  { id: 10, name: "Conversations Vocales", category: "Social", image: conversations, icon: Users, description: "Messagerie vocale avec contacts" },
  { id: 11, name: "Enregistrement Vocal", category: "Social", image: voiceRecording, icon: Mic, description: "Interface d'enregistrement message vocal" },
  { id: 12, name: "Live Audio", category: "Social", image: liveAudio, icon: Users, description: "Salle audio en direct type Clubhouse" },
  { id: 13, name: "Profil Utilisateur", category: "Social", image: profile, icon: Users, description: "Profil avec stats et badges vocaux" },
  { id: 14, name: "Découvrir", category: "Social", image: discover, icon: Search, description: "Explorer contenus par catégorie" },
  { id: 15, name: "Groupe Vocal", category: "Social", image: groupChat, icon: Users, description: "Chat de groupe avec messages vocaux" },
  { id: 16, name: "SOS Urgences", category: "Services", image: emergencySos, icon: Stethoscope, description: "Bouton d'urgence vocal GPS" },
  { id: 17, name: "IA Finance Mobile", category: "Business", image: financeMobile, icon: Briefcase, description: "Mobile Money vocal MTN/Moov" },
  { id: 18, name: "Documents Officiels", category: "Services", image: documents, icon: Briefcase, description: "Aide administrative vocale" },
  { id: 19, name: "Paramètres", category: "Settings", image: settings, icon: Smartphone, description: "Configuration de l'application" },
  { id: 20, name: "Accessibilité", category: "Settings", image: accessibility, icon: Smartphone, description: "Options d'accessibilité inclusive" },
];

const categories = [
  { name: "Tous", icon: Grid, color: "from-gray-500 to-gray-600" },
  { name: "Social", icon: Users, color: "from-blue-500 to-blue-600" },
  { name: "IA", icon: Mic, color: "from-purple-500 to-purple-600" },
  { name: "IA Santé", icon: Stethoscope, color: "from-green-500 to-green-600" },
  { name: "Business", icon: Briefcase, color: "from-orange-500 to-orange-600" },
  { name: "Opportunités", icon: Search, color: "from-emerald-500 to-emerald-600" },
  { name: "Culture", icon: Heart, color: "from-pink-500 to-pink-600" },
  { name: "Services", icon: Smartphone, color: "from-red-500 to-red-600" },
  { name: "Settings", icon: Smartphone, color: "from-slate-500 to-slate-600" },
];

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900/10 to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-gray-900/80 border-b border-orange-500/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Mic className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                  BOT.BJ Langue Locale
                </h1>
                <p className="text-gray-400 text-sm">Super-App Vocal Communautaire • 20 écrans prototype</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-orange-400 font-medium text-sm">IA Langues Locales</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2">
                <Grid className="w-4 h-4 text-orange-400" />
                <span className="text-white font-medium">{screens.length} écrans</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Feature Highlights */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Réseau Social", value: "Vocal", icon: Users, color: "bg-blue-500/20 text-blue-400" },
            { label: "IA Business", value: "Commerce", icon: Briefcase, color: "bg-orange-500/20 text-orange-400" },
            { label: "IA Santé", value: "Conseil", icon: Stethoscope, color: "bg-green-500/20 text-green-400" },
            { label: "Opportunités", value: "Emploi", icon: Search, color: "bg-purple-500/20 text-purple-400" },
          ].map((feature, i) => (
            <div key={i} className={`${feature.color} rounded-xl p-4 border border-white/5`}>
              <feature.icon className="w-6 h-6 mb-2" />
              <p className="font-bold text-lg">{feature.value}</p>
              <p className="text-sm opacity-80">{feature.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="container mx-auto px-4 pb-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const count = category.name === "Tous" ? screens.length : screens.filter(s => s.category === category.name).length;
            if (count === 0 && category.name !== "Tous") return null;
            
            return (
              <button
                key={category.name}
                onClick={() => setActiveCategory(category.name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === category.name
                    ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.name}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeCategory === category.name ? "bg-white/20" : "bg-white/5"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredScreens.map((screen) => {
            const Icon = screen.icon;
            return (
              <div
                key={screen.id}
                onClick={() => setSelectedScreen(screen.id)}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[9/19] rounded-2xl overflow-hidden bg-gray-800 border border-white/10 transition-all duration-300 group-hover:border-orange-500/50 group-hover:shadow-lg group-hover:shadow-orange-500/20 group-hover:scale-[1.02]">
                  <img
                    src={screen.image}
                    alt={screen.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                          <Icon className="w-3 h-3 text-orange-400" />
                        </div>
                        <span className="text-xs text-orange-400 font-medium">{screen.category}</span>
                      </div>
                      <p className="text-white text-xs line-clamp-2">{screen.description}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 px-1">
                  <p className="text-white text-sm font-medium truncate">{screen.name}</p>
                  <p className="text-gray-500 text-xs">Écran {screen.id}/20</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Preview */}
      <Dialog open={selectedScreen !== null} onOpenChange={() => setSelectedScreen(null)}>
        <DialogContent className="max-w-4xl bg-gray-900/95 border-orange-500/20 p-0 overflow-hidden">
          <div className="relative">
            {/* Close button */}
            <button
              onClick={() => setSelectedScreen(null)}
              className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-orange-500/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Navigation */}
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-orange-500/50 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-orange-500/50 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Image */}
            <div className="flex items-center justify-center p-8 min-h-[80vh]">
              {selectedScreenData && (
                <img
                  src={selectedScreenData.image}
                  alt={selectedScreenData.name}
                  className="max-h-[75vh] w-auto rounded-3xl shadow-2xl shadow-orange-500/10"
                />
              )}
            </div>

            {/* Info bar */}
            {selectedScreenData && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium">
                        {selectedScreenData.category}
                      </span>
                    </div>
                    <h3 className="text-white text-xl font-bold">{selectedScreenData.name}</h3>
                    <p className="text-gray-400 text-sm">{selectedScreenData.description}</p>
                    <p className="text-gray-500 text-xs mt-1">Écran {selectedScreenData.id} sur {screens.length}</p>
                  </div>
                  <a
                    href={selectedScreenData.image}
                    download={`botbj-${selectedScreenData.id}-${selectedScreenData.name.toLowerCase().replace(/\s/g, '-')}.png`}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg text-white font-medium transition-colors shadow-lg shadow-orange-500/30"
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
