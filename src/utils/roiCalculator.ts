import * as XLSX from 'xlsx';

export const generateROICalculator = () => {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // ROI Calculator Sheet
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
    ['INVESTISSEMENT BOT.BJ', '', '', ''],
    ['Abonnement mensuel (FCFA)', 0, 49900, ''],
    ['Temps de déploiement', '2-4 semaines', '10 minutes', ''],
    ['', '', '', ''],
    ['RÉSULTATS MENSUELS', '', '', ''],
    ['Économies support', '', '', 450000],
    ['CA supplémentaire', '', '', 2500000],
    ['Coût Bot.bj', '', '', -49900],
    ['GAIN NET MENSUEL', '', '', 2900100],
    ['', '', '', ''],
    ['ROI ANNUEL', '', '', 34801200],
    ['Retour sur investissement', '', '', '5782%'],
  ];
  
  const ws1 = XLSX.utils.aoa_to_sheet(roiData);
  
  // Set column widths
  ws1['!cols'] = [
    { wch: 30 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 }
  ];
  
  // Instructions Sheet
  const instructionsData = [
    ['COMMENT UTILISER CE CALCULATEUR', '', ''],
    ['', '', ''],
    ['1. Données Actuelles', 'Entrez vos chiffres actuels dans la colonne B'],
    ['   - Nombre d\'agents support', ''],
    ['   - Salaire moyen', ''],
    ['   - Nombre de leads mensuels', ''],
    ['   - Taux de conversion actuel', ''],
    ['   - Valeur moyenne par vente', ''],
    ['', '', ''],
    ['2. Calculs Automatiques', 'Les économies et gains sont calculés automatiquement'],
    ['', '', ''],
    ['3. Bénéfices Bot.bj', ''],
    ['   ✓ Réduction de 60% des coûts support', ''],
    ['   ✓ Augmentation de 200% du taux de conversion', ''],
    ['   ✓ Disponibilité 24/7', ''],
    ['   ✓ Temps de réponse < 1 minute', ''],
    ['', '', ''],
    ['4. Résultats', 'Consultez vos gains mensuels et annuels'],
    ['', '', ''],
    ['BESOIN D\'AIDE ?', 'contact@bot.bj', '+229 XX XX XX XX'],
  ];
  
  const ws2 = XLSX.utils.aoa_to_sheet(instructionsData);
  ws2['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 20 }];
  
  // Add sheets to workbook
  XLSX.utils.book_append_sheet(wb, ws1, 'Calculateur ROI');
  XLSX.utils.book_append_sheet(wb, ws2, 'Instructions');
  
  // Generate and download
  XLSX.writeFile(wb, 'Bot.bj_Calculateur_ROI.xlsx');
};
