import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompleteModuleData } from '@/types/module';

export interface ExportOptions {
  selectedModules: string[];
  includeFAQ: boolean;
  includePricing: boolean;
  includeComparison: boolean;
}

export class ProfessionalPDFGenerator {
  private doc: jsPDF;
  private pageNumber: number = 1;
  private readonly marginLeft = 20;
  private readonly marginRight = 190;
  private readonly lineHeight = 7;
  
  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
  }
  
  generateCoverPage(title: string, subtitle: string, stats: any[]) {
    // Title
    this.doc.setFontSize(32);
    this.doc.setFont('helvetica', 'bold');
    const titleLines = this.doc.splitTextToSize(title, 170);
    this.doc.text(titleLines, 105, 80, { align: 'center' });
    
    // Subtitle
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(subtitle, 105, 110, { align: 'center' });
    
    // Stats
    this.doc.setFontSize(14);
    let y = 140;
    stats.forEach(stat => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(stat.value, 105, y, { align: 'center' });
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(12);
      this.doc.text(stat.label, 105, y + 6, { align: 'center' });
      y += 20;
    });
    
    // Date
    this.doc.setFontSize(10);
    this.doc.setTextColor(128);
    this.doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 105, 270, { align: 'center' });
    this.doc.setTextColor(0);
    
    this.doc.addPage();
  }
  
  generateTableOfContents(modules: CompleteModuleData[]) {
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Table des Matières', this.marginLeft, 30);
    
    let y = 50;
    modules.forEach((module, index) => {
      if (y > 260) {
        this.addFooter();
        this.doc.addPage();
        y = 30;
      }
      
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(`${index + 1}. ${module.icon} ${module.title}`, this.marginLeft, y);
      this.doc.text(`${5 + (index * 15)}`, this.marginRight - 10, y);
      
      y += 8;
    });
    
    this.addFooter();
    this.doc.addPage();
  }
  
  generateModuleSection(module: CompleteModuleData) {
    let y = 30;
    
    // Module Title
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`${module.icon} ${module.title}`, this.marginLeft, y);
    y += 12;
    
    // Category and badges
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Catégorie: ${module.category} | Difficulté: ${module.metadata.difficulty}`, this.marginLeft, y);
    y += 10;
    
    // Presentation
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Présentation', this.marginLeft, y);
    y += 8;
    
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    module.presentation.fullDescription.forEach(para => {
      const lines = this.doc.splitTextToSize(para, 170);
      if (y + (lines.length * this.lineHeight) > 270) {
        this.addFooter();
        this.doc.addPage();
        y = 30;
      }
      this.doc.text(lines, this.marginLeft, y);
      y += lines.length * this.lineHeight + 5;
    });
    
    // Features
    if (y > 200) {
      this.addFooter();
      this.doc.addPage();
      y = 30;
    }
    
    y += 5;
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('✨ Fonctionnalités Clés', this.marginLeft, y);
    y += 10;
    
    module.features.slice(0, 6).forEach((feature, index) => {
      if (y > 250) {
        this.addFooter();
        this.doc.addPage();
        y = 30;
      }
      
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(`${index + 1}. ${feature.name}`, this.marginLeft, y);
      y += 6;
      
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      const descLines = this.doc.splitTextToSize(feature.description, 165);
      this.doc.text(descLines, this.marginLeft + 5, y);
      y += descLines.length * 5 + 6;
    });
    
    // ROI Table
    this.addFooter();
    this.doc.addPage();
    y = 30;
    
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('💎 Retour sur Investissement', this.marginLeft, y);
    y += 10;
    
    autoTable(this.doc, {
      startY: y,
      head: [['Métrique', 'Avant', 'Avec Bot.bj', 'Amélioration']],
      body: module.roi.metricsComparison.map(m => [
        m.metric, m.before, m.after, m.improvement
      ]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [139, 92, 246], textColor: 255 }
    });
    
    y = (this.doc as any).lastAutoTable.finalY + 15;
    
    // FAQ
    if (y > 200) {
      this.addFooter();
      this.doc.addPage();
      y = 30;
    }
    
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('❓ Questions Fréquentes', this.marginLeft, y);
    y += 10;
    
    module.faq.slice(0, 5).forEach((item) => {
      if (y > 240) {
        this.addFooter();
        this.doc.addPage();
        y = 30;
      }
      
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      const qLines = this.doc.splitTextToSize(`Q: ${item.question}`, 170);
      this.doc.text(qLines, this.marginLeft, y);
      y += qLines.length * 6 + 3;
      
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(60);
      const aLines = this.doc.splitTextToSize(`R: ${item.answer}`, 170);
      this.doc.text(aLines, this.marginLeft, y);
      this.doc.setTextColor(0);
      y += aLines.length * 5 + 8;
    });
    
    this.addFooter();
    this.doc.addPage();
  }
  
  addFooter() {
    this.doc.setDrawColor(200);
    this.doc.line(this.marginLeft, 285, this.marginRight, 285);
    
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(150);
    
    this.doc.text('Bot.bj - Documentation des Fonctionnalités', this.marginLeft, 291);
    this.doc.text(`Page ${this.pageNumber}`, this.marginRight - 15, 291);
    this.doc.setTextColor(0);
    
    this.pageNumber++;
  }
  
  async generate(modules: CompleteModuleData[], options: ExportOptions): Promise<Blob> {
    // Cover Page
    this.generateCoverPage(
      'Guide Complet des Fonctionnalités Bot.bj',
      '16 Modules Puissants pour Transformer Votre Business',
      [
        { value: '500+', label: 'Bots Créés' },
        { value: '50K+', label: 'Messages Traités' },
        { value: '98%', label: 'Satisfaction' }
      ]
    );
    
    // Table of Contents
    const selectedModules = modules.filter(m => 
      options.selectedModules.includes(m.id)
    );
    this.generateTableOfContents(selectedModules);
    
    // Modules
    selectedModules.forEach(module => {
      this.generateModuleSection(module);
    });
    
    // Last page
    this.doc.setFontSize(22);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Prêt à Transformer Votre Business ?', 105, 100, { align: 'center' });
    
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Essayez Bot.bj Gratuitement', 105, 120, { align: 'center' });
    
    this.doc.setFontSize(12);
    this.doc.text('🌐 www.bot.bj', 105, 145, { align: 'center' });
    this.doc.text('📧 contact@bot.bj', 105, 155, { align: 'center' });
    
    return this.doc.output('blob');
  }
}
