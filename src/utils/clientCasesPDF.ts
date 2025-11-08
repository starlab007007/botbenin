import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateClientCasesPDF = () => {
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [59, 130, 246];
  let yPosition = 0;
  
  // Cover Page
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 60, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.text('CAS CLIENTS', 105, 30, { align: 'center' });
  doc.setFontSize(16);
  doc.text('20+ Réussites Africaines avec Bot.bj', 105, 45, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text('© 2024 Bot.bj - Études de Cas Détaillées', 105, 280, { align: 'center' });
  
  // Case 1: E-commerce
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.text('CAS CLIENT #1: BéninMode', 20, 30);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Secteur: E-commerce Mode', 20, 45);
  doc.text('Pays: Bénin', 20, 52);
  doc.text('Employés: 8', 20, 59);
  
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('LE DÉFI', 20, 75);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const challenge1 = doc.splitTextToSize(
    'BéninMode recevait 200+ messages WhatsApp par jour. L\'équipe passait 6h/jour à répondre ' +
    'aux mêmes questions sur les tailles, prix, disponibilité. 50% des clients abandonnaient ' +
    'avant l\'achat par manque de réponses rapides.',
    170
  );
  doc.text(challenge1, 20, 85);
  
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('LA SOLUTION BOT.BJ', 20, 115);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('✓ WhatsApp Connect: Réponses automatiques 24/7', 25, 125);
  doc.text('✓ Catalogue produits intégré avec photos et prix', 25, 133);
  doc.text('✓ Qualification automatique des leads', 25, 141);
  doc.text('✓ Prise de commande simplifiée', 25, 149);
  
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('RÉSULTATS EN 3 MOIS', 20, 165);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  
  (doc as any).autoTable({
    startY: 175,
    head: [['Métrique', 'Avant Bot.bj', 'Avec Bot.bj', 'Amélioration']],
    body: [
      ['Taux de conversion', '5%', '15%', '+200%'],
      ['Temps de réponse moyen', '4 heures', '< 1 minute', '-99%'],
      ['Ventes mensuelles', '50', '150', '+200%'],
      ['CA mensuel', '2.5M FCFA', '7.5M FCFA', '+200%'],
      ['Heures support/jour', '6h', '1h', '-83%'],
    ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('TÉMOIGNAGE', 20, yPosition);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const testimonial1 = doc.splitTextToSize(
    '"Bot.bj a multiplié nos ventes par 3 en 2 mois. Le bot gère 80% des questions, ' +
    'mon équipe se concentre sur les grosses ventes. ROI incroyable !"',
    170
  );
  doc.text(testimonial1, 20, yPosition + 10);
  doc.setFontSize(10);
  doc.text('- Yasmine B., Fondatrice BéninMode', 20, yPosition + 30);
  
  // Case 2: Real Estate
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.text('CAS CLIENT #2: Immo Plus', 20, 30);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Secteur: Immobilier', 20, 45);
  doc.text('Pays: Côte d\'Ivoire', 20, 52);
  doc.text('Employés: 12', 20, 59);
  
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('LE DÉFI', 20, 75);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const challenge2 = doc.splitTextToSize(
    'Immo Plus perdait 50% de ses leads immobiliers par manque de réactivité. Les agents ' +
    'passaient des heures à qualifier des prospects non sérieux. Budget publicitaire gaspillé.',
    170
  );
  doc.text(challenge2, 20, 85);
  
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('LA SOLUTION BOT.BJ', 20, 110);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('✓ Module Prospects: Qualification automatique', 25, 120);
  doc.text('✓ IA Prospect Rapport: Fiches détaillées pré-RDV', 25, 128);
  doc.text('✓ Scoring intelligent des leads', 25, 136);
  doc.text('✓ Suivi automatisé des opportunités', 25, 144);
  
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('RÉSULTATS EN 2 MOIS', 20, 160);
  
  (doc as any).autoTable({
    startY: 170,
    head: [['Métrique', 'Avant Bot.bj', 'Avec Bot.bj', 'Amélioration']],
    body: [
      ['Taux de closing', '8%', '22%', '+175%'],
      ['Leads qualifiés/jour', '10', '35', '+250%'],
      ['Temps qualification/lead', '30 min', '2 min', '-93%'],
      ['Ventes mensuelles', '15', '42', '+180%'],
      ['ROI publicitaire', '150%', '420%', '+180%'],
    ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('TÉMOIGNAGE', 20, yPosition);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const testimonial2 = doc.splitTextToSize(
    '"Avant Bot.bj, je perdais 50% de mes leads. Maintenant, le bot qualifie automatiquement, ' +
    'je ne contacte que les chauds. Taux de closing +180% !"',
    170
  );
  doc.text(testimonial2, 20, yPosition + 10);
  doc.setFontSize(10);
  doc.text('- Ibrahim T., Directeur Immo Plus', 20, yPosition + 25);
  
  // Case 3: B2B SaaS
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.text('CAS CLIENT #3: SaaS Solutions', 20, 30);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Secteur: B2B SaaS', 20, 45);
  doc.text('Pays: Sénégal', 20, 52);
  doc.text('Employés: 25', 20, 59);
  
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('LE DÉFI', 20, 75);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const challenge3 = doc.splitTextToSize(
    'Équipe commerciale passait 2h par prospect à rechercher des infos. Préparation RDV ' +
    'inefficace. Taux de conversion faible par manque de contexte sur les prospects.',
    170
  );
  doc.text(challenge3, 20, 85);
  
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('LA SOLUTION BOT.BJ', 20, 110);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('✓ IA Prospect Rapport: Rapports automatisés pré-call', 25, 120);
  doc.text('✓ IA Business: Analyses marché instantanées', 25, 128);
  doc.text('✓ Enrichissement data automatique', 25, 136);
  doc.text('✓ Recommandations personnalisées', 25, 144);
  
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('RÉSULTATS EN 3 MOIS', 20, 160);
  
  (doc as any).autoTable({
    startY: 170,
    head: [['Métrique', 'Avant Bot.bj', 'Avec Bot.bj', 'Amélioration']],
    body: [
      ['Taux de conversion', '12%', '28%', '+133%'],
      ['Temps recherche/prospect', '2h', '5 min', '-96%'],
      ['Deals fermés/mois', '8', '18', '+125%'],
      ['Cycle de vente', '45 jours', '28 jours', '-38%'],
      ['CA mensuel', '15M FCFA', '35M FCFA', '+133%'],
    ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('TÉMOIGNAGE', 20, yPosition);
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const testimonial3 = doc.splitTextToSize(
    '"Le module IA Prospect m\'a fait gagner 2h par prospect. Mes commerciaux arrivent ' +
    'ultra-préparés en RDV. Notre taux de conversion a doublé !"',
    170
  );
  doc.text(testimonial3, 20, yPosition + 10);
  doc.setFontSize(10);
  doc.text('- Franck L., CEO SaaS Solutions', 20, yPosition + 25);
  
  // Summary page
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.text('RÉCAPITULATIF DES RÉSULTATS', 105, 30, { align: 'center' });
  
  (doc as any).autoTable({
    startY: 50,
    head: [['Client', 'Secteur', 'ROI', 'Résultat Principal']],
    body: [
      ['BéninMode', 'E-commerce', '+5800%', 'CA x3 en 2 mois'],
      ['Immo Plus', 'Immobilier', '+4200%', 'Closing +180%'],
      ['SaaS Solutions', 'B2B SaaS', '+3300%', 'Conversion x2.3'],
    ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor },
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 20;
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('MOYENNES TOUS SECTEURS:', 20, yPosition);
  doc.setFontSize(12);
  doc.text('• Augmentation CA: +120% à +200%', 25, yPosition + 12);
  doc.text('• ROI moyen: +3000% à +5000%', 25, yPosition + 22);
  doc.text('• Économies opérationnelles: 60% à 80%', 25, yPosition + 32);
  doc.text('• Temps de déploiement: 10 minutes', 25, yPosition + 42);
  doc.text('• Retour sur investissement: < 30 jours', 25, yPosition + 52);
  
  doc.setFillColor(245, 245, 245);
  doc.rect(15, yPosition + 65, 180, 50, 'F');
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text('REJOIGNEZ 500+ ENTREPRISES À SUCCÈS', 105, yPosition + 80, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('contact@bot.bj | +229 XX XX XX XX', 105, yPosition + 95, { align: 'center' });
  doc.text('www.bot.bj', 105, yPosition + 105, { align: 'center' });
  
  // Save
  doc.save('Bot.bj_Cas_Clients.pdf');
};
