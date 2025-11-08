import React, { useState } from 'react';
import { DocumentationHeader } from '@/components/features-documentation/DocumentationHeader';
import { ModulePresentation } from '@/components/features-documentation/ModulePresentation';
import { ModuleFeaturesGrid } from '@/components/features-documentation/ModuleFeaturesGrid';
import { ModuleWorkflowDiagram } from '@/components/features-documentation/ModuleWorkflowDiagram';
import { ModuleStepByStep } from '@/components/features-documentation/ModuleStepByStep';
import { allModules } from '@/data/modules';
import { ProfessionalPDFGenerator } from '@/utils/pdfGenerator';
import { toast } from 'sonner';

const FeaturesPage: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    setIsExporting(true);
    toast.info('📄 Génération du PDF en cours...', {
      description: 'Cela peut prendre 30-60 secondes'
    });
    
    try {
      const generator = new ProfessionalPDFGenerator();
      const pdfBlob = await generator.generate(allModules, {
        selectedModules: allModules.map(m => m.id),
        includeFAQ: true,
        includePricing: true,
        includeComparison: true
      });
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `botbj-guide-fonctionnalites-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('✅ PDF généré avec succès !', {
        description: 'Le téléchargement a commencé'
      });
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('❌ Erreur lors de la génération', {
        description: 'Réessayez ou contactez le support'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background">
      <DocumentationHeader onExportPDF={handleExportPDF} isExporting={isExporting} />
      
      <div id="modules" className="container mx-auto px-4 md:px-6 py-16 space-y-24">
        {allModules.map((module, index) => (
          <section key={module.id} id={module.id} className="space-y-12 scroll-mt-20">
            {/* Section divider */}
            {index > 0 && <div className="border-t pt-12" />}
            
            {/* Module Presentation */}
            <ModulePresentation module={module} />
            
            {/* Features Grid */}
            <ModuleFeaturesGrid features={module.features} />
            
            {/* Workflow */}
            <ModuleWorkflowDiagram 
              mermaidCode={module.workflow.mermaidCode}
              stepsExplanation={module.workflow.stepsExplanation}
            />
            
            {/* Step by Step Guide */}
            <ModuleStepByStep 
              prerequisites={module.stepByStep.prerequisites}
              estimatedTime={module.stepByStep.estimatedTime}
              steps={module.stepByStep.steps}
              finalResult={module.stepByStep.finalResult}
            />
          </section>
        ))}
      </div>
    </div>
  );
};

export default FeaturesPage;
