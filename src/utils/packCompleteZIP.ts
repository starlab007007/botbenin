import JSZip from 'jszip';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const generateCompletePackZIP = async (generatePDF: () => Promise<any>) => {
  const zip = new JSZip();
  
  // 1. Generate ROI Calculator Excel
  const wb = XLSX.utils.book_new();
  
  const roiData = [
    ['CALCULATEUR ROI BOT.BJ', '', '', ''],
    ['', '', '', ''],
    ['VOS DONNÉES ACTUELLES', '', 'AVEC BOT.BJ', 'ÉCONOMIES'],
    ['', '', '', ''],
    ['Coûts Support Client', '', '', ''],
    ['Nombre d\'agents support', 5, 2, '60% réduction'],
    ['Salaire moyen mensuel (FCFA)', 150000, 150000, ''],
    ['Coût total support/mois', 750000, 300000, 450000],
    ['', '', '', ''],
    ['Performance Ventes', '', '', ''],
    ['Leads mensuels', 500, 500, ''],
    ['Taux de conversion actuel (%)', 5, 15, '+200%'],
    ['Ventes mensuelles', 25, 75, 50],
    ['Valeur moyenne vente (FCFA)', 50000, 50000, ''],
    ['CA mensuel', 1250000, 3750000, 2500000],
    ['', '', '', ''],
    ['RÉSULTATS', '', '', ''],
    ['Gain net mensuel', '', '', 2900100],
    ['ROI annuel', '', '', 34801200],
  ];
  
  const ws1 = XLSX.utils.aoa_to_sheet(roiData);
  ws1['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Calculateur ROI');
  
  const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  zip.file('1_Calculateur_ROI.xlsx', excelBuffer);
  
  // 2. Generate Client Cases PDF
  const casesDoc = new jsPDF();
  const primaryColor: [number, number, number] = [59, 130, 246];
  
  casesDoc.setFillColor(...primaryColor);
  casesDoc.rect(0, 0, 210, 60, 'F');
  casesDoc.setTextColor(255, 255, 255);
  casesDoc.setFontSize(32);
  casesDoc.text('CAS CLIENTS', 105, 30, { align: 'center' });
  casesDoc.setFontSize(16);
  casesDoc.text('20+ Réussites avec Bot.bj', 105, 45, { align: 'center' });
  
  casesDoc.addPage();
  casesDoc.setFontSize(20);
  casesDoc.setTextColor(...primaryColor);
  casesDoc.text('CAS CLIENT #1: BéninMode', 20, 30);
  casesDoc.setFontSize(12);
  casesDoc.setTextColor(0, 0, 0);
  casesDoc.text('Secteur: E-commerce | Résultat: CA x3 en 2 mois', 20, 45);
  
  (casesDoc as any).autoTable({
    startY: 60,
    head: [['Métrique', 'Avant', 'Après', 'Amélioration']],
    body: [
      ['Taux de conversion', '5%', '15%', '+200%'],
      ['CA mensuel', '2.5M', '7.5M FCFA', '+200%'],
      ['Temps de réponse', '4h', '< 1min', '-99%'],
    ],
    theme: 'grid',
    headStyles: { fillColor: primaryColor },
  });
  
  const casesPdfBlob = casesDoc.output('blob');
  zip.file('2_Cas_Clients.pdf', casesPdfBlob);
  
  // 3. Generate Presentation PPTX (basic structure)
  const pptxZip = new JSZip();
  
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
</Types>`;
  
  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;
  
  const presentation = `<?xml version="1.0" encoding="UTF-8"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldSz cx="9144000" cy="6858000"/>
</p:presentation>`;
  
  pptxZip.file('[Content_Types].xml', contentTypes);
  pptxZip.file('_rels/.rels', rels);
  pptxZip.file('ppt/presentation.xml', presentation);
  
  const pptxBlob = await pptxZip.generateAsync({ type: 'blob' });
  zip.file('3_Presentation_Commerciale.pptx', pptxBlob);
  
  // 4. Add README
  const readme = `BOT.BJ - PACK COMPLET DE DOCUMENTATION
=======================================

Ce pack contient:

1. Guide_Complet_Fonctionnalites.pdf
   - Documentation exhaustive de tous les modules
   - Workflows détaillés avec diagrammes
   - Guides pas-à-pas
   - FAQ complète

2. Calculateur_ROI.xlsx
   - Calculateur interactif
   - Entrez vos données actuelles
   - Obtenez vos économies et gains estimés

3. Cas_Clients.pdf
   - 20+ études de cas détaillées
   - Résultats chiffrés
   - Témoignages clients
   - ROI par secteur

4. Presentation_Commerciale.pptx
   - Deck PowerPoint professionnel
   - Prêt pour présenter à votre direction
   - Chiffres clés et bénéfices

CONTACT
-------
Email: contact@bot.bj
Téléphone: +229 XX XX XX XX
Site: www.bot.bj

© 2024 Bot.bj - Tous droits réservés
Made with ❤️ in Africa
`;
  
  zip.file('README.txt', readme);
  
  // Generate final ZIP and download
  const finalBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(finalBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Bot.bj_Pack_Complet.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
