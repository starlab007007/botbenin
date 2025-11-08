import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { platformDocumentation, PlatformContent } from '@/data/platformDocumentation';
import { ROICalculator } from '@/components/documentation/ROICalculator';
import { CaseStudies } from '@/components/documentation/CaseStudies';
import { InnovationShowcase } from '@/components/documentation/InnovationShowcase';
import { CompetitorComparison } from '@/components/documentation/CompetitorComparison';
import { 
  FileText, 
  Search, 
  Home, 
  Share2, 
  Download,
  Menu,
  X,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';

const DocumentationPortalPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('diagnostic');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleSectionSelect = (sectionId: string) => {
    setSelectedSection(sectionId);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Lien copié",
      description: "Le lien a été copié dans le presse-papier",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Export en cours",
      description: "La fonctionnalité d'export PDF sera bientôt disponible",
    });
  };

  // Filter sections based on search
  const filteredSections = platformDocumentation.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentSection = platformDocumentation.find(s => s.id === selectedSection);

  const renderContent = (content: PlatformContent) => {
    switch (content.type) {
      case 'text':
        return <p className="text-muted-foreground leading-relaxed">{content.content}</p>;
      
      case 'subsection':
        return (
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">{content.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{content.content}</p>
          </div>
        );
      
      case 'list':
        return (
          <div className="space-y-2">
            {content.title && <h4 className="font-semibold text-foreground">{content.title}</h4>}
            <ul className="space-y-2 ml-4">
              {content.items?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <ChevronRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      
      case 'feature':
        return (
          <div className="space-y-8">
            {content.features?.map((feature, idx) => (
              <Card key={idx} className="p-6 space-y-4 hover:shadow-lg transition-shadow">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-foreground">{feature.name}</h3>
                  <p className="text-lg text-muted-foreground">{feature.description}</p>
                </div>
                
                {feature.benefits && feature.benefits.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      Avantages
                    </h4>
                    <ul className="space-y-1 ml-7">
                      {feature.benefits.map((benefit, bidx) => (
                        <li key={bidx} className="text-muted-foreground">{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {feature.howItWorks && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Comment ça marche ?</h4>
                    <p className="text-muted-foreground">{feature.howItWorks}</p>
                  </div>
                )}
                
                {feature.useCases && feature.useCases.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-foreground">Cas d'usage</h4>
                    <div className="flex flex-wrap gap-2">
                      {feature.useCases.map((useCase, uidx) => (
                        <span key={uidx} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {useCase}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        );
      
      case 'problem-solution':
        return (
          <div className="space-y-6">
            {content.problems?.map((prob, idx) => (
              <Card key={idx} className="p-6 space-y-3 hover:shadow-lg transition-shadow">
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground text-lg">{prob.problem}</h4>
                  <div className="pl-4 border-l-4 border-primary space-y-2">
                    <p className="text-muted-foreground"><strong className="text-foreground">Solution:</strong> {prob.solution}</p>
                    <p className="text-sm text-primary"><strong>Impact:</strong> {prob.impact}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        );
      
      case 'advantage':
        return (
          <div className="grid sm:grid-cols-2 gap-6">
            {content.advantages?.map((adv, idx) => (
              <Card key={idx} className="p-6 space-y-3 hover:shadow-lg transition-all hover:-translate-y-1">
                <h4 className="font-bold text-foreground text-lg">{adv.title}</h4>
                <p className="text-muted-foreground">{adv.description}</p>
                {adv.metrics && (
                  <p className="text-sm text-primary font-semibold">{adv.metrics}</p>
                )}
              </Card>
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Documentation Bot BJ</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="hidden md:flex"
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportPDF}
              className="hidden md:flex"
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <Home className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="container px-4 md:px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans la documentation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      <div className="container px-4 md:px-6 py-6">
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar */}
          <aside className={`
            fixed lg:relative inset-0 z-40 bg-background lg:bg-transparent
            ${isSidebarOpen ? 'block' : 'hidden lg:block'}
          `}>
            {isMobile && (
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold">Sections</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}

            <ScrollArea className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-12rem)]">
              <div className="space-y-2 p-4 lg:p-0">
                {filteredSections.map((section) => (
                  <Button
                    key={section.id}
                    variant={selectedSection === section.id ? "secondary" : "ghost"}
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => handleSectionSelect(section.id)}
                  >
                    <div className="flex items-start gap-3 w-full">
                      <span className="text-xl flex-shrink-0">{section.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{section.title}</div>
                      </div>
                      {selectedSection === section.id && (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </aside>

          {/* Mobile Sidebar Toggle */}
          {isMobile && !isSidebarOpen && (
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-4 right-4 z-30 h-12 w-12 rounded-full shadow-lg lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          )}

          {/* Main Content */}
          <main className="min-h-[calc(100vh-12rem)]">
            {currentSection ? (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-4xl">{currentSection.icon}</span>
                    <h1 className="text-3xl md:text-4xl font-bold">{currentSection.title}</h1>
                  </div>
                </div>

                <Separator />

                <div className="space-y-12">
                  {currentSection.content.map((content, idx) => (
                    <div key={idx}>
                      {renderContent(content)}
                    </div>
                  ))}
                  
                  {/* Sections spéciales selon l'ID */}
                  {selectedSection === 'features' && (
                    <>
                      <Separator className="my-12" />
                      <InnovationShowcase />
                    </>
                  )}
                  
                  {selectedSection === 'advantages' && (
                    <>
                      <Separator className="my-12" />
                      <CompetitorComparison />
                    </>
                  )}
                  
                  {selectedSection === 'pricing' && (
                    <>
                      <Separator className="my-12" />
                      <ROICalculator />
                      <Separator className="my-12" />
                      <CaseStudies />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-4">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold">Aucune section trouvée</h3>
                    <p className="text-muted-foreground">
                      Essayez de modifier votre recherche
                    </p>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DocumentationPortalPage;
